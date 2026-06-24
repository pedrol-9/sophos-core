'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ─── Precios en COP (centavos) por plan y duración ───────────────────────────
// Plan 1: Prueba ($0), Plan 2: Básico ($199.000/mes), Plan 3: Premium ($599.000/mes)
const PLAN_PRECIOS_COP: Record<number, number> = {
  1: 0,
  2: 19900000, // $199.000 en centavos
  3: 59900000, // $599.000 en centavos
};

const PLAN_NOMBRES: Record<number, string> = {
  1: 'Plan Prueba',
  2: 'Plan Básico',
  3: 'Plan Premium',
};

/**
 * Genera los parámetros seguros para inicializar el Widget de Wompi en el cliente.
 * La firma de integridad SHA-256 se calcula ÚNICAMENTE en el servidor para
 * prevenir manipulación de precios desde el navegador.
 */
export async function generateWompiParams(
  planId: number,
  meses: number
): Promise<{
  success: boolean;
  error?: string;
  data?: {
    publicKey: string;
    referencia: string;
    valorCentavos: number;
    moneda: string;
    firma: string;
    redirectUrl: string;
    planNombre: string;
    meses: number;
  };
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
    const valorTotal = valorUnitario * meses;

    if (valorTotal === 0) {
      return { success: false, error: 'El Plan Prueba es gratuito, no requiere pago.' };
    }

    // Generar referencia única y rastreable
    const timestamp = Date.now();
    const referencia = `REF-${idInstitucion.slice(0, 8).toUpperCase()}-P${planId}-M${meses}-${timestamp}`;

    // ─── Firma de integridad SHA-256 (requerida por Wompi) ───────────────────
    // Formato: SHA256(referencia + valorEnCentavos + moneda + secretoIntegridad)
    const wompiIntegritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    if (!wompiIntegritySecret) {
      return { success: false, error: 'Error de configuración del servidor de pagos.' };
    }

    const cadenaFirma = `${referencia}${valorTotal}COP${wompiIntegritySecret}`;
    const firma = crypto.createHash('sha256').update(cadenaFirma).digest('hex');

    // Registrar transacción pendiente para auditoría
    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await adminSupabase.from('transacciones_wompi').insert({
      id_institucion: idInstitucion,
      referencia_wompi: referencia,
      id_suscripcion: planId,
      meses_adquiridos: meses,
      valor_cop: valorTotal,
      estado: 'PENDIENTE',
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return {
      success: true,
      data: {
        publicKey: process.env.WOMPI_PUBLIC_KEY!,
        referencia,
        valorCentavos: valorTotal,
        moneda: 'COP',
        firma,
        redirectUrl: `${baseUrl}/dashboard/admin?pago=completado`,
        planNombre: PLAN_NOMBRES[planId],
        meses,
      },
    };
  } catch (err: any) {
    console.error('[wompi-actions] generateWompiParams error:', err);
    return { success: false, error: 'Error interno al preparar el pago.' };
  }
}

/**
 * Obtiene el estado actual de la suscripción de la institución del admin logueado.
 * Retorna días restantes, estado y si está vencida.
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
