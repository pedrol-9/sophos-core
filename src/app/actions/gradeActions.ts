'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/supabase';
import { getEvidenciasForAsignacion, getGradesheetByEvidencias } from '@/app/actions/evidenciasActions';

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
 * @deprecated en favor de upsertCalificacionEvidencia de evidenciasActions
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
 * @deprecated en favor de getGradesheetByEvidencias
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
 * Adaptado para el nuevo sistema de evidencias por periodo.
 * Esta plantilla contiene únicamente datos editables y no expone identificadores únicos.
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

    // 3. Obtener evidencias activas para el periodo
    const evRes = await getEvidenciasForAsignacion(idAsignacion, idPeriodo);
    if (!evRes.success || !evRes.data) {
      return { success: false, error: evRes.error || 'No se pudieron obtener evidencias.' };
    }
    const activeEvidencias = evRes.data.filter((e) => e.activaEnPeriodo);
    if (activeEvidencias.length === 0) {
      return { success: false, error: 'No hay evidencias activas configuradas para este periodo. Por favor confíguralas en la planilla primero.' };
    }

    // 4. Obtener planilla de estudiantes y sus notas actuales
    const studentRes = await getGradesheetByEvidencias(asignacion.id_curso, idAsignacion, idPeriodo);
    if (!studentRes.success || !studentRes.data) {
      return { success: false, error: studentRes.error || 'Error al consultar planilla de estudiantes.' };
    }

    // 5. Construir CSV en memoria
    const headers = [
      'email',
      'nombre_estudiante',
      ...activeEvidencias.map((e) => `"${e.nombre.replace(/"/g, '""')}"`),
      'observaciones'
    ];
    let csv = headers.join(',') + '\n';
    
    studentRes.data.forEach((student) => {
      const email = student.email || '';
      const nombreEscapado = student.nombre_completo.replace(/"/g, '""');
      
      const gradeValues = activeEvidencias.map((ev) => {
        const gradeRow = student.grades[ev.id_evidencia];
        return gradeRow && gradeRow.nota !== null ? gradeRow.nota.toFixed(1) : '';
      });

      // Buscar primera observación que exista para el estudiante
      let obs = '';
      for (const ev of activeEvidencias) {
        const gradeRow = student.grades[ev.id_evidencia];
        if (gradeRow?.comentario_docente) {
          obs = gradeRow.comentario_docente;
          break;
        }
      }
      const obsEscapado = obs ? `"${obs.replace(/"/g, '""')}"` : '';

      csv += `${email},"${nombreEscapado}",${gradeValues.join(',')},${obsEscapado}\n`;
    });

    return { success: true, data: csv };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al exportar plantilla de notas.';
    return { success: false, error: msg };
  }
}

/**
 * Procesa masivamente un archivo CSV subido por el docente para importar calificaciones de forma atómica.
 * Cruza la información mediante el correo electrónico del estudiante para asociar con su id_matricula.
 * Mapea las columnas dinámicas a sus respectivas evidencias configuradas y activas.
 * Utiliza bulk upsert en una sola transacción para maximizar el rendimiento.
 */
export async function importPlanillaDocente(
  idAsignacion: string,
  idPeriodo: string,
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

    // 2. Pre-cargar asignaciones del docente y verificar permisos
    const { data: teacherAsigs } = await supabase
      .from('asignaciones_academicas')
      .select('id_asignacion, id_curso')
      .eq('id_docente', user.id);
    
    const currentAsig = teacherAsigs?.find((a) => a.id_asignacion === idAsignacion);
    if (!currentAsig) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'No tienes permisos de docente sobre la asignación especificada.' };
    }

    // 3. Obtener las evidencias activas para el periodo
    const evRes = await getEvidenciasForAsignacion(idAsignacion, idPeriodo);
    if (!evRes.success || !evRes.data) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: evRes.error || 'No se pudieron obtener evidencias.' };
    }
    const activeEvidencias = evRes.data.filter((e) => e.activaEnPeriodo);
    if (activeEvidencias.length === 0) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'No hay evidencias activas configuradas para este periodo.' };
    }

    // 4. Obtener los alumnos matriculados en este curso para cruzar por email
    const { data: matriculas, error: matError } = await supabase
      .from('estudiantes_matriculados')
      .select(`
        id_matricula,
        usuarios!inner (email)
      `)
      .eq('id_curso', currentAsig.id_curso)
      .eq('ano_lectivo', new Date().getFullYear());

    if (matError || !matriculas) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'Error al consultar estudiantes matriculados en el curso.' };
    }

    // Crear mapa de email -> id_matricula
    const emailToMatriculaMap = new Map<string, string>();
    matriculas.forEach((m: any) => {
      let email: string | null = null;
      if (m.usuarios) {
        if (Array.isArray(m.usuarios)) {
          email = m.usuarios[0]?.email || null;
        } else {
          email = (m.usuarios as any).email || null;
        }
      }
      if (email) {
        emailToMatriculaMap.set(email.toLowerCase().trim(), m.id_matricula);
      }
    });

    // 5. Obtener el número entero del período activo para compatibilidad
    const { data: per, error: perError } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo')
      .eq('id_periodo', idPeriodo)
      .maybeSingle();

    if (perError || !per) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'El período académico especificado no es válido.' };
    }

    // Verificar si el periodo está cerrado
    const { data: activePer } = await supabase
      .from('periodos_academicos')
      .select('numero_periodo')
      .eq('id_institucion', idInstitucion)
      .eq('activo', true)
      .maybeSingle();

    if (activePer && per.numero_periodo < activePer.numero_periodo) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'No se permite importar calificaciones para periodos académicos cerrados.' };
    }

    const numeroPeriodo = per.numero_periodo ?? 1;

    // 6. Obtener calificaciones previas registradas para esta asignación y período para optimizar en memoria
    const { data: existingCalificaciones, error: queryErr } = await supabase
      .from('calificaciones')
      .select('id_calificacion, id_matricula, id_evidencia')
      .eq('id_asignacion', idAsignacion)
      .eq('id_periodo', idPeriodo)
      .not('id_evidencia', 'is', null);

    if (queryErr) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'Error al verificar calificaciones preexistentes.' };
    }

    // Construir mapa en memoria de: "id_matricula-id_evidencia" -> id_calificacion
    const existingGradesMap = new Map<string, string>();
    existingCalificaciones?.forEach((c) => {
      if (c.id_evidencia) {
        existingGradesMap.set(`${c.id_matricula}-${c.id_evidencia}`, c.id_calificacion);
      }
    });

    // 7. Parsear cabecera para mapear columnas de evidencias
    const headerLine = lines[0];
    const headers = headerLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((h) => h.trim().replace(/^"|"$/g, ''));

    // Encontrar índices clave
    const emailIdx = headers.findIndex((h) => h.toLowerCase() === 'email');
    const obsIdx = headers.findIndex((h) => h.toLowerCase() === 'observaciones');

    if (emailIdx === -1) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'El archivo CSV no contiene la columna obligatoria "email".' };
    }

    // Mapear cada columna a su correspondiente id_evidencia
    // Columna idx -> id_evidencia
    const columnToEvidenciaMap = new Map<number, string>();
    
    headers.forEach((header, idx) => {
      if (idx === emailIdx || idx === obsIdx || header.toLowerCase() === 'nombre_estudiante') {
        return;
      }
      // Buscar evidencia cuyo nombre coincida
      const ev = activeEvidencias.find((e) => e.nombre.toLowerCase().trim() === header.toLowerCase().trim());
      if (ev) {
        columnToEvidenciaMap.set(idx, ev.id_evidencia);
      }
    });

    if (columnToEvidenciaMap.size === 0) {
      return { success: false, successCount: 0, errorCount: 0, errors: [], error: 'No se encontraron columnas que coincidan con las evidencias activas de este periodo.' };
    }

    const recordsToUpsert: any[] = [];
    const errors: BulkImportError[] = [];
    let successCount = 0;
    let errorCount = 0;

    // 8. Parser posicional del CSV
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^"|"$/g, ''));

      if (cols.length <= emailIdx) {
        errorCount++;
        errors.push({ row: i + 1, error: 'Línea vacía o sin email.' });
        continue;
      }

      const rowEmail = cols[emailIdx]?.toLowerCase().trim();
      const rowMatriculaId = emailToMatriculaMap.get(rowEmail);
      if (!rowMatriculaId) {
        errorCount++;
        errors.push({ row: i + 1, error: `El estudiante con email "${rowEmail}" no está matriculado en este curso.` });
        continue;
      }

      const observaciones = obsIdx !== -1 && cols[obsIdx] ? cols[obsIdx] : null;
      let rowHasError = false;

      // Iterar sobre las columnas de evidencias mapeadas
      columnToEvidenciaMap.forEach((idEvidencia, colIdx) => {
        const notaStr = cols[colIdx];
        if (notaStr === undefined || notaStr === '') {
          return; // Celda vacía, omitir sin error
        }

        const score = parseFloat(notaStr);
        if (isNaN(score) || score < 0.0 || score > 5.0) {
          errors.push({ row: i + 1, error: `Nota fuera del rango válido (0.0 - 5.0): "${notaStr}"` });
          rowHasError = true;
          return;
        }

        const mapKey = `${rowMatriculaId}-${idEvidencia}`;
        const existingId = existingGradesMap.get(mapKey);

        recordsToUpsert.push({
          ...(existingId ? { id_calificacion: existingId } : {}),
          id_matricula: rowMatriculaId,
          id_asignacion: idAsignacion,
          id_periodo: idPeriodo,
          periodo: numeroPeriodo,
          id_evidencia: idEvidencia,
          actividad: 'evidencia',
          dimension: 'SABER',
          nota: score,
          comentario_docente: observaciones,
          id_institucion: idInstitucion,
          fecha_registro: new Date().toISOString()
        });
      });

      if (rowHasError) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    // 9. Ejecutar el Bulk Upsert en lote
    if (recordsToUpsert.length > 0) {
      const { error: upsertErr } = await supabase
        .from('calificaciones')
        .upsert(recordsToUpsert);

      if (upsertErr) {
        return { success: false, successCount: 0, errorCount: 0, errors: [], error: `Error al almacenar calificaciones: ${upsertErr.message}` };
      }
    }

    return {
      success: true,
      successCount,
      errorCount,
      errors
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al importar la planilla.';
    return { success: false, successCount: 0, errorCount: 0, errors: [], error: msg };
  }
}
