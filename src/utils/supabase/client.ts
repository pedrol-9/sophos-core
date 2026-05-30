/**
 * @file src/utils/supabase/client.ts
 * @description Cliente de Supabase para Client Components (lado del navegador).
 * 
 * Utiliza createBrowserClient de @supabase/ssr para interactuar con la base de datos y
 * la autenticación desde componentes del lado del cliente.
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

/**
 * Crea una instancia del cliente Supabase del lado del cliente/navegador.
 * Utiliza de forma segura las variables de entorno expuestas al navegador (NEXT_PUBLIC_).
 * 
 * @returns Instancia tipada del cliente Supabase para componentes del navegador.
 * 
 * @example
 * 'use client'
 * import { createClient } from '@/utils/supabase/client';
 * 
 * const supabase = createClient();
 * const handleLogin = async () => {
 *   await supabase.auth.signInWithPassword({ email, password });
 * };
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
