'use server';

/**
 * @file src/app/actions/admin-actions.ts
 * @description Server Actions exclusivas del rol ADMIN de Sophos Core.
 *
 * bulkImportUsers: Procesa un archivo CSV/TXT subido por un Administrador,
 * crea cuentas en lote en Supabase Auth con la service_role_key, inserta
 * los perfiles en la tabla 'usuarios' y matricula estudiantes en sus cursos
 * si se suministra el nombre del curso en el archivo.
 *
 * Formato CSV esperado (con encabezado):
 * nombre_completo,email,rol,curso
 * "Pedro García","pedro@colegio.co","DOCENTE",""
 * "Laura Díaz","laura@colegio.co","ESTUDIANTE","11A"
 */

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type BulkImportResult = {
  error?: string;
  success?: boolean;
  successCount?: number;
  errorCount?: number;
  errors?: string[];
};

const VALID_BULK_ROLES = ['DOCENTE', 'ESTUDIANTE', 'ACUDIENTE'] as const;
type BulkRole = (typeof VALID_BULK_ROLES)[number];

// ─── ACTION ──────────────────────────────────────────────────────────────────

/**
 * Procesa una carga masiva de usuarios desde un archivo CSV.
 * Solo puede ser ejecutada por un usuario autenticado con rol ADMIN.
 *
 * @param formData - FormData con campo 'file' (CSV/TXT).
 * @returns Resumen de la importación con conteos de éxito y error.
 */
export async function bulkImportUsers(formData: FormData): Promise<BulkImportResult> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // ── Validar identidad y rol del ejecutor ─────────────────────────────────
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser) {
    return { error: 'Sesión no válida. Por favor, inicia sesión nuevamente.' };
  }

  const adminRol = adminUser.app_metadata?.rol;
  const idInstitucion = adminUser.app_metadata?.id_institucion;

  console.log('--- DEBUG BULK IMPORT ---');
  console.log('User ID:', adminUser.id);
  console.log('app_metadata:', adminUser.app_metadata);
  console.log('adminRol:', adminRol);
  console.log('idInstitucion:', idInstitucion);
  console.log('-------------------------');

  if (adminRol !== 'ADMIN' || !idInstitucion) {
    return {
      error: 'Acceso denegado. Solo los Administradores pueden realizar cargas masivas.',
    };
  }

  // ── Leer y validar el archivo ─────────────────────────────────────────────
  const file = formData.get('file') as File | null;
  if (!file) {
    return { error: 'No se recibió ningún archivo. Por favor, selecciona un CSV.' };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: 'El archivo no puede superar los 5 MB.' };
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');

  if (lines.length < 2) {
    return { error: 'El archivo CSV está vacío o no contiene filas de datos.' };
  }

  // ── Parsear encabezados ───────────────────────────────────────────────────
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));

  const emailIdx = headers.indexOf('email');
  const nameIdx = headers.indexOf('nombre_completo');
  const rolIdx = headers.indexOf('rol');
  const cursoIdx = headers.indexOf('curso');

  if (emailIdx === -1 || nameIdx === -1 || rolIdx === -1) {
    return {
      error:
        'El archivo CSV debe contener las columnas: nombre_completo, email, rol. La columna "curso" es opcional.',
    };
  }

  // ── Procesar filas ────────────────────────────────────────────────────────
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Soporte para campos entre comillas con comas internas
    const fields = line
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((f) => f.trim().replace(/"/g, ''));

    const email = fields[emailIdx]?.toLowerCase();
    const nombreCompleto = fields[nameIdx];
    const rawRol = fields[rolIdx]?.toUpperCase().trim();
    const cursoNombre = cursoIdx !== -1 ? fields[cursoIdx]?.trim() : null;

    // Validaciones por fila
    if (!email || !nombreCompleto || !rawRol) {
      errorCount++;
      errors.push(`Fila ${i + 1}: Campos 'email', 'nombre_completo' y 'rol' son obligatorios.`);
      continue;
    }

    if (!VALID_BULK_ROLES.includes(rawRol as BulkRole)) {
      errorCount++;
      errors.push(
        `Fila ${i + 1} (${email}): Rol '${rawRol}' no es válido. Use: ${VALID_BULK_ROLES.join(', ')}.`
      );
      continue;
    }

    // Generar contraseña temporal única
    const tempPassword = `Sophos${Math.random().toString(36).substring(2, 7).toUpperCase()}2026!`;

    // ── Crear cuenta en Supabase Auth ─────────────────────────────────────
    const { data: newAuthData, error: authErr } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        id_institucion: idInstitucion,
        rol: rawRol,
        must_change_password: true, // Flag para forzar cambio de contraseña en primer ingreso
      },
      user_metadata: {
        nombre_completo: nombreCompleto,
      },
    });

    if (authErr || !newAuthData.user) {
      errorCount++;
      errors.push(
        `Fila ${i + 1} (${email}): ${
          authErr?.message?.includes('already registered')
            ? 'El email ya está registrado.'
            : authErr?.message
        }`
      );
      continue;
    }

    const newUserId = newAuthData.user.id;

    // ── Insertar perfil público ────────────────────────────────────────────
    const { error: userErr } = await adminClient.from('usuarios').insert({
      id_usuario: newUserId,
      email,
      nombre_completo: nombreCompleto,
      rol: rawRol as BulkRole,
      id_institucion: idInstitucion,
    });

    if (userErr) {
      // Rollback del usuario en auth
      await adminClient.auth.admin.deleteUser(newUserId);
      errorCount++;
      errors.push(`Fila ${i + 1} (${email}): Error al crear perfil público: ${userErr.message}`);
      continue;
    }

    // ── Matricular estudiante en curso si se suministra ───────────────────
    if (rawRol === 'ESTUDIANTE' && cursoNombre) {
      const { data: curso } = await adminClient
        .from('cursos')
        .select('id_curso')
        .eq('id_institucion', idInstitucion)
        .eq('nombre', cursoNombre)
        .maybeSingle();

      if (curso) {
        const { error: matriculaErr } = await adminClient.from('estudiantes_matriculados').insert({
          id_estudiante: newUserId,
          id_curso: curso.id_curso,
          id_institucion: idInstitucion,
          ano_lectivo: new Date().getFullYear(),
        });

        if (matriculaErr) {
          // La cuenta se creó pero la matrícula falló — registrar advertencia
          errors.push(
            `Fila ${i + 1} (${email}): Usuario creado, pero no se pudo matricular en '${cursoNombre}': ${matriculaErr.message}`
          );
        }
      } else {
        errors.push(
          `Fila ${i + 1} (${email}): Curso '${cursoNombre}' no encontrado en la institución. El usuario fue creado sin matrícula.`
        );
      }
    }

    successCount++;
  }

  return {
    success: true,
    successCount,
    errorCount,
    errors,
  };
}
