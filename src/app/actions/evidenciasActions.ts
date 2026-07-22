'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ─── TIPOS PÚBLICOS ──────────────────────────────────────────────────────────

export type EvidenciaRow = {
  id_evidencia: string;
  id_materia: string;
  grado: string;
  nombre: string;
  descripcion: string | null;
  ano_lectivo: number;
  orden: number;
  activo: boolean;
  estado_aprobacion?: 'APROBADA' | 'PENDIENTE' | 'RECHAZADA';
  id_docente_sugerido?: string | null;
};

export type EvidenciaAdminDetail = EvidenciaRow & {
  periodo_asignado?: string | null;
  peso_periodo?: number | null;
  docente_nombre?: string | null;
  usadaEnPeriodoAnterior?: boolean;
  periodoAnteriorNombre?: string | null;
  periodosUsadosNombres?: string[];
};

export type ConfigEvidenciaPeriodo = {
  id_evidencia: string;
  activo: boolean;
  /** Peso como fracción decimal, ej: 0.40 = 40% */
  peso: number;
};

export type EvidenciaConConfig = EvidenciaRow & {
  /** true si el docente la activó para este periodo */
  activaEnPeriodo: boolean;
  /** 0.0–1.0 */
  peso: number;
  /** true si ya fue activada en un periodo previo del mismo año lectivo */
  usadaEnPeriodoAnterior?: boolean;
  periodoAnteriorNombre?: string;
};

export type GradesheetEvidenciaRow = {
  id_calificacion: string | null;
  id_evidencia: string;
  nota: number | null;
  comentario_docente: string | null;
};

export type GradesheetStudentEvidencias = {
  id_matricula: string;
  id_estudiante: string;
  nombre_completo: string;
  email: string;
  /** Mapa id_evidencia → nota/comentario */
  grades: Record<string, GradesheetEvidenciaRow>;
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Extrae el número de grado del nombre del curso.
 * "6A" → "6", "601" → "6", "1002" → "10", "11-1" → "11"
 */
function extractGrado(nombreCurso: string): string {
  const match = nombreCurso.match(/^(\d+)/);
  if (match) {
    const num = match[1];
    if (num.length >= 3) {
      // Si tiene 3 dígitos o más (ej: "601" o "1002"), quitamos los últimos dos dígitos
      return num.slice(0, -2);
    }
    return num;
  }
  return nombreCurso;
}

// ─── ACCIONES DEL ADMINISTRADOR ──────────────────────────────────────────────

/**
 * Obtiene todas las evidencias configuradas por el admin para una institución.
 * Permite filtrar opcionalmente por materia y/o grado.
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
  anoLectivo?: number;
}): Promise<{
  success: boolean;
  data?: EvidenciaAdminDetail[];
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

    // 1. Obtener todas las evidencias del banco para esta materia + grado
    const { data: evidencias, error: evErr } = await supabase
      .from('evidencias')
      .select('*')
      .eq('id_institucion', idInstitucion)
      .eq('id_materia', opts.idMateria)
      .eq('grado', opts.grado)
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

    // 2. Obtener periodo activo y todos los periodos
    const { data: periodos } = await supabase
      .from('periodos_academicos')
      .select('id_periodo, numero_periodo, activo')
      .eq('id_institucion', idInstitucion)
      .order('numero_periodo', { ascending: true });

    const activePeriod = (periodos || []).find((p) => p.activo);
    const evIds = list.map((e) => e.id_evidencia);

    // 3. Cargar configuraciones de evidencias asociadas directamente por id_evidencia
    const { data: cfgs } = await supabase
      .from('configuracion_evidencias_periodo')
      .select('id_evidencia, id_periodo, activo, peso')
      .in('id_evidencia', evIds);

    const configRecords = cfgs || [];

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

      evConfigs.forEach((cfg) => {
        const per = (periodos || []).find((p) => p.id_periodo === cfg.id_periodo);
        if (per) {
          const pName = `P${per.numero_periodo}`;
          if (!periodosUsadosNombres.includes(pName)) {
            periodosUsadosNombres.push(pName);
          }
          if (activePeriod && per.id_periodo === activePeriod.id_periodo) {
            esActivaEnPeriodoVigente = true;
            pesoPeriodo = Number(cfg.peso);
          } else if (activePeriod && per.numero_periodo < activePeriod.numero_periodo) {
            usadaEnAnterior = true;
          }
          if (pesoPeriodo === null && cfg.peso !== undefined && cfg.peso !== null) {
            pesoPeriodo = Number(cfg.peso);
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
      };
    });

    return {
      success: true,
      data: result,
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

    // Si fue sugerida por un docente, activarla en su asignación para el periodo activo
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

    let payload: any = { estado_aprobacion: 'RECHAZADA', activo: false };
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

    const grado = curso ? extractGrado(curso.nombre) : '6';

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

// ─── ACCIONES DEL DOCENTE ────────────────────────────────────────────────────

/**
 * Obtiene las evidencias disponibles para una asignación y periodo,
 * junto con la configuración activa/pesos que el docente ya haya guardado.
 * Si no hay configuración previa, todas las evidencias aparecen con peso equitativo.
 */
export async function getEvidenciasForAsignacion(
  idAsignacion: string,
  idPeriodo: string
): Promise<{ success: boolean; data?: EvidenciaConConfig[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Sesión expirada.' };

    // 1. Obtener la asignación → id_materia, id_curso
    const { data: asignacion, error: asigErr } = await supabase
      .from('asignaciones_academicas')
      .select('id_materia, id_curso, id_institucion')
      .eq('id_asignacion', idAsignacion)
      .single();

    if (asigErr || !asignacion) {
      return { success: false, error: 'No se encontró la asignación académica.' };
    }

    // 2. Obtener el nombre del curso para extraer el grado
    const { data: curso, error: cursoErr } = await supabase
      .from('cursos')
      .select('nombre')
      .eq('id_curso', asignacion.id_curso)
      .single();

    if (cursoErr || !curso) {
      return { success: false, error: 'No se encontró el curso asociado.' };
    }

    const grado = extractGrado(curso.nombre);

    // 3. Buscar evidencias disponibles para este grado+materia+año
    const { data: rawEvidencias, error: evErr } = await supabase
      .from('evidencias')
      .select('*')
      .eq('id_institucion', asignacion.id_institucion)
      .eq('id_materia', asignacion.id_materia)
      .eq('grado', grado)
      .eq('ano_lectivo', new Date().getFullYear())
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (evErr) return { success: false, error: evErr.message };
    if (!rawEvidencias || rawEvidencias.length === 0) {
      return { success: true, data: [] };
    }

    const evidencias = rawEvidencias.map((row: any) => ({
      ...row,
      estado_aprobacion: row.estado_aprobacion || 'APROBADA',
    }));

    // 4. Cargar periodos para determinar cuales son periodos anteriores
    const { data: periodos } = await supabase
      .from('periodos_academicos')
      .select('id_periodo, numero_periodo')
      .eq('id_institucion', asignacion.id_institucion)
      .order('numero_periodo', { ascending: true });

    const currentPeriod = (periodos || []).find((p) => p.id_periodo === idPeriodo);
    const previousPeriodIds = (periodos || [])
      .filter((p) => currentPeriod && p.numero_periodo < currentPeriod.numero_periodo)
      .map((p) => p.id_periodo);

    // 5. Cargar configuraciones de periodos anteriores para esta asignación
    const usedInPreviousMap = new Map<string, string>(); // id_evidencia -> "P1"
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

    // 6. Cargar la configuración ya guardada por el docente para este periodo
    const { data: configs } = await supabase
      .from('configuracion_evidencias_periodo')
      .select('id_evidencia, activo, peso')
      .eq('id_asignacion', idAsignacion)
      .eq('id_periodo', idPeriodo);

    // Mapa id_evidencia → config guardada
    const configMap = new Map<string, { activo: boolean; peso: number }>();
    (configs || []).forEach((c) => {
      configMap.set(c.id_evidencia, { activo: c.activo, peso: Number(c.peso) });
    });

    const hasSavedConfig = configMap.size > 0;

    // Evidencias disponibles (que no hayan sido usadas en periodos anteriores)
    const disponiblesParaPeriodo = evidencias.filter((e) => !usedInPreviousMap.has(e.id_evidencia));
    const pesoEquitativo = disponiblesParaPeriodo.length > 0 ? 1 / disponiblesParaPeriodo.length : 1;

    const result: EvidenciaConConfig[] = evidencias.map((ev) => {
      const saved = configMap.get(ev.id_evidencia);
      const usadaAnterior = usedInPreviousMap.has(ev.id_evidencia);
      const periodoAnteriorNombre = usedInPreviousMap.get(ev.id_evidencia);

      // Si fue usada en periodo anterior, el docente no puede activarla de nuevo
      const activaEnPeriodo = usadaAnterior ? false : saved ? saved.activo : true;

      return {
        ...(ev as EvidenciaRow),
        activaEnPeriodo: activaEnPeriodo,
        peso: saved ? saved.peso : activaEnPeriodo ? pesoEquitativo : 0,
        usadaEnPeriodoAnterior: usadaAnterior,
        periodoAnteriorNombre: periodoAnteriorNombre,
      };
    });

    // Normalizar pesos de las activas en el periodo actual
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
 * Persiste la selección y pesos de evidencias que el docente configuró
 * para el periodo actual en la planilla.
 * Los pesos deben sumar 1.0 (100%). Se normaliza automáticamente si no.
 */
export async function saveConfigEvidenciasPeriodo(
  idAsignacion: string,
  idPeriodo: string,
  configs: ConfigEvidenciaPeriodo[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.rol !== 'DOCENTE') {
      return { success: false, error: 'Solo docentes pueden configurar evidencias.' };
    }

    // Verificar que el periodo no esté cerrado
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

    // Verificar propiedad de la asignación
    const { data: asig } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion')
      .eq('id_asignacion', idAsignacion)
      .eq('id_docente', user.id)
      .maybeSingle();

    if (!asig) return { success: false, error: 'No tienes permisos sobre esta asignación.' };

    if (configs.length === 0) return { success: true };

    // Normalizar pesos de las evidencias activas para que sumen 1.0
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

    // Verificar que el periodo no esté cerrado
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

    // Verificar propiedad
    const { data: asig } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion')
      .eq('id_asignacion', idAsignacion)
      .eq('id_docente', user.id)
      .maybeSingle();

    if (!asig) return { success: false, error: 'No tienes permisos sobre esta asignación.' };

    const numeroPeriodo = per.numero_periodo ?? 1;

    // Buscar calificación existente por evidencia
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
          actividad: 'evidencia',       // conservar por compatibilidad
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

    // 1. Estudiantes matriculados
    const { data: matriculas, error: matErr } = await supabase
      .from('estudiantes_matriculados')
      .select('id_matricula, id_estudiante, usuarios!inner(nombre_completo, email)')
      .eq('id_curso', idCurso)
      .eq('ano_lectivo', new Date().getFullYear());

    if (matErr) return { success: false, error: matErr.message };
    if (!matriculas || matriculas.length === 0) return { success: true, data: [] };

    // 2. Calificaciones registradas por evidencia para este periodo
    const { data: calificaciones, error: calErr } = await supabase
      .from('calificaciones')
      .select('id_calificacion, nota, id_evidencia, comentario_docente, id_matricula')
      .eq('id_asignacion', idAsignacion)
      .eq('id_periodo', idPeriodo)
      .not('id_evidencia', 'is', null);

    if (calErr) return { success: false, error: calErr.message };

    // 3. Estructurar por estudiante
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

export type CalificacionBatchItem = {
  idMatricula: string;
  idEvidencia: string;
  nota: number | null;
};

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

    // Verificar que el periodo no esté cerrado
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

    // Verificar propiedad
    const { data: asig } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion')
      .eq('id_asignacion', idAsignacion)
      .eq('id_docente', user.id)
      .maybeSingle();

    if (!asig) return { success: false, error: 'No tienes permisos sobre esta asignación.' };

    // Realizar los upserts en bucle sobre el servidor
    for (const item of items) {
      const { idMatricula, idEvidencia, nota } = item;
      
      if (nota !== null && (isNaN(nota) || nota < 0.0 || nota > 5.0)) {
        continue;
      }

      // Buscar si existe
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
              fecha_registro: new Date().toISOString()
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

