#!/usr/bin/env node

/**
 * Script de Keep-Alive para Supabase
 *
 * Realiza una consulta REST a la base de datos de Supabase para evitar que el
 * proyecto en el plan gratuito se pause por inactividad (después de 7 días).
 *
 * Puede ejecutarse:
 *  1. Localmente: npm run keep-alive
 *  2. Mediante GitHub Actions (cron programado)
 *  3. Opcionalmente enviando un correo de confirmación (usando Resend si se configura RESEND_API_KEY).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno desde .env.local si no están presentes (ejecución local)
function loadEnvLocal() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const envPath = resolve(__dirname, '../.env.local');

    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual > 0) {
            const key = trimmed.substring(0, firstEqual).trim();
            let val = trimmed.substring(firstEqual + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn('[Keep-Alive] No se pudo leer .env.local de forma automática:', err.message);
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || process.env.ALERT_EMAIL;

async function sendEmailNotification(status, details) {
  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) {
    console.log('[Keep-Alive] Notificación por email omitida (RESEND_API_KEY o NOTIFICATION_EMAIL no configurados).');
    return;
  }

  const isSuccess = status === 'SUCCESS';
  const subject = isSuccess
    ? '✅ [Sophos Core] Supabase Keep-Alive Exitoso'
    : '🚨 [ALERTA - Sophos Core] Falló Keep-Alive de Supabase';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: ${isSuccess ? '#16a34a' : '#dc2626'}; margin-top: 0;">
        ${isSuccess ? '✅ Ping a Supabase Completado' : '🚨 Error en Ping a Supabase'}
      </h2>
      <p>Este es un reporte automático del sistema de mantenimiento de <strong>Sophos Core</strong> para evitar la pausa del proyecto en el plan gratuito de Supabase.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; font-weight: bold; color: #475569;">Fecha / Hora:</td>
          <td style="padding: 8px 0; color: #1e293b;">${new Date().toISOString()}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; font-weight: bold; color: #475569;">Proyecto Supabase:</td>
          <td style="padding: 8px 0; color: #1e293b;">${SUPABASE_URL}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 0; font-weight: bold; color: #475569;">Estado:</td>
          <td style="padding: 8px 0; font-weight: bold; color: ${isSuccess ? '#16a34a' : '#dc2626'};">
            ${isSuccess ? 'Activo (200 OK)' : 'Fallo'}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold; color: #475569;">Detalle:</td>
          <td style="padding: 8px 0; color: #1e293b;">${JSON.stringify(details)}</td>
        </tr>
      </table>

      <p style="margin-top: 25px; font-size: 12px; color: #94a3b8;">
        Sophos Core Keep-Alive Monitor • GitHub Actions & Vercel
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sophos Core Monitor <onboarding@resend.dev>',
        to: [NOTIFICATION_EMAIL],
        subject,
        html,
      }),
    });

    if (res.ok) {
      console.log(`[Keep-Alive] ✉️ Notificación enviada a ${NOTIFICATION_EMAIL}`);
    } else {
      const errText = await res.text();
      console.warn('[Keep-Alive] No se pudo enviar el correo vía Resend:', errText);
    }
  } catch (err) {
    console.warn('[Keep-Alive] Error al contactar servicio de correo:', err.message);
  }
}

async function pingSupabase() {
  console.log('----------------------------------------------------');
  console.log('🔄 Iniciando Keep-Alive de Supabase...');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const errorMsg = 'Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidas en las variables de entorno.';
    console.error(`❌ ${errorMsg}`);
    await sendEmailNotification('FAILURE', { error: errorMsg });
    process.exitCode = 1;
    return;
  }

  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);

  try {
    // 1. Petición HEAD a la tabla 'instituciones' a través de la API REST de Supabase
    const endpoint = `${SUPABASE_URL}/rest/v1/instituciones?select=count`;
    const response = await fetch(endpoint, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Range': '0-0',
      },
    });

    if (!response.ok && response.status !== 206) {
      const errorText = `Supabase respondió con status HTTP ${response.status}: ${response.statusText}`;
      console.error(`❌ ${errorText}`);
      await sendEmailNotification('FAILURE', { status: response.status, statusText: response.statusText });
      process.exitCode = 1;
      return;
    }

    const contentRange = response.headers.get('content-range') || 'Desconocido';
    console.log(`✅ Conexión exitosa a Supabase (Status: ${response.status})`);
    console.log(`📊 Content-Range / Conteo: ${contentRange}`);
    console.log('✨ La base de datos ha registrado actividad y su temporizador de inactividad se ha renovado.');
    console.log('----------------------------------------------------');

    await sendEmailNotification('SUCCESS', {
      status: response.status,
      contentRange,
      message: 'Base de datos activa y operativa.',
    });

    process.exitCode = 0;
  } catch (error) {
    console.error('❌ Error de red o conexión al consultar Supabase:', error.message);
    await sendEmailNotification('FAILURE', { error: error.message });
    process.exitCode = 1;
  }
}

pingSupabase();
