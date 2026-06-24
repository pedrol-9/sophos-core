import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * @file src/app/api/webhooks/wompi/route.ts
 *
 * Route Handler que procesa eventos asincrónicos de Wompi (Bancolombia).
 * Recibe notificaciones POST cuando una transacción cambia de estado.
 *
 * Seguridad: valida la firma del evento usando WOMPI_EVENTS_SECRET
 * antes de procesar cualquier actualización en la base de datos.
 */

// Cliente admin de Supabase (bypasea RLS para escrituras críticas del webhook)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Valida la firma del evento Wompi.
 * Wompi envía un header `x-event-checksum` con el SHA-256 de:
 * event.id + event.created_at + event.data.transaction.id + WOMPI_EVENTS_SECRET
 */
function validateWompiSignature(event: any, checksum: string): boolean {
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!eventsSecret) return false;

  const cadena =
    `${event.id}${event.created_at}${event.data?.transaction?.id ?? ''}${eventsSecret}`;
  const expected = crypto.createHash('sha256').update(cadena).digest('hex');

  return expected === checksum;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const checksum = request.headers.get('x-event-checksum') ?? '';

    // ─── 1. Validar firma del evento ────────────────────────────────────────
    if (!validateWompiSignature(body, checksum)) {
      console.warn('[wompi-webhook] Firma inválida. Posible evento no autorizado.');
      return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
    }

    const transaction = body?.data?.transaction;
    if (!transaction) {
      return NextResponse.json({ received: true, message: 'Sin transacción en payload.' });
    }

    const { reference, status, id: wompiTxId } = transaction;

    // ─── 2. Buscar la transacción pendiente en nuestra BD ───────────────────
    const supabase = getAdminClient();
    const { data: txRecord, error: txError } = await supabase
      .from('transacciones_wompi')
      .select('*')
      .eq('referencia_wompi', reference)
      .single();

    if (txError || !txRecord) {
      console.warn(`[wompi-webhook] Referencia no encontrada: ${reference}`);
      // Responder 200 para que Wompi no reintente
      return NextResponse.json({ received: true, message: 'Referencia desconocida.' });
    }

    // ─── 3. Actualizar estado de la transacción ─────────────────────────────
    const nuevoEstado = status === 'APPROVED' ? 'APROBADA' : 'RECHAZADA';

    await supabase
      .from('transacciones_wompi')
      .update({
        estado: nuevoEstado,
        wompi_transaction_id: wompiTxId,
        fecha_actualizacion: new Date().toISOString(),
      })
      .eq('referencia_wompi', reference);

    // ─── 4. Si fue aprobada, extender la suscripción ────────────────────────
    if (status === 'APPROVED') {
      const { id_institucion, id_suscripcion, meses_adquiridos } = txRecord;

      // Obtener la fecha de expiración actual
      const { data: inst } = await supabase
        .from('instituciones')
        .select('fecha_expiracion, estado_suscripcion')
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
        console.error('[wompi-webhook] Error actualizando institución:', updateError);
        // No retornamos error HTTP para evitar reintentos de Wompi
      } else {
        console.log(
          `[wompi-webhook] ✅ Suscripción extendida: institución ${id_institucion}, ` +
          `plan ${id_suscripcion}, hasta ${nuevaExpiracion.toISOString()}`
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[wompi-webhook] Error inesperado:', err);
    // Retornar 200 para evitar reintentos infinitos de Wompi
    return NextResponse.json({ received: true, error: 'Error interno procesado.' });
  }
}
