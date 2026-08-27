'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * @file src/app/actions/auth/auth-actions.ts
 * @description Server Actions para el flujo de autenticación y registro de Sophos Core.
 */

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { createInstitutionAndAdmin, removeMustChangePasswordFlag } from '@/services/authService';

export type RegisterState = {
  error?: string;
  success?: boolean;
};

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

  if (!nombreLegal || !nit || !emailAdmin || !password || !nombreAdmin) {
    return { error: 'Todos los campos marcados como obligatorios deben completarse.' };
  }

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  }

  try {
    await createInstitutionAndAdmin(nombreLegal, nit, dominio, nombreAdmin, emailAdmin, password);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
    return { error: message };
  }

  redirect('/dashboard/admin');
}

export async function changeUserPassword(
  prevState: any,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const password = (formData.get('password') as string)?.trim();
  const confirmPassword = (formData.get('confirm_password') as string)?.trim();

  if (!password || !confirmPassword) {
    return { error: 'Ambas contraseñas son obligatorias.' };
  }

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Las contraseñas ingresadas no coinciden.' };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Sesión no válida. Por favor, inicia sesión nuevamente.' };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      return { error: `Error al actualizar la contraseña: ${updateError.message}` };
    }

    await removeMustChangePasswordFlag(user.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
    return { error: message };
  }

  redirect('/dashboard');
}
