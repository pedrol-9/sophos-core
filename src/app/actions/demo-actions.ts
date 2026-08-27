'use server';

import { createAdminClient } from '@/utils/supabase/admin';
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

  try {
    const adminClient = createAdminClient();
    const FIXED_INST_ID = '00000000-0000-0000-0000-000000000001';

    // 1. Asegurar que la institución demo exista
    await adminClient.from('instituciones').upsert({
      id_institucion: FIXED_INST_ID,
      nombre_legal: 'IE Jose María Carbonell',
      nit: '900.123.456-7',
      dominio_personalizado: 'jm-carbonell.edu.co',
      estado_suscripcion: 'PRUEBA',
    });

    // 2. Localizar o auto-aprovisionar el usuario en Auth
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === account.email.toLowerCase()
    );

    if (!existingUser) {
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

      if (createError || !newUser?.user) {
        return { success: false, error: `Error creando usuario demo: ${createError?.message || 'Error desconocido'}` };
      }

      await adminClient.from('usuarios').upsert({
        id_usuario: newUser.user.id,
        email: account.email,
        nombre_completo: account.subtitle,
        rol: account.role,
        id_institucion: FIXED_INST_ID,
      });
    } else {
      // Sincronizar contraseña y asegurar must_change_password: false
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        password: DEMO_PASSWORD_DEFAULT,
        email_confirm: true,
        app_metadata: {
          id_institucion: FIXED_INST_ID,
          rol: account.role,
          must_change_password: false,
        },
      });

      await adminClient.from('usuarios').upsert({
        id_usuario: existingUser.id,
        email: account.email,
        nombre_completo: account.subtitle,
        rol: account.role,
        id_institucion: FIXED_INST_ID,
      });
    }

    // 3. Autenticación en el cliente de sesión SSR
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: DEMO_PASSWORD_DEFAULT,
    });

    if (signInError) {
      return { success: false, error: `Fallo al iniciar sesión: ${signInError.message}` };
    }

    let redirectPath = '/dashboard/admin';
    if (account.role === 'DOCENTE') redirectPath = '/dashboard/docente';
    else if (account.role === 'ESTUDIANTE') redirectPath = '/dashboard/estudiante';
    else if (account.role === 'ACUDIENTE') redirectPath = '/dashboard/acudiente';

    return { success: true, redirectPath };
  } catch (err: any) {
    console.error('[loginAsDemo] Error:', err);
    return { success: false, error: err?.message || 'Error en el servidor al autenticar cuenta demo.' };
  }
}
