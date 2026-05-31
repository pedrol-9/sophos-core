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
  console.log("Listing users from auth.users...");
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  
  users.forEach(u => {
    console.log(`Auth User: ${u.email} | ID: ${u.id} | Rol (app_metadata): ${u.app_metadata.rol} | Inst (app_metadata): ${u.app_metadata.id_institucion}`);
  });

  console.log("\nListing users from public.usuarios table...");
  const { data: profiles, error: dbError } = await supabase.from('usuarios').select('*');
  if (dbError) {
    console.error("DB error:", dbError);
    return;
  }

  profiles.forEach(p => {
    console.log(`Profile: ${p.email} | ID: ${p.id_usuario} | Rol: ${p.rol} | Inst: ${p.id_institucion} | Nombre: ${p.nombre_completo}`);
  });
}

main();
