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
  console.log("=== LISTANDO TODAS LAS INSTITUCIONES EN LA BASE DE DATOS ===");
  const { data, error } = await supabase.from('instituciones').select('*');
  if (error) {
    console.error("Error al obtener instituciones:", error.message);
    return;
  }
  console.log(`Total instituciones encontradas: ${data.length}`);
  data.forEach((inst, index) => {
    console.log(`\n[${index + 1}] ID: ${inst.id_institucion}`);
    console.log(`    Nombre Legal: ${inst.nombre_legal}`);
    console.log(`    NIT:          ${inst.nit}`);
    console.log(`    Creado en:    ${inst.creado_en || inst.created_at}`);
  });
}

main();
