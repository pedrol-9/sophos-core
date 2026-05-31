const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
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
  console.log("Checking DB assignments & Carlos Mendoza info...");
  
  // 1. Get Carlos Mendoza auth user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("List users error:", listError);
    return;
  }
  
  const carlos = users.find(u => u.email === 'carlos.mendoza+profesor@gmail.com');
  console.log("Carlos Mendoza auth info:");
  console.log(`- ID: ${carlos?.id}`);
  console.log(`- Rol (app_metadata): ${carlos?.app_metadata?.rol}`);
  console.log(`- Institution (app_metadata): ${carlos?.app_metadata?.id_institucion}`);

  // 2. Query assignments for Carlos
  const { data: assignments, error: assError } = await supabase
    .from('asignaciones_academicas')
    .select('*, cursos(nombre), materias(nombre)')
    .eq('id_docente', carlos?.id);

  console.log("Assignments in DB for Carlos:", assignments);
  if (assError) {
    console.error("Query assignments error:", assError.message);
  }

  // 3. Query all assignments in DB
  const { data: allAssignments } = await supabase
    .from('asignaciones_academicas')
    .select('*, cursos(nombre), materias(nombre)');
  console.log("All Assignments in DB:", allAssignments);
}

main();
