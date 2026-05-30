'use server';

/**
 * @file src/app/actions/auth-actions.ts
 * @description Server Actions para el flujo de autenticación y registro de Sophos Core.
 *
 * registerInstitution: Registra una nueva institución educativa (tenant) en estado PRUEBA,
 * crea el usuario administrador en Supabase Auth con los metadatos de rol e id_institucion
 * inyectados en app_metadata (disponibles en el JWT), inserta el perfil público y
 * autentica al usuario inmediatamente en la sesión actual.
 */

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type RegisterState = {
  error?: string;
  success?: boolean;
};

// ─── ACTION ──────────────────────────────────────────────────────────────────

/**
 * Registra una nueva institución educativa y su administrador inicial.
 *
 * Flujo:
 * 1. Inserta la institución en estado 'PRUEBA' → obtiene id_institucion.
 * 2. Crea el usuario en auth.users con app_metadata {id_institucion, rol: 'ADMIN'}.
 * 3. Inserta el perfil en la tabla pública 'usuarios'.
 * 4. Autentica al administrador en la sesión cookie actual.
 * 5. Redirige al workspace del administrador.
 *
 * Si cualquier paso falla, ejecuta rollback manual de los pasos anteriores.
 */
export async function registerInstitution(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const nombreLegal = (formData.get('nombre_legal') as string)?.trim();
  const nit = (formData.get('nit') as string)?.trim();
  const dominio = (formData.get('dominio') as string)?.trim() || null;
  const nombreAdmin = (formData.get('nombre_admin') as string)?.trim();
  const emailAdmin = (formData.get('email_admin') as string)?.trim();
  const password = (formData.get('contrasena') as string)?.trim();

  // Validación básica de campos requeridos
  if (!nombreLegal || !nit || !emailAdmin || !password || !nombreAdmin) {
    return { error: 'Todos los campos marcados como obligatorios deben completarse.' };
  }

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  }

  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // ── PASO 1: Crear la institución ──────────────────────────────────────────
    const { data: inst, error: instError } = await supabase
      .from('instituciones')
      .insert({
        nombre_legal: nombreLegal,
        nit: nit,
        dominio_personalizado: dominio,
        estado_suscripcion: 'PRUEBA',
      })
      .select('id_institucion')
      .single();

    if (instError || !inst) {
      // NIT duplicado es el error más probable (unique constraint)
      if (instError?.code === '23505') {
        return { error: 'Ya existe una institución registrada con ese NIT.' };
      }
      return { error: `Error al crear la institución: ${instError?.message}` };
    }

    const idInstitucion = inst.id_institucion;

    // ── PASO 2: Crear usuario en Supabase Auth con metadatos de rol ───────────
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: emailAdmin,
      password: password,
      email_confirm: true, // Supabase Auth tiene "Confirm email" desactivado en el proyecto
      app_metadata: {
        id_institucion: idInstitucion,
        rol: 'ADMIN',
      },
      user_metadata: {
        nombre_completo: nombreAdmin,
      },
    });

    if (authError || !authData.user) {
      // Rollback de la institución
      await supabase
        .from('instituciones')
        .delete()
        .eq('id_institucion', idInstitucion);

      if (authError?.message?.includes('already registered')) {
        return { error: 'Este correo electrónico ya está registrado en el sistema.' };
      }
      return { error: `Error al crear las credenciales de acceso: ${authError?.message}` };
    }

    const newUserId = authData.user.id;

    // ── PASO 3: Insertar perfil público ───────────────────────────────────────
    const { error: userError } = await supabase.from('usuarios').insert({
      id_usuario: newUserId,
      email: emailAdmin,
      nombre_completo: nombreAdmin,
      rol: 'ADMIN',
      id_institucion: idInstitucion,
    });

    if (userError) {
      // Rollback del usuario en auth y de la institución
      await adminClient.auth.admin.deleteUser(newUserId);
      await supabase
        .from('instituciones')
        .delete()
        .eq('id_institucion', idInstitucion);
      return { error: `Error al crear el perfil de usuario: ${userError.message}` };
    }

    // ── PASO 4: Autenticar la sesión del nuevo administrador ──────────────────
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: emailAdmin,
      password: password,
    });

    if (loginError) {
      // La cuenta fue creada, pero el login falló — informar al usuario
      return {
        error:
          'La institución fue registrada correctamente, pero ocurrió un error al iniciar sesión automáticamente. Por favor, ingresa en /login manualmente.',
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
    return { error: message };
  }

  // ── PASO 5: Redirigir al workspace de Admin ───────────────────────────────
  // redirect() debe invocarse fuera del bloque try/catch ya que lanza internamente
  redirect('/dashboard/admin');
}
