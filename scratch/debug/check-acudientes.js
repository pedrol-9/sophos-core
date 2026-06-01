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
  console.log("=== INSPECCIONANDO ACUDIENTES Y SUS VÍNCULOS ===");

  const { data: profiles, error } = await supabase
    .from('usuarios')
    .select('*, perfiles_acudientes_estudiantes!perfiles_acudientes_estudiantes_id_acudiente_fkey(*)')
    .eq('rol', 'ACUDIENTE');

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Total acudientes: ${profiles.length}`);

  for (const prof of profiles) {
    const vinculos = prof.perfiles_acudientes_estudiantes || [];
    console.log(`\n👤 Acudiente: ${prof.nombre_completo} (${prof.email})`);
    console.log(`    - ID Institución: ${prof.id_institucion}`);
    console.log(`    - Vínculos: ${vinculos.length}`);
    for (const v of vinculos) {
      // Buscar estudiante
      const { data: est } = await supabase.from('usuarios').select('nombre_completo, email').eq('id_usuario', v.id_estudiante).single();
      console.log(`      * Vinculado a Estudiante ID: ${v.id_estudiante} | Nombre: ${est?.nombre_completo} (${est?.email}) | Parentesco: ${v.parentesco}`);
    }
  }
}

main();
