'use server';

export interface SyncSheetsResult {
  success: boolean;
  status?: string;
  periodo_procesado?: number;
  resumen?: {
    total_alumnos_procesados: number;
    total_calificaciones_guardadas: number;
    cursos_actualizados_en_este_cargue: string[];
    total_cursos_pendientes: number;
  };
  cursos_pendientes?: Array<{ curso: string; materia: string }>;
  advertencias?: Array<{ tipo?: string; mensaje: string }>;
  errores?: Array<{ tipo?: string; mensaje: string }>;
  error?: string;
}

export async function triggerSyncSheets(options?: { periodoNum?: number; spreadsheetId?: string }): Promise<SyncSheetsResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const targetUrl = `${supabaseUrl}/functions/v1/sync-grades-sheet`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (anonKey) {
      headers['Authorization'] = `Bearer ${anonKey}`;
      headers['apikey'] = anonKey;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        periodo_num: options?.periodoNum || null,
        spreadsheet_id: options?.spreadsheetId || null,
        timestamp: new Date().toISOString(),
      }),
      // Timeout después de 60 segundos
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `El servicio respondió con error ${response.status}: ${errorText || response.statusText}`,
      };
    }

    const data = await response.json();

    // Si la respuesta es un array, tomar el primer elemento
    const result = Array.isArray(data) ? data[0] : data;

    return {
      success: result?.status === 'success' || result?.status === 'partial_success',
      status: result?.status || 'success',
      periodo_procesado: result?.periodo_procesado,
      resumen: result?.resumen || {
        total_alumnos_procesados: 0,
        total_calificaciones_guardadas: 0,
        cursos_actualizados_en_este_cargue: [],
        total_cursos_pendientes: 0,
      },
      cursos_pendientes: result?.cursos_pendientes || [],
      advertencias: result?.advertencias || [],
      errores: result?.errores || [],
    };
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      return {
        success: false,
        error: 'La sincronización tardó más de 60 segundos. Verifica la conexión a Google Sheets.',
      };
    }

    return {
      success: false,
      error: `No se pudo conectar con el servicio de sincronización en ${targetUrl}. (${err.message})`,
    };
  }
}
