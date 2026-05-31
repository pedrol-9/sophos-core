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

  // ── Pre-procesar, Limpiar y Deduplicar filas del CSV ──────────────────────
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // Mapa para deduplicar filas en el mismo CSV basándose en el email
  const uniqueRows = new Map<string, {
    nombreCompleto: string;
    email: string;
    rawRol: string;
    cursoNombre: string | null;
    lineNum: number;
  }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Soporte para campos entre comillas con comas internas
    const fields = line
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((f) => f.trim().replace(/"/g, ''));

    const email = fields[emailIdx]?.toLowerCase().trim();
    const nombreCompleto = fields[nameIdx]?.trim();
    const rawRol = fields[rolIdx]?.toUpperCase().trim();
    const cursoNombre = cursoIdx !== -1 ? fields[cursoIdx]?.trim() : null;

    // Validaciones básicas de estructura por fila
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

    if (uniqueRows.has(email)) {
      // Duplicado en el CSV - Omitir silenciosamente para limpiar filas
      continue;
    }

    uniqueRows.set(email, {
      nombreCompleto,
      email,
      rawRol,
      cursoNombre,
      lineNum: i + 1
    });
  }

  // ── Procesar cada fila única contra la Base de Datos ──────────────────────
  for (const [email, row] of uniqueRows.entries()) {
    const { nombreCompleto, rawRol, cursoNombre, lineNum } = row;
    const currentYear = new Date().getFullYear();

    // 1. Verificar si el usuario ya existe en public.usuarios
    const { data: existingUser, error: checkError } = await adminClient
      .from('usuarios')
      .select('id_usuario')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      errorCount++;
      errors.push(`Fila ${lineNum} (${email}): Error al verificar existencia: ${checkError.message}`);
      continue;
    }

    let userId = existingUser?.id_usuario || null;
    let isNewUser = false;

    // 2. Si no existe, crear la cuenta de autenticación y el perfil público
    if (!userId) {
      const tempPassword = 'Sophos2026!';
      const { data: newAuthData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        app_metadata: {
          id_institucion: idInstitucion,
          rol: rawRol,
          must_change_password: true, // Forzar cambio de contraseña en primer ingreso
        },
        user_metadata: {
          nombre_completo: nombreCompleto,
        },
      });

      if (authErr || !newAuthData.user) {
        errorCount++;
        errors.push(
          `Fila ${lineNum} (${email}): ${
            authErr?.message?.includes('already registered')
              ? 'El email ya está registrado.'
              : authErr?.message
          }`
        );
        continue;
      }

      userId = newAuthData.user.id;
      isNewUser = true;

      // Insertar perfil en la tabla de usuarios
      const { error: userErr } = await adminClient.from('usuarios').insert({
        id_usuario: userId,
        email,
        nombre_completo: nombreCompleto,
        rol: rawRol as BulkRole,
        id_institucion: idInstitucion,
      });

      if (userErr) {
        // Rollback del usuario en auth
        await adminClient.auth.admin.deleteUser(userId);
        errorCount++;
        errors.push(`Fila ${lineNum} (${email}): Error al crear perfil público: ${userErr.message}`);
        continue;
      }
    }

    // 3. Procesar matrículas (Estudiantes) o asignaciones (Docentes)
    if (rawRol === 'ESTUDIANTE' && cursoNombre) {
      // Buscar el curso en la institución
      let { data: curso } = await adminClient
        .from('cursos')
        .select('id_curso')
        .eq('id_institucion', idInstitucion)
        .eq('nombre', cursoNombre)
        .maybeSingle();

      // Si el curso no existe, crearlo dinámicamente
      if (!curso) {
        const { data: newCurso, error: newCursoErr } = await adminClient
          .from('cursos')
          .insert({
            id_institucion: idInstitucion,
            nombre: cursoNombre,
            jornada: 'Mañana', // Jornada estándar por defecto
          })
          .select('id_curso')
          .single();

        if (newCursoErr) {
          errors.push(
            `Fila ${lineNum} (${email}): No se pudo crear el curso '${cursoNombre}': ${newCursoErr.message}`
          );
          if (isNewUser) successCount++;
          continue;
        }
        curso = newCurso;
      }

      // Validar si el estudiante ya está matriculado en este curso
      const { data: matriculaExistente } = await adminClient
        .from('estudiantes_matriculados')
        .select('id_matricula')
        .eq('id_estudiante', userId)
        .eq('id_curso', curso.id_curso)
        .eq('ano_lectivo', currentYear)
        .maybeSingle();

      if (!matriculaExistente) {
        const { error: matriculaErr } = await adminClient.from('estudiantes_matriculados').insert({
          id_estudiante: userId,
          id_curso: curso.id_curso,
          id_institucion: idInstitucion,
          ano_lectivo: currentYear,
        });

        if (matriculaErr) {
          errors.push(
            `Fila ${lineNum} (${email}): Perfil listo, pero no se pudo matricular en '${cursoNombre}': ${matriculaErr.message}`
          );
        }
      }
    } else if (rawRol === 'DOCENTE' && cursoNombre) {
      // Parsear asignaciones de docente en formato: Materia-Curso;Materia-Curso
      const assignmentsList = cursoNombre.split(';').map((x) => x.trim()).filter(Boolean);

      for (const assignmentStr of assignmentsList) {
        let materiaNombre = "";
        let cursoNombreParsed = "";

        // Emparejar la materia y el curso usando una regex (ej: "Matemáticas-11-A" o "Ciencias-Sociales-10-B")
        // Busca al final de la cadena un patrón de grado y grupo: guion, uno o dos dígitos, guion y una letra.
        const match = assignmentStr.match(/^(.*?)-(\d{1,2}-[A-Za-z])$/);

        if (match) {
          materiaNombre = match[1].trim();
          cursoNombreParsed = match[2].trim();
        } else {
          // Fallback por si el curso no tiene guion (ej: "Matemáticas-11A")
          const parts = assignmentStr.split('-');
          if (parts.length < 2) {
            errors.push(
              `Fila ${lineNum} (${email}): Formato de asignatura '${assignmentStr}' no es válido. Use: 'Materia-Curso'.`
            );
            continue;
          }
          cursoNombreParsed = parts[parts.length - 1].trim();
          materiaNombre = parts.slice(0, parts.length - 1).join('-').trim();
        }

        if (!materiaNombre || !cursoNombreParsed) {
          errors.push(`Fila ${lineNum} (${email}): Materia o curso vacíos en '${assignmentStr}'.`);
          continue;
        }

        // A. Buscar o crear curso
        let { data: curso } = await adminClient
          .from('cursos')
          .select('id_curso')
          .eq('id_institucion', idInstitucion)
          .eq('nombre', cursoNombreParsed)
          .maybeSingle();

        if (!curso) {
          const { data: newCurso, error: newCursoErr } = await adminClient
            .from('cursos')
            .insert({
              id_institucion: idInstitucion,
              nombre: cursoNombreParsed,
              jornada: 'Mañana',
            })
            .select('id_curso')
            .single();

          if (newCursoErr) {
            errors.push(
              `Fila ${lineNum} (${email}): No se pudo crear el curso '${cursoNombreParsed}': ${newCursoErr.message}`
            );
            continue;
          }
          curso = newCurso;
        }

        // B. Buscar o crear materia
        let { data: materia } = await adminClient
          .from('materias')
          .select('id_materia')
          .eq('id_institucion', idInstitucion)
          .eq('nombre', materiaNombre)
          .maybeSingle();

        if (!materia) {
          const { data: newMateria, error: newMateriaErr } = await adminClient
            .from('materias')
            .insert({
              id_institucion: idInstitucion,
              nombre: materiaNombre,
              area: 'General', // Área estándar por defecto
            })
            .select('id_materia')
            .single();

          if (newMateriaErr) {
            errors.push(
              `Fila ${lineNum} (${email}): No se pudo crear la materia '${materiaNombre}': ${newMateriaErr.message}`
            );
            continue;
          }
          materia = newMateria;
        }

        // C. Crear asignación académica si no existe ya
        const { data: asignacionExistente } = await adminClient
          .from('asignaciones_academicas')
          .select('id_asignacion')
          .eq('id_docente', userId)
          .eq('id_materia', materia.id_materia)
          .eq('id_curso', curso.id_curso)
          .eq('ano_lectivo', currentYear)
          .maybeSingle();

        if (!asignacionExistente) {
          const { error: assignErr } = await adminClient.from('asignaciones_academicas').insert({
            id_docente: userId,
            id_materia: materia.id_materia,
            id_curso: curso.id_curso,
            id_institucion: idInstitucion,
            ano_lectivo: currentYear,
          });

          if (assignErr) {
            errors.push(
              `Fila ${lineNum} (${email}): No se pudo asignar '${materiaNombre}' en '${cursoNombreParsed}': ${assignErr.message}`
            );
          }
        }
      }
    }

    if (isNewUser) {
      successCount++;
    }
  }

  return {
    success: true,
    successCount,
    errorCount,
    errors,
  };
}
