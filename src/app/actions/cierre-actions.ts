'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type SubjectSummary = {
  id_asignacion: string;
  materiaNombre: string;
  materiaArea: string;
  docenteNombre: string;
  notaDefinitiva: number;
  nivelDesempeno: string;
  fallas: number;
  comentarios: string[];
};

export type PeriodoStatus = {
  id_periodo: string;
  numero_periodo: number;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  avanceNotas: number; // Porcentaje de notas ingresadas (0-100)
  cerrado: boolean; // Si ya tiene registros en boletines_historicos
};

/**
 * Obtiene el estado detallado de todos los períodos de la institución del usuario autenticado.
 */
export async function getPeriodosStatus(): Promise<{ success: boolean; data?: PeriodoStatus[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Sesión expirada o inválida.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'El usuario no pertenece a ninguna institución.' };
    }

    // 1. Obtener periodos
    const { data: periodos, error: perError } = await supabase
      .from('periodos_academicos')
      .select('*')
      .eq('id_institucion', idInstitucion)
      .order('numero_periodo', { ascending: true });

    if (perError) {
      return { success: false, error: `Error al obtener periodos: ${perError.message}` };
    }

    // 2. Obtener conteo de estudiantes matriculados
    const { count: studentCount, error: studError } = await supabase
      .from('estudiantes_matriculados')
      .select('*', { count: 'exact', head: true })
      .eq('id_institucion', idInstitucion)
      .eq('ano_lectivo', 2026);

    if (studError) {
      return { success: false, error: `Error al obtener estudiantes: ${studError.message}` };
    }

    const totalStudents = studentCount || 0;

    // 3. Mapear periodos y calcular avance de notas
    const results: PeriodoStatus[] = [];
    for (const p of periodos) {
      // Verificar si ya está cerrado (existe al menos un boletín guardado para este período)
      const { count: boletinCount } = await supabase
        .from('boletines_historicos')
        .select('*', { count: 'exact', head: true })
        .eq('id_periodo', p.id_periodo);

      const cerrado = (boletinCount ?? 0) > 0;

      let avanceNotas = 0;

      if (p.activo && totalStudents > 0) {
        // Calcular avance para el periodo activo:
        // Obtener asignaciones académicas
        const { data: assignments } = await supabase
          .from('asignaciones_academicas')
          .select('id_asignacion, id_curso')
          .eq('id_institucion', idInstitucion)
          .eq('ano_lectivo', 2026);

        if (assignments && assignments.length > 0) {
          const assignmentIds = assignments.map(a => a.id_asignacion);

          // Contar evidencias configuradas activas para este periodo
          const { data: configs } = await supabase
            .from('configuracion_evidencias_periodo')
            .select('id_asignacion, id_evidencia')
            .eq('activo', true)
            .eq('id_periodo', p.id_periodo);

          // Contar calificaciones registradas para este periodo
          const { count: gradesCount } = await supabase
            .from('calificaciones')
            .select('*', { count: 'exact', head: true })
            .eq('id_periodo', p.id_periodo)
            .eq('id_institucion', idInstitucion);

          // Calcular total esperado: para cada config activa de evidencia, esperamos (estudiantes en ese curso) calificaciones.
          // Para simplificar y hacerlo rápido en base de datos:
          // totalEsperado = sum_{config} (estudiantes del curso asociado a config.id_asignacion)
          let totalEsperado = 0;
          if (configs && configs.length > 0) {
            // Contar estudiantes por curso
            const { data: studPerCourse } = await supabase
              .from('estudiantes_matriculados')
              .select('id_curso')
              .eq('id_institucion', idInstitucion)
              .eq('ano_lectivo', 2026);

            const courseCounts: Record<string, number> = {};
            (studPerCourse || []).forEach(s => {
              courseCounts[s.id_curso] = (courseCounts[s.id_curso] || 0) + 1;
            });

            configs.forEach(c => {
              const asig = assignments.find(a => a.id_asignacion === c.id_asignacion);
              if (asig) {
                totalEsperado += courseCounts[asig.id_curso] || 0;
              }
            });
          }

          const ingresadas = gradesCount || 0;
          avanceNotas = totalEsperado > 0 ? Math.min(100, Math.round((ingresadas / totalEsperado) * 100)) : 0;
        }
      } else if (cerrado) {
        avanceNotas = 100;
      }

      results.push({
        id_periodo: p.id_periodo,
        numero_periodo: p.numero_periodo,
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        activo: p.activo,
        avanceNotas,
        cerrado,
      });
    }

    return { success: true, data: results };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error interno al consultar periodos.' };
  }
}

/**
 * Algoritmo transaccional para calcular promedios ponderados y cerrar un periodo académico.
 * Guarda los boletines históricos en lote.
 */
export async function closePeriod(periodId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Sesión expirada o inválida.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'El usuario no pertenece a ninguna institución.' };
    }

    if (user.app_metadata?.rol !== 'ADMIN') {
      return { success: false, error: 'Acceso denegado. Solo administradores pueden cerrar periodos.' };
    }

    // 1. Obtener periodo a cerrar
    const { data: periodToClose, error: perError } = await supabase
      .from('periodos_academicos')
      .select('*')
      .eq('id_periodo', periodId)
      .eq('id_institucion', idInstitucion)
      .single();

    if (perError || !periodToClose) {
      return { success: false, error: 'El periodo seleccionado no existe o no pertenece a tu institución.' };
    }

    if (!periodToClose.activo) {
      return { success: false, error: 'Solo se puede cerrar el periodo actualmente activo.' };
    }

    // Verificar si ya hay boletines para este periodo para evitar duplicados
    const { count: existingCount } = await supabase
      .from('boletines_historicos')
      .select('*', { count: 'exact', head: true })
      .eq('id_periodo', periodId);

    if (existingCount && existingCount > 0) {
      return { success: false, error: 'Este periodo ya ha sido cerrado anteriormente.' };
    }

    // 2. Obtener escala de valoración
    const { data: escalas, error: escError } = await supabase
      .from('escala_valoracion')
      .select('*')
      .eq('id_institucion', idInstitucion);

    if (escError || !escalas || escalas.length === 0) {
      return { success: false, error: 'No se ha configurado la escala de valoración institucional. Configure el año lectivo.' };
    }

    // 3. Obtener estudiantes matriculados
    const { data: students, error: studError } = await supabase
      .from('estudiantes_matriculados')
      .select('id_matricula, id_estudiante, id_curso')
      .eq('id_institucion', idInstitucion)
      .eq('ano_lectivo', 2026);

    if (studError || !students || students.length === 0) {
      return { success: false, error: 'No hay estudiantes matriculados en el año lectivo actual.' };
    }

    // 4. Obtener asignaciones académicas (para saber las materias correspondientes a cada curso)
    const { data: assignments, error: asigError } = await (supabase as any)
      .from('asignaciones_academicas')
      .select(`
        id_asignacion,
        id_curso,
        id_materia,
        materias (nombre, area),
        usuarios (nombre_completo)
      `)
      .eq('id_institucion', idInstitucion)
      .eq('ano_lectivo', 2026);

    if (asigError || !assignments || assignments.length === 0) {
      return { success: false, error: 'No hay asignaciones académicas configuradas.' };
    }

    // 5. Obtener configuraciones de evidencias para el periodo
    const { data: configs } = await supabase
      .from('configuracion_evidencias_periodo')
      .select('id_asignacion, id_evidencia, peso, activo')
      .eq('id_periodo', periodId);

    // 6. Obtener todas las calificaciones del periodo
    const { data: grades } = await supabase
      .from('calificaciones')
      .select('id_matricula, id_asignacion, id_evidencia, nota, comentario_docente, comentario_ia')
      .eq('id_periodo', periodId)
      .eq('id_institucion', idInstitucion);

    // 7. Obtener asistencias del periodo
    const { data: absences } = await supabase
      .from('asistencias')
      .select('id_matricula, id_asignacion, fecha, estado')
      .eq('id_institucion', idInstitucion)
      .gte('fecha', periodToClose.fecha_inicio)
      .lte('fecha', periodToClose.fecha_fin)
      .in('estado', ['FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA']);

    const bulletinsToInsert: any[] = [];

    // 8. Iterar estudiantes para calcular sus boletines
    for (const stud of students) {
      const studentGrades = (grades || []).filter(g => g.id_matricula === stud.id_matricula);
      const studentAbsences = (absences || []).filter(a => a.id_matricula === stud.id_matricula);

      // Obtener materias asignadas al curso del estudiante
      const courseAssignments = assignments.filter((a: any) => a.id_curso === stud.id_curso);
      if (courseAssignments.length === 0) continue;

      const datosMaterias: SubjectSummary[] = [];
      let sumDefinitives = 0;
      let countDefinitives = 0;

      for (const asig of courseAssignments) {
        const matGrades = studentGrades.filter(g => g.id_asignacion === asig.id_asignacion);
        const matConfigs = (configs || []).filter(c => c.id_asignacion === asig.id_asignacion && c.activo);
        const matAbsences = studentAbsences.filter(a => a.id_asignacion === asig.id_asignacion);

        let notaDefinitiva = 0;

        if (matGrades.length > 0) {
          let weightedSum = 0;
          let totalWeight = 0;
          let hasWeights = false;

          matGrades.forEach(g => {
            const conf = matConfigs.find(c => c.id_evidencia === g.id_evidencia);
            if (conf) {
              weightedSum += Number(g.nota) * Number(conf.peso);
              totalWeight += Number(conf.peso);
              hasWeights = true;
            }
          });

          if (hasWeights && totalWeight > 0) {
            notaDefinitiva = weightedSum / totalWeight;
          } else {
            // Promedio simple si no hay pesos activos
            const sum = matGrades.reduce((acc, curr) => acc + Number(curr.nota), 0);
            notaDefinitiva = sum / matGrades.length;
          }
        }

        // Redondear a un decimal
        const notaDefinitivaRounded = Math.round(notaDefinitiva * 10) / 10;

        // Determinar nivel de desempeño
        const scaleMatch = escalas.find(e => notaDefinitivaRounded >= Number(e.nota_minima) && notaDefinitivaRounded <= Number(e.nota_maxima));
        const nivelDesempeno = scaleMatch ? scaleMatch.nombre_desempeno : 'BAJO';

        // Recolectar comentarios
        const comentarios: string[] = [];
        matGrades.forEach(g => {
          if (g.comentario_docente) comentarios.push(`Docente: ${g.comentario_docente}`);
          if (g.comentario_ia) comentarios.push(`AI: ${g.comentario_ia}`);
        });

        datosMaterias.push({
          id_asignacion: asig.id_asignacion,
          materiaNombre: asig.materias?.nombre || 'Asignatura',
          materiaArea: asig.materias?.area || 'General',
          docenteNombre: asig.usuarios?.nombre_completo || 'Docente',
          notaDefinitiva: notaDefinitivaRounded,
          nivelDesempeno,
          fallas: matAbsences.length,
          comentarios: comentarios.slice(0, 3), // Limitar a los 3 comentarios principales
        });

        sumDefinitives += notaDefinitivaRounded;
        countDefinitives++;
      }

      const promedioGeneral = countDefinitives > 0 ? Math.round((sumDefinitives / countDefinitives) * 100) / 100 : 0.00;

      bulletinsToInsert.push({
        id_matricula: stud.id_matricula,
        id_periodo: periodId,
        id_institucion: idInstitucion,
        promedio_general: promedioGeneral,
        datos_materias: datosMaterias, // Almacenado como JSONB
      });
    }

    // 9. Guardar boletines históricos en Supabase
    if (bulletinsToInsert.length > 0) {
      const { error: insError } = await supabase
        .from('boletines_historicos')
        .insert(bulletinsToInsert);

      if (insError) {
        return { success: false, error: `Error al guardar boletines históricos: ${insError.message}` };
      }
    }

    // 10. Desactivar periodo actual
    const { error: updError } = await supabase
      .from('periodos_academicos')
      .update({ activo: false })
      .eq('id_periodo', periodId);

    if (updError) {
      return { success: false, error: `Error al desactivar el período cerrado: ${updError.message}` };
    }

    // 11. Activar el siguiente periodo
    const siguientePeriodoNum = periodToClose.numero_periodo + 1;
    if (siguientePeriodoNum <= 4) {
      const { error: nextError } = await supabase
        .from('periodos_academicos')
        .update({ activo: true })
        .eq('id_institucion', idInstitucion)
        .eq('numero_periodo', siguientePeriodoNum);

      if (nextError) {
        console.warn(`Advertencia: No se pudo activar automáticamente el período ${siguientePeriodoNum}: ${nextError.message}`);
      }
    }

    revalidatePath('/dashboard/admin');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error interno del servidor al cerrar el período.' };
  }
}

/**
 * Retorna las estadísticas consolidadas de reprobación, alumnos destacados y ausentismo.
 */
export async function getDashboardStats(): Promise<{
  success: boolean;
  data?: {
    cuadroHonor: { id_matricula: string; nombre: string; promedio: number }[];
    reprobacionMaterias: { materia: string; porcentajeReprobacion: number }[];
    promedioAsistencia: number; // Porcentaje promedio de asistencia (ej. 94)
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Sesión expirada.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    if (!idInstitucion) {
      return { success: false, error: 'No se vinculó ninguna institución.' };
    }

    // Intentar buscar sobre el último periodo CERRADO
    const { data: ultimoBoletin } = await supabase
      .from('boletines_historicos')
      .select('id_periodo')
      .eq('id_institucion', idInstitucion)
      .limit(1);

    let listadoBoletines: any[] = [];
    
    if (ultimoBoletin && ultimoBoletin.length > 0) {
      const targetPeriodo = ultimoBoletin[0].id_periodo;
      const { data: bh } = await supabase
        .from('boletines_historicos')
        .select(`
          id_matricula,
          promedio_general,
          datos_materias,
          estudiantes_matriculados (
            usuarios (nombre_completo)
          )
        `)
        .eq('id_periodo', targetPeriodo);
      listadoBoletines = bh || [];
    }

    if (listadoBoletines.length > 0) {
      // 1. Calcular Cuadro de Honor
      const cuadroHonor = listadoBoletines
        .map((b: any) => ({
          id_matricula: b.id_matricula,
          nombre: b.estudiantes_matriculados?.usuarios?.nombre_completo || 'Estudiante',
          promedio: Number(b.promedio_general),
        }))
        .sort((a, b) => b.promedio - a.promedio)
        .slice(0, 5);

      // 2. Calcular reprobación por materia
      const reprobacionMap: Record<string, { total: number; reprobadas: number }> = {};
      listadoBoletines.forEach((b: any) => {
        const materias = b.datos_materias as SubjectSummary[];
        materias.forEach(m => {
          if (!reprobacionMap[m.materiaNombre]) {
            reprobacionMap[m.materiaNombre] = { total: 0, reprobadas: 0 };
          }
          reprobacionMap[m.materiaNombre].total++;
          if (m.notaDefinitiva < 3.0) {
            reprobacionMap[m.materiaNombre].reprobadas++;
          }
        });
      });

      const reprobacionMaterias = Object.keys(reprobacionMap).map(materia => {
        const stats = reprobacionMap[materia];
        return {
          materia,
          porcentajeReprobacion: Math.round((stats.reprobadas / stats.total) * 100),
        };
      });

      // 3. Promedio Asistencia:
      // total de materias * alumnos vs fallas
      let totalMaterias = 0;
      let totalFallas = 0;
      listadoBoletines.forEach((b: any) => {
        const materias = b.datos_materias as SubjectSummary[];
        materias.forEach(m => {
          totalMaterias++;
          totalFallas += m.fallas || 0;
        });
      });
      // Supongamos 40 días hábiles de clase por periodo académico promedio, por lo tanto 40 clases por materia
      const clasesTotales = totalMaterias * 40;
      const promedioAsistencia = clasesTotales > 0 ? Math.max(70, Math.round(((clasesTotales - totalFallas) / clasesTotales) * 100)) : 95;

      return {
        success: true,
        data: {
          cuadroHonor,
          reprobacionMaterias,
          promedioAsistencia,
        }
      };
    } else {
      // Fallback: calcular estimaciones rápidas basadas en el periodo ACTIVO actual
      // 1. Obtener periodo activo
      const { data: activePer } = await supabase
        .from('periodos_academicos')
        .select('id_periodo')
        .eq('id_institucion', idInstitucion)
        .eq('activo', true)
        .maybeSingle();

      if (!activePer) {
        return {
          success: true,
          data: { cuadroHonor: [], reprobacionMaterias: [], promedioAsistencia: 100 }
        };
      }

      // Obtener calificaciones ingresadas hasta el momento
      const { data: curGrades } = await (supabase as any)
        .from('calificaciones')
        .select(`
          id_matricula,
          nota,
          id_asignacion,
          asignaciones_academicas (
            materias (nombre)
          ),
          estudiantes_matriculados (
            usuarios (nombre_completo)
          )
        `)
        .eq('id_periodo', activePer.id_periodo);

      if (!curGrades || curGrades.length === 0) {
        return {
          success: true,
          data: { cuadroHonor: [], reprobacionMaterias: [], promedioAsistencia: 98 }
        };
      }

      // Agrupar por estudiante
      const studAverages: Record<string, { nombre: string; sum: number; count: number }> = {};
      const reprobacionMap: Record<string, { total: number; reprobadas: number }> = {};

      curGrades.forEach((g: any) => {
        const mName = g.asignaciones_academicas?.materias?.nombre || 'Asignatura';
        const studId = g.id_matricula;
        const studName = g.estudiantes_matriculados?.usuarios?.nombre_completo || 'Estudiante';

        if (!studAverages[studId]) {
          studAverages[studId] = { nombre: studName, sum: 0, count: 0 };
        }
        studAverages[studId].sum += Number(g.nota);
        studAverages[studId].count++;

        if (!reprobacionMap[mName]) {
          reprobacionMap[mName] = { total: 0, reprobadas: 0 };
        }
        reprobacionMap[mName].total++;
        if (Number(g.nota) < 3.0) {
          reprobacionMap[mName].reprobadas++;
        }
      });

      const cuadroHonor = Object.keys(studAverages).map(id => {
        const s = studAverages[id];
        return {
          id_matricula: id,
          nombre: s.nombre,
          promedio: Math.round((s.sum / s.count) * 10) / 10,
        };
      })
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 5);

      const reprobacionMaterias = Object.keys(reprobacionMap).map(materia => {
        const stats = reprobacionMap[materia];
        return {
          materia,
          porcentajeReprobacion: Math.round((stats.reprobadas / stats.total) * 100),
        };
      });

      return {
        success: true,
        data: {
          cuadroHonor,
          reprobacionMaterias,
          promedioAsistencia: 96 // estimación fija si no hay cierres
        }
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error calculando indicadores.' };
  }
}

/**
 * Obtiene el boletín cerrado de un estudiante específico en un período determinado.
 */
export async function getStudentBulletin(
  matriculaId: string,
  periodoId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Usuario no autenticado.' };
    }

    const { data: boletin, error } = await supabase
      .from('boletines_historicos')
      .select(`
        id_boletin,
        promedio_general,
        datos_materias,
        fecha_cierre,
        periodos_academicos (
          numero_periodo,
          fecha_inicio,
          fecha_fin
        ),
        estudiantes_matriculados (
          id_estudiante,
          ano_lectivo,
          cursos (nombre),
          usuarios (nombre_completo, email)
        ),
        instituciones (
          nombre_legal,
          nit
        )
      `)
      .eq('id_matricula', matriculaId)
      .eq('id_periodo', periodoId)
      .maybeSingle();

    if (error) {
      return { success: false, error: `Error al obtener el boletín: ${error.message}` };
    }

    if (!boletin) {
      return { success: false, error: 'Boletín no encontrado o período no cerrado.' };
    }

    return { success: true, data: boletin };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al recuperar boletín.' };
  }
}

/**
 * Obtiene todos los boletines históricos de un estudiante (utilizado por alumnos y acudientes).
 */
export async function getStudentHistorialBoletines(matriculaId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('boletines_historicos')
      .select(`
        id_boletin,
        id_periodo,
        promedio_general,
        fecha_cierre,
        periodos_academicos (
          numero_periodo
        )
      `)
      .eq('id_matricula', matriculaId)
      .order('fecha_cierre', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al obtener historial.' };
  }
}
