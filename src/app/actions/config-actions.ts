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

export type PonderacionParam = {
  peso_saber: number;
  peso_hacer: number;
  peso_ser: number;
};

export type LogroParam = {
  id_asignacion: string;
  numero_periodo: number;
  descripcion: string;
};

export type OnboardingData = {
  periodos: PeriodoParam[];
  escalas: EscalaParam[];
  ponderaciones: PonderacionParam;
  logros: LogroParam[];
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

    await supabase
      .from('configuracion_ponderaciones')
      .delete()
      .eq('id_institucion', idInstitucion);

    // ── Paso B: Guardar configuracion_ponderaciones ─────────────────────────────
    const { error: pondError } = await supabase
      .from('configuracion_ponderaciones')
      .insert({
        id_institucion: idInstitucion,
        peso_saber: data.ponderaciones.peso_saber,
        peso_hacer: data.ponderaciones.peso_hacer,
        peso_ser: data.ponderaciones.peso_ser,
      });

    if (pondError) {
      throw new Error(`Error al guardar ponderaciones: ${pondError.message}`);
    }

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
