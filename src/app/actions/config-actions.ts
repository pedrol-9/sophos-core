'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { Database } from '@/types/supabase';

export type PeriodoParam = {
  numero_periodo: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
};

export type EscalaParam = {
  nombre_desempeno: Database["public"]["Enums"]["tipo_desempeno_escala"];
  nota_minima: number;
  nota_maxima: number;
};

export type LogroParam = {
  id_asignacion: string;
  numero_periodo: number;
  descripcion: string;
};

export type OnboardingData = {
  periodos: PeriodoParam[];
  escalas: EscalaParam[];
  logros: LogroParam[];
  nomenclaturaCursos: string;
};

export type ActionResponse = {
  success: boolean;
  error?: string;
};

/**
 * Guarda en bloque y de forma secuencial la parametrización inicial del Onboarding (Fase 1.5).
 */
export async function saveOnboardingParametrizacion(
  data: OnboardingData
): Promise<ActionResponse> {
  try {
    const supabase = await createClient();

    // Obtener sesión de usuario activa
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Usuario no autenticado o sesión expirada.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return {
        success: false,
        error: 'El perfil de usuario no tiene una institución vinculada.',
      };
    }

    // ── Paso 0: Guardar nomenclatura de cursos en la tabla instituciones ─────────
    const { error: instError } = await supabase
      .from('instituciones')
      .update({ nomenclatura_cursos: data.nomenclaturaCursos })
      .eq('id_institucion', idInstitucion);

    if (instError) {
      throw new Error(`Error al guardar nomenclatura de cursos: ${instError.message}`);
    }

    // ── Paso A: Limpieza previa (Idempotencia) ──────────────────────────────────
    // Eliminamos registros previos de esta institución para evitar llaves duplicadas.
    // Esto asegura que si una inserción falló a medias, podamos volver a intentar limpiamente.
    await supabase
      .from('evidencias_logros')
      .delete()
      .in(
         'id_asignacion',
         (
           await supabase
             .from('asignaciones_academicas')
             .select('id_asignacion')
             .eq('id_institucion', idInstitucion)
         ).data?.map((a) => a.id_asignacion) || []
      );

    await supabase
      .from('periodos_academicos')
      .delete()
      .eq('id_institucion', idInstitucion);

    await supabase
      .from('escala_valoracion')
      .delete()
      .eq('id_institucion', idInstitucion);

    // ── Paso C: Guardar periodos_academicos ─────────────────────────────────────
    const { data: savedPeriods, error: periodsError } = await supabase
      .from('periodos_academicos')
      .insert(
        data.periodos.map((p) => ({
          id_institucion: idInstitucion,
          numero_periodo: p.numero_periodo,
          fecha_inicio: p.fecha_inicio,
          fecha_fin: p.fecha_fin,
          activo: p.activo,
        }))
      )
      .select('id_periodo, numero_periodo');

    if (periodsError || !savedPeriods) {
      throw new Error(`Error al guardar periodos: ${periodsError?.message || 'No devuelto'}`);
    }

    // Mapear numero_periodo -> id_periodo (UUID) para asociarlo a los logros
    const periodMap = new Map<number, string>();
    savedPeriods.forEach((p) => {
      periodMap.set(p.numero_periodo, p.id_periodo);
    });

    // ── Paso D: Guardar escala_valoracion ───────────────────────────────────────
    const { error: escalaError } = await supabase
      .from('escala_valoracion')
      .insert(
        data.escalas.map((e) => ({
          id_institucion: idInstitucion,
          nombre_desempeno: e.nombre_desempeno,
          nota_minima: e.nota_minima,
          nota_maxima: e.nota_maxima,
        }))
      );

    if (escalaError) {
      throw new Error(`Error al guardar escala de valoración: ${escalaError.message}`);
    }

    // ── Paso E: Guardar evidencias_logros ───────────────────────────────────────
    if (data.logros && data.logros.length > 0) {
      const formattedLogros = data.logros.map((l) => {
        const idPeriodo = periodMap.get(l.numero_periodo);
        if (!idPeriodo) {
          throw new Error(`El logro hace referencia al periodo ${l.numero_periodo} que no pudo ser resuelto.`);
        }
        return {
          id_asignacion: l.id_asignacion,
          id_periodo: idPeriodo,
          descripcion: l.descripcion,
        };
      });

      const { error: logrosError } = await supabase
        .from('evidencias_logros')
        .insert(formattedLogros);

      if (logrosError) {
        throw new Error(`Error al registrar los logros académicos: ${logrosError.message}`);
      }
    }

    // Revalidar el path del dashboard
    revalidatePath('/dashboard/admin');

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al guardar la parametrización.';
    return { success: false, error: msg };
  }
}

// ─── ACCIONES POR SECCIÓN (Ajustes Académicos) ────────────────────────────────

/**
 * Guarda solo los periodos académicos de la institución (delete + insert idempotente).
 */
export async function savePeriodosConfig(periodos: PeriodoParam[]): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: 'Usuario no autenticado.' };
    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) return { success: false, error: 'Institución no vinculada.' };

    await supabase.from('periodos_academicos').delete().eq('id_institucion', idInstitucion);

    const { error } = await supabase.from('periodos_academicos').insert(
      periodos.map((p) => ({ id_institucion: idInstitucion, ...p }))
    );
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al guardar periodos.' };
  }
}

/**
 * Guarda solo la escala de valoración de la institución (delete + insert idempotente).
 */
export async function saveEscalaConfig(escalas: EscalaParam[]): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: 'Usuario no autenticado.' };
    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) return { success: false, error: 'Institución no vinculada.' };

    await supabase.from('escala_valoracion').delete().eq('id_institucion', idInstitucion);

    const { error } = await supabase.from('escala_valoracion').insert(
      escalas.map((e) => ({ id_institucion: idInstitucion, ...e }))
    );
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al guardar escala.' };
  }
}

/**
 * Guarda solo la nomenclatura de cursos de la institución.
 */
export async function saveNomenclaturaConfig(nomenclatura: string): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: 'Usuario no autenticado.' };
    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) return { success: false, error: 'Institución no vinculada.' };

    const { error } = await supabase
      .from('instituciones')
      .update({ nomenclatura_cursos: nomenclatura })
      .eq('id_institucion', idInstitucion);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al guardar nomenclatura.' };
  }
}


export type ExistingOnboardingConfig = {
  periodos: PeriodoParam[];
  escalas: EscalaParam[];
  nomenclaturaCursos: string;
};

/**
 * Lee la configuración de onboarding ya guardada (periodos, escala, nomenclatura).
 * Se usa para pre-popular el wizard cuando el admin quiere editar una config existente.
 */
export async function getOnboardingConfig(): Promise<{ success: boolean; data?: ExistingOnboardingConfig; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Usuario no autenticado o sesión expirada.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'El perfil de usuario no tiene una institución vinculada.' };
    }

    // Leer periodos
    const { data: periodos, error: periodosError } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo, fecha_inicio, fecha_fin, activo')
      .eq('id_institucion', idInstitucion)
      .order('numero_periodo');

    if (periodosError) {
      return { success: false, error: `Error al leer periodos: ${periodosError.message}` };
    }

    // Leer escala
    const { data: escalas, error: escalasError } = await supabase
      .from('escala_valoracion')
      .select('nombre_desempeno, nota_minima, nota_maxima')
      .eq('id_institucion', idInstitucion)
      .order('nota_minima');

    if (escalasError) {
      return { success: false, error: `Error al leer escala de valoración: ${escalasError.message}` };
    }

    // Leer nomenclatura de cursos
    const { data: inst, error: instError } = await supabase
      .from('instituciones')
      .select('nomenclatura_cursos')
      .eq('id_institucion', idInstitucion)
      .single();

    if (instError) {
      return { success: false, error: `Error al leer nomenclatura: ${instError.message}` };
    }

    return {
      success: true,
      data: {
        periodos: (periodos || []).map((p) => ({
          numero_periodo: p.numero_periodo,
          fecha_inicio: p.fecha_inicio,
          fecha_fin: p.fecha_fin,
          activo: p.activo,
        })),
        escalas: (escalas || []).map((e) => ({
          nombre_desempeno: e.nombre_desempeno as EscalaParam['nombre_desempeno'],
          nota_minima: e.nota_minima,
          nota_maxima: e.nota_maxima,
        })),
        nomenclaturaCursos: inst?.nomenclatura_cursos || '6A',
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al leer la configuración.';
    return { success: false, error: msg };
  }
}

export type SubscriptionInfo = {
  nombreLegal: string;
  nit: string;
  planId: number | null;
  planNombre: string;
  planLimit: number;
  planPrecio: number;
  estadoSuscripcion: string;
  totalUsersUsed: number;
};

/**
 * Obtiene la información de suscripción y límites de la institución del usuario.
 */
export async function getSubscriptionInfo(): Promise<{ success: boolean; data?: SubscriptionInfo; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Usuario no autenticado o sesión expirada.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'El perfil de usuario no tiene una institución vinculada.' };
    }

    // Obtener la institución con su plan
    const { data: inst, error: instError } = await supabase
      .from('instituciones')
      .select('nombre_legal, nit, estado_suscripcion, id_suscripcion, planes_suscripcion(nombre, limite_usuarios, precio)')
      .eq('id_institucion', idInstitucion)
      .single();

    if (instError || !inst) {
      return { success: false, error: `Error al obtener la institución: ${instError?.message || 'No encontrada'}` };
    }

    // Contar usuarios registrados en la institución
    const { count, error: countError } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('id_institucion', idInstitucion);

    if (countError) {
      return { success: false, error: `Error al contar usuarios: ${countError.message}` };
    }

    const planNombre = (inst.planes_suscripcion as any)?.nombre || 'Sin Plan';
    const planLimit = (inst.planes_suscripcion as any)?.limite_usuarios ?? 0;
    const planPrecio = (inst.planes_suscripcion as any)?.precio ?? 0;

    return {
      success: true,
      data: {
        nombreLegal: inst.nombre_legal,
        nit: inst.nit,
        planId: inst.id_suscripcion,
        planNombre,
        planLimit,
        planPrecio,
        estadoSuscripcion: inst.estado_suscripcion,
        totalUsersUsed: count ?? 0,
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error interno del servidor.' };
  }
}

/**
 * Permite cambiar el plan de suscripción de la institución.
 */
export async function updateSubscriptionPlan(planId: number): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Usuario no autenticado o sesión expirada.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'El perfil de usuario no tiene una institución vinculada.' };
    }

    if (user.app_metadata?.rol !== 'ADMIN') {
      return { success: false, error: 'Solo administradores pueden gestionar suscripciones.' };
    }

    // Obtener detalles del plan seleccionado
    const { data: plan, error: planError } = await supabase
      .from('planes_suscripcion')
      .select('id_suscripcion, nombre, limite_usuarios')
      .eq('id_suscripcion', planId)
      .single();

    if (planError || !plan) {
      return { success: false, error: `El plan seleccionado no es válido: ${planError?.message || 'No encontrado'}` };
    }

    // Contar usuarios actuales para asegurar que el nuevo plan pueda soportarlos
    const { count, error: countError } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('id_institucion', idInstitucion);

    if (countError) {
      return { success: false, error: `Error al contar usuarios: ${countError.message}` };
    }

    const currentUsers = count ?? 0;
    if (currentUsers > plan.limite_usuarios) {
      return {
        success: false,
        error: `No puedes cambiar al plan '${plan.nombre}' porque tu institución tiene ${currentUsers} usuarios registrados y este plan solo permite un máximo de ${plan.limite_usuarios}.`
      };
    }

    // Determinar nuevo estado (PRUEBA si es el plan de ID 1, de lo contrario ACTIVO)
    const nuevoEstado = plan.id_suscripcion === 1 ? 'PRUEBA' : 'ACTIVO';

    // Actualizar institución
    const { error: updateError } = await supabase
      .from('instituciones')
      .update({
        id_suscripcion: planId,
        estado_suscripcion: nuevoEstado
      })
      .eq('id_institucion', idInstitucion);

    if (updateError) {
      return { success: false, error: `Error al actualizar la suscripción: ${updateError.message}` };
    }

    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error interno del servidor.' };
  }
}
