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

// ID del Administrador actual a proteger (no borrar bajo ninguna circunstancia)
const PROTECTED_ADMIN_EMAILS = [
  'psanabria999@gmail.com',
  'contacto@jm-carbonell.com',
  'contacto@prueba.edu.co'
];

async function fetchAllAuthUsers() {
  const allUsers = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });
    if (error) {
      throw error;
    }
    if (!data || !data.users || data.users.length === 0) {
      break;
    }
    allUsers.push(...data.users);
    if (data.users.length < perPage) {
      break;
    }
    page++;
  }
  return allUsers;
}

async function cleanOrphans() {
  console.log("\n--- MODO: LIMPIAR SOLAMENTE PERFILES HUÉRFANOS ---");

  // 1. Obtener usuarios de Auth paginados
  let users;
  try {
    users = await fetchAllAuthUsers();
  } catch (authError) {
    console.error("Error al listar usuarios de Auth:", authError);
    return;
  }
  const authIds = new Set(users.map(u => u.id));

  // 2. Obtener perfiles de usuarios
  const { data: profiles, error: dbError } = await supabase.from('usuarios').select('*');
  if (dbError) {
    console.error("Error al obtener perfiles de la DB:", dbError);
    return;
  }

  // Identificar huérfanos (Están en public.usuarios pero no en Auth)
  const orphans = profiles.filter(p => !authIds.has(p.id_usuario));

  if (orphans.length === 0) {
    console.log("✅ No se encontraron perfiles huérfanos para limpiar.");
    return;
  }

  console.log(`Encontrados ${orphans.length} perfiles huérfanos en la base de datos.`);

  const orphanIds = orphans.map(o => o.id_usuario);

  // 3. Limpiar de las tablas relacionales para evitar fallos de llave foránea
  console.log("Limpiando dependencias relacionales de los huérfanos...");
  
  // Borrar asistencias y calificaciones primero (si quedaran)
  await supabase.from('calificaciones').delete().neq('id_calificacion', '00000000-0000-0000-0000-000000000000');
  await supabase.from('asistencias').delete().neq('id_asistencia', '00000000-0000-0000-0000-000000000000');
  
  await supabase.from('observador_digital').delete().in('id_estudiante', orphanIds);
  await supabase.from('observador_digital').delete().in('id_docente', orphanIds);
  await supabase.from('perfiles_acudientes_estudiantes').delete().in('id_acudiente', orphanIds);
  await supabase.from('perfiles_acudientes_estudiantes').delete().in('id_estudiante', orphanIds);
  
  await supabase.from('estudiantes_matriculados').delete().in('id_estudiante', orphanIds);
  await supabase.from('asignaciones_academicas').delete().in('id_docente', orphanIds);
  
  // 4. Limpiar de la tabla usuarios
  console.log("Eliminando perfiles de la tabla public.usuarios...");
  const { error: deleteError } = await supabase.from('usuarios').delete().in('id_usuario', orphanIds);

  if (deleteError) {
    console.error("❌ Error al eliminar perfiles huérfanos:", deleteError.message);
  } else {
    console.log(`✅ ¡Limpieza exitosa! Se eliminaron ${orphans.length} perfiles huérfanos.`);
  }
}

async function resetDatabase() {
  console.log("\n--- MODO: RESTABLECIMIENTO TOTAL (RESET) ---");
  console.log("¡Cuidado! Esto eliminará a todos los Estudiantes, Docentes y Acudientes de la institución.");

  // 1. Obtener usuarios de Auth paginados
  let users;
  try {
    users = await fetchAllAuthUsers();
  } catch (authError) {
    console.error("Error al obtener usuarios de Auth:", authError);
    return;
  }

  // Filtrar usuarios que NO sean administradores (protegiendo todos los de rol ADMIN y emails protegidos)
  const usersToDelete = users.filter(u => u.app_metadata?.rol !== 'ADMIN' && !PROTECTED_ADMIN_EMAILS.includes(u.email.toLowerCase()));
  const idsToDelete = usersToDelete.map(u => u.id);

  if (idsToDelete.length > 0) {
    console.log(`Eliminando ${usersToDelete.length} usuarios relacionales...`);

    // 2. Limpiar tablas relacionales públicas
    console.log("Limpiando dependencias relacionales públicas...");
    
    // Primero: Calificaciones y Asistencias (tienen claves foráneas apuntando a matriculas y asignaciones)
    console.log("Limpiando registros de asistencia y calificaciones...");
    await supabase.from('calificaciones').delete().neq('id_calificacion', '00000000-0000-0000-0000-000000000000');
    await supabase.from('asistencias').delete().neq('id_asistencia', '00000000-0000-0000-0000-000000000000');

    // Segundo: Observador y Acudientes (tienen claves foráneas apuntando a estudiantes/docentes en usuarios)
    await supabase.from('observador_digital').delete().in('id_estudiante', idsToDelete);
    await supabase.from('observador_digital').delete().in('id_docente', idsToDelete);
    await supabase.from('perfiles_acudientes_estudiantes').delete().in('id_acudiente', idsToDelete);
    await supabase.from('perfiles_acudientes_estudiantes').delete().in('id_estudiante', idsToDelete);

    // Tercero: Matrículas y Asignaciones (tienen claves foráneas apuntando a estudiantes/docentes en usuarios)
    await supabase.from('estudiantes_matriculados').delete().in('id_estudiante', idsToDelete);
    await supabase.from('asignaciones_academicas').delete().in('id_docente', idsToDelete);

    // 3. Eliminar de public.usuarios
    console.log("Eliminando perfiles de la tabla public.usuarios...");
    await supabase.from('usuarios').delete().in('id_usuario', idsToDelete);

    // 4. Eliminar de Supabase Auth
    console.log("Eliminando cuentas de autenticación de Supabase Auth...");
    for (const user of usersToDelete) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`  - Falló eliminar ${user.email} de Auth:`, delErr.message);
      } else {
        console.log(`  - Eliminado de Auth: ${user.email}`);
      }
    }
  } else {
    console.log("✅ No hay usuarios cargados (estudiantes/docentes/acudientes) para eliminar.");
  }

  // 5. Opcional: Ejecutar también la limpieza de perfiles huérfanos restantes
  await cleanOrphans();

  console.log("\n✅ ¡Restablecimiento completado! La base de datos está en estado inicial (prístina) con solo las cuentas de administrador activas.");
}

async function cleanOrphanInstitutions() {
  console.log("\n--- LIMPIANDO INSTITUCIONES HUÉRFANAS ---");
  
  // 1. Obtener todas las instituciones
  const { data: institutions, error: instError } = await supabase.from('instituciones').select('*');
  if (instError) {
    console.error("Error al obtener instituciones:", instError.message);
    return;
  }
  
  if (!institutions || institutions.length === 0) {
    console.log("✅ No hay instituciones registradas.");
    return;
  }

  // 2. Obtener todos los usuarios de la tabla usuarios
  const { data: profiles, error: dbError } = await supabase.from('usuarios').select('id_institucion');
  if (dbError) {
    console.error("Error al obtener perfiles de usuarios:", dbError.message);
    return;
  }
  
  const activeInstitutionIds = new Set(profiles.map(p => p.id_institucion).filter(Boolean));

  // 3. Las instituciones que no estén en activeInstitutionIds son huérfanas
  const orphanInstitutions = institutions.filter(inst => !activeInstitutionIds.has(inst.id_institucion));

  if (orphanInstitutions.length === 0) {
    console.log("✅ No se encontraron instituciones huérfanas.");
    return;
  }

  console.log(`Encontradas ${orphanInstitutions.length} instituciones huérfanas. Eliminando...`);
  
  const orphanInstIds = orphanInstitutions.map(inst => inst.id_institucion);
  const { data: deleted, error: deleteError } = await supabase
    .from('instituciones')
    .delete()
    .in('id_institucion', orphanInstIds)
    .select();

  if (deleteError) {
    console.error("❌ Error al eliminar instituciones huérfanas:", deleteError.message);
  } else {
    console.log(`✅ ¡Limpieza de instituciones exitosa! Se eliminaron ${deleted?.length || 0} instituciones huérfanas:`);
    if (deleted) {
      deleted.forEach(inst => {
        console.log(`  - ${inst.nombre_legal} (NIT: ${inst.nit})`);
      });
    }
  }
}

async function run() {
  const mode = process.argv[2];

  if (mode === 'orphans') {
    await cleanOrphans();
    await cleanOrphanInstitutions();
  } else if (mode === 'reset') {
    await resetDatabase();
    await cleanOrphanInstitutions();
  } else {
    console.log("Uso del script de limpieza:");
    console.log("  node scratch/debug/clean-database.js <modo>");
    console.log("\nModos disponibles:");
    console.log("  orphans  -> Elimina únicamente los perfiles huérfanos y las instituciones sin usuarios.");
    console.log("  reset    -> Restablece la base de datos a cero (borra estudiantes, docentes, acudientes e instituciones sin uso, protegiendo al administrador).");
  }
}

run();
