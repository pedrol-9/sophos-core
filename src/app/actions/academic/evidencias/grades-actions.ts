'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { GradesheetStudentEvidencias, GradesheetEvidenciaRow, CalificacionBatchItem } from './types';

/**
 * Guarda o actualiza la nota de un estudiante para una evidencia específica.
 */
export async function upsertCalificacionEvidencia(
  idAsignacion: string,
  idMatricula: string,
  idPeriodo: string,
  idEvidencia: string,
  nota: number
): Promise<{ success: boolean; data?: { id_calificacion: string }; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'DOCENTE') {
      return { success: false, error: 'Solo docentes pueden registrar calificaciones.' };
    }

    if (isNaN(nota) || nota < 0.0 || nota > 5.0) {
      return { success: false, error: 'La nota debe estar entre 0.0 y 5.0.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion as string;

    const { data: per } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo')
      .eq('id_periodo', idPeriodo)
      .maybeSingle();

    if (!per) {
      return { success: false, error: 'El período académico no es válido.' };
    }

    const { data: activePer } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo')
      .eq('id_institucion', idInstitucion)
      .eq('activo', true)
      .maybeSingle();

    if (activePer && per.numero_periodo < activePer.numero_periodo) {
      return { success: false, error: 'No se permite registrar o modificar calificaciones en periodos cerrados.' };
    }

    const { data: asig } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion')
      .eq('id_asignacion', idAsignacion)
      .eq('id_docente', user.id)
      .maybeSingle();

    if (!asig) return { success: false, error: 'No tienes permisos sobre esta asignación.' };

    const numeroPeriodo = per.numero_periodo ?? 1;

    const { data: existing } = await supabase
      .from('calificaciones')
      .select('id_calificacion')
      .eq('id_matricula', idMatricula)
      .eq('id_asignacion', idAsignacion)
      .eq('id_periodo', idPeriodo)
      .eq('id_evidencia', idEvidencia)
      .maybeSingle();

    let resultId = '';

    if (existing) {
      const { data: updated, error } = await supabase
        .from('calificaciones')
        .update({ nota, fecha_registro: new Date().toISOString() })
        .eq('id_calificacion', existing.id_calificacion)
        .select('id_calificacion')
        .single();
      if (error) return { success: false, error: error.message };
      resultId = updated.id_calificacion;
    } else {
      const { data: inserted, error } = await supabase
        .from('calificaciones')
        .insert({
          id_matricula: idMatricula,
          id_asignacion: idAsignacion,
          id_periodo: idPeriodo,
          periodo: numeroPeriodo,
          id_evidencia: idEvidencia,
          actividad: 'evidencia',
          nota,
          id_institucion: idInstitucion,
          fecha_registro: new Date().toISOString(),
        })
        .select('id_calificacion')
        .single();
      if (error) return { success: false, error: error.message };
      resultId = inserted.id_calificacion;
    }

    return { success: true, data: { id_calificacion: resultId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Retorna estudiantes con sus notas indexadas por id_evidencia para la planilla.
 */
export async function getGradesheetByEvidencias(
  idCurso: string,
  idAsignacion: string,
  idPeriodo: string
): Promise<{ success: boolean; data?: GradesheetStudentEvidencias[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: matriculas, error: matErr } = await supabase
      .from('estudiantes_matriculados')
      .select('id_matricula, id_estudiante, usuarios!inner(nombre_completo, email)')
      .eq('id_curso', idCurso)
      .eq('ano_lectivo', new Date().getFullYear());

    if (matErr) return { success: false, error: matErr.message };
    if (!matriculas || matriculas.length === 0) return { success: true, data: [] };

    const { data: calificaciones, error: calErr } = await supabase
      .from('calificaciones')
      .select('id_calificacion, nota, id_evidencia, comentario_docente, id_matricula')
      .eq('id_asignacion', idAsignacion)
      .eq('id_periodo', idPeriodo)
      .not('id_evidencia', 'is', null);

    if (calErr) return { success: false, error: calErr.message };

    const list: GradesheetStudentEvidencias[] = (matriculas as any[]).map((m) => {
      const studentCals = (calificaciones || []).filter((c) => c.id_matricula === m.id_matricula);
      const gradesMap: Record<string, GradesheetEvidenciaRow> = {};
      studentCals.forEach((c) => {
        if (c.id_evidencia) {
          gradesMap[c.id_evidencia] = {
            id_calificacion: c.id_calificacion,
            id_evidencia: c.id_evidencia,
            nota: Number(c.nota),
            comentario_docente: c.comentario_docente,
          };
        }
      });

      let nombre_completo = '';
      let email = '';
      if (m.usuarios) {
        if (Array.isArray(m.usuarios)) {
          nombre_completo = m.usuarios[0]?.nombre_completo ?? '';
          email = m.usuarios[0]?.email ?? '';
        } else {
          nombre_completo = m.usuarios.nombre_completo ?? '';
          email = m.usuarios.email ?? '';
        }
      }

      return {
        id_matricula: m.id_matricula,
        id_estudiante: m.id_estudiante,
        nombre_completo,
        email,
        grades: gradesMap,
      };
    });

    return { success: true, data: list };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Guarda calificaciones en lote.
 */
export async function upsertCalificacionesBatch(
  idAsignacion: string,
  idPeriodo: string,
  items: CalificacionBatchItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'DOCENTE') {
      return { success: false, error: 'Solo docentes pueden registrar calificaciones.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion as string;

    const { data: per } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo')
      .eq('id_periodo', idPeriodo)
      .maybeSingle();

    if (!per) {
      return { success: false, error: 'El período académico no es válido.' };
    }

    const { data: activePer } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo')
      .eq('id_institucion', idInstitucion)
      .eq('activo', true)
      .maybeSingle();

    if (activePer && per.numero_periodo < activePer.numero_periodo) {
      return { success: false, error: 'No se permite registrar o modificar calificaciones en periodos cerrados.' };
    }

    const { data: asig } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion')
      .eq('id_asignacion', idAsignacion)
      .eq('id_docente', user.id)
      .maybeSingle();

    if (!asig) return { success: false, error: 'No tienes permisos sobre esta asignación.' };

    for (const item of items) {
      const { idMatricula, idEvidencia, nota } = item;

      if (nota !== null && (isNaN(nota) || nota < 0.0 || nota > 5.0)) {
        continue;
      }

      const { data: existing } = await supabase
        .from('calificaciones')
        .select('id_calificacion')
        .eq('id_matricula', idMatricula)
        .eq('id_asignacion', idAsignacion)
        .eq('id_periodo', idPeriodo)
        .eq('id_evidencia', idEvidencia)
        .maybeSingle();

      if (nota === null) {
        if (existing) {
          const { error: delErr } = await supabase
            .from('calificaciones')
            .delete()
            .eq('id_calificacion', existing.id_calificacion);
          if (delErr) throw delErr;
        }
      } else {
        if (existing) {
          const { error: updErr } = await supabase
            .from('calificaciones')
            .update({ nota, fecha_registro: new Date().toISOString() })
            .eq('id_calificacion', existing.id_calificacion);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('calificaciones')
            .insert({
              id_matricula: idMatricula,
              id_asignacion: idAsignacion,
              id_periodo: idPeriodo,
              periodo: per.numero_periodo,
              id_evidencia: idEvidencia,
              nota,
              id_institucion: idInstitucion,
              fecha_registro: new Date().toISOString(),
            });
          if (insErr) throw insErr;
        }
      }
    }

    revalidatePath('/dashboard/docente');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error en servidor' };
  }
}
