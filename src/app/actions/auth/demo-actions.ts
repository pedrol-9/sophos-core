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
        return { success: true, redirectPath };
      }

      return {
        success: false,
        error: `No se pudo autenticar con ${account.email}. Por favor verifica que el usuario exista en tu proyecto de Supabase.`,
      };
    }

    // 3. Asegurar que el registro exista en la tabla pública 'usuarios'
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

    return { success: true, redirectPath };
  } catch (err: any) {
    console.error('[loginAsDemo] Error:', err);
    return { success: false, error: err?.message || 'Error inesperado al autenticar cuenta demo.' };
  }
}
