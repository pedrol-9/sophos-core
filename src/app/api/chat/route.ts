import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { calificacionId } = await request.json();

    if (!calificacionId) {
      return NextResponse.json({ error: 'calificacionId es obligatorio.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Obtener la calificación con detalles del estudiante y la materia
    const { data: grade, error: gradeError } = await adminClient
      .from('calificaciones')
      .select(`
        id_calificacion,
        nota,
        periodo,
        comentario_docente,
        id_matricula,
        id_asignacion,
        id_institucion,
        estudiantes_matriculados!inner (
          id_estudiante,
          usuarios!inner (nombre_completo)
        ),
        asignaciones_academicas!inner (
          materias!inner (nombre)
        )
      `)
      .eq('id_calificacion', calificacionId)
      .maybeSingle();

    if (gradeError || !grade) {
      return NextResponse.json(
        { error: `Calificación no encontrada: ${gradeError?.message || 'ID inválido'}` },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentName = (grade as any).estudiantes_matriculados?.usuarios?.nombre_completo || 'Estudiante';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subjectName = (grade as any).asignaciones_academicas?.materias?.nombre || 'Asignatura';
    const currentGrade = grade.nota;
    const currentPeriod = grade.periodo;
    const teacherComment = grade.comentario_docente;

    // 2. Obtener el conteo de faltas acumuladas del estudiante para esta asignatura
    const { count: absencesCount } = await adminClient
      .from('asistencias')
      .select('*', { count: 'exact', head: true })
      .eq('id_matricula', grade.id_matricula)
      .eq('id_asignacion', grade.id_asignacion)
      .in('estado', ['FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA']);

    const totalAbsences = absencesCount || 0;

    // 3. Obtener notas anteriores de la misma asignatura y matrícula para evaluar tendencia
    const { data: previousGrades } = await adminClient
      .from('calificaciones')
      .select('nota, periodo')
      .eq('id_matricula', grade.id_matricula)
      .eq('id_asignacion', grade.id_asignacion)
      .neq('id_calificacion', calificacionId)
      .order('periodo', { ascending: true });

    const gradesHistoryText = previousGrades && previousGrades.length > 0
      ? previousGrades.map(pg => `Periodo ${pg.periodo}: ${pg.nota}`).join(', ')
      : 'Sin registros de periodos anteriores';

    // 4. Configurar la llamada a Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY no está configurada en las variables de entorno.");
      return NextResponse.json({ error: 'La clave de Gemini no está configurada en el servidor.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Elaborar el prompt contextual
    const prompt = `
    Actúa como un Asesor Académico de IA para Sophos Core, un portal de gestión educativa.
    Analiza el rendimiento del estudiante y genera un comentario breve, analítico y constructivo (en español).

    INFORMACIÓN DEL ESTUDIANTE:
    - Nombre del Alumno: ${studentName}
    - Materia: ${subjectName}
    - Calificación actual (Periodo ${currentPeriod}): ${currentGrade.toFixed(1)} de 5.0 (La nota mínima para pasar es 3.0)
    - Historial de notas anteriores en esta materia: ${gradesHistoryText}
    - Total de inasistencias acumuladas: ${totalAbsences} faltas reportadas.
    - Comentario del docente: "${teacherComment || 'Sin observaciones adicionales del profesor.'}"

    INSTRUCCIONES PARA EL COMENTARIO:
    1. Debe estar redactado en español neutro, dirigido al estudiante.
    2. Debe ser directo y breve (máximo 3 frases cortas, no más de 250 caracteres en total).
    3. Analiza la tendencia (si mejora o empeora) y el impacto de las faltas si son altas (más de 3 faltas es preocupante).
    4. Proporciona una recomendación puntual de mejora o de motivación.
    5. NO uses formato markdown (nada de negritas, viñetas ni asteriscos). NO uses comillas externas ni respondas con introducciones como "Aquí tienes tu comentario:". Entrega únicamente el comentario limpio.
    `;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const aiComment = aiResponse.text?.trim() || 'No se pudo generar retroalimentación en este momento.';

    // 5. Guardar la retroalimentación de la IA en la base de datos
    const { error: updateError } = await adminClient
      .from('calificaciones')
      .update({ comentario_ia: aiComment })
      .eq('id_calificacion', calificacionId);

    if (updateError) {
      return NextResponse.json({ error: `Error al guardar comentario de IA: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, comentario_ia: aiComment });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno desconocido';
    console.error("Gemini route error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
