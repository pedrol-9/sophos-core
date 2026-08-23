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

export async function triggerN8nSyncSheets(options?: { periodoNum?: number; spreadsheetId?: string }): Promise<SyncSheetsResult> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/sync-sheets';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
        error: `El servidor de n8n respondió con error ${response.status}: ${errorText || response.statusText}`,
      };
    }

    const data = await response.json();

    // Si n8n devolvió un array (por ejemplo [ { status: 'success', ... } ]), tomamos el primer elemento
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
        error: 'La sincronización tardó más de 60 segundos. Verifica que n8n esté corriendo y conectado a Google Sheets.',
      };
    }

    return {
      success: false,
      error: `No se pudo conectar con n8n en ${webhookUrl}. Asegúrate de que el flujo en n8n esté en estado 'Active' y el contenedor Docker encendido. (${err.message})`,
    };
  }
}
