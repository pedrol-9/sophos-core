/**
 * @file src/proxy.ts
 * @description Proxy principal de Next.js (anteriormente Middleware).
 * 
 * Intercepta todas las solicitudes del cliente y ejecuta el flujo de autenticación y
 * actualización de sesión de Supabase.
 */

import { type NextRequest } from 'next/server';
import { updateSession } from './utils/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas de solicitud excepto para las que comienzan con:
     * - _next/static (archivos estáticos)
     * - _next/image (servicios de optimización de imágenes)
     * - favicon.ico (icono de la pestaña del navegador)
     * - Imágenes/archivos con extensiones comunes (.svg, .png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
