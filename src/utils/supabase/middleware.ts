/**
 * @file src/utils/supabase/middleware.ts
 * @description Middleware de Supabase para refrescar la sesión del usuario en Next.js (App Router).
 * 
 * Implementa la lógica recomendada por @supabase/ssr para interceptar solicitudes,
 * renovar tokens expirados mediante cookies y manejar la redirección de rutas protegidas/públicas.
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Actualiza la sesión activa del usuario y aplica reglas de redirección para protección de rutas.
 * 
 * @param {NextRequest} request - Objeto de solicitud de Next.js Middleware.
 * @returns {Promise<NextResponse>} Respuesta con cookies actualizadas o redirección de ruta.
 */
export async function updateSession(request: NextRequest) {
  // 1. Crear una respuesta inicial basada en la solicitud entrante
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 2. Instanciar el cliente de Supabase para el middleware usando cookies de la solicitud/respuesta
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Actualizar las cookies en la solicitud para que los Server Components posteriores las lean
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          
          // Crear una nueva respuesta e inyectarle las cookies actualizadas para guardarlas en el navegador
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Obtener el usuario actual. Esto refresca automáticamente la sesión/token si es necesario y seguro.
  // IMPORTANTE: Se debe usar getUser() en lugar de getSession() por motivos de seguridad y validación real.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Definición de rutas protegidas y de autenticación
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');

  // 4. Redirección si el usuario no está autenticado e intenta acceder a una ruta protegida
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Si viene de una página específica del dashboard, la guardamos en query param para redirección posterior
    if (pathname !== '/dashboard') {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }

  // 5. Redirección si el usuario ya está autenticado e intenta acceder al login/signup
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Retornar la respuesta con las cookies refrescadas
  return supabaseResponse;
}
