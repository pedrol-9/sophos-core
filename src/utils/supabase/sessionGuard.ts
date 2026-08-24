/**
 * @file src/utils/supabase/sessionGuard.ts
 * @description Guardia de sesión, enrutador por roles y router multi-tenant de Supabase para Next.js.
 *
 * Implementa la lógica recomendada por @supabase/ssr para interceptar solicitudes,
 * renovar tokens expirados mediante cookies, resolver subdominios institucionales
 * (*.sophoscore.com o /[subdomain]/...) y manejar la redirección de rutas protegidas/públicas.
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

const SYSTEM_SLUGS = [
  'dashboard',
  'login',
  'signup',
  'auth',
  'api',
  'change-password',
  '_next',
  'favicon.ico',
  'ver_diagrama.html',
];

const RESERVED_HOST_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'mail',
  'auth',
  'localhost',
];

/**
 * Extrae el subdominio institucional ya sea del Host (ej: carbonell.sophoscore.com)
 * o del primer segmento del path (ej: /carbonell/dashboard).
 */
function resolveSubdomain(request: NextRequest): {
  subdomain: string | null;
  isPathBased: boolean;
  effectivePathname: string;
} {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();
  const rawPathname = request.nextUrl.pathname;

  // 1. Detección por Host (ej: carbonell.sophoscore.com o carbonell.localhost)
  if (hostname.includes('.sophoscore.com') || hostname.includes('.localhost')) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const candidate = parts[0];
      if (!RESERVED_HOST_SUBDOMAINS.includes(candidate) && /^[a-z0-9-]+$/.test(candidate)) {
        return {
          subdomain: candidate,
          isPathBased: false,
          effectivePathname: rawPathname,
        };
      }
    }
  }

  // 2. Detección por Path (ej: /carbonell o /carbonell/dashboard o /carbonell/login)
  const segments = rawPathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const firstSegment = segments[0].toLowerCase();
    if (
      !SYSTEM_SLUGS.includes(firstSegment) &&
      /^[a-z0-9-]+$/.test(firstSegment) &&
      firstSegment.length >= 3 &&
      !firstSegment.includes('.')
    ) {
      const rest = '/' + segments.slice(1).join('/');
      const mappedPath = rest === '/' ? '/dashboard' : rest;
      return {
        subdomain: firstSegment,
        isPathBased: true,
        effectivePathname: mappedPath,
      };
    }
  }

  return {
    subdomain: null,
    isPathBased: false,
    effectivePathname: rawPathname,
  };
}

/**
 * Actualiza la sesión activa del usuario y aplica reglas de redirección y multi-tenant.
 */
export async function updateSession(request: NextRequest) {
  const { subdomain, isPathBased, effectivePathname } = resolveSubdomain(request);

  // Inyectar cabeceras personalizadas de subdominio
  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set('x-subdomain', subdomain);
  }

  // Si la ruta venía por path (/carbonell/dashboard), hacemos rewrite interno a /dashboard
  let supabaseResponse = isPathBased
    ? NextResponse.rewrite(new URL(effectivePathname, request.url), {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({
        request: { headers: requestHeaders },
      });

  if (subdomain) {
    supabaseResponse.cookies.set('sophos_subdomain', subdomain, {
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // Accesible por cliente si se requiere
    });
  }

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          // Preservar rewrite o next response
          supabaseResponse = isPathBased
            ? NextResponse.rewrite(new URL(effectivePathname, request.url), {
                request: { headers: requestHeaders },
              })
            : NextResponse.next({
                request: { headers: requestHeaders },
              });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );

          if (subdomain) {
            supabaseResponse.cookies.set('sophos_subdomain', subdomain, {
              path: '/',
              sameSite: 'lax',
            });
          }
        },
      },
    }
  );

  // 3. Obtener el usuario actual (refresca la sesión/token si es necesario).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── CONTROL DE INACTIVIDAD (30 MINUTOS) ───────────────────────────────────
  const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
  const lastActiveCookie = request.cookies.get('sophos_last_active')?.value;
  const now = Date.now();

  if (user) {
    if (lastActiveCookie && now - parseInt(lastActiveCookie, 10) > INACTIVITY_TIMEOUT_MS) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('message', 'session_expired');
      
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.cookies.delete('sophos_last_active');
      return redirectResponse;
    } else {
      supabaseResponse.cookies.set('sophos_last_active', now.toString(), {
        path: '/',
        maxAge: 60 * 60 * 24,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  } else {
    if (lastActiveCookie) {
      supabaseResponse.cookies.delete('sophos_last_active');
    }
  }

  const pathname = effectivePathname;

  // ─── REDIRECCIÓN DE RAÍZ EN SUBDOMINIOS DE HOST ──────────────────────────
  // Si alguien entra a carbonell.sophoscore.com/ (raíz), llevar a /login o a su dashboard
  if (subdomain && !isPathBased && pathname === '/') {
    if (user) {
      const rol = (user?.app_metadata?.rol as string | undefined)?.toUpperCase();
      const targetWorkspace = rol ? (ROL_WORKSPACE[rol] ?? '/dashboard/admin') : '/dashboard/admin';
      const url = request.nextUrl.clone();
      url.pathname = targetWorkspace;
      return NextResponse.redirect(url);
    } else {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

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

  // Extraer metadatos de rol del JWT
  const rol = (user?.app_metadata?.rol as string | undefined)?.toUpperCase();
  const targetWorkspace = rol ? (ROL_WORKSPACE[rol] ?? '/dashboard/admin') : '/dashboard/admin';

  // ─── CONTROL DE EXPIRACIÓN DE SUSCRIPCIÓN ────────────────────────────────
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

    // 7. Control de fronteras de rol
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

  return supabaseResponse;
}
