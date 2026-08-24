// Supabase Edge Function: sync-grades-sheet
// Deno runtime - Ejecuta en el edge de Supabase

// @ts-ignore: Deno npm specifier
import { createClient } from "npm:@supabase/supabase-js@2";

// Declaración de tipos para Deno en editores sin extensión Deno
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SheetItemRow {
  sheetName: string;
  materia: string;
  curso: string;
  estudiante: string;
  email: string;
  row_number: number;
  notas: {
    bimestral: number | null;
    actitudinal: number | null;
    cuaderno: number | null;
    evidencia_1: number | null;
    evidencia_2: number | null;
    evidencia_3: number | null;
    definitiva: number | null;
  };
  status: "VALID_ROW";
}

interface ParsedSheetTitle {
  materia: string;
  curso: string;
}

// 1. Parser para los títulos de las pestañas
function parseSheetTitle(title: string): ParsedSheetTitle | null {
  if (!title) return null;
  const cleanTitle = title.trim().replace(/\s+/g, " ");

  // Patrón 1: "Materia Grado-Curso" (ej: "Física 10-A", "Fisica 10A", "Matemáticas 9-1", "Lengua 11 B")
  const pattern1 = /^(.+?)[,\s_-]+(\d{1,2})[\s._-]*([A-Za-z0-9])$/i;
  // Patrón 2: "Grado-Curso Materia" (ej: "10-A Física", "10A Fisica", "9-1 Matematicas")
  const pattern2 = /^(\d{1,2})[\s._-]*([A-Za-z0-9])[,\s_-]+(.+)$/i;
  // Patrón 3: "Materia Grado" (ej: "Física 10", "Matemáticas 11")
  const pattern3 = /^(.+?)[,\s_-]+(\d{1,2})$/i;

  let match = cleanTitle.match(pattern1);
  if (match) {
    return {
      materia: match[1].trim(),
      curso: `${match[2]}-${match[3].toUpperCase()}`,
    };
  }

  match = cleanTitle.match(pattern2);
  if (match) {
    return {
      materia: match[3].trim(),
      curso: `${match[1]}-${match[2].toUpperCase()}`,
    };
  }

  match = cleanTitle.match(pattern3);
  if (match) {
    return {
      materia: match[1].trim(),
      curso: match[2].trim(),
    };
  }

  return null;
}

// 2. Normalizador de notas numéricas
function parseNota(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = parseFloat(String(val).replace(",", "."));
  if (isNaN(num) || num < 0.0 || num > 5.0) return null;
  return Math.round(num * 100) / 100;
}

// 3. Helper para autenticar con Google Service Account mediante WebCrypto
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = typeof serviceAccountJson === "string" ? JSON.parse(serviceAccountJson) : serviceAccountJson;
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const encodedHeader = encodeBase64Url(header);
  const encodedClaim = encodeBase64Url(claimSet);
  const message = `${encodedHeader}.${encodedClaim}`;

  // Limpiar clave privada PEM
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");

  const binaryDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(message)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${message}.${signature}`;

  // Canjear JWT por Access Token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Fallo al autenticar con Google: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// 4. Servidor de la Edge Function
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const googleServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY") || Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuración de Supabase no encontrada en el entorno.");
    }

    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const spreadsheetId = body.spreadsheet_id || body.spreadsheetId || "11wV1BwCfERdfKNmzFn07Ed0sCon7fXxC8s7E5y704nc";
    const periodoNum = body.periodo_num || body.periodoNum || null;

    // Obtener token de acceso o API key
    let authHeader: Record<string, string> = {};
    let apiKeyParam = "";

    if (googleServiceAccount) {
      const accessToken = await getGoogleAccessToken(googleServiceAccount);
      authHeader = { Authorization: `Bearer ${accessToken}` };
    } else if (googleApiKey) {
      apiKeyParam = `&key=${googleApiKey}`;
    } else if (body.google_access_token) {
      authHeader = { Authorization: `Bearer ${body.google_access_token}` };
    }

    // A. Obtener metadata de pestañas
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties${apiKeyParam}`;
    const metaRes = await fetch(metaUrl, { headers: authHeader });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      throw new Error(`Error al consultar Google Sheets (${metaRes.status}): ${errText}`);
    }

    const metaData = await metaRes.json();
    const sheets = metaData.sheets || [];

    const validSheets: Array<{ sheetName: string; materia: string; curso: string }> = [];
    const advertenciasValidacion: Array<{ tipo: string; mensaje: string }> = [];

    for (const s of sheets) {
      const title = s.properties?.title?.trim() || "";
      if (!title || title.toLowerCase().startsWith("config") || title.toLowerCase().startsWith("resumen")) {
        continue;
      }

      const parsed = parseSheetTitle(title);
      if (parsed) {
        validSheets.push({
          sheetName: title,
          materia: parsed.materia,
          curso: parsed.curso,
        });
      } else {
        advertenciasValidacion.push({
          tipo: "HOJA_NO_RECONOCIDA",
          mensaje: `No se pudo identificar la materia y el curso en la hoja '${title}'. Asegúrate de incluir el nombre y grupo (ej: 'Física 10-A').`,
        });
      }
    }

    if (validSheets.length === 0) {
      return new Response(
        JSON.stringify({
          status: "warning",
          mensaje: "No se encontraron pestañas de materias válidas en el documento.",
          advertencias: advertenciasValidacion,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // B. Obtener todas las filas de todas las pestañas válidas en una sola llamada en lote (batchGet)
    const rangesQuery = validSheets
      .map((s) => `ranges=${encodeURIComponent(`'${s.sheetName}'!A1:AZ100`)}`)
      .join("&");
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}${apiKeyParam}`;
    
    const batchRes = await fetch(batchUrl, { headers: authHeader });
    if (!batchRes.ok) {
      const errText = await batchRes.text();
      throw new Error(`Error al leer los datos de las hojas (${batchRes.status}): ${errText}`);
    }

    const batchData = await batchRes.json();
    const valueRanges = batchData.valueRanges || [];

    const itemsToUpsert: SheetItemRow[] = [];

    // C. Procesar datos de cada hoja
    for (let i = 0; i < validSheets.length; i++) {
      const sheetMeta = validSheets[i];
      const rangeData = valueRanges[i];
      const rows: any[][] = rangeData?.values || [];

      // Las filas con estudiantes comienzan desde el índice 6 (fila 7 en Excel/Sheets)
      for (let r = 6; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        // Columnas esperadas según el formato de la plantilla:
        // Col A (idx 0): #
        // Col B (idx 1): Estudiante (Nombre)
        // Col C (idx 2): Email
        // Col D (idx 3): Bimestral
        // Col J (idx 9): Actitudinal
        // Col L (idx 11): Cuaderno
        // Col X (idx 23): Evidencia 1
        // Col AJ (idx 35): Evidencia 2
        // Col AV (idx 47): Evidencia 3
        // Col AX (idx 49): Definitiva
        const email = String(row[2] || "").trim().toLowerCase();
        const estudiante = String(row[1] || "").trim();

        if (!email || !email.includes("@")) {
          continue;
        }

        itemsToUpsert.push({
          sheetName: sheetMeta.sheetName,
          materia: sheetMeta.materia,
          curso: sheetMeta.curso,
          estudiante: estudiante,
          email: email,
          row_number: r + 1,
          notas: {
            bimestral: parseNota(row[3]),
            actitudinal: parseNota(row[9]),
            cuaderno: parseNota(row[11]),
            evidencia_1: parseNota(row[23]),
            evidencia_2: parseNota(row[35]),
            evidencia_3: parseNota(row[47]),
            definitiva: parseNota(row[49]),
          },
          status: "VALID_ROW",
        });
      }
    }

    // D. Invocar RPC en Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "sincronizar_calificaciones_sheet",
      {
        p_items: itemsToUpsert,
        p_periodo_num: periodoNum,
      }
    );

    if (rpcError) {
      throw new Error(`Error en RPC sincronizar_calificaciones_sheet: ${rpcError.message}`);
    }

    // Unir advertencias de validación de hojas con advertencias de la base de datos
    const finalAdvertencias = [
      ...advertenciasValidacion,
      ...(rpcData?.advertencias || []),
    ];

    const responsePayload = {
      ...rpcData,
      advertencias: finalAdvertencias,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message || "Error inesperado en Edge Function sync-grades-sheet",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
