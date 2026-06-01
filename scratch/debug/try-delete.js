const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente (subiendo 2 niveles)
const envPath = path.join(__dirname, '..', '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'ricardo.merchan@edu.co';
  console.log(`Intentando borrar perfil de: ${email} ...`);

  // 1. Obtener ID del usuario
  const { data: userProfile } = await supabase.from('usuarios').select('id_usuario').eq('email', email).single();
  if (!userProfile) {
    console.log("No se encontró el perfil en la base de datos.");
    return;
  }
  const userId = userProfile.id_usuario;
  console.log(`ID Usuario: ${userId}`);

  // 2. Intentar borrar de usuarios
  const { error: delError } = await supabase.from('usuarios').delete().eq('id_usuario', userId);

  if (delError) {
    console.error("❌ ERROR AL BORRAR DE usuarios:");
    console.error(delError);
  } else {
    console.log("✅ ÉXITO al borrar de usuarios.");
  }
}

main();
