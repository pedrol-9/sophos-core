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
  console.log("=== INSPECCIONANDO CONTENIDO DE TABLAS DE ASIGNACIONES ===");

  const { data: asig } = await supabase.from('asignaciones_academicas').select('*');
  console.log(`Total asignaciones: ${asig?.length || 0}`);
  
  if (asig && asig.length > 0) {
    console.log("Muestras de asignaciones:");
    asig.slice(0, 10).forEach(a => {
      console.log(`  - Docente: ${a.id_docente} | Materia: ${a.id_materia} | Curso: ${a.id_curso}`);
    });
  }

  const { data: matriculas } = await supabase.from('estudiantes_matriculados').select('*');
  console.log(`Total matrículas: ${matriculas?.length || 0}`);
}

main();
