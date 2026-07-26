'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { EvidenciaRow, EvidenciaAdminDetail } from './types';
import { extractGrado as syncExtractGrado } from '@/utils/extractGrado';

/**
 * Extrae el número de grado del nombre del curso. (Async para Server Action)
 */
export async function extractGrado(nombreCurso: string): Promise<string> {
  return syncExtractGrado(nombreCurso);
}

/**
 * Obtiene todas las evidencias configuradas por el admin para una institución.
 */
export async function getEvidenciasAdmin(opts?: {
  idMateria?: string;
  grado?: string;
  anoLectivo?: number;
}): Promise<{ success: boolean; data?: EvidenciaRow[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'ADMIN') {
      return { success: false, error: 'Acceso restringido. Solo administradores.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion as string;
    const anoLectivo = opts?.anoLectivo ?? new Date().getFullYear();

    let query = supabase
      .from('evidencias')
      .select('*')
      .eq('id_institucion', idInstitucion)
      .eq('ano_lectivo', anoLectivo)
      .order('grado', { ascending: true })
      .order('orden', { ascending: true });

    if (opts?.idMateria) query = query.eq('id_materia', opts.idMateria);
    if (opts?.grado) query = query.eq('grado', opts.grado);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const mapped = (data || []).map((row: any) => ({
      ...row,
      estado_aprobacion: row.estado_aprobacion || 'APROBADA',
    }));

    return { success: true, data: mapped as EvidenciaRow[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Obtiene las evidencias para el admin con información extendida de uso por docentes y resumen estadístico.
 */
export async function getEvidenciasAdminFull(opts: {
  idMateria: string;
  grado: string;
  idCurso?: string;
  anoLectivo?: number;
}): Promise<{
  success: boolean;
  data?: EvidenciaAdminDetail[];
  activePeriodoNumero?: number | null;
  stats?: {
    totalBanco: number;
    totalActivasPeriodo: number;
    totalPendientesAprobacion: number;
    totalUsadasAnteriores: number;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'ADMIN') {
      return { success: false, error: 'Acceso restringido. Solo administradores.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion as string;
    const anoLectivo = opts.anoLectivo ?? new Date().getFullYear();

    const { data: materiaObj } = await supabase
      .from('materias')
      .select('nombre')
      .eq('id_materia', opts.idMateria)
      .maybeSingle();

    let matchingMateriaIds = [opts.idMateria];
    if (materiaObj?.nombre) {
      const { data: siblingMaterias } = await supabase
        .from('materias')
        .select('id_materia')
        .eq('id_institucion', idInstitucion)
        .ilike('nombre', materiaObj.nombre.trim());

      if (siblingMaterias && siblingMaterias.length > 0) {
        matchingMateriaIds = Array.from(new Set([...matchingMateriaIds, ...siblingMaterias.map((m) => m.id_materia)]));
      }
    }

    const extractedGrado = syncExtractGrado(opts.grado || '');
    const gradosToSearch = Array.from(
      new Set([opts.grado, extractedGrado, `${extractedGrado}°`, `Grado ${extractedGrado}`].filter((g): g is string => Boolean(g && g.trim())))
    );

    const { data: evidencias, error: evErr } = await supabase
      .from('evidencias')
      .select('*')
      .eq('id_institucion', idInstitucion)
      .in('id_materia', matchingMateriaIds)
      .in('grado', gradosToSearch)
      .eq('ano_lectivo', anoLectivo)
      .order('orden', { ascending: true });

    if (evErr) return { success: false, error: evErr.message };
    const list = (evidencias || []).map((row: any) => ({
      ...row,
      estado_aprobacion: row.estado_aprobacion || 'APROBADA',
    })) as EvidenciaRow[];

    if (list.length === 0) {
      return {
        success: true,
        data: [],
        stats: { totalBanco: 0, totalActivasPeriodo: 0, totalPendientesAprobacion: 0, totalUsadasAnteriores: 0 },
      };
    }

    const { data: periodos } = await supabase
      .from('periodos_academicos')
      .select('id_periodo, numero_periodo, activo')
      .eq('id_institucion', idInstitucion)
      .order('numero_periodo', { ascending: true });

    const activePeriod = (periodos || []).find((p) => p.activo);
    const evIds = list.map((e) => e.id_evidencia);

    let targetAsignacionIds: string[] = [];
    if (opts.idCurso) {
      const { data: targetCurso } = await supabase
        .from('cursos')
        .select('nombre')
        .eq('id_curso', opts.idCurso)
        .maybeSingle();

      let targetCursoIds = [opts.idCurso];
      if (targetCurso?.nombre) {
        const { data: siblingCursos } = await supabase
          .from('cursos')
          .select('id_curso')
          .eq('id_institucion', idInstitucion)
          .ilike('nombre', targetCurso.nombre.trim());
        if (siblingCursos && siblingCursos.length > 0) {
          targetCursoIds = Array.from(new Set([...targetCursoIds, ...siblingCursos.map((c) => c.id_curso)]));
        }
      }

      const { data: asigs } = await supabase
        .from('asignaciones_academicas')
        .select('id_asignacion')
        .in('id_curso', targetCursoIds)
        .in('id_materia', matchingMateriaIds);

      if (asigs && asigs.length > 0) {
        targetAsignacionIds = asigs.map((a) => a.id_asignacion);
      }
    }

    let configRecords: any[] = [];

    if (opts.idCurso) {
      if (targetAsignacionIds.length > 0) {
        const { data: cfgs } = await supabase
          .from('configuracion_evidencias_periodo')
          .select('id_evidencia, id_periodo, activo, peso, id_asignacion')
          .in('id_evidencia', evIds)
          .in('id_asignacion', targetAsignacionIds);
        configRecords = cfgs || [];
      } else {
        configRecords = [];
      }
    } else {
      const { data: cfgs } = await supabase
        .from('configuracion_evidencias_periodo')
        .select('id_evidencia, id_periodo, activo, peso, id_asignacion')
        .in('id_evidencia', evIds);
      configRecords = cfgs || [];
    }

    let totalActivasPeriodo = 0;
    let totalUsadasAnteriores = 0;
    let totalPendientesAprobacion = 0;

    const result: EvidenciaAdminDetail[] = list.map((ev) => {
      const isPendiente = ev.estado_aprobacion === 'PENDIENTE';
      if (isPendiente) totalPendientesAprobacion++;

      const evConfigs = configRecords.filter((c) => c.id_evidencia === ev.id_evidencia && c.activo);
      
      const periodosUsadosNombres: string[] = [];
      let pesoPeriodo: number | null = null;
      let esActivaEnPeriodoVigente = false;
      let usadaEnAnterior = false;
      const pesosPorPeriodo: Record<string, number> = {};

      evConfigs.forEach((cfg) => {
        const per = (periodos || []).find((p) => p.id_periodo === cfg.id_periodo);
        if (per) {
          const pName = `P${per.numero_periodo}`;
          if (!periodosUsadosNombres.includes(pName)) {
            periodosUsadosNombres.push(pName);
          }
          pesosPorPeriodo[pName] = Number(cfg.peso);
          if (activePeriod && per.id_periodo === activePeriod.id_periodo) {
            esActivaEnPeriodoVigente = true;
            pesoPeriodo = Number(cfg.peso);
          } else if (activePeriod && per.numero_periodo < activePeriod.numero_periodo) {
            usadaEnAnterior = true;
            if (pesoPeriodo === null) {
              pesoPeriodo = Number(cfg.peso);
            }
          } else if (!activePeriod) {
            if (pesoPeriodo === null) {
              pesoPeriodo = Number(cfg.peso);
            }
          }
        }
      });

      if (esActivaEnPeriodoVigente) totalActivasPeriodo++;
      if (usadaEnAnterior && !esActivaEnPeriodoVigente) totalUsadasAnteriores++;

      periodosUsadosNombres.sort();

      return {
        ...ev,
        periodo_asignado: periodosUsadosNombres.join(', ') || null,
        peso_periodo: pesoPeriodo,
        usadaEnPeriodoAnterior: usadaEnAnterior,
        periodoAnteriorNombre: periodosUsadosNombres[0] || null,
        periodosUsadosNombres,
        esActivaEnPeriodoVigente,
        pesosPorPeriodo,
      };
    });

    return {
      success: true,
      data: result,
      activePeriodoNumero: activePeriod?.numero_periodo ?? null,
      stats: {
        totalBanco: list.filter((e) => e.activo !== false && e.estado_aprobacion !== 'RECHAZADA').length,
        totalActivasPeriodo,
        totalPendientesAprobacion,
        totalUsadasAnteriores,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Aprueba una evidencia sugerida por docente. Solo Admin.
 */
export async function aprobarEvidenciaAdmin(idEvidencia: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'ADMIN') {
      return { success: false, error: 'Acceso restringido. Solo administradores.' };
    }

    let { data: ev, error: evErr } = await supabase
      .from('evidencias')
      .update({ estado_aprobacion: 'APROBADA', activo: true })
      .eq('id_evidencia', idEvidencia)
      .select('*')
      .single();

    if (evErr && evErr.message.includes('column')) {
      const retry = await supabase.from('evidencias').update({ activo: true }).eq('id_evidencia', idEvidencia).select('*').single();
      ev = retry.data;
      evErr = retry.error;
    }

    if (evErr || !ev) return { success: false, error: evErr?.message || 'No se encontró la evidencia.' };

    if (ev.id_docente_sugerido) {
      const { data: per } = await supabase
        .from('periodos_academicos')
        .select('id_periodo')
        .eq('id_institucion', ev.id_institucion)
        .eq('activo', true)
        .maybeSingle();

      if (per) {
        const { data: asig } = await supabase
          .from('asignaciones_academicas')
          .select('id_asignacion')
          .eq('id_docente', ev.id_docente_sugerido)
          .eq('id_materia', ev.id_materia)
          .limit(1)
          .maybeSingle();

        if (asig) {
          await supabase.from('configuracion_evidencias_periodo').upsert({
            id_asignacion: asig.id_asignacion,
            id_periodo: per.id_periodo,
            id_evidencia: idEvidencia,
            activo: true,
            peso: 0.5,
          });
        }
      }
    }

    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Rechaza una evidencia sugerida por docente. Solo Admin.
 */
export async function rechazarEvidenciaAdmin(idEvidencia: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'ADMIN') {
      return { success: false, error: 'Acceso restringido. Solo administradores.' };
    }

    const payload: any = { estado_aprobacion: 'RECHAZADA', activo: false };
    let { error } = await supabase.from('evidencias').update(payload).eq('id_evidencia', idEvidencia);

    if (error && error.message.includes('column')) {
      const retry = await supabase.from('evidencias').update({ activo: false }).eq('id_evidencia', idEvidencia);
      error = retry.error;
    }

    if (error) return { success: false, error: error.message };
    revalidatePath('/dashboard/admin');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Crea o actualiza una evidencia. Solo admin.
 */
export async function upsertEvidencia(evidencia: {
  id_evidencia?: string;
  id_materia: string;
  grado: string;
  nombre: string;
  descripcion?: string;
  orden?: number;
  activo?: boolean;
}): Promise<{ success: boolean; data?: EvidenciaRow; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'ADMIN') {
      return { success: false, error: 'Acceso restringido. Solo administradores.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion as string;

    const payload: any = {
      id_institucion: idInstitucion,
      id_materia: evidencia.id_materia,
      grado: evidencia.grado,
      nombre: evidencia.nombre.trim(),
      descripcion: evidencia.descripcion?.trim() || null,
      orden: evidencia.orden ?? 1,
      activo: evidencia.activo ?? true,
      estado_aprobacion: 'APROBADA',
      ano_lectivo: new Date().getFullYear(),
    };

    let result;
    if (evidencia.id_evidencia) {
      let { data, error } = await supabase
        .from('evidencias')
        .update(payload)
        .eq('id_evidencia', evidencia.id_evidencia)
        .select()
        .single();

      if (error && error.message.includes('column')) {
        delete payload.estado_aprobacion;
        const retry = await supabase.from('evidencias').update(payload).eq('id_evidencia', evidencia.id_evidencia).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error) return { success: false, error: error.message };
      result = data;
    } else {
      let { data, error } = await supabase
        .from('evidencias')
        .insert(payload)
        .select()
        .single();

      if (error && error.message.includes('column')) {
        delete payload.estado_aprobacion;
        const retry = await supabase.from('evidencias').insert(payload).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error) return { success: false, error: error.message };
      result = data;
    }

    return { success: true, data: result as EvidenciaRow };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Elimina una evidencia. Solo admin.
 */
export async function deleteEvidencia(
  idEvidencia: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'ADMIN') {
      return { success: false, error: 'Acceso restringido. Solo administradores.' };
    }

    const { error } = await supabase
      .from('evidencias')
      .delete()
      .eq('id_evidencia', idEvidencia);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}
