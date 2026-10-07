'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { DEMO_ACCOUNTS, DEMO_PASSWORD_DEFAULT } from '@/config/demo-accounts';

export async function exitDemoMode(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('sophos_demo_mode');
}

export async function loginAsDemo(roleId: string): Promise<{
  success: boolean;
  error?: string;
  redirectPath?: string;
}> {
  const account = DEMO_ACCOUNTS.find((a) => a.id === roleId);
  if (!account) {
    return { success: false, error: 'Rol de demostración no válido.' };
  }

  let redirectPath = '/dashboard/admin';
  if (account.role === 'DOCENTE') redirectPath = '/dashboard/docente';
  else if (account.role === 'ESTUDIANTE') redirectPath = '/dashboard/estudiante';
  else if (account.role === 'ACUDIENTE') redirectPath = '/dashboard/acudiente';

  try {
    const supabase = await createClient();

    // 1. Intento directo de autenticación estándar
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    // 2. Si las credenciales fallan o el usuario no existe, crearlo con signUp estándar
    if (signInError || !signInData.user) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          data: {
            nombre_completo: account.subtitle,
            rol: account.role,
            id_institucion: '00000000-0000-0000-0000-000000000001',
          },
        },
      });

      if (!signUpError) {
        // Reintentar login inmediatamente tras el registro
        const retry = await supabase.auth.signInWithPassword({
          email: account.email,
          password: account.password,
        });
        signInData = retry.data;
        signInError = retry.error;
      }
    }

    if (signInError || !signInData?.user) {
      // Si la contraseña remota difiere, intentar contraseña alternativa por defecto
      const fallback = await supabase.auth.signInWithPassword({
        email: account.email,
        password: DEMO_PASSWORD_DEFAULT,
      });

      if (!fallback.error && fallback.data.user) {
        signInData = fallback.data;
        signInError = null;
      } else {
        return {
          success: false,
          error: `No se pudo autenticar con ${account.email}. Por favor verifica que el usuario exista en tu proyecto de Supabase.`,
        };
      }
    }

    // 3. Garantizar que la cuenta demo tenga must_change_password: false
    try {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(signInData.user.id, {
        app_metadata: {
          id_institucion: '00000000-0000-0000-0000-000000000001',
          rol: account.role,
          must_change_password: false,
        },
      });
      await supabase.auth.refreshSession();
    } catch (adminErr: any) {
      console.warn('[loginAsDemo] Non-blocking metadata sync warning:', adminErr?.message);
    }

    // 4. Asegurar que el registro exista en la tabla pública 'usuarios'
    try {
      await supabase.from('usuarios').upsert({
        id_usuario: signInData.user.id,
        email: account.email,
        nombre_completo: account.subtitle,
        rol: account.role,
        id_institucion: '00000000-0000-0000-0000-000000000001',
      });
    } catch {
      // No bloqueante si las políticas RLS restringen inserción directa
    }

    // 5. Establecer la cookie indicando que se encuentra en Modo Demo activo
    const cookieStore = await cookies();
    cookieStore.set('sophos_demo_mode', 'true', {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 horas
    });

    return { success: true, redirectPath };
  } catch (err: any) {
    console.error('[loginAsDemo] Error:', err);
    return { success: false, error: err?.message || 'Error inesperado al autenticar cuenta demo.' };
  }
}

