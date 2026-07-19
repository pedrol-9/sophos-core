/**
 * @file src/utils/supabase/server.ts
 * @description Cliente de Supabase para Server Components y Server Actions de Next.js.
 *
 * Implementa el manejo transaccional de cookies requerido por @supabase/ssr para
 * garantizar que las sesiones de usuario persistan correctamente en el servidor
 * (SSR, RSC, Route Handlers, Middleware).
 *
 * IMPORTANTE: Este archivo debe importarse ÚNICAMENTE en contextos de servidor.
 * Para Client Components, usar el cliente de Supabase del lado del cliente.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Crea una instancia del cliente Supabase configurada para el entorno de servidor
 * de Next.js con manejo completo del ciclo de vida de cookies.
 *
 * El cliente resultante soporta:
 * - Lectura de sesión desde cookies HttpOnly (get)
 * - Escritura/renovación de tokens de acceso (set)
 * - Eliminación de sesión durante logout (remove)
 *
 * @returns {Promise<SupabaseClient>} Instancia del cliente Supabase lista para uso en servidor.
 *
 * @example
 * // En un Server Component:
 * const supabase = await createClient();
 * const { data: { user } } = await supabase.auth.getUser();
 *
 * @example
 * // En un Route Handler:
 * export async function GET() {
 *   const supabase = await createClient();
 *   const { data, error } = await supabase.from('cursos').select('*');
 *   return NextResponse.json({ data, error });
 * }
 */
export async function createClient() {
  // cookieStore es una API asíncrona en Next.js 15+ — se debe awaitar
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        /**
         * Lee una cookie por nombre desde el almacén de cookies del request.
         * Supabase utiliza esto para recuperar la sesión activa del usuario.
         */
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        /**
         * Escribe una cookie en el response. Supabase lo invoca al renovar
         * tokens de acceso o al iniciar sesión desde el servidor.
         *
         * Next.js 15+ permite escritura directa en Server Actions y Route Handlers.
         * En Server Components de solo lectura, esta operación es ignorada por el runtime.
         */
        set(name: string, value: string, options: Parameters<typeof cookieStore.set>[2]) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Ignorado intencionalmente: en Server Components de solo lectura
            // el runtime lanza un error si se intenta escribir cookies.
            // El Middleware de autenticación se encarga de la renovación en esos casos.
          }
        },

        /**
         * Elimina una cookie estableciendo su valor a vacío y expiración inmediata.
         * Supabase lo invoca al cerrar sesión (signOut).
         */
        remove(name: string, options: Parameters<typeof cookieStore.set>[2]) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch {
            // Ignorado intencionalmente — mismo razonamiento que el método set().
          }
        },
      },
      global: {
        fetch: (input, init) => {
          return fetch(input, {
            ...init,
            cache: 'no-store',
          });
        },
      },
    }
  );
}
