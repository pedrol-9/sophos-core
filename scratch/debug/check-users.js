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
  console.log("=== INICIANDO AUDITORÍA DE USUARIOS EN LA BASE DE DATOS ===");
  console.log("=========================================================\n");

  console.log("1. Obteniendo datos de Supabase Auth...");
  let users = [];
  let page = 1;
  const perPage = 50;
  let authError = null;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      authError = error;
      break;
    }
    if (!data || !data.users || data.users.length === 0) {
      break;
    }
    users.push(...data.users);
    if (data.users.length < perPage) {
      break;
    }
    page++;
  }

  if (authError) {
    console.error("Error al obtener usuarios de Auth:", authError);
    return;
  }
  console.log(`   - Encontrados ${users.length} usuarios en Supabase Auth.`);

  console.log("\n2. Obteniendo datos de la tabla pública 'usuarios'...");
  const { data: profiles, error: dbError } = await supabase.from('usuarios').select('*');
  if (dbError) {
    console.error("Error al obtener perfiles de la DB:", dbError);
    return;
  }
  console.log(`   - Encontrados ${profiles.length} perfiles en public.usuarios.`);

  // --- ANÁLISIS DE DUPLICADOS ---
  console.log("\n3. Buscando duplicados en la base de datos...");
  
  // Duplicados en Auth
  const authEmails = users.map(u => u.email.toLowerCase());
  const authDuplicates = authEmails.filter((item, index) => authEmails.indexOf(item) !== index);
  const uniqueAuthDuplicates = [...new Set(authDuplicates)];

  // Duplicados en public.usuarios
  const dbEmails = profiles.map(p => p.email.toLowerCase());
  const dbDuplicates = dbEmails.filter((item, index) => dbEmails.indexOf(item) !== index);
  const uniqueDbDuplicates = [...new Set(dbDuplicates)];

  let duplicatesFound = false;

  if (uniqueAuthDuplicates.length > 0) {
    duplicatesFound = true;
    console.warn(`   ⚠️ ¡ATENCIÓN! Se encontraron correos duplicados en Supabase Auth:`);
    uniqueAuthDuplicates.forEach(email => {
      const matching = users.filter(u => u.email.toLowerCase() === email);
      console.warn(`      - "${email}" aparece ${matching.length} veces en Auth. IDs: ${matching.map(m => m.id).join(', ')}`);
    });
  } else {
    console.log("   ✅ Sin correos duplicados en Supabase Auth.");
  }

  if (uniqueDbDuplicates.length > 0) {
    duplicatesFound = true;
    console.warn(`   ⚠️ ¡ATENCIÓN! Se encontraron correos duplicados en public.usuarios:`);
    uniqueDbDuplicates.forEach(email => {
      const matching = profiles.filter(p => p.email.toLowerCase() === email);
      console.warn(`      - "${email}" aparece ${matching.length} veces en public.usuarios. IDs: ${matching.map(m => m.id_usuario).join(', ')}`);
    });
  } else {
    console.log("   ✅ Sin correos duplicados en la tabla pública 'usuarios'.");
  }

  // --- ANÁLISIS DE REGISTROS HUÉRFANOS ---
  console.log("\n4. Buscando registros huérfanos entre Auth y Base de Datos...");
  
  const authIds = new Set(users.map(u => u.id));
  const profileIds = new Set(profiles.map(p => p.id_usuario));

  // Huérfanos en Auth (Tienen Auth pero no Perfil Público)
  const orphansInAuth = users.filter(u => !profileIds.has(u.id));
  
  // Huérfanos en la DB (Tienen Perfil Público pero no Auth)
  const orphansInDb = profiles.filter(p => !authIds.has(p.id_usuario));

  let orphansFound = false;

  if (orphansInAuth.length > 0) {
    orphansFound = true;
    console.warn(`   ⚠️ Se encontraron ${orphansInAuth.length} usuarios en Auth sin perfil público en 'public.usuarios':`);
    orphansInAuth.forEach(u => {
      console.warn(`      - Email: ${u.email} | ID: ${u.id} | Rol: ${u.app_metadata?.rol || 'No especificado'}`);
    });
  } else {
    console.log("   ✅ Todos los usuarios de Auth tienen su perfil correspondiente en la tabla pública.");
  }

  if (orphansInDb.length > 0) {
    orphansFound = true;
    console.warn(`   ⚠️ Se encontraron ${orphansInDb.length} perfiles en public.usuarios que no existen en Supabase Auth:`);
    orphansInDb.forEach(p => {
      console.warn(`      - Email: ${p.email} | ID: ${p.id_usuario} | Rol: ${p.rol} | Nombre: ${p.nombre_completo}`);
    });
  } else {
    console.log("   ✅ Todos los perfiles públicos tienen una cuenta de autenticación válida.");
  }

  // --- ESTADÍSTICAS POR INSTITUCIÓN Y ROL ---
  console.log("\n5. Resumen estadístico por Institución (Tenant):");
  
  const institutions = {};
  profiles.forEach(p => {
    const instId = p.id_institucion;
    if (!institutions[instId]) {
      institutions[instId] = { ADMIN: 0, DOCENTE: 0, ESTUDIANTE: 0, ACUDIENTE: 0, total: 0 };
    }
    institutions[instId][p.rol] = (institutions[instId][p.rol] || 0) + 1;
    institutions[instId].total += 1;
  });

  Object.keys(institutions).forEach(instId => {
    const stats = institutions[instId];
    console.log(`   - Institución ID: ${instId}`);
    console.log(`      * Total perfiles:  ${stats.total}`);
    console.log(`      * Estudiantes:     ${stats.ESTUDIANTE}`);
    console.log(`      * Docentes:        ${stats.DOCENTE}`);
    console.log(`      * Acudientes:      ${stats.ACUDIENTE}`);
    console.log(`      * Admins:          ${stats.ADMIN}`);
  });

  console.log("\n=========================================================");
  if (!duplicatesFound && !orphansFound) {
    console.log("=== ✅ RESULTADO: LA BASE DE DATOS ESTÁ COMPLETAMENTE LIMPIA Y SANA ===");
  } else {
    console.warn("=== ⚠️ RESULTADO: SE DETECTARON ANOMALÍAS EN LA BASE DE DATOS ===");
  }
  console.log("=========================================================");
}

main();
