'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/utils/supabase/server';

export type AcademicAssignment = {
  id_asignacion: string;
  id_curso: string;
  id_materia: string;
  ano_lectivo: number;
  cursos: { id_curso: string; nombre: string } | null;
  materias: { id_materia: string; nombre: string; area: string } | null;
};

export type CourseStudent = {
  id_matricula: string;
  id_estudiante: string;
  nombre_completo: string;
  email: string;
  grades: {
    id_calificacion: string;
    nota: number;
    periodo: number;
    comentario_docente: string | null;
    comentario_ia: string | null;
  }[];
  absencesCount: number;
};

/**
 * Obtiene las asignaciones académicas (curso y materia) del docente autenticado.
 */
export async function getTeacherAssignments(): Promise<{ data?: AcademicAssignment[]; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión no válida. Por favor, inicia sesión nuevamente.' };
  }

  const rol = user.app_metadata?.rol;
  if (rol !== 'DOCENTE') {
    return { error: 'Acceso denegado. Solo los docentes pueden realizar esta acción.' };
  }

  const { data, error } = await supabase
    .from('asignaciones_academicas')
    .select(`
      id_asignacion,
      id_curso,
      id_materia,
      ano_lectivo,
      cursos (id_curso, nombre),
      materias (id_materia, nombre, area)
    `)
    .eq('id_docente', user.id)
    .eq('ano_lectivo', new Date().getFullYear());

  if (error) {
    return { error: `Error al cargar asignaciones: ${error.message}` };
  }

  return { data: data as unknown as AcademicAssignment[] };
}

/**
 * Obtiene los estudiantes matriculados en un curso, junto con sus calificaciones y faltas para una asignación.
 */
export async function getCourseStudents(
  idCurso: string,
  idAsignacion: string
): Promise<{ data?: CourseStudent[]; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión no válida. Por favor, inicia sesión nuevamente.' };
  }

  // 1. Obtener los estudiantes matriculados en este curso
  const { data: matriculas, error: matriculasError } = await supabase
    .from('estudiantes_matriculados')
    .select(`
      id_matricula,
      id_estudiante,
      usuarios!inner (nombre_completo, email)
    `)
    .eq('id_curso', idCurso)
    .eq('ano_lectivo', new Date().getFullYear());

  if (matriculasError) {
    return { error: `Error al cargar estudiantes: ${matriculasError.message}` };
  }

  if (!matriculas || matriculas.length === 0) {
    return { data: [] };
  }

  // 2. Obtener todas las calificaciones de esta asignación
  const { data: calificaciones, error: gradesError } = await supabase
    .from('calificaciones')
    .select('id_calificacion, nota, periodo, comentario_docente, comentario_ia, id_matricula')
    .eq('id_asignacion', idAsignacion);

  if (gradesError) {
    return { error: `Error al cargar calificaciones: ${gradesError.message}` };
  }

  // 3. Obtener el historial de inasistencias de esta asignación
  const { data: asistencias, error: asistError } = await supabase
    .from('asistencias')
    .select('id_matricula, estado')
    .eq('id_asignacion', idAsignacion)
    .in('estado', ['FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA']);

  if (asistError) {
    return { error: `Error al cargar asistencias: ${asistError.message}` };
  }

  // 4. Mapear todo
  const students: CourseStudent[] = matriculas.map((m: any) => {
    const studentGrades = (calificaciones || [])
      .filter(g => g.id_matricula === m.id_matricula)
      .map(g => ({
        id_calificacion: g.id_calificacion,
        nota: g.nota,
        periodo: g.periodo,
        comentario_docente: g.comentario_docente,
        comentario_ia: g.comentario_ia
      }));

    const studentAbsences = (asistencias || []).filter(a => a.id_matricula === m.id_matricula).length;

    return {
      id_matricula: m.id_matricula,
      id_estudiante: m.id_estudiante,
      nombre_completo: m.usuarios.nombre_completo,
      email: m.usuarios.email,
      grades: studentGrades,
      absencesCount: studentAbsences
    };
  });

  return { data: students };
}

/**
 * Guarda o actualiza una calificación de un estudiante.
 * Retorna el ID de la calificación guardada para disparar la IA.
 */
export async function saveGrade(
  idAsignacion: string,
  idMatricula: string,
  nota: number,
  periodo: number,
  comentarioDocente?: string
): Promise<{ data?: { id_calificacion: string }; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión no válida. Por favor, inicia sesión nuevamente.' };
  }

  // Validaciones
  if (nota < 0 || nota > 5) {
    return { error: 'La calificación debe estar en el rango de 0.0 a 5.0.' };
  }

  if (periodo < 1 || periodo > 4) {
    return { error: 'El periodo debe estar entre 1 y 4.' };
  }

  const idInstitucion = user.app_metadata?.id_institucion;
  if (!idInstitucion) {
    return { error: 'No se encontró la institución en tu sesión.' };
  }

  // Validar propiedad de la asignación (que pertenezca a este docente)
  const { data: asignacion, error: checkError } = await supabase
    .from('asignaciones_academicas')
    .select('id_asignacion')
    .eq('id_asignacion', idAsignacion)
    .eq('id_docente', user.id)
    .maybeSingle();

  if (checkError || !asignacion) {
    return { error: 'No tienes permisos para calificar en esta asignatura/curso.' };
  }

  // Verificar si ya existe una nota para este estudiante, periodo y asignación
  const { data: existing, error: findError } = await supabase
    .from('calificaciones')
    .select('id_calificacion')
    .eq('id_matricula', idMatricula)
    .eq('id_asignacion', idAsignacion)
    .eq('periodo', periodo)
    .maybeSingle();

  if (findError) {
    return { error: `Error de base de datos: ${findError.message}` };
  }

  let resultId = '';

  if (existing) {
    // Actualizar nota existente
    const { data: updated, error: updateError } = await supabase
      .from('calificaciones')
      .update({
        nota,
        comentario_docente: comentarioDocente || null,
        fecha_registro: new Date().toISOString()
      })
      .eq('id_calificacion', existing.id_calificacion)
      .select('id_calificacion')
      .single();

    if (updateError) {
      return { error: `Error al actualizar nota: ${updateError.message}` };
    }
    resultId = updated.id_calificacion;
  } else {
    // Crear nueva nota
    const { data: inserted, error: insertError } = await supabase
      .from('calificaciones')
      .insert({
        id_matricula: idMatricula,
        id_asignacion: idAsignacion,
        periodo,
        nota,
        comentario_docente: comentarioDocente || null,
        id_institucion: idInstitucion,
        fecha_registro: new Date().toISOString()
      })
      .select('id_calificacion')
      .single();

    if (insertError) {
      return { error: `Error al guardar nota: ${insertError.message}` };
    }
    resultId = inserted.id_calificacion;
  }

  return { data: { id_calificacion: resultId } };
}

/**
 * Guarda el reporte de asistencia diaria de un curso (solo registra las faltas).
 */
export async function saveAttendance(
  idAsignacion: string,
  fecha: string,
  absences: Array<{ idMatricula: string; estado: 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA'; observacion?: string }>
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Sesión no válida. Por favor, inicia sesión nuevamente.' };
  }

  const idInstitucion = user.app_metadata?.id_institucion;
  if (!idInstitucion) {
    return { error: 'No se encontró la institución en tu sesión.' };
  }

  // Validar propiedad de la asignación
  const { data: asignacion, error: checkError } = await supabase
    .from('asignaciones_academicas')
    .select('id_asignacion')
    .eq('id_asignacion', idAsignacion)
    .eq('id_docente', user.id)
    .maybeSingle();

  if (checkError || !asignacion) {
    return { error: 'No tienes permisos para registrar asistencia en este curso.' };
  }

  // 1. Eliminar asistencia previa en esta asignación y fecha (para re-escribir el reporte diario)
  const { error: deleteError } = await supabase
    .from('asistencias')
    .delete()
    .eq('id_asignacion', idAsignacion)
    .eq('fecha', fecha);

  if (deleteError) {
    return { error: `Error al actualizar reporte de asistencia: ${deleteError.message}` };
  }

  // 2. Si no hay faltas reportadas, terminar con éxito (el resto se asume presente)
  if (absences.length === 0) {
    return { success: true };
  }

  // 3. Insertar las inasistencias
  const recordsToInsert = absences.map(a => ({
    id_asignacion: idAsignacion,
    id_matricula: a.idMatricula,
    fecha,
    estado: a.estado,
    observacion: a.observacion || null,
    id_institucion: idInstitucion
  }));

  const { error: insertError } = await supabase
    .from('asistencias')
    .insert(recordsToInsert);

  if (insertError) {
    return { error: `Error al registrar inasistencias: ${insertError.message}` };
  }

  return { success: true };
}
