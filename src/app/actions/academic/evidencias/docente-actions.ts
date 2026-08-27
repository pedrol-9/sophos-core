'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { EvidenciaRow, EvidenciaConConfig, ConfigEvidenciaPeriodo } from './types';
import { extractGrado as syncExtractGrado } from '@/utils/extractGrado';

/**
 * Sugiere una nueva evidencia por parte del docente para su materia/grado.
 */
export async function sugerirEvidenciaDocente(opts: {
  idAsignacion: string;
  nombre: string;
  descripcion?: string;
}): Promise<{ success: boolean; data?: EvidenciaRow; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'DOCENTE') {
      return { success: false, error: 'Solo los docentes pueden sugerir evidencias.' };
    }

    const { data: asig } = await supabase
      .from('asignaciones_academicas')
      .select('id_materia, id_curso, id_institucion')
      .eq('id_asignacion', opts.idAsignacion)
      .single();

    if (!asig) return { success: false, error: 'No se encontró la asignación académica.' };

    const { data: curso } = await supabase
      .from('cursos')
      .select('nombre')
      .eq('id_curso', asig.id_curso)
      .single();

    const grado = curso ? syncExtractGrado(curso.nombre) : '6';

    const payload: any = {
      id_institucion: asig.id_institucion,
      id_materia: asig.id_materia,
      grado: grado,
      nombre: opts.nombre.trim(),
      descripcion: opts.descripcion?.trim() || null,
      orden: 99,
      activo: true,
      estado_aprobacion: 'PENDIENTE',
      id_docente_sugerido: user.id,
      ano_lectivo: new Date().getFullYear(),
    };

    let { data, error } = await supabase
      .from('evidencias')
      .insert(payload)
      .select()
      .single();

    if (error && error.message.includes('column')) {
      delete payload.estado_aprobacion;
      delete payload.id_docente_sugerido;
      const retry = await supabase.from('evidencias').insert(payload).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as EvidenciaRow };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Obtiene las evidencias disponibles para una asignación y periodo.
 */
export async function getEvidenciasForAsignacion(
  idAsignacion: string,
  idPeriodo: string
): Promise<{ success: boolean; data?: EvidenciaConConfig[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Sesión expirada.' };

    const { data: asignacion, error: asigErr } = await supabase
      .from('asignaciones_academicas')
      .select('id_materia, id_curso, id_institucion')
      .eq('id_asignacion', idAsignacion)
      .single();

    if (asigErr || !asignacion) {
      return { success: false, error: 'No se encontró la asignación académica.' };
    }

    const { data: materiaObj } = await supabase
      .from('materias')
      .select('nombre')
      .eq('id_materia', asignacion.id_materia)
      .maybeSingle();

    let matchingMateriaIds = [asignacion.id_materia];
    if (materiaObj?.nombre) {
      const { data: siblingMaterias } = await supabase
        .from('materias')
        .select('id_materia')
        .eq('id_institucion', asignacion.id_institucion)
        .ilike('nombre', materiaObj.nombre.trim());

      if (siblingMaterias && siblingMaterias.length > 0) {
        matchingMateriaIds = Array.from(new Set([...matchingMateriaIds, ...siblingMaterias.map((m) => m.id_materia)]));
      }
    }

    const { data: curso, error: cursoErr } = await supabase
      .from('cursos')
      .select('*')
      .eq('id_curso', asignacion.id_curso)
      .single();

    if (cursoErr || !curso) {
      return { success: false, error: 'No se encontró el curso asociado.' };
    }

    const extractedGrado = syncExtractGrado(curso.nombre || '');
    const cursoGrado = (curso as any).grado || '';
    const rawDigits = (curso.nombre || '').replace(/[^0-9]/g, '');

    const gradosToSearch = Array.from(
      new Set([extractedGrado, rawDigits, curso.nombre, cursoGrado].filter((g): g is string => Boolean(g && g.trim())))
    );

    const { data: rawEvidencias, error: evErr } = await supabase
      .from('evidencias')
      .select('*')
      .eq('id_institucion', asignacion.id_institucion)
      .in('id_materia', matchingMateriaIds)
      .neq('estado_aprobacion', 'RECHAZADA')
      .order('orden', { ascending: true });

    if (evErr) return { success: false, error: evErr.message };
    if (!rawEvidencias || rawEvidencias.length === 0) {
      return { success: true, data: [] };
    }

    const matchingEvidencias = rawEvidencias.filter((ev: any) => {
      if (!ev.grado) return true;
      const evGradoExtracted = syncExtractGrado(ev.grado);
      return (
        gradosToSearch.includes(ev.grado) ||
        (extractedGrado && evGradoExtracted === extractedGrado) ||
        (extractedGrado && ev.grado.startsWith(extractedGrado)) ||
        (evGradoExtracted && extractedGrado.startsWith(evGradoExtracted))
      );
    });

    const finalRawList = matchingEvidencias.length > 0 ? matchingEvidencias : rawEvidencias;

    const evidencias = finalRawList.map((row: any) => ({
      ...row,
      estado_aprobacion: row.estado_aprobacion || 'APROBADA',
    }));

    const { data: periodos } = await supabase
      .from('periodos_academicos')
      .select('id_periodo, numero_periodo')
      .eq('id_institucion', asignacion.id_institucion)
      .order('numero_periodo', { ascending: true });

    const currentPeriod = (periodos || []).find((p) => p.id_periodo === idPeriodo);
    const previousPeriodIds = (periodos || [])
      .filter((p) => currentPeriod && p.numero_periodo < currentPeriod.numero_periodo)
      .map((p) => p.id_periodo);

    const usedInPreviousMap = new Map<string, string>();
    if (previousPeriodIds.length > 0) {
      const { data: prevConfigs } = await supabase
        .from('configuracion_evidencias_periodo')
        .select('id_evidencia, id_periodo, activo')
        .eq('id_asignacion', idAsignacion)
        .in('id_periodo', previousPeriodIds)
        .eq('activo', true);

      (prevConfigs || []).forEach((c) => {
        const per = (periodos || []).find((p) => p.id_periodo === c.id_periodo);
        if (per) {
          usedInPreviousMap.set(c.id_evidencia, `P${per.numero_periodo}`);
        }
      });
    }

    const { data: configs } = await supabase
      .from('configuracion_evidencias_periodo')
      .select('id_evidencia, activo, peso')
      .eq('id_asignacion', idAsignacion)
      .eq('id_periodo', idPeriodo);

    const configMap = new Map<string, { activo: boolean; peso: number }>();
    (configs || []).forEach((c) => {
      configMap.set(c.id_evidencia, { activo: c.activo, peso: Number(c.peso) });
    });

    const hasSavedConfig = configMap.size > 0;
    const disponiblesParaPeriodo = evidencias.filter((e) => !usedInPreviousMap.has(e.id_evidencia));
    const pesoEquitativo = disponiblesParaPeriodo.length > 0 ? 1 / disponiblesParaPeriodo.length : 1;

    const result: EvidenciaConConfig[] = evidencias.map((ev) => {
      const saved = configMap.get(ev.id_evidencia);
      const usadaAnterior = usedInPreviousMap.has(ev.id_evidencia);
      const periodoAnteriorNombre = usedInPreviousMap.get(ev.id_evidencia);

      const activaEnPeriodo = usadaAnterior
        ? false
        : saved !== undefined
        ? saved.activo
        : hasSavedConfig
        ? false
        : true;

      return {
        ...(ev as EvidenciaRow),
        activaEnPeriodo: activaEnPeriodo,
        peso: saved !== undefined ? saved.peso : activaEnPeriodo ? pesoEquitativo : 0,
        usadaEnPeriodoAnterior: usadaAnterior,
        periodoAnteriorNombre: periodoAnteriorNombre,
      };
    });

    const activas = result.filter((e) => e.activaEnPeriodo);
    if (!hasSavedConfig && activas.length > 0) {
      const total = activas.reduce((acc, e) => acc + e.peso, 0);
      if (total > 0) activas.forEach((e) => (e.peso = e.peso / total));
    }

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Persiste la selección y pesos de evidencias que el docente configuró para el periodo.
 */
export async function saveConfigEvidenciasPeriodo(
  idAsignacion: string,
  idPeriodo: string,
  configs: ConfigEvidenciaPeriodo[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const userRole = user?.app_metadata?.rol;
    if (!user || (userRole !== 'DOCENTE' && userRole !== 'ADMIN')) {
      return { success: false, error: 'Solo docentes o administradores pueden configurar evidencias.' };
    }

    const { data: per } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo, id_institucion')
      .eq('id_periodo', idPeriodo)
      .maybeSingle();

    if (!per) {
      return { success: false, error: 'El período académico no es válido.' };
    }

    const { data: activePer } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo')
      .eq('id_institucion', per.id_institucion)
      .eq('activo', true)
      .maybeSingle();

    if (activePer && per.numero_periodo < activePer.numero_periodo) {
      return { success: false, error: 'No se permite modificar la configuración de evidencias en periodos cerrados.' };
    }

    const { data: asig } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion')
      .eq('id_asignacion', idAsignacion)
      .maybeSingle();

    if (!asig) return { success: false, error: 'No se encontró la asignación académica.' };

    if (configs.length === 0) return { success: true };

    const activas = configs.filter((c) => c.activo);
    const totalPeso = activas.reduce((acc, c) => acc + c.peso, 0);
    if (totalPeso > 0 && Math.abs(totalPeso - 1.0) > 0.001) {
      activas.forEach((c) => (c.peso = c.peso / totalPeso));
    }

    const records = configs.map((c) => ({
      id_asignacion: idAsignacion,
      id_periodo: idPeriodo,
      id_evidencia: c.id_evidencia,
      activo: c.activo,
      peso: c.activo ? c.peso : 0,
      fecha_actualizacion: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('configuracion_evidencias_periodo')
      .upsert(records, { onConflict: 'id_asignacion,id_periodo,id_evidencia' });

    if (error) return { success: false, error: error.message };
    revalidatePath('/dashboard/docente');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido.' };
  }
}

/**
 * Sincroniza evidencias 11-A y 11-B.
 */
export async function syncEvidencias11A11BData(): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Sin sesión.' };
    const idInstitucion = user.app_metadata?.id_institucion as string;

    const { data: periodos } = await supabase
      .from('periodos_academicos')
      .select('id_periodo, numero_periodo, activo')
      .eq('id_institucion', idInstitucion)
      .order('numero_periodo', { ascending: true });

    if (!periodos || periodos.length === 0) return { success: false, error: 'No hay periodos académicos.' };

    const p1 = periodos.find((p) => p.numero_periodo === 1);
    const p2 = periodos.find((p) => p.numero_periodo === 2);
    const p3 = periodos.find((p) => p.numero_periodo === 3 || p.activo);

    const { data: cursos } = await supabase
      .from('cursos')
      .select('id_curso, nombre')
      .eq('id_institucion', idInstitucion);

    const curso11A = cursos?.find((c) => c.nombre.trim() === '11-A' || c.nombre.includes('11-A') || c.nombre.includes('11A'));
    const curso11B = cursos?.find((c) => c.nombre.trim() === '11-B' || c.nombre.includes('11-B') || c.nombre.includes('11B'));

    if (!curso11A || !curso11B) {
      return { success: false, error: 'No se encontraron los cursos 11-A y/o 11-B en la base de datos.' };
    }

    const { data: materiasMat } = await supabase
      .from('materias')
      .select('id_materia')
      .eq('id_institucion', idInstitucion)
      .ilike('nombre', '%matemátic%');

    const matIds = (materiasMat || []).map((m) => m.id_materia);

    const { data: asigs11A } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion')
      .eq('id_institucion', idInstitucion)
      .eq('id_curso', curso11A.id_curso)
      .in('id_materia', matIds.length > 0 ? matIds : ['none']);

    const { data: asigs11B } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion')
      .eq('id_institucion', idInstitucion)
      .eq('id_curso', curso11B.id_curso)
      .in('id_materia', matIds.length > 0 ? matIds : ['none']);

    const idsAsig11A = (asigs11A || []).map((a) => a.id_asignacion);
    const idsAsig11B = (asigs11B || []).map((a) => a.id_asignacion);

    if (idsAsig11A.length === 0 || idsAsig11B.length === 0) {
      return { success: false, error: 'Faltan asignaciones académicas para 11-A o 11-B.' };
    }

    const { data: evidencias } = await supabase
      .from('evidencias')
      .select('id_evidencia, nombre')
      .eq('id_institucion', idInstitucion);

    const evPrueba1 = evidencias?.find((e) => e.nombre.toLowerCase().includes('prueba 1') || e.nombre.toLowerCase().includes('evidencia de prueba 1'));
    const evPrueba3 = evidencias?.find((e) => e.nombre.toLowerCase().includes('prueba 3') || e.nombre.toLowerCase().includes('evidencia de prueba 3'));

    if (p1) {
      const { data: cfgP1_11A } = await supabase
        .from('configuracion_evidencias_periodo')
        .select('*')
        .in('id_asignacion', idsAsig11A)
        .eq('id_periodo', p1.id_periodo);

      if (cfgP1_11A && cfgP1_11A.length > 0) {
        await supabase
          .from('configuracion_evidencias_periodo')
          .delete()
          .in('id_asignacion', idsAsig11B)
          .eq('id_periodo', p1.id_periodo);

        for (const targetAsigId of idsAsig11B) {
          for (const item of cfgP1_11A) {
            await supabase.from('configuracion_evidencias_periodo').insert({
              id_asignacion: targetAsigId,
              id_periodo: p1.id_periodo,
              id_evidencia: item.id_evidencia,
              activo: item.activo,
              peso: item.peso,
            });
          }
        }
      }
    }

    if (p2) {
      const { data: cfgP2_11A } = await supabase
        .from('configuracion_evidencias_periodo')
        .select('*')
        .in('id_asignacion', idsAsig11A)
        .eq('id_periodo', p2.id_periodo);

      if (cfgP2_11A && cfgP2_11A.length > 0) {
        await supabase
          .from('configuracion_evidencias_periodo')
          .delete()
          .in('id_asignacion', idsAsig11B)
          .eq('id_periodo', p2.id_periodo);

        for (const targetAsigId of idsAsig11B) {
          for (const item of cfgP2_11A) {
            await supabase.from('configuracion_evidencias_periodo').insert({
              id_asignacion: targetAsigId,
              id_periodo: p2.id_periodo,
              id_evidencia: item.id_evidencia,
              activo: item.activo,
              peso: item.peso,
            });
          }
        }
      }
    }

    if (p3) {
      await supabase
        .from('configuracion_evidencias_periodo')
        .delete()
        .in('id_asignacion', idsAsig11A)
        .eq('id_periodo', p3.id_periodo);

      await supabase
        .from('configuracion_evidencias_periodo')
        .delete()
        .in('id_asignacion', idsAsig11B)
        .eq('id_periodo', p3.id_periodo);

      if (evPrueba1) {
        for (const asigId of idsAsig11A) {
          await supabase.from('configuracion_evidencias_periodo').insert({
            id_asignacion: asigId,
            id_periodo: p3.id_periodo,
            id_evidencia: evPrueba1.id_evidencia,
            activo: true,
            peso: 1.0,
          });
        }
      }

      if (evPrueba3) {
        for (const asigId of idsAsig11B) {
          await supabase.from('configuracion_evidencias_periodo').insert({
            id_asignacion: asigId,
            id_periodo: p3.id_periodo,
            id_evidencia: evPrueba3.id_evidencia,
            activo: true,
            peso: 1.0,
          });
        }
      }
    }

    return {
      success: true,
      message: 'Base de datos sincronizada: P1 y P2 de 11-B clonados de 11-A. P3: Prueba 1 para 11-A y Prueba 3 para 11-B.',
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al sincronizar.' };
  }
}
