'use server';

import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/supabase';

export type DimensionType = Database["public"]["Enums"]["tipo_dimension_nota"];

export type GradesheetCalificacion = {
  id_calificacion: string;
  nota: number;
  dimension: DimensionType;
  actividad: string;
  comentario_docente: string | null;
  comentario_ia: string | null;
  id_periodo: string | null;
  periodo: number;
};

export type GradesheetStudent = {
  id_matricula: string;
  id_estudiante: string;
  nombre_completo: string;
  email: string;
  grades: GradesheetCalificacion[];
};

export type PonderacionInfo = {
  peso_saber: number;
  peso_hacer: number;
  peso_ser: number;
};

export type EscalaInfo = {
  nombre_desempeno: Database["public"]["Enums"]["tipo_desempeno_escala"];
  nota_minima: number;
  nota_maxima: number;
};

export type PeriodoInfo = {
  id_periodo: string;
  numero_periodo: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
};

/**
 * Guarda o actualiza atómicamente la calificación diaria de una actividad específica para un estudiante.
 */
export async function upsertCalificacionDiaria(
  idAsignacion: string,
  idMatricula: string,
  idPeriodo: string,
  dimension: DimensionType,
  actividad: string,
  nota: number
): Promise<{ success: boolean; data?: { id_calificacion: string }; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Validar sesión y rol del docente
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Sesión expirada. Inicia sesión de nuevo.' };
    }

    if (user.app_metadata?.rol !== 'DOCENTE') {
      return { success: false, error: 'Acceso restringido. Solo docentes pueden calificar.' };
    }

    // 2. Validar que la nota se encuentre entre 0.0 y 5.0
    if (isNaN(nota) || nota < 0.0 || nota > 5.0) {
      return { success: false, error: 'La calificación debe ser un valor decimal entre 0.0 y 5.0.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'No se encontró tu institución en los metadatos.' };
    }

    // 3. Validar propiedad de la asignación (aislamiento multi-tenant)
    const { data: asignacion, error: checkError } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion, id_materia, id_curso')
      .eq('id_asignacion', idAsignacion)
      .eq('id_docente', user.id)
      .maybeSingle();

    if (checkError || !asignacion) {
      return { success: false, error: 'No tienes permisos de docente sobre esta asignación académica.' };
    }

    // 4. Obtener el número entero del periodo para compatibilidad hacia atrás
    const { data: periodoData, error: periodFetchError } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo')
      .eq('id_periodo', idPeriodo)
      .maybeSingle();

    if (periodFetchError || !periodoData) {
      return { success: false, error: 'El periodo académico proporcionado no existe.' };
    }
    const numeroPeriodo = periodoData.numero_periodo;

    // 5. Buscar si ya existe la nota para este estudiante, periodo, asignación y actividad
    const { data: existing, error: findError } = await supabase
      .from('calificaciones')
      .select('id_calificacion')
      .eq('id_matricula', idMatricula)
      .eq('id_asignacion', idAsignacion)
      .eq('id_periodo', idPeriodo)
      .eq('actividad', actividad)
      .maybeSingle();

    if (findError) {
      return { success: false, error: `Error al buscar nota: ${findError.message}` };
    }

    let resultId = '';

    if (existing) {
      // Modificar existente
      const { data: updated, error: updateError } = await supabase
        .from('calificaciones')
        .update({
          nota,
          dimension,
          fecha_registro: new Date().toISOString()
        })
        .eq('id_calificacion', existing.id_calificacion)
        .select('id_calificacion')
        .single();

      if (updateError) {
        return { success: false, error: `Error al actualizar nota: ${updateError.message}` };
      }
      resultId = updated.id_calificacion;
    } else {
      // Insertar nueva
      const { data: inserted, error: insertError } = await supabase
        .from('calificaciones')
        .insert({
          id_matricula: idMatricula,
          id_asignacion: idAsignacion,
          id_periodo: idPeriodo,
          periodo: numeroPeriodo,
          actividad,
          dimension,
          nota,
          id_institucion: idInstitucion,
          fecha_registro: new Date().toISOString()
        })
        .select('id_calificacion')
        .single();

      if (insertError) {
        return { success: false, error: `Error al guardar nota: ${insertError.message}` };
      }
      resultId = inserted.id_calificacion;
    }

    return { success: true, data: { id_calificacion: resultId } };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al guardar la calificación.';
    return { success: false, error: msg };
  }
}

/**
 * Carga los parámetros y configuraciones institucionales (ponderaciones, periodos, escala).
 */
export async function getParametrizacionDocente(
  idAsignacion: string
): Promise<{
  success: boolean;
  ponderaciones?: PonderacionInfo;
  periodos?: PeriodoInfo[];
  escalas?: EscalaInfo[];
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // 1. Obtener la asignación y validar el tenant
    const { data: asignacion, error: asigError } = await supabase
      .from('asignaciones_academicas')
      .select('id_institucion')
      .eq('id_asignacion', idAsignacion)
      .single();

    if (asigError || !asignacion) {
      return { success: false, error: 'No se pudo resolver la asignación académica.' };
    }
    const idInstitucion = asignacion.id_institucion;

    // 2. Cargar ponderaciones
    const { data: pond, error: pondError } = await supabase
      .from('configuracion_ponderaciones')
      .select('peso_saber, peso_hacer, peso_ser')
      .eq('id_institucion', idInstitucion)
      .maybeSingle();

    if (pondError) {
      return { success: false, error: `Error al cargar ponderaciones: ${pondError.message}` };
    }

    // 3. Cargar periodos
    const { data: pers, error: persError } = await supabase
      .from('periodos_academicos')
      .select('id_periodo, numero_periodo, fecha_inicio, fecha_fin, activo')
      .eq('id_institucion', idInstitucion)
      .order('numero_periodo', { ascending: true });

    if (persError) {
      return { success: false, error: `Error al cargar periodos: ${persError.message}` };
    }

    // 4. Cargar escala de valoración
    const { data: esc, error: escError } = await supabase
      .from('escala_valoracion')
      .select('nombre_desempeno, nota_minima, nota_maxima')
      .eq('id_institucion', idInstitucion);

    if (escError) {
      return { success: false, error: `Error al cargar escalas: ${escError.message}` };
    }

    return {
      success: true,
      ponderaciones: pond
        ? {
            peso_saber: Number(pond.peso_saber),
            peso_hacer: Number(pond.peso_hacer),
            peso_ser: Number(pond.peso_ser),
          }
        : { peso_saber: 0.4, peso_hacer: 0.4, peso_ser: 0.2 }, // Fallback legal
      periodos: pers || [],
      escalas: esc || [],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al obtener parametrización.';
    return { success: false, error: msg };
  }
}

/**
 * Obtiene los alumnos matriculados y sus notas del periodo seleccionado para cargar la planilla.
 */
export async function getGradesheetStudents(
  idCurso: string,
  idAsignacion: string,
  idPeriodo: string
): Promise<{ success: boolean; data?: GradesheetStudent[]; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Obtener alumnos matriculados en el curso para el año actual
    const { data: matriculas, error: matError } = await supabase
      .from('estudiantes_matriculados')
      .select(`
        id_matricula,
        id_estudiante,
        usuarios!inner (nombre_completo, email)
      `)
      .eq('id_curso', idCurso)
      .eq('ano_lectivo', new Date().getFullYear());

    if (matError) {
      return { success: false, error: `Error al consultar matrículas: ${matError.message}` };
    }

    if (!matriculas || matriculas.length === 0) {
      return { success: true, data: [] };
    }

    // 2. Obtener calificaciones registradas para esta asignación y este periodo específico
    const { data: calificaciones, error: calError } = await supabase
      .from('calificaciones')
      .select('id_calificacion, nota, dimension, actividad, comentario_docente, comentario_ia, id_periodo, periodo, id_matricula')
      .eq('id_asignacion', idAsignacion)
      .eq('id_periodo', idPeriodo);

    if (calError) {
      return { success: false, error: `Error al consultar calificaciones: ${calError.message}` };
    }

    // 3. Estructurar datos
    const list: GradesheetStudent[] = matriculas.map((m: any) => {
      const studentGrades = (calificaciones || [])
        .filter((c) => c.id_matricula === m.id_matricula)
        .map((c) => ({
          id_calificacion: c.id_calificacion,
          nota: Number(c.nota),
          dimension: c.dimension as DimensionType,
          actividad: c.actividad,
          comentario_docente: c.comentario_docente,
          comentario_ia: c.comentario_ia,
          id_periodo: c.id_periodo,
          periodo: c.periodo,
        }));

      return {
        id_matricula: m.id_matricula,
        id_estudiante: m.id_estudiante,
        nombre_completo: m.usuarios.nombre_completo,
        email: m.usuarios.email,
        grades: studentGrades,
      };
    });

    return { success: true, data: list };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al cargar planilla de notas.';
    return { success: false, error: msg };
  }
}

export type BulkImportError = {
  row: number;
  error: string;
};

export type BulkImportResponse = {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: BulkImportError[];
  error?: string;
};

/**
 * Genera una plantilla CSV con los estudiantes matriculados para calificar sin conexión.
 */
export async function exportPlantillaDocente(
  idAsignacion: string,
  idPeriodo: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Validar sesión del docente
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.rol !== 'DOCENTE') {
      return { success: false, error: 'Acceso denegado. Solo docentes pueden descargar esta plantilla.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'No se encontró tu institución asociada.' };
    }

    // 2. Validar propiedad de la asignación académica
    const { data: asignacion, error: asigError } = await supabase
      .from('asignaciones_academicas')
      .select('id_curso, ano_lectivo')
      .eq('id_asignacion', idAsignacion)
      .eq('id_docente', user.id)
      .maybeSingle();

    if (asigError || !asignacion) {
      return { success: false, error: 'No tienes permisos de docente sobre esta asignación o no existe.' };
    }

    // 3. Obtener los alumnos matriculados en este curso
    const { data: matriculas, error: matError } = await supabase
      .from('estudiantes_matriculados')
      .select(`
        id_matricula,
        usuarios!inner (nombre_completo)
      `)
      .eq('id_curso', asignacion.id_curso)
      .eq('ano_lectivo', asignacion.ano_lectivo);

    if (matError || !matriculas) {
      return { success: false, error: 'Error al consultar estudiantes matriculados en el curso.' };
    }

    // 4. Construir CSV en memoria
    let csv = 'id_institucion,id_matricula,id_asignacion,id_periodo,nombre_estudiante,nota_saber,nota_hacer,nota_ser,observaciones\n';
    
    matriculas.forEach((m: any) => {
      const nombreEscapado = m.usuarios.nombre_completo.replace(/"/g, '""');
      csv += `${idInstitucion},${m.id_matricula},${idAsignacion},${idPeriodo},"${nombreEscapado}",,,,\n`;
    });

    return { success: true, data: csv };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al exportar plantilla de notas.';
    return { success: false, error: msg };
  }
}

/**
 * Procesa masivamente un archivo CSV subido por el docente para importar calificaciones de forma atómica.
 */
export async function importPlanillaDocente(
  csvContent: string
): Promise<BulkImportResponse> {
  try {
    const supabase = await createClient();

    // 1. Validar sesión del docente
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.rol !== 'DOCENTE') {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'Sesión no válida o no autorizado.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'No se encontró tu institución.' };
    }

    // Dividir líneas
    const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'El archivo está vacío o solo contiene la cabecera.' };
    }

    // Pre-cargar asignaciones del docente para validación en memoria
    const { data: teacherAsigs } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion')
      .eq('id_docente', user.id);
    const validAsigsSet = new Set(teacherAsigs?.map((a) => a.id_asignacion) || []);

    const errors: BulkImportError[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Guardar periodos mapeados en memoria para evitar consultas redundantes
    const periodMap = new Map<string, number>();

    // 2. Parser posicional
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Regex para separar comas respetando comillas
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ''));

      if (cols.length < 5) {
        errorCount++;
        errors.push({ row: i + 1, error: 'Estructura de columnas inválida en la fila.' });
        continue;
      }

      const rowInstId = cols[0];
      const rowMatriculaId = cols[1];
      const rowAsignacionId = cols[2];
      const rowPeriodoId = cols[3];
      const rowNombre = cols[4];
      const notaSaberStr = cols[5];
      const notaHacerStr = cols[6];
      const notaSerStr = cols[7];
      const observaciones = cols[8] || null;

      // A. Validar Tenant
      if (rowInstId !== idInstitucion) {
        errorCount++;
        errors.push({ row: i + 1, error: `La fila no pertenece a esta institución (ID: ${rowInstId}).` });
        continue;
      }

      // B. Validar pertenencia de la asignación
      if (!validAsigsSet.has(rowAsignacionId)) {
        errorCount++;
        errors.push({ row: i + 1, error: 'No tienes permisos de docente sobre la asignación especificada.' });
        continue;
      }

      // C. Validar Periodo
      let numeroPeriodo: number;
      const cachedPeriod = periodMap.get(rowPeriodoId);
      if (cachedPeriod === undefined) {
        const { data: per, error: perError } = await supabase
          .from('periodos_academicos')
          .select('numero_periodo')
          .eq('id_periodo', rowPeriodoId)
          .maybeSingle();

        if (perError || !per) {
          errorCount++;
          errors.push({ row: i + 1, error: `El periodo ID (${rowPeriodoId}) no existe o no es válido.` });
          continue;
        }
        const num = per.numero_periodo ?? 1;
        numeroPeriodo = num;
        periodMap.set(rowPeriodoId, num);
      } else {
        numeroPeriodo = cachedPeriod;
      }

      // D. Helper para guardar o actualizar nota por dimensión
      const upsertDimension = async (
        notaStr: string,
        dim: DimensionType
      ): Promise<{ ok: boolean; error?: string }> => {
        if (!notaStr) return { ok: true }; // Celda vacía, omitir

        const score = parseFloat(notaStr);
        if (isNaN(score) || score < 0.0 || score > 5.0) {
          return { ok: false, error: `Nota ${dim} (${notaStr}) fuera del rango válido (0.0 - 5.0).` };
        }

        // Buscar si ya existe la nota de esta actividad de plantilla
        const { data: existing } = await supabase
          .from('calificaciones')
          .select('id_calificacion')
          .eq('id_matricula', rowMatriculaId)
          .eq('id_asignacion', rowAsignacionId)
          .eq('id_periodo', rowPeriodoId)
          .eq('actividad', 'Consolidado_Plantilla')
          .eq('dimension', dim)
          .maybeSingle();

        if (existing) {
          const { error: uErr } = await supabase
            .from('calificaciones')
            .update({
              nota: score,
              comentario_docente: observaciones,
              fecha_registro: new Date().toISOString()
            })
            .eq('id_calificacion', existing.id_calificacion);

          if (uErr) return { ok: false, error: `Error al actualizar nota: ${uErr.message}` };
        } else {
          const { error: iErr } = await supabase
            .from('calificaciones')
            .insert({
              id_matricula: rowMatriculaId,
              id_asignacion: rowAsignacionId,
              id_periodo: rowPeriodoId,
              periodo: numeroPeriodo,
              dimension: dim,
              actividad: 'Consolidado_Plantilla',
              nota: score,
              comentario_docente: observaciones,
              id_institucion: idInstitucion,
              fecha_registro: new Date().toISOString()
            });

          if (iErr) return { ok: false, error: `Error al registrar nota: ${iErr.message}` };
        }

        return { ok: true };
      };

      // Procesar dimensiones de forma secuencial
      try {
        const resSaber = await upsertDimension(notaSaberStr, 'SABER');
        if (!resSaber.ok) {
          errorCount++;
          errors.push({ row: i + 1, error: resSaber.error || '' });
          continue;
        }

        const resHacer = await upsertDimension(notaHacerStr, 'HACER');
        if (!resHacer.ok) {
          errorCount++;
          errors.push({ row: i + 1, error: resHacer.error || '' });
          continue;
        }

        const resSer = await upsertDimension(notaSerStr, 'SER');
        if (!resSer.ok) {
          errorCount++;
          errors.push({ row: i + 1, error: resSer.error || '' });
          continue;
        }

        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push({ row: i + 1, error: err.message || 'Error al procesar notas.' });
      }
    }

    return {
      success: true,
      successCount,
      errorCount,
      errors
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al importar la plantilla.';
    return { success: false, successCount: 0, errorCount: 0, errors: [], error: msg };
  }
}
