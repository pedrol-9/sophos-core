'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/utils/supabase/server';
import { DEMO_ACCOUNTS, DEMO_PASSWORD_DEFAULT } from '@/config/demo-accounts';

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
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (!signInError && signInData.user) {
      return { success: true, redirectPath };
    }

    // 2. Si las credenciales fallan o el usuario no existe, intentar auto-aprovisionar con adminClient
    try {
      const { createAdminClient } = await import('@/utils/supabase/admin');
      const adminClient = createAdminClient();
      const FIXED_INST_ID = '00000000-0000-0000-0000-000000000001';

      // Asegurar que la institución demo exista
      await adminClient.from('instituciones').upsert({
        id_institucion: FIXED_INST_ID,
        nombre_legal: 'IE Jose María Carbonell',
        nit: '900.123.456-7',
        dominio_personalizado: 'jm-carbonell.edu.co',
        estado_suscripcion: 'PRUEBA',
      });

      // Crear usuario vía admin
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: account.email,
        password: DEMO_PASSWORD_DEFAULT,
        email_confirm: true,
        app_metadata: {
          id_institucion: FIXED_INST_ID,
          rol: account.role,
          must_change_password: false,
        },
        user_metadata: {
          nombre_completo: account.subtitle,
        },
      });

      if (!createError && newUser?.user) {
        await adminClient.from('usuarios').upsert({
          id_usuario: newUser.user.id,
          email: account.email,
          nombre_completo: account.subtitle,
          rol: account.role,
          id_institucion: FIXED_INST_ID,
        });
      }
    } catch (adminErr: any) {
      console.warn('[loginAsDemo] Admin provisioning skipped:', adminErr?.message);

      // Si falla adminClient (por ejemplo, legacy key policy), intentar registro directo
      try {
        await supabase.auth.signUp({
          email: account.email,
          password: DEMO_PASSWORD_DEFAULT,
          options: {
            data: {
              nombre_completo: account.subtitle,
            },
          },
        });
      } catch (signUpErr) {
        console.warn('[loginAsDemo] SignUp fallback failed:', signUpErr);
      }
    }

    // 3. Re-intentar inicio de sesión
    const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });

    if (retryError || !retryData.user) {
      return {
        success: false,
        error: `No se pudo iniciar sesión con la cuenta de ${account.title} (${account.email}). Verifica que el usuario exista en tu proyecto de Supabase.`,
      };
    }

    return { success: true, redirectPath };
  } catch (err: any) {
    console.error('[loginAsDemo] Unexpected error:', err);
    return { success: false, error: err?.message || 'Error inesperado al autenticar cuenta demo.' };
  }
}
