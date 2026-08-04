import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Route Handler ejecutado periódicamente por Vercel Cron para mantener activo
 * el proyecto en el plan gratuito de Supabase (evitar que se pause por inactividad).
 */
export async function GET(request: Request) {
  // 1. Validar la clave secreta enviada por Vercel Cron (si existe CRON_SECRET en Vercel)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // 2. Realizar una consulta HEAD liviana para generar tráfico a la API/BD de Supabase
    const { count, error } = await supabase
      .from('instituciones')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[Cron Keep-Alive] Error al consultar Supabase:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Ping a Supabase realizado exitosamente',
      timestamp: new Date().toISOString(),
      institucionesCount: count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[Cron Keep-Alive] Error inesperado:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
