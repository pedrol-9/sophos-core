'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type SaaSMetrics = {
  totalInstituciones: number;
  totalUsuarios: number;
  mrrTotal: number;
  distribucionPlanes: { plan: string; count: number }[];
  totalTokensIA: number;
  costoEstimadoIA: number;
  usuariosPorRol: { rol: string; count: number }[];
};

export type InstitutionSaaSInfo = {
  id_institucion: string;
  nit: string;
  nombre_legal: string;
  estado_suscripcion: string;
  id_suscripcion: number | null;
  planNombre: string;
  planLimit: number;
  totalUsuarios: number;
  fecha_registro: string;
};

/**
 * Valida si el usuario logueado tiene el rol SUPER_ADMIN
 */
async function checkSuperAdminRole() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Sesión expirada o inválida.');
  }

  const rol = user.app_metadata?.rol;
  if (rol !== 'SUPER_ADMIN') {
    throw new Error('Acceso denegado. Se requiere privilegios de Súper Administrador.');
  }

  return supabase;
}

/**
 * Obtiene las métricas clave agregadas para el SaaS global.
 */
export async function getSuperAdminMetrics(): Promise<{ success: boolean; data?: SaaSMetrics; error?: string }> {
  try {
    const supabase = await checkSuperAdminRole();

    // 1. Total de instituciones
    const { count: totalInstituciones } = await supabase
      .from('instituciones')
      .select('*', { count: 'exact', head: true });

    // 2. Total de usuarios y por rol
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('rol');

    const totalUsuarios = usuarios?.length || 0;
    const rolCounts: Record<string, number> = {};
    (usuarios || []).forEach(u => {
      rolCounts[u.rol] = (rolCounts[u.rol] || 0) + 1;
    });

    const usuariosPorRol = Object.keys(rolCounts).map(rol => ({
      rol,
      count: rolCounts[rol]
    }));

    // 3. Distribución de planes y MRR
    const { data: insts } = await (supabase as any)
      .from('instituciones')
      .select('id_suscripcion, planes_suscripcion(nombre, precio)');

    const planCounts: Record<string, number> = {};
    let mrrTotal = 0;
    (insts || []).forEach((i: any) => {
      const name = i.planes_suscripcion?.nombre || 'Sin Plan';
      planCounts[name] = (planCounts[name] || 0) + 1;
      mrrTotal += Number(i.planes_suscripcion?.precio || 0);
    });

    const distribucionPlanes = Object.keys(planCounts).map(plan => ({
      plan,
      count: planCounts[plan]
    }));

    // 4. Consumo acumulado de IA
    const { data: iaLogs } = await supabase
      .from('logs_ia_tokens')
      .select('tokens_usados, costo_estimado');

    let totalTokensIA = 0;
    let costoEstimadoIA = 0;
    (iaLogs || []).forEach(l => {
      totalTokensIA += l.tokens_usados || 0;
      costoEstimadoIA += Number(l.costo_estimado) || 0;
    });

    return {
      success: true,
      data: {
        totalInstituciones: totalInstituciones || 0,
        totalUsuarios,
        mrrTotal,
        distribucionPlanes,
        totalTokensIA,
        costoEstimadoIA: Math.round(costoEstimadoIA * 100) / 100,
        usuariosPorRol,
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener métricas SaaS.' };
  }
}

/**
 * Obtiene el listado completo de instituciones registradas con sus estadísticas de uso.
 */
export async function getInstitutionsList(): Promise<{ success: boolean; data?: InstitutionSaaSInfo[]; error?: string }> {
  try {
    const supabase = await checkSuperAdminRole();

    const { data: insts, error } = await (supabase as any)
      .from('instituciones')
      .select(`
        id_institucion,
        nit,
        nombre_legal,
        estado_suscripcion,
        id_suscripcion,
        fecha_registro,
        planes_suscripcion (
          nombre,
          limite_usuarios
        )
      `)
      .order('fecha_registro', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const results: InstitutionSaaSInfo[] = [];

    for (const inst of insts) {
      // Contar usuarios registrados en esta institución
      const { count } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('id_institucion', inst.id_institucion);

      results.push({
        id_institucion: inst.id_institucion,
        nit: inst.nit,
        nombre_legal: inst.nombre_legal,
        estado_suscripcion: inst.estado_suscripcion,
        id_suscripcion: inst.id_suscripcion,
        planNombre: inst.planes_suscripcion?.nombre || 'Sin Plan',
        planLimit: inst.planes_suscripcion?.limite_usuarios ?? 0,
        totalUsuarios: count ?? 0,
        fecha_registro: inst.fecha_registro || '',
      });
    }

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener instituciones.' };
  }
}

/**
 * Permite cambiar la suscripción o inhabilitar una institución manualmente.
 */
export async function updateInstitutionSaaS(
  idInstitucion: string,
  planId: number,
  estado: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await checkSuperAdminRole();

    const { error } = await supabase
      .from('instituciones')
      .update({
        id_suscripcion: planId,
        estado_suscripcion: estado
      })
      .eq('id_institucion', idInstitucion);

    if (error) {
      return { success: false, error: `Error al actualizar la institución: ${error.message}` };
    }

    revalidatePath('/dashboard/super-admin');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error interno al actualizar la institución.' };
  }
}

/**
 * Obtiene los planes de suscripción globales.
 */
export async function getPlansList(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await checkSuperAdminRole();

    const { data: planes, error } = await supabase
      .from('planes_suscripcion')
      .select('*')
      .order('id_suscripcion', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: planes || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza los precios y límites de un plan de suscripción global.
 */
export async function updatePlanDetails(
  planId: number,
  precio: number,
  limite: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await checkSuperAdminRole();

    const { error } = await supabase
      .from('planes_suscripcion')
      .update({
        precio,
        limite_usuarios: limite
      })
      .eq('id_suscripcion', planId);

    if (error) {
      return { success: false, error: `Error al actualizar plan: ${error.message}` };
    }

    revalidatePath('/dashboard/super-admin');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene el log de llamadas y costos de la API de IA.
 */
export async function getAILogs(limit = 100): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await checkSuperAdminRole();

    const { data, error } = await (supabase as any)
      .from('logs_ia_tokens')
      .select(`
        id_ia_token,
        servicio_ia,
        tokens_usados,
        costo_estimado,
        fecha_peticion,
        instituciones (
          nombre_legal
        )
      `)
      .order('fecha_peticion', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
