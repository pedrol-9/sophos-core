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
  console.log("=========================================================");
  console.log("=== REPORTE DE ADMINISTRADORES REGISTRADOS (SOPHOS SAAS) ===");
  console.log("=========================================================\n");

  // 1. Obtener perfiles ADMIN de public.usuarios
  const { data: adminProfiles, error: dbError } = await supabase
    .from('usuarios')
    .select('*, instituciones(*)')
    .eq('rol', 'ADMIN');

  if (dbError) {
    console.error("❌ Error al consultar la tabla pública usuarios:", dbError.message);
    return;
  }

  if (!adminProfiles || adminProfiles.length === 0) {
    console.log("❌ No se encontraron administradores registrados en la tabla public.usuarios.");
    return;
  }

  console.log(`Encontrados ${adminProfiles.length} perfiles ADMIN en la base de datos.\n`);

  // 2. Por cada admin, obtener datos de Auth para enriquecer el reporte
  for (let i = 0; i < adminProfiles.length; i++) {
    const profile = adminProfiles[i];
    const inst = profile.instituciones || {};

    console.log(`👤 ADMINISTRADOR #${i + 1}`);
    console.log(`---------------------------------------------------------`);
    console.log(`  - Nombre Completo:  ${profile.nombre_completo}`);
    console.log(`  - Email Perfil:     ${profile.email}`);
    console.log(`  - ID Usuario (UUID): ${profile.id_usuario}`);
    console.log(`  - Fecha Registro:   ${profile.fecha_registro ? new Date(profile.fecha_registro).toLocaleString() : 'No registrada'}`);
    
    // Institución relacionada
    console.log(`  - Institución vinculada (Tenant):`);
    console.log(`      * ID Institución: ${profile.id_institucion}`);
    console.log(`      * Nombre Legal:   ${inst.nombre_legal || 'No especificado'}`);
    console.log(`      * NIT:            ${inst.nit || 'No especificado'}`);
    console.log(`      * Plan/Suscrip.:  ${inst.estado_suscripcion || 'No especificado'}`);
    console.log(`      * Dominio Personal:${inst.dominio_personalizado || 'Ninguno'}`);

    // Consultar datos de Auth para ver último ingreso y metadata
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(profile.id_usuario);
      
      if (authError || !authUser) {
        console.log(`  - ⚠️ Estado Auth: INCONSISTENTE (El perfil existe en DB pero no en Supabase Auth)`);
      } else {
        console.log(`  - Estado Auth: SANO`);
        console.log(`      * Confirmado:     ${authUser.email_confirmed_at ? 'Sí' : 'No'}`);
        console.log(`      * Creado en Auth:  ${new Date(authUser.created_at).toLocaleString()}`);
        console.log(`      * Última Sesión:  ${authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : 'Nunca ha ingresado'}`);
        console.log(`      * Reset Contraseña:${authUser.app_metadata?.must_change_password ? 'Requerido al primer ingreso' : 'No requerido'}`);
      }
    } catch (err) {
      console.log(`  - ⚠️ Error al consultar Supabase Auth para este usuario.`);
    }
    console.log(`---------------------------------------------------------\n`);
  }

  console.log("=========================================================");
  console.log("=== FIN DEL REPORTE ===");
  console.log("=========================================================");
}

main();
