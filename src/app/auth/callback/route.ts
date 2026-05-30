/**
 * @file src/app/auth/callback/route.ts
 * @description Manejador de la ruta de callback para el intercambio de códigos de autenticación de Supabase.
 * 
 * Intercepta solicitudes GET que contengan el parámetro `code` (provisto por enlaces de correo o OAuth),
 * lo intercambia por una sesión activa de cookies mediante el cliente servidor y redirige al usuario.
 * 
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  // 'next' especifica a dónde redirigir al usuario tras una autenticación exitosa (por defecto /dashboard)
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    // Intercambiar el código temporal por una sesión de Supabase (escribe la cookie)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Redirección segura usando URL relativa resuelta contra el origen del request
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Redirigir de regreso al login indicando un error si falla el intercambio de código
  return NextResponse.redirect(new URL('/login?error=auth-code-error', request.url));
}
