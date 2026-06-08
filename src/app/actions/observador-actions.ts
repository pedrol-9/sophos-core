'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { revalidatePath } from 'next/cache';

export type ObservadorRecord = {
  id_observador: string;
  tipo_nota: 'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO';
  observacion_informal: string;
  observacion_formal_ia: string | null;
  fecha_registro: string | null;
  firmado: boolean;
  fecha_firma: string | null;
  firmado_por: string | null;
  docenteNombre: string;
  firmadorNombre?: string;
};

/**
 * Registra una anotación en el observador digital del estudiante.
 * Utiliza Gemini para formalizar pedagógicamente la nota.
 */
export async function createObservacion(
  idEstudiante: string,
  tipoNota: 'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO',
  observacionInformal: string
): Promise<{ success: boolean; idObservador?: string; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Sesión inválida o expirada.' };
    }

    const idInstitucion = user.app_metadata?.id_institucion;
    const rol = user.app_metadata?.rol;

    if (!idInstitucion) {
      return { success: false, error: 'No se encontró la institución del usuario.' };
    }

    if (rol !== 'DOCENTE' && rol !== 'ADMIN') {
      return { success: false, error: 'Acceso denegado. Solo docentes o administradores pueden registrar observaciones.' };
    }

    // 1. Obtener el nombre del alumno para darle contexto a la IA
    const { data: estudianteData } = await supabase
      .from('usuarios')
      .select('nombre_completo')
      .eq('id_usuario', idEstudiante)
      .maybeSingle();

    const studentName = estudianteData?.nombre_completo || 'el estudiante';

    // 2. Llamada a Gemini para formalizar y pulir la observación informal
    let observacionFormalIa = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && observacionInformal.trim()) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
        Actúa como un Asesor Pedagógico y psicólogo escolar de IA para un colegio.
        Toma la siguiente anotación de comportamiento (escrita por un docente de forma informal) y transcríbela a un formato profesional, neutral, pedagógico y constructivo (en español).

        INFORMACIÓN:
        - Estudiante: ${studentName}
        - Tipo de Nota: ${tipoNota === 'DISCIPLINARIA' ? 'Falta Disciplinaria' : tipoNota === 'LOGRO_DESTACADO' ? 'Reconocimiento / Logro destacado' : 'Observación Pedagógica'}
        - Anotación del docente: "${observacionInformal}"

        INSTRUCCIONES DE REDACCIÓN:
        1. Mantén la objetividad de los hechos, pero elimina cualquier tono de enojo, sarcasmo o frustración personal.
        2. Corrige la ortografía y mejora la cohesión del texto.
        3. Enfatiza las implicaciones formativas del comportamiento observado.
        4. Si es una anotación disciplinaria o pedagógica de mejora, concluye con un llamado al acompañamiento familiar de forma empática y constructiva.
        5. Mantén la redacción concisa y al grano (máximo 4 frases cortas, no más de 300 caracteres).
        6. NO uses formato markdown (evita negritas, asteriscos, guiones, listas). Entrega solo la transcripción limpia en un párrafo único.
        `;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        observacionFormalIa = aiResponse.text?.trim() || '';
      } catch (err) {
        console.error("Gemini failed, fallback to original comment:", err);
        observacionFormalIa = observacionInformal;
      }
    } else {
      observacionFormalIa = observacionInformal;
    }

    // 3. Insertar el registro
    const { data, error } = await supabase
      .from('observador_digital')
      .insert({
        id_institucion: idInstitucion,
        id_estudiante: idEstudiante,
        id_docente: user.id,
        tipo_nota: tipoNota,
        observacion_informal: observacionInformal,
        observacion_formal_ia: observacionFormalIa || null,
        fecha_registro: new Date().toISOString(),
        firmado: false,
        fecha_firma: null,
        firmado_por: null
      })
      .select('id_observador')
      .single();

    if (error) {
      return { success: false, error: `Error al registrar en el observador: ${error.message}` };
    }

    revalidatePath('/dashboard/docente');
    return { success: true, idObservador: data.id_observador };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error interno del servidor.' };
  }
}

/**
 * Obtiene todas las anotaciones de observador del estudiante seleccionado.
 */
export async function getStudentObservations(
  idEstudiante: string
): Promise<{ data?: ObservadorRecord[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: 'Sesión inválida o expirada.' };
    }

    const { data, error } = await supabase
      .from('observador_digital')
      .select(`
        id_observador,
        tipo_nota,
        observacion_informal,
        observacion_formal_ia,
        fecha_registro,
        firmado,
        fecha_firma,
        firmado_por,
        docente:usuarios!observador_digital_id_docente_fkey (nombre_completo),
        firmador:usuarios!observador_digital_firmado_por_fkey (nombre_completo)
      `)
      .eq('id_estudiante', idEstudiante)
      .order('fecha_registro', { ascending: false });

    if (error) {
      return { error: `Error al cargar observador: ${error.message}` };
    }

    const records: ObservadorRecord[] = (data || []).map((o: any) => ({
      id_observador: o.id_observador,
      tipo_nota: o.tipo_nota,
      observacion_informal: o.observacion_informal,
      observacion_formal_ia: o.observacion_formal_ia,
      fecha_registro: o.fecha_registro,
      firmado: o.firmado,
      fecha_firma: o.fecha_firma,
      firmado_por: o.firmado_por,
      docenteNombre: o.docente?.nombre_completo || 'Docente/Coordinador',
      firmadorNombre: o.firmador?.nombre_completo
    }));

    return { data: records };
  } catch (err: any) {
    return { error: err.message || 'Error interno del servidor.' };
  }
}

/**
 * Permite al acudiente firmar digitalmente una observación de su acudido.
 */
export async function signObservacion(
  idObservador: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Sesión inválida o expirada.' };
    }

    const rol = user.app_metadata?.rol;
    if (rol !== 'ACUDIENTE') {
      return { success: false, error: 'Acceso denegado. Solo acudientes pueden firmar anotaciones.' };
    }

    // 1. Obtener la anotación para validar el estudiante
    const { data: obs, error: obsError } = await supabase
      .from('observador_digital')
      .select('id_estudiante, firmado')
      .eq('id_observador', idObservador)
      .maybeSingle();

    if (obsError || !obs) {
      return { success: false, error: 'No se encontró la observación correspondiente.' };
    }

    if (obs.firmado) {
      return { success: false, error: 'Esta anotación ya ha sido firmada previamente.' };
    }

    // 2. Validar que el estudiante pertenece a los acudidos de este usuario
    const { data: relation, error: relError } = await supabase
      .from('perfiles_acudientes_estudiantes')
      .select('id_acudiente_estudiante')
      .eq('id_acudiente', user.id)
      .eq('id_estudiante', obs.id_estudiante)
      .maybeSingle();

    if (relError || !relation) {
      return { success: false, error: 'Acceso denegado. No tienes autorización para firmar por este alumno.' };
    }

    // 3. Registrar la firma
    const { error: updateError } = await supabase
      .from('observador_digital')
      .update({
        firmado: true,
        fecha_firma: new Date().toISOString(),
        firmado_por: user.id
      })
      .eq('id_observador', idObservador);

    if (updateError) {
      return { success: false, error: `Error al registrar firma: ${updateError.message}` };
    }

    revalidatePath('/dashboard/acudiente');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error interno del servidor.' };
  }
}
