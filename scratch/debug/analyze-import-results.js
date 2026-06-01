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
  console.log("=== ANALIZANDO RESULTADOS DE IMPORTACIÓN ===");

  // 1. Leer el archivo SOPHOS_DB_UPLOADER_2.txt
  const filePath = path.join(__dirname, '..', '..', 'src', 'docs', 'SOPHOS_DB_UPLOADER_2.txt');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  
  const emailIdx = headers.indexOf('email');
  const nameIdx = headers.indexOf('nombre_completo');
  const rolIdx = headers.indexOf('rol');
  const cursoIdx = headers.indexOf('curso');
  const emailEstudianteVinculadoIdx = headers.indexOf('email_estudiante_vinculado');

  // 2. Traer todos los datos de Supabase para cruzar en memoria (más rápido)
  const authUsers = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });
    if (error) {
      console.error("Error al obtener usuarios de Auth:", error.message);
      return;
    }
    if (!data || !data.users || data.users.length === 0) {
      break;
    }
    authUsers.push(...data.users);
    if (data.users.length < perPage) {
      break;
    }
    page++;
  }
  console.log(`   - Encontrados ${authUsers.length} usuarios en Supabase Auth.`);
  const authMap = new Map(authUsers.map(u => [u.email.toLowerCase(), u]));

  const { data: profiles, error: dbError } = await supabase.from('usuarios').select('*');
  if (dbError) {
    console.error("Error al obtener perfiles:", dbError.message);
    return;
  }
  const profileMap = new Map(profiles.map(p => [p.email.toLowerCase(), p]));

  const { data: matriculas } = await supabase.from('estudiantes_matriculados').select('*');
  const matriculaSet = new Set(matriculas?.map(m => m.id_estudiante) || []);

  const { data: asignaciones } = await supabase.from('asignaciones_academicas').select('*');
  const docSet = new Set(asignaciones?.map(d => d.id_docente) || []);

  const { data: vinculos } = await supabase.from('perfiles_acudientes_estudiantes').select('*');
  const acudienteSet = new Set(vinculos?.map(v => v.id_acudiente) || []);

  let registeredCount = 0;
  let failedCount = 0;
  const reports = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const fields = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((f) => f.trim().replace(/"/g, ''));
    
    const email = fields[emailIdx]?.toLowerCase().trim();
    const nombre = fields[nameIdx]?.trim();
    const rol = fields[rolIdx]?.toUpperCase().trim();
    const emailVinculado = fields[emailEstudianteVinculadoIdx]?.toLowerCase().trim();

    if (!email) continue;

    const inAuth = authMap.has(email);
    const inProfile = profileMap.has(email);
    const profile = profileMap.get(email);
    let relOk = false;
    let detail = "";

    if (inProfile && profile) {
      if (rol === 'ESTUDIANTE') {
        relOk = matriculaSet.has(profile.id_usuario);
        detail = relOk ? "Matriculado" : "Falta Matrícula";
      } else if (rol === 'DOCENTE') {
        relOk = docSet.has(profile.id_usuario);
        detail = relOk ? "Con Carga Académica" : "Falta Carga Académica";
      } else if (rol === 'ACUDIENTE') {
        relOk = acudienteSet.has(profile.id_usuario);
        detail = relOk ? `Vinculado a ${emailVinculado}` : `Falta Vínculo a ${emailVinculado}`;
      }
    }

    const ok = inAuth && inProfile && relOk;
    if (ok) {
      registeredCount++;
    } else {
      failedCount++;
    }

    reports.push({
      line: i + 1,
      nombre,
      email,
      rol,
      inAuth,
      inProfile,
      relOk,
      detail,
      ok
    });
  }

  console.log(`\nResumen del análisis:`);
  console.log(`- Registrados (Todo OK): ${registeredCount}`);
  console.log(`- Fallidos (Incompletos o Inexistentes): ${failedCount}`);

  console.log(`\n=== DETALLE DE FILAS CON FALLOS / INCOMPLETAS ===`);
  reports.filter(r => !r.ok).forEach(r => {
    console.log(`Fila ${r.line} | ${r.nombre} (${r.email}) | Rol: ${r.rol}`);
    console.log(`    - En Auth:          ${r.inAuth ? "SÍ" : "NO"}`);
    console.log(`    - En Perfil DB:     ${r.inProfile ? "SÍ" : "NO"}`);
    console.log(`    - Lógica Relacional: ${r.relOk ? "SÍ" : "NO"} (${r.detail})`);
  });
}

main();
