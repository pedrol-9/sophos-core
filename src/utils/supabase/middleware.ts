/**
 * @file src/utils/supabase/middleware.ts
 * @description Middleware de Supabase para refrescar la sesión del usuario en Next.js (App Router).
 *
 * Implementa la lógica recomendada por @supabase/ssr para interceptar solicitudes,
 * renovar tokens expirados mediante cookies y manejar la redirección de rutas protegidas/públicas.
 *
 * Incluye redirección elástica por rol (ADMIN, DOCENTE, ESTUDIANTE, ACUDIENTE) leyendo
 * los app_metadata del JWT sin consultas adicionales a la base de datos.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Mapping de rol a workspace de destino
const ROL_WORKSPACE: Record<string, string> = {
  ADMIN: '/dashboard/admin',
  DOCENTE: '/dashboard/docente',
  ESTUDIANTE: '/dashboard/estudiante',
  ACUDIENTE: '/dashboard/acudiente',
};

/**
 * Actualiza la sesión activa del usuario y aplica reglas de redirección por rol.
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

  // 3. Obtener el usuario actual (refresca la sesión/token si es necesario).
  // IMPORTANTE: Usar getUser() en lugar de getSession() por seguridad y validación real.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Extraer metadatos de rol del JWT (sin consulta adicional a DB)
  const rol = (user?.app_metadata?.rol as string | undefined)?.toUpperCase();
  const targetWorkspace = rol ? (ROL_WORKSPACE[rol] ?? '/dashboard/admin') : null;

  // Clasificar la ruta actual
  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup');
  const isDashboardRoot = pathname === '/dashboard';

  // 4. Usuario NO autenticado intentando acceder a ruta protegida → login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/dashboard') {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }

  if (user && targetWorkspace) {
    // 5. Usuario autenticado intentando entrar al login/signup → su workspace
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = targetWorkspace;
      return NextResponse.redirect(url);
    }

    // 6. Usuario autenticado en raíz de /dashboard → su workspace específico
    if (isDashboardRoot) {
      const url = request.nextUrl.clone();
      url.pathname = targetWorkspace;
      return NextResponse.redirect(url);
    }

    // 7. Control de fronteras de rol: bloquear acceso cruzado a workspaces ajenos
    // Permite rutas que empiecen con el workspace correcto o rutas compartidas (/dashboard/profile, etc.)
    const isInOwnWorkspace = pathname.startsWith(targetWorkspace);
    const isSharedDashboardRoute =
      !pathname.startsWith('/dashboard/admin') &&
      !pathname.startsWith('/dashboard/docente') &&
      !pathname.startsWith('/dashboard/estudiante') &&
      !pathname.startsWith('/dashboard/acudiente');

    if (isProtectedRoute && !isInOwnWorkspace && !isSharedDashboardRoute) {
      const url = request.nextUrl.clone();
      url.pathname = targetWorkspace;
      return NextResponse.redirect(url);
    }
  }

  // Retornar la respuesta con las cookies refrescadas
  return supabaseResponse;
}

