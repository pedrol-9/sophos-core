const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: Archivo .env.local no encontrado.');
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value.trim();
    }
  });
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Faltan variables de configuración de Supabase.');
  process.exit(1);
}

// Cliente administrador para auditoría y servicio
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Cliente regular para simular usuarios del cliente web
const userClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DEFAULT_PASSWORD = 'Sophos2026!';

async function loginAs(email) {
  const { data, error } = await userClient.auth.signInWithPassword({
    email,
    password: DEFAULT_PASSWORD
  });
  if (error) {
    throw new Error(`Error de inicio de sesión para ${email}: ${error.message}`);
  }
  return data.user;
}

async function runTests() {
  console.log('====================================================');
  console.log('INICIANDO PRUEBAS DE SEGURIDAD RLS Y TRIGGERS');
  console.log('====================================================\n');

  try {
    // -----------------------------------------------------------------
    // PRUEBA 1: Escalada de Privilegios en la Tabla usuarios
    // -----------------------------------------------------------------
    console.log('--- TEST 1: Intento de escalada de privilegios en usuarios ---');
    const studentUser = await loginAs('mateo.silva@edu.co');
    console.log(`Logueado como Estudiante: ${studentUser.email} (ID: ${studentUser.id})`);

    // Intentar cambiar el rol de estudiante a ADMIN en la base de datos
    const { data: updateData, error: updateError } = await userClient
      .from('usuarios')
      .update({ rol: 'ADMIN' })
      .eq('id_usuario', studentUser.id)
      .select();

    if (updateError) {
      console.log(`✅ ÉXITO (Rechazado correctamente): ${updateError.message}`);
    } else {
      console.log('❌ FALLO: ¡Se permitió actualizar el rol a ADMIN!');
      console.log(updateData);
    }
    console.log('');

    // -----------------------------------------------------------------
    // PRUEBA 2: Immutabilidad en observador_digital
    // -----------------------------------------------------------------
    console.log('--- TEST 2: Alteración no autorizada de bitácora en observador_digital ---');
    const acudienteUser = await loginAs('rodrigo.silva@parent.co');
    console.log(`Logueado como Acudiente: ${acudienteUser.email} (ID: ${acudienteUser.id})`);

    // Consultar una anotación del observador vinculada a los alumnos del acudiente
    const { data: obsData, error: obsErr } = await userClient
      .from('observador_digital')
      .select('id_observador, observacion_informal, firmado')
      .limit(1);

    if (obsErr || !obsData || obsData.length === 0) {
      console.log('⚠️  No se encontraron observaciones en la base de datos para este acudiente. Omitiendo.');
    } else {
      const obs = obsData[0];
      console.log(`Encontrada observación: ID ${obs.id_observador}, Texto: "${obs.observacion_informal}", Firmado: ${obs.firmado}`);

      // Intentar modificar el texto de la anotación
      const { data: hackData, error: hackError } = await userClient
        .from('observador_digital')
        .update({ observacion_informal: 'COMPORTAMIENTO EXCELENTE (Hackeado)' })
        .eq('id_observador', obs.id_observador)
        .select();

      if (hackError) {
        console.log(`✅ ÉXITO (Rechazado correctamente): ${hackError.message}`);
      } else {
        console.log('❌ FALLO: ¡Se permitió modificar el texto de la anotación!');
        console.log(hackData);
      }

      // Intentar firmar legítimamente
      if (!obs.firmado) {
        console.log('Intentando firmar la anotación de forma legítima...');
        const { data: signData, error: signError } = await userClient
          .from('observador_digital')
          .update({
            firmado: true,
            fecha_firma: new Date().toISOString(),
            firmado_por: acudienteUser.id
          })
          .eq('id_observador', obs.id_observador)
          .select();

        if (signError) {
          console.log(`❌ FALLO: No se pudo firmar legítimamente: ${signError.message}`);
        } else {
          console.log('✅ ÉXITO: Firma registrada correctamente.');
        }
      } else {
        console.log('La anotación ya estaba firmada. Validando que no se pueda desfirmar...');
        const { error: unsignError } = await userClient
          .from('observador_digital')
          .update({ firmado: false })
          .eq('id_observador', obs.id_observador);

        if (unsignError) {
          console.log(`✅ ÉXITO (No se pudo desfirmar): ${unsignError.message}`);
        } else {
          console.log('❌ FALLO: ¡Se permitió desfirmar la observación!');
        }
      }
    }
    console.log('');

    // -----------------------------------------------------------------
    // PRUEBA 3: Seguridad RLS en planes_suscripcion
    // -----------------------------------------------------------------
    console.log('--- TEST 3: Seguridad RLS en planes_suscripcion ---');
    // Intentar alterar planes sin autenticación (usuario anónimo)
    const anonymousClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Obtener planes (debería ser posible)
    const { data: planes, error: getPlanesError } = await anonymousClient
      .from('planes_suscripcion')
      .select('id_suscripcion, nombre');

    if (getPlanesError) {
      console.log(`❌ FALLO al leer planes: ${getPlanesError.message}`);
    } else {
      console.log(`Leídos ${planes.length} planes correctamente.`);
    }

    // Intentar insertar un plan ficticio
    const { error: insertPlanError } = await anonymousClient
      .from('planes_suscripcion')
      .insert({ nombre: 'Plan VIP Hack', precio: 0, limite_usuarios: 999999 });

    if (insertPlanError) {
      console.log(`✅ ÉXITO (Bloqueado por RLS): ${insertPlanError.message}`);
    } else {
      console.log('❌ FALLO: ¡Se permitió insertar planes de suscripción de forma anónima!');
    }
    console.log('');

    // -----------------------------------------------------------------
    // PRUEBA 4: Seguridad RLS en logs_ia_tokens
    // -----------------------------------------------------------------
    console.log('--- TEST 4: Seguridad RLS en logs_ia_tokens ---');
    // Un estudiante no debería poder consultar los logs de tokens de la institución
    const { data: logs, error: getLogsError } = await userClient
      .from('logs_ia_tokens')
      .select('*');

    if (getLogsError) {
      console.log(`✅ ÉXITO (Rechazado correctamente): ${getLogsError.message}`);
    } else if (logs && logs.length > 0) {
      console.log('❌ FALLO: ¡El estudiante pudo leer los logs de tokens de IA!');
      console.log(logs);
    } else {
      console.log('✅ ÉXITO: No se retornaron registros (vacío o denegado).');
    }
    console.log('');

  } catch (err) {
    console.error('Ocurrió un error inesperado durante las pruebas:', err);
  } finally {
    // Cerrar sesiones
    await userClient.auth.signOut();
  }
}

runTests();
