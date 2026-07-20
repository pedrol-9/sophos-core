'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Precios en COP por plan (valores unitarios por mes)
const PLAN_PRECIOS_COP: Record<number, number> = {
  1: 0,
  2: 199000, // $199.000 COP
  3: 599000, // $599.000 COP
};

const PLAN_NOMBRES: Record<number, string> = {
  1: 'Plan Prueba',
  2: 'Plan Básico',
  3: 'Plan Premium',
};

/**
 * Calcula el porcentaje de descuento por volumen según la cantidad de meses contratada
 */
function getDescuento(meses: number): number {
  if (meses >= 12) return 20;
  if (meses >= 6) return 10;
  if (meses >= 3) return 5;
  return 0;
}

/**
 * Inicializa de forma segura el cliente de Mercado Pago
 */
function getMercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'placeholder-access-token',
  });
}

/**
 * Genera una preferencia de Mercado Pago y registra la transacción en estado PENDIENTE.
 * Retorna la URL (init_point) del Checkout Pro para redirigir al usuario.
 */
export async function generateMercadoPagoPreference(
  planId: number,
  meses: number
): Promise<{
  success: boolean;
  error?: string;
  initPoint?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Sesión inválida o expirada.' };
    }

    const rol = user.app_metadata?.rol;
    if (rol !== 'ADMIN') {
      return { success: false, error: 'Solo administradores del colegio pueden realizar pagos.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'No se encontró la institución del administrador.' };
    }

    if (!PLAN_PRECIOS_COP[planId]) {
      return { success: false, error: 'Plan de suscripción no válido.' };
    }

    if (meses < 1 || meses > 12) {
      return { success: false, error: 'Número de meses debe estar entre 1 y 12.' };
    }

    const valorUnitario = PLAN_PRECIOS_COP[planId];
    const precioBase = valorUnitario * meses;
    const descuento = getDescuento(meses);
    const valorTotal = Math.round(precioBase * (1 - descuento / 100));

    if (valorTotal === 0) {
      return { success: false, error: 'El Plan Prueba es gratuito, no requiere pago.' };
    }

    // Generar referencia única y rastreable
    const timestamp = Date.now();
    const referencia = `REF-${idInstitucion.slice(0, 8).toUpperCase()}-P${planId}-M${meses}-${timestamp}`;

    // Registrar transacción pendiente para auditoría
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await adminSupabase.from('transacciones_mercadopago').insert({
      id_institucion: idInstitucion,
      referencia_mercadopago: referencia,
      id_suscripcion: planId,
      meses_adquiridos: meses,
      valor_cop: valorTotal,
      estado: 'PENDIENTE',
    });

    if (dbError) {
      console.error('[mercadopago-actions] DB Insert Error:', dbError);
      return { success: false, error: 'Error al registrar la transacción.' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const mpClient = getMercadoPagoClient();
    const preference = new Preference(mpClient);

    // Crear preferencia en Mercado Pago
    const response = await preference.create({
      body: {
        items: [
          {
            id: `plan-${planId}`,
            title: `${PLAN_NOMBRES[planId]} - ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
            quantity: 1,
            unit_price: valorTotal,
            currency_id: 'COP',
          },
        ],
        external_reference: referencia,
        back_urls: {
          success: `${baseUrl}/dashboard/admin?pago=completado`,
          failure: `${baseUrl}/dashboard/admin?pago=fallido`,
          pending: `${baseUrl}/dashboard/admin?pago=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      },
    });

    return {
      success: true,
      initPoint: response.init_point,
    };
  } catch (err: any) {
    console.error('[mercadopago-actions] generateMercadoPagoPreference error:', err);
    return { success: false, error: 'Error interno al preparar el pago.' };
  }
}

/**
 * Obtiene el estado actual de la suscripción de la institución del admin logueado.
 */
export async function getSubscriptionStatus(): Promise<{
  success: boolean;
  error?: string;
  data?: {
    estado: string;
    planNombre: string;
    planId: number | null;
    fechaExpiracion: string | null;
    diasRestantes: number | null;
    estaVencida: boolean;
    limiteUsuarios: number;
    totalUsuarios: number;
  };
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Sesión inválida.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'Institución no encontrada.' };
    }

    const { data: inst, error } = await (supabase as any)
      .from('instituciones')
      .select(`
        estado_suscripcion,
        fecha_expiracion,
        id_suscripcion,
        planes_suscripcion (
          nombre,
          limite_usuarios
        )
      `)
      .eq('id_institucion', idInstitucion)
      .single();

    if (error || !inst) {
      return { success: false, error: 'No se encontró la institución.' };
    }

    // Contar usuarios actuales
    const { count: totalUsuarios } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('id_institucion', idInstitucion);

    const ahora = new Date();
    const expiracion = inst.fecha_expiracion ? new Date(inst.fecha_expiracion) : null;
    const diasRestantes = expiracion
      ? Math.floor((expiracion.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const estaVencida = expiracion ? ahora > expiracion : false;

    return {
      success: true,
      data: {
        estado: inst.estado_suscripcion,
        planNombre: inst.planes_suscripcion?.nombre || 'Sin Plan',
        planId: inst.id_suscripcion,
        fechaExpiracion: inst.fecha_expiracion,
        diasRestantes,
        estaVencida,
        limiteUsuarios: inst.planes_suscripcion?.limite_usuarios ?? 0,
        totalUsuarios: totalUsuarios ?? 0,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
