'use server';

/**
 * @file src/app/actions/admin/admin-actions.ts
 * @description Server Actions exclusivas del rol ADMIN de Sophos Core.
 */

import { createClient } from '@/utils/supabase/server';
import { processBulkImport, BulkImportResult } from '@/services/adminService';

/**
 * Procesa una carga masiva de usuarios desde un archivo CSV.
 * Solo puede ser ejecutada por un usuario autenticado con rol ADMIN.
 *
 * @param formData - FormData con campo 'file' (CSV/TXT).
 * @returns Resumen de la importación con conteos de éxito y error.
 */
export async function bulkImportUsers(formData: FormData): Promise<BulkImportResult> {
  const supabase = await createClient();

  // ── Validar identidad y rol del ejecutor ─────────────────────────────────
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser) {
    return { error: 'Sesión no válida. Por favor, inicia sesión nuevamente.' };
  }

  const adminRol = adminUser.app_metadata?.rol;
  const idInstitucion = adminUser.app_metadata?.id_institucion;

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

  // ── Delegar lógica al servicio ───────────────────────────────────────────
  return processBulkImport(lines, idInstitucion);
}

/**
 * Crea un nuevo curso en la institución del administrador activo.
 */
export async function createCourse(nombre: string, jornada: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.rol !== 'ADMIN') {
    return { success: false, error: 'Acceso denegado. Solo administradores.' };
  }

  const id_institucion = user.app_metadata.id_institucion;
  if (!id_institucion) {
    return { success: false, error: 'La cuenta no tiene una institución vinculada.' };
  }

  const { data, error } = await supabase
    .from('cursos')
    .insert({
      id_institucion,
      nombre,
      jornada,
    })
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Crea una nueva materia en la institución del administrador activo.
 */
export async function createSubject(nombre: string, area: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.rol !== 'ADMIN') {
    return { success: false, error: 'Acceso denegado. Solo administradores.' };
  }

  const id_institucion = user.app_metadata.id_institucion;
  if (!id_institucion) {
    return { success: false, error: 'La cuenta no tiene una institución vinculada.' };
  }

  const { data, error } = await supabase
    .from('materias')
    .insert({
      id_institucion,
      nombre,
      area,
    })
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Obtiene los logs de uso de Inteligencia Artificial para la institución.
 */
export async function getIATokenLogs() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.rol !== 'ADMIN') {
    return { success: false, error: 'Acceso denegado. Solo administradores.' };
  }

  const idInstitucion = user.app_metadata.id_institucion;
  if (!idInstitucion) {
    return { success: false, error: 'La cuenta no tiene una institución vinculada.' };
  }

  const { data, error } = await supabase
    .from('logs_ia_tokens')
    .select('*')
    .eq('id_institucion', idInstitucion)
    .order('fecha_peticion', { ascending: false });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Sube el escudo/logotipo de la institución a Supabase Storage.
 */
export async function uploadInstitutionLogo(idInstitucion: string, base64Data: string, mimeType: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.rol !== 'ADMIN' || user.app_metadata?.id_institucion !== idInstitucion) {
    return { success: false, error: 'Acceso denegado.' };
  }

  const base64Content = base64Data.split(';base64,').pop();
  if (!base64Content) {
    return { success: false, error: 'Formato de imagen inválido.' };
  }
  const buffer = Buffer.from(base64Content, 'base64');

  const { createAdminClient } = await import('@/utils/supabase/admin');
  const adminClient = createAdminClient();
  const fileName = `${idInstitucion}/logo.png`;

  const { error } = await adminClient.storage
    .from('logos')
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  const { data: urlData } = adminClient.storage
    .from('logos')
    .getPublicUrl(fileName);

  const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Persistir la URL del logotipo en la tabla instituciones
  const { error: dbError } = await adminClient
    .from('instituciones')
    .update({ logo_url: logoUrl })
    .eq('id_institucion', idInstitucion);

  if (dbError) {
    console.error('[uploadInstitutionLogo] Error al actualizar logo_url en BD:', dbError);
  }

  return { success: true, logoUrl };
}

/**
 * Actualiza la información básica de la institución.
 */
export async function updateInstitutionInfo(nombreLegal: string, nit: string, dominio: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.rol !== 'ADMIN') {
    return { success: false, error: 'Acceso denegado.' };
  }

  const idInstitucion = user.app_metadata.id_institucion;
  if (!idInstitucion) {
    return { success: false, error: 'La cuenta no tiene una institución vinculada.' };
  }

  const { data, error } = await supabase
    .from('instituciones')
    .update({
      nombre_legal: nombreLegal,
      nit: nit,
      dominio_personalizado: dominio,
    })
    .eq('id_institucion', idInstitucion)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

const RESERVED_SUBDOMAINS = [
  'admin',
  'api',
  'app',
  'www',
  'soporte',
  'support',
  'dashboard',
  'auth',
  'mail',
  'email',
  'billing',
  'pagos',
  'root',
  'login',
  'signup',
  'registro',
  'portal',
  'test',
  'demo',
  'staging',
  'dev',
  'sophos',
  'sophoscore',
];

/**
 * Valida si un subdominio está disponible y cumple las reglas de formato.
 */
export async function checkSubdomainAvailability(subdominio: string): Promise<{ available: boolean; error?: string }> {
  const clean = subdominio.trim().toLowerCase();

  if (!clean || clean.length < 3) {
    return { available: false, error: 'El subdominio debe tener al menos 3 caracteres.' };
  }

  if (clean.length > 30) {
    return { available: false, error: 'El subdominio no puede superar los 30 caracteres.' };
  }

  if (!/^[a-z0-9-]+$/.test(clean)) {
    return { available: false, error: 'Solo se permiten letras minúsculas, números y guiones.' };
  }

  if (clean.startsWith('-') || clean.endsWith('-')) {
    return { available: false, error: 'El subdominio no puede comenzar ni terminar con un guión.' };
  }

  if (RESERVED_SUBDOMAINS.includes(clean)) {
    return { available: false, error: 'Este subdominio está reservado por el sistema.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('instituciones')
    .select('id_institucion')
    .eq('subdominio', clean)
    .maybeSingle();

  if (error) {
    return { available: false, error: 'Error al consultar disponibilidad.' };
  }

  if (data) {
    return { available: false, error: 'Este subdominio ya está en uso por otra institución.' };
  }

  return { available: true };
}

/**
 * Asigna de forma PERMANENTE e IRREVERSIBLE el subdominio a la institución (One-Time Setup).
 */
export async function assignInstitutionSubdomain(subdominio: string): Promise<{ success: boolean; error?: string; subdominio?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.rol !== 'ADMIN') {
    return { success: false, error: 'Acceso denegado. Se requieren permisos de Administrador.' };
  }

  const idInstitucion = user.app_metadata.id_institucion;
  if (!idInstitucion) {
    return { success: false, error: 'La cuenta no tiene una institución vinculada.' };
  }

  // 1. Verificar si la institución ya tiene bloqueado su subdominio
  const { data: inst, error: fetchError } = await supabase
    .from('instituciones')
    .select('subdominio, subdominio_bloqueado')
    .eq('id_institucion', idInstitucion)
    .single();

  if (fetchError || !inst) {
    return { success: false, error: 'No se pudo cargar la información de la institución.' };
  }

  if (inst.subdominio_bloqueado && inst.subdominio) {
    return {
      success: false,
      error: `El subdominio ya fue asignado previamente (${inst.subdominio}.sophoscore.com) y no puede ser modificado.`,
    };
  }

  // 2. Validar disponibilidad
  const check = await checkSubdomainAvailability(subdominio);
  if (!check.available) {
    return { success: false, error: check.error || 'Subdominio no válido.' };
  }

  const clean = subdominio.trim().toLowerCase();

  // 3. Asignar y bloquear
  const { error: updateError } = await supabase
    .from('instituciones')
    .update({
      subdominio: clean,
      subdominio_bloqueado: true,
    })
    .eq('id_institucion', idInstitucion);

  if (updateError) {
    return { success: false, error: `Error al guardar subdominio: ${updateError.message}` };
  }

  return { success: true, subdominio: clean };
}

/**
 * Obtiene la lista de administradores institucionales.
 */
export async function getInstitutionAdmins() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.rol !== 'ADMIN') {
    return { success: false, error: 'Acceso denegado.' };
  }

  const idInstitucion = user.app_metadata.id_institucion;
  if (!idInstitucion) {
    return { success: false, error: 'La cuenta no tiene una institución vinculada.' };
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id_institucion', idInstitucion)
    .eq('rol', 'ADMIN');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Crea un administrador adicional en Auth y en la tabla de usuarios.
 */
export async function createAdditionalAdmin(nombre: string, email: string, contrasena: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.rol !== 'ADMIN') {
    return { success: false, error: 'Acceso denegado.' };
  }

  const id_institucion = user.app_metadata.id_institucion;
  if (!id_institucion) {
    return { success: false, error: 'La cuenta no tiene una institución vinculada.' };
  }

  const { createAdminClient } = await import('@/utils/supabase/admin');
  const adminClient = createAdminClient();

  // 1. Crear el usuario en Supabase Auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: contrasena,
    email_confirm: true,
    app_metadata: {
      id_institucion: id_institucion,
      rol: 'ADMIN',
    },
    user_metadata: {
      nombre_completo: nombre,
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes('already registered')) {
      return { success: false, error: 'Este correo electrónico ya está registrado.' };
    }
    return { success: false, error: authError?.message || 'Error al registrar credenciales.' };
  }

  const newUserId = authData.user.id;

  // 2. Insertar en la tabla pública de usuarios
  const { error: dbError } = await adminClient.from('usuarios').insert({
    id_usuario: newUserId,
    email,
    nombre_completo: nombre,
    rol: 'ADMIN',
    id_institucion: id_institucion,
  });

  if (dbError) {
    // Si falla la inserción en BD, limpiar el usuario de Auth para consistencia
    await adminClient.auth.admin.deleteUser(newUserId);
    return { success: false, error: dbError.message };
  }

  return { success: true, userId: newUserId };
}
