'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/utils/supabase/server';

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
      .select('id_evidencia, id_materia, grado, nombre, descripcion, ano_lectivo, orden, activo')
      .eq('id_institucion', idInstitucion)
      .eq('ano_lectivo', anoLectivo)
      .order('grado', { ascending: true })
      .order('orden', { ascending: true });

    if (opts?.idMateria) query = query.eq('id_materia', opts.idMateria);
    if (opts?.grado) query = query.eq('grado', opts.grado);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data as EvidenciaRow[]) || [] };
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

    const payload = {
      id_institucion: idInstitucion,
      id_materia: evidencia.id_materia,
      grado: evidencia.grado,
      nombre: evidencia.nombre.trim(),
      descripcion: evidencia.descripcion?.trim() || null,
      orden: evidencia.orden ?? 1,
      activo: evidencia.activo ?? true,
      ano_lectivo: new Date().getFullYear(),
    };

    let result;
    if (evidencia.id_evidencia) {
      const { data, error } = await supabase
        .from('evidencias')
        .update(payload)
        .eq('id_evidencia', evidencia.id_evidencia)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      result = data;
    } else {
      const { data, error } = await supabase
        .from('evidencias')
        .insert(payload)
        .select()
        .single();
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
    const { data: evidencias, error: evErr } = await supabase
      .from('evidencias')
      .select('id_evidencia, id_materia, grado, nombre, descripcion, ano_lectivo, orden, activo')
      .eq('id_institucion', asignacion.id_institucion)
      .eq('id_materia', asignacion.id_materia)
      .eq('grado', grado)
      .eq('ano_lectivo', new Date().getFullYear())
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (evErr) return { success: false, error: evErr.message };
    if (!evidencias || evidencias.length === 0) {
      return { success: true, data: [] };
    }

    // 4. Cargar la configuración ya guardada por el docente para este periodo
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

    // 5. Si no hay configuración previa → calcular pesos equitativos
    const hasSavedConfig = configMap.size > 0;
    const pesoEquitativo = evidencias.length > 0 ? 1 / evidencias.length : 1;

    const result: EvidenciaConConfig[] = evidencias.map((ev) => {
      const saved = configMap.get(ev.id_evidencia);
      return {
        ...(ev as EvidenciaRow),
        activaEnPeriodo: saved ? saved.activo : true,
        peso: saved ? saved.peso : pesoEquitativo,
      };
    });

    // Si había configuración guardada, normalizar pesos de las activas
    if (!hasSavedConfig) {
      // Normalizar para que sumen exactamente 1.0
      const total = result.reduce((acc, e) => acc + e.peso, 0);
      if (total > 0) result.forEach((e) => (e.peso = e.peso / total));
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
          dimension: 'SABER',           // campo legacy, irrelevante en nuevo modelo
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
