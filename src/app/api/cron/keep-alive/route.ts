import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Route Handler ejecutado periódicamente por Vercel Cron para mantener activo
 * el proyecto en el plan gratuito de Supabase (evitar que se pause por inactividad).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization');
  const queryKey = searchParams.get('key');

  // Validar secreto si CRON_SECRET está configurado en el entorno
  if (process.env.CRON_SECRET) {
    const isHeaderValid = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isQueryValid = queryKey === process.env.CRON_SECRET;
    if (!isHeaderValid && !isQueryValid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
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
