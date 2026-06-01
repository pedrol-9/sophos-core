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
  console.log("=== PROBANDO CREACIÓN DIRECTA EN AUTH PARA CARLOS GUTIÉRREZ ===");

  const { data, error } = await supabase.auth.admin.createUser({
    email: 'carlos.gutierrez@edu.co',
    password: 'Sophos2026!',
    email_confirm: true,
    app_metadata: {
      id_institucion: '1aff3832-7191-4a69-8d1f-8a8585d2ea4e',
      rol: 'DOCENTE',
      must_change_password: true,
    },
    user_metadata: {
      nombre_completo: 'Carlos Julio Gutiérrez',
    },
  });

  if (error) {
    console.error("❌ ERROR AL CREAR USUARIO:");
    console.error(`  - Mensaje: ${error.message}`);
    console.error(`  - Status:  ${error.status}`);
    console.error(`  - Código:  ${error.code}`);
    console.error(error);
  } else {
    console.log("✅ ÉXITO: El usuario fue creado exitosamente.");
    console.log("ID del usuario:", data.user.id);
    
    // Limpiar para no dejar basura si tuvo éxito
    await supabase.auth.admin.deleteUser(data.user.id);
    console.log("Usuario de prueba eliminado.");
  }
}

main();
