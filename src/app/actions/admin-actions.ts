'use server';

/**
 * @file src/app/actions/admin-actions.ts
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
