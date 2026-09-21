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

import { readFileSync, existsSync, appendFileSync } from 'fs';
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
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Sophos Core Monitor <onboarding@resend.dev>';

function appendStepSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    try {
      appendFileSync(summaryPath, markdown + '\n\n', 'utf-8');
    } catch {
      // Ignorar fallos al escribir en summary
    }
  }
}

async function sendEmailNotification(status, details) {
  if (!RESEND_API_KEY || !NOTIFICATION_EMAIL) {
    console.log('\n⚠️ [Keep-Alive] Notificación por email OMITIDA:');
    if (!RESEND_API_KEY) {
      console.log('   - Falta el secreto RESEND_API_KEY en GitHub Actions.');
    }
    if (!NOTIFICATION_EMAIL) {
      console.log('   - Falta el secreto NOTIFICATION_EMAIL en GitHub Actions.');
    }
    console.log('   👉 Configúralos en GitHub: Repo > Settings > Secrets and variables > Actions > Repository secrets.\n');

    appendStepSummary(
      `### ⚠️ Notificación por Email Omitida\n` +
      `- **Causa**: Variables de entorno de correo no configuradas.\n` +
      `- \`RESEND_API_KEY\`: ${RESEND_API_KEY ? '✅ Configurado' : '❌ Falta configurar en GitHub Secrets'}\n` +
      `- \`NOTIFICATION_EMAIL\`: ${NOTIFICATION_EMAIL ? '✅ Configurado' : '❌ Falta configurar en GitHub Secrets'}`
    );
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
        from: RESEND_FROM_EMAIL,
        to: [NOTIFICATION_EMAIL],
        subject,
        html,
      }),
    });

    if (res.ok) {
      console.log(`[Keep-Alive] ✉️ Notificación enviada con éxito a ${NOTIFICATION_EMAIL}`);
      appendStepSummary(
        `### ✅ Correo de Notificación Enviado con Éxito\n` +
        `- **Destinatario**: \`${NOTIFICATION_EMAIL}\`\n` +
        `- **Remitente**: \`${RESEND_FROM_EMAIL}\``
      );
    } else {
      const errText = await res.text();
      console.error(`\n❌ [Keep-Alive] Error al enviar el correo vía Resend (HTTP ${res.status}):\n${errText}\n`);
      if (res.status === 403 && RESEND_FROM_EMAIL.includes('onboarding@resend.dev')) {
        console.error('💡 Causa frecuente en Resend (HTTP 403):');
        console.error('   Cuando usas el remitente por defecto "onboarding@resend.dev", Resend SOLO permite');
        console.error('   enviar correos a la MISMA dirección con la que te registraste en Resend.');
        console.error(`   Si NOTIFICATION_EMAIL (${NOTIFICATION_EMAIL}) es distinta a tu cuenta de Resend, será rechazada.`);
        console.error('   Para enviar a cualquier dirección: verifica un dominio en https://resend.com/domains y define RESEND_FROM_EMAIL.\n');
      }

      appendStepSummary(
        `### ❌ Error al Enviar Notificación por Correo (Resend HTTP ${res.status})\n` +
        `\`\`\`json\n${errText}\n\`\`\`\n` +
        (res.status === 403 && RESEND_FROM_EMAIL.includes('onboarding@resend.dev')
          ? `> ⚠️ **Importante**: Con \`onboarding@resend.dev\`, Resend solo autoriza enviar a tu propia dirección registrada en Resend.`
          : '')
      );
    }
  } catch (err) {
    console.error('[Keep-Alive] Error de conexión al contactar servicio de correo Resend:', err.message);
    appendStepSummary(`### ❌ Error de Conexión con Resend\n- ${err.message}`);
  }
}

async function pingSupabase() {
  console.log('----------------------------------------------------');
  console.log('🔄 Iniciando Keep-Alive de Supabase...');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const errorMsg = 'Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidas en las variables de entorno.';
    console.error(`❌ ${errorMsg}`);
    appendStepSummary(
      `## 🚨 Supabase Keep-Alive: Fallo de Configuración\n` +
      `- **Error**: Faltan variables de Supabase (\`NEXT_PUBLIC_SUPABASE_URL\` o \`SUPABASE_SERVICE_ROLE_KEY\`).`
    );
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
      appendStepSummary(
        `## 🚨 Supabase Keep-Alive: Error HTTP\n` +
        `| Proyecto | Status HTTP | Detalle |\n` +
        `| :--- | :--- | :--- |\n` +
        `| \`${SUPABASE_URL}\` | **${response.status}** | ${response.statusText} |`
      );
      await sendEmailNotification('FAILURE', { status: response.status, statusText: response.statusText });
      process.exitCode = 1;
      return;
    }

    const contentRange = response.headers.get('content-range') || 'Desconocido';
    console.log(`✅ Conexión exitosa a Supabase (Status: ${response.status})`);
    console.log(`📊 Content-Range / Conteo: ${contentRange}`);
    console.log('✨ La base de datos ha registrado actividad y su temporizador de inactividad se ha renovado.');
    console.log('----------------------------------------------------');

    appendStepSummary(
      `## 🚀 Supabase Keep-Alive: Éxito\n` +
      `| Propiedad | Valor |\n` +
      `| :--- | :--- |\n` +
      `| **Fecha / Hora** | ${new Date().toISOString()} |\n` +
      `| **Proyecto Supabase** | \`${SUPABASE_URL}\` |\n` +
      `| **Status HTTP** | ✅ ${response.status} |\n` +
      `| **Content-Range** | \`${contentRange}\` |\n` +
      `| **Estado** | Actividad registrada (temporizador renovado) |`
    );

    await sendEmailNotification('SUCCESS', {
      status: response.status,
      contentRange,
      message: 'Base de datos activa y operativa.',
    });

    process.exitCode = 0;
  } catch (error) {
    console.error('❌ Error de red o conexión al consultar Supabase:', error.message);
    appendStepSummary(
      `## 🚨 Supabase Keep-Alive: Error de Red\n` +
      `- **Mensaje**: ${error.message}`
    );
    await sendEmailNotification('FAILURE', { error: error.message });
    process.exitCode = 1;
  }
}

pingSupabase();
