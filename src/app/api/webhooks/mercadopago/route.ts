import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Cliente admin de Supabase (bypasea RLS para escrituras críticas del webhook)
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Inicializar cliente de Mercado Pago
function getMercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'placeholder-access-token',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const searchParams = request.nextUrl.searchParams;

    // Obtener ID del pago desde el cuerpo o los query params
    const paymentIdRaw = body?.data?.id || body?.id || searchParams.get('data.id') || searchParams.get('id');
    const type = body?.type || searchParams.get('type');

    // Mercado Pago envía notificaciones de varios tipos. Solo nos interesa 'payment'
    if (type !== 'payment' && !paymentIdRaw) {
      return NextResponse.json({ received: true, message: 'Notificación ignorada.' });
    }

    const paymentId = String(paymentIdRaw);
    console.log(`[mercadopago-webhook] Procesando pago ID: ${paymentId}`);

    // 1. Consultar el estado del pago directamente en la API de Mercado Pago (Seguridad activa)
    const mpClient = getMercadoPagoClient();
    const paymentClient = new Payment(mpClient);
    const paymentDetails = await paymentClient.get({ id: paymentId });

    const reference = paymentDetails.external_reference;
    const status = paymentDetails.status; // approved | rejected | pending | etc.

    if (!reference) {
      console.warn(`[mercadopago-webhook] El pago ${paymentId} no contiene external_reference.`);
      return NextResponse.json({ received: true, message: 'Sin referencia externa.' });
    }

    // 2. Buscar la transacción en nuestra base de datos
    const supabase = getAdminClient();
    const { data: txRecord, error: txError } = await supabase
      .from('transacciones_mercadopago')
      .select('*')
      .eq('referencia_mercadopago', reference)
      .single();

    if (txError || !txRecord) {
      console.warn(`[mercadopago-webhook] Referencia no encontrada en BD: ${reference}`);
      return NextResponse.json({ received: true, message: 'Referencia desconocida.' });
    }

    // Evitar procesar de nuevo si ya está aprobada
    if (txRecord.estado === 'APROBADA') {
      return NextResponse.json({ received: true, message: 'Transacción ya procesada previamente.' });
    }

    // 3. Actualizar el estado de la transacción
    let nuevoEstado = 'PENDIENTE';
    if (status === 'approved') nuevoEstado = 'APROBADA';
    else if (status === 'rejected' || status === 'cancelled') nuevoEstado = 'RECHAZADA';

    await supabase
      .from('transacciones_mercadopago')
      .update({
        estado: nuevoEstado,
        mercadopago_payment_id: paymentId,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('referencia_mercadopago', reference);

    // 4. Si fue aprobado, extender la suscripción de la institución
    if (status === 'approved') {
      const { id_institucion, id_suscripcion, meses_adquiridos } = txRecord;

      // Obtener la fecha de expiración actual
      const { data: inst } = await supabase
        .from('instituciones')
        .select('fecha_expiracion')
        .eq('id_institucion', id_institucion)
        .single();

      const ahora = new Date();
      // Si ya expiró, contamos desde ahora; si no, sumamos desde la fecha actual de expiración
      const baseDate =
        inst?.fecha_expiracion && new Date(inst.fecha_expiracion) > ahora
          ? new Date(inst.fecha_expiracion)
          : ahora;

      const nuevaExpiracion = new Date(baseDate);
      nuevaExpiracion.setMonth(nuevaExpiracion.getMonth() + meses_adquiridos);

      // Actualizar institución: plan, estado y nueva fecha de expiración
      const { error: updateError } = await supabase
        .from('instituciones')
        .update({
          id_suscripcion: id_suscripcion,
          estado_suscripcion: 'ACTIVO',
          fecha_expiracion: nuevaExpiracion.toISOString(),
        })
        .eq('id_institucion', id_institucion);

      if (updateError) {
        console.error('[mercadopago-webhook] Error al actualizar la institución:', updateError);
      } else {
        console.log(
          `[mercadopago-webhook] ✅ Suscripción extendida exitosamente: institución ${id_institucion}, ` +
          `plan ${id_suscripcion}, hasta ${nuevaExpiracion.toISOString()}`
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[mercadopago-webhook] Error inesperado:', err);
    // Retornar 200 para evitar que Mercado Pago reintente infinitamente
    return NextResponse.json({ received: true, error: 'Error interno procesado.' });
  }
}
