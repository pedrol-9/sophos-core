/**
 * @file scratch/debug/db-util.js
 * @description Script unificado de utilidades de administración y base de datos para Sophos Core.
 *
 * Comandos soportados:
 *  - node scratch/debug/db-util.js audit           -> Auditoría de consistencia Auth/DB y estadísticas.
 *  - node scratch/debug/db-util.js reset           -> Restablecimiento a cero de datos relacionales (conserva admins).
 *  - node scratch/debug/db-util.js orphans         -> Limpia perfiles huérfanos e instituciones sin uso.
 *  - node scratch/debug/db-util.js list            -> Lista todas las instituciones y administradores del sistema.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env.local programáticamente
const envPath = path.join(__dirname, '..', '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error("❌ Archivo .env.local no encontrado.");
  process.exit(1);
}

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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Variables de conexión Supabase faltantes en .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Emails de administradores protegidos contra eliminación
const PROTECTED_ADMIN_EMAILS = [
  'psanabria999@gmail.com',
  'contacto@jm-carbonell.com',
  'contacto@prueba.edu.co'
];

// Helper para paginación de Auth
async function fetchAllAuthUsers() {
  const allUsers = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    if (!data || !data.users || data.users.length === 0) break;
    allUsers.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }
  return allUsers;
}

// ── COMANDO: AUDIT ──────────────────────────────────────────────────────────
async function audit() {
  console.log("=========================================================");
  console.log("=== INICIANDO AUDITORÍA DE USUARIOS EN LA BASE DE DATOS ===");
  console.log("=========================================================\n");

  console.log("1. Obteniendo datos de Supabase Auth...");
  let users;
  try {
    users = await fetchAllAuthUsers();
  } catch (err) {
    console.error("Error al obtener usuarios de Auth:", err.message);
    return;
  }
  console.log(`   - Encontrados ${users.length} usuarios en Supabase Auth.`);

  console.log("\n2. Obteniendo datos de la tabla pública 'usuarios'...");
  const { data: profiles, error: dbError } = await supabase.from('usuarios').select('*');
  if (dbError) {
    console.error("Error al obtener perfiles de la DB:", dbError.message);
    return;
  }
  console.log(`   - Encontrados ${profiles.length} perfiles en public.usuarios.`);

  // Duplicados
  const authEmails = users.map(u => u.email.toLowerCase());
  const authDuplicates = authEmails.filter((item, index) => authEmails.indexOf(item) !== index);
  const uniqueAuthDuplicates = [...new Set(authDuplicates)];

  const dbEmails = profiles.map(p => p.email.toLowerCase());
  const dbDuplicates = dbEmails.filter((item, index) => dbEmails.indexOf(item) !== index);
  const uniqueDbDuplicates = [...new Set(dbDuplicates)];

  console.log("\n3. Buscando duplicados...");
  if (uniqueAuthDuplicates.length > 0) {
    console.warn(`   ⚠️ Duplicados en Auth:`, uniqueAuthDuplicates);
  } else {
    console.log("   ✅ Sin correos duplicados en Supabase Auth.");
  }
  if (uniqueDbDuplicates.length > 0) {
    console.warn(`   ⚠️ Duplicados en public.usuarios:`, uniqueDbDuplicates);
  } else {
    console.log("   ✅ Sin correos duplicados en public.usuarios.");
  }

  // Huérfanos
  const authIds = new Set(users.map(u => u.id));
  const orphans = profiles.filter(p => !authIds.has(p.id_usuario));

  console.log("\n4. Buscando huérfanos...");
  if (orphans.length > 0) {
    console.warn(`   ⚠️ Se encontraron ${orphans.length} perfiles sin cuenta de Auth:`);
    orphans.forEach(o => console.warn(`      - ${o.email} (${o.rol})`));
  } else {
    console.log("   ✅ Todos los perfiles de la base de datos están saneados con Auth.");
  }

  // Resumen
  console.log("\n5. Resumen estadístico por Institución:");
  const { data: institutions } = await supabase.from('instituciones').select('id_institucion, nombre_legal');
  const instMap = new Map();
  if (institutions) {
    institutions.forEach(i => instMap.set(i.id_institucion, i.nombre_legal));
  }

  const stats = {};
  profiles.forEach(p => {
    const instId = p.id_institucion || 'Sin Institución';
    const name = instMap.get(instId) || instId;
    if (!stats[name]) {
      stats[name] = { estudiantes: 0, docentes: 0, acudientes: 0, admins: 0, total: 0 };
    }
    stats[name].total++;
    if (p.rol === 'ESTUDIANTE') stats[name].estudiantes++;
    else if (p.rol === 'DOCENTE') stats[name].docentes++;
    else if (p.rol === 'ACUDIENTE') stats[name].acudientes++;
    else if (p.rol === 'ADMIN') stats[name].admins++;
  });

  console.table(stats);
}

// ── COMANDO: RESET ──────────────────────────────────────────────────────────
async function reset() {
  console.log("\n--- RESTABLECIMIENTO DE DATOS RELACIONALES ---");
  let users;
  try {
    users = await fetchAllAuthUsers();
  } catch (err) {
    console.error("Error al obtener usuarios de Auth:", err.message);
    return;
  }

  // No borrar administradores
  const usersToDelete = users.filter(u => u.app_metadata?.rol !== 'ADMIN' && !PROTECTED_ADMIN_EMAILS.includes(u.email.toLowerCase()));
  const idsToDelete = usersToDelete.map(u => u.id);

  if (idsToDelete.length > 0) {
    console.log(`Eliminando dependencias y perfiles de ${usersToDelete.length} usuarios...`);

    // Limpiar tablas dependientes
    await supabase.from('calificaciones').delete().neq('id_calificacion', '00000000-0000-0000-0000-000000000000');
    await supabase.from('asistencias').delete().neq('id_asistencia', '00000000-0000-0000-0000-000000000000');
    await supabase.from('observador_digital').delete().in('id_estudiante', idsToDelete);
    await supabase.from('observador_digital').delete().in('id_docente', idsToDelete);
    await supabase.from('perfiles_acudientes_estudiantes').delete().in('id_acudiente', idsToDelete);
    await supabase.from('perfiles_acudientes_estudiantes').delete().in('id_estudiante', idsToDelete);
    await supabase.from('estudiantes_matriculados').delete().in('id_estudiante', idsToDelete);
    await supabase.from('asignaciones_academicas').delete().in('id_docente', idsToDelete);

    // Borrar perfiles públicos
    await supabase.from('usuarios').delete().in('id_usuario', idsToDelete);

    // Borrar de Supabase Auth
    for (const u of usersToDelete) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.error(`  - Error al eliminar ${u.email} de Auth:`, delErr.message);
      } else {
        console.log(`  - Eliminado de Auth: ${u.email}`);
      }
    }
    console.log("✅ Restablecimiento completado.");
  } else {
    console.log("✅ No hay usuarios transaccionales para eliminar.");
  }
}

// ── COMANDO: ORPHANS ────────────────────────────────────────────────────────
async function cleanOrphans() {
  console.log("\n--- LIMPIEZA DE PERFILES E INSTITUCIONES HUÉRFANAS ---");
  let users;
  try {
    users = await fetchAllAuthUsers();
  } catch (err) {
    console.error("Error:", err.message);
    return;
  }
  const authIds = new Set(users.map(u => u.id));
  const { data: profiles } = await supabase.from('usuarios').select('*');

  if (profiles) {
    const orphans = profiles.filter(p => !authIds.has(p.id_usuario));
    if (orphans.length > 0) {
      console.log(`Eliminando ${orphans.length} perfiles huérfanos...`);
      const orphanIds = orphans.map(o => o.id_usuario);
      await supabase.from('observador_digital').delete().in('id_estudiante', orphanIds);
      await supabase.from('perfiles_acudientes_estudiantes').delete().in('id_acudiente', orphanIds);
      await supabase.from('estudiantes_matriculados').delete().in('id_estudiante', orphanIds);
      await supabase.from('usuarios').delete().in('id_usuario', orphanIds);
      console.log("✅ Perfiles huérfanos eliminados.");
    } else {
      console.log("✅ No se encontraron perfiles huérfanos.");
    }
  }

  // Limpiar instituciones vacías (sin usuarios vinculados)
  const { data: institutions } = await supabase.from('instituciones').select('id_institucion, nombre_legal');
  const { data: activeUsers } = await supabase.from('usuarios').select('id_institucion');
  if (institutions && activeUsers) {
    const activeInstIds = new Set(activeUsers.map(p => p.id_institucion).filter(Boolean));
    const emptyInsts = institutions.filter(i => !activeInstIds.has(i.id_institucion));
    if (emptyInsts.length > 0) {
      console.log(`Eliminando ${emptyInsts.length} instituciones sin usuarios...`);
      const emptyIds = emptyInsts.map(i => i.id_institucion);
      await supabase.from('instituciones').delete().in('id_institucion', emptyIds);
      console.log("✅ Instituciones huérfanas eliminadas.");
    } else {
      console.log("✅ No se encontraron instituciones huérfanas.");
    }
  }
}

// ── COMANDO: LIST ───────────────────────────────────────────────────────────
async function list() {
  console.log("\n=========================================================");
  console.log("=== INSTITUCIONES Y ADMINISTRADORES REGISTRADOS ===");
  console.log("=========================================================");

  const { data: insts } = await supabase.from('instituciones').select('*');
  console.log("\n🏫 INSTITUCIONES:");
  if (insts && insts.length > 0) {
    insts.forEach(i => console.log(`  - [ID: ${i.id_institucion}] ${i.nombre_legal} | NIT: ${i.nit}`));
  } else {
    console.log("  (Ninguna registrada)");
  }

  const { data: admins } = await supabase.from('usuarios').select('*').eq('rol', 'ADMIN');
  console.log("\n👤 ADMINISTRADORES:");
  if (admins && admins.length > 0) {
    admins.forEach(a => console.log(`  - [ID: ${a.id_usuario}] ${a.nombre_completo} (${a.email}) | Institución: ${a.id_institucion}`));
  } else {
    console.log("  (Ninguno registrado)");
  }
}

// ── ENTRADA PRINCIPAL ────────────────────────────────────────────────────────
async function main() {
  const command = process.argv[2];
  switch (command) {
    case 'audit':
      await audit();
      break;
    case 'reset':
      await reset();
      break;
    case 'orphans':
      await cleanOrphans();
      break;
    case 'list':
      await list();
      break;
    default:
      console.log("Utilidades de Base de Datos Sophos Core.");
      console.log("Uso:");
      console.log("  node scratch/debug/db-util.js [comando]");
      console.log("\nComandos:");
      console.log("  audit   -> Ejecuta una auditoría de consistencia entre Supabase Auth y la DB.");
      console.log("  reset   -> Elimina estudiantes, docentes, acudientes y dependencias (preserva admins).");
      console.log("  orphans -> Limpia perfiles de usuarios e instituciones abandonadas.");
      console.log("  list    -> Muestra las instituciones y administradores existentes.");
  }
}

main().catch(err => console.error("Error crítico:", err.message));
