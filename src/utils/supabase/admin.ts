/**
 * @file src/utils/supabase/admin.ts
 * @description Cliente Supabase con privilegios de Administrador (service_role).
 *
 * IMPORTANTE: Este cliente bypasea las políticas de Row Level Security (RLS).
 * Úsalo ÚNICAMENTE en Server Actions y Route Handlers donde la identidad del
 * ejecutor haya sido validada previamente.
 *
 * NUNCA importes este módulo desde Client Components ('use client').
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Instancia un cliente Supabase con la service_role_key.
 * Desactiva la persistencia de sesión ya que opera en el servidor sin contexto de usuario.
 *
 * @returns Cliente Supabase con permisos de administrador.
 * @throws {Error} Si las variables de entorno requeridas no están configuradas.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[Sophos Core] NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas. ' +
      'Asegúrate de que estén definidas en tu archivo .env.local.'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      // Desactivar para evitar intentos de refresco de token en el servidor
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
