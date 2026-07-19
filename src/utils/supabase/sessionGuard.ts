/**
 * @file src/utils/supabase/sessionGuard.ts
 * @description Guardia de sesión y enrutador por roles de Supabase para Next.js.
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
  SUPER_ADMIN: '/dashboard/super-admin',
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  // 2. Instanciar el cliente de Supabase para el middleware usando cookies de la solicitud/respuesta
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── CONTROL DE INACTIVIDAD (30 MINUTOS) ───────────────────────────────────
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
  const lastActiveCookie = request.cookies.get('sophos_last_active')?.value;
  const now = Date.now();

  if (user) {
    if (lastActiveCookie && now - parseInt(lastActiveCookie, 10) > INACTIVITY_TIMEOUT_MS) {
      // Sesión expirada por inactividad
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('message', 'session_expired');
      
      const redirectResponse = NextResponse.redirect(url);
      // Limpiar la cookie de inactividad
      redirectResponse.cookies.delete('sophos_last_active');
      return redirectResponse;
    } else {
      // Actualizar la marca de tiempo de actividad
      supabaseResponse.cookies.set('sophos_last_active', now.toString(), {
        path: '/',
        maxAge: 60 * 60 * 24, // 1 día (suficiente para evaluar inactividad)
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  const pathname = request.nextUrl.pathname;

  // ─── CONTROL DE CAMBIO DE CONTRASEÑA OBLIGATORIO ─────────────────────────
  const mustChangePassword = user?.app_metadata?.must_change_password === true;
  const isChangePasswordRoute = pathname === '/change-password';

  if (!user && isChangePasswordRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && mustChangePassword && !isChangePasswordRoute) {
    const isNextAsset = pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname === '/favicon.ico';
    if (!isNextAsset) {
      const url = request.nextUrl.clone();
      url.pathname = '/change-password';
      return NextResponse.redirect(url);
    }
  }

  // Extraer metadatos de rol del JWT (sin consulta adicional a DB)
  const rol = (user?.app_metadata?.rol as string | undefined)?.toUpperCase();
  const targetWorkspace = rol ? (ROL_WORKSPACE[rol] ?? '/dashboard/admin') : '/dashboard/admin';

  // ─── CONTROL DE EXPIRACIÓN DE SUSCRIPCIÓN (Wompi) ────────────────────────
  // Solo aplica a ADMIN con colegio, SUPER_ADMIN nunca es bloqueado
  if (user && rol === 'ADMIN' && pathname.startsWith('/dashboard/admin')) {
    const fechaExpiracionRaw = user.app_metadata?.fecha_expiracion as string | undefined;
    if (fechaExpiracionRaw) {
      const expiracion = new Date(fechaExpiracionRaw);
      const estaVencida = new Date() > expiracion;
      const isRenovacionRoute = request.nextUrl.searchParams.has('suscripcion');

      if (estaVencida && !isRenovacionRoute && pathname !== '/dashboard/admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/admin';
        url.searchParams.set('suscripcion', 'vencida');
        return NextResponse.redirect(url);
      }
    }
  }

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
      !pathname.startsWith('/dashboard/super-admin') &&
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

