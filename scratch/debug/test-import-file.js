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
  const idInstitucion = '1aff3832-7191-4a69-8d1f-8a8585d2ea4e'; // IE José María Carbonell
  console.log("Simulando carga de docentes fallidos en IE José María Carbonell...");

  const failedDocentes = [
    { email: 'carlos.gutierrez@edu.co', nombre: 'Carlos Julio Gutiérrez', carga: 'Filosofía-11-A;Filosofía-11-B' },
    { email: 'martha.fonseca@edu.co', nombre: 'Martha Lucía Fonseca', carga: 'Español-10-A;Español-10-B' },
    { email: 'gustavo.petro@edu.co', nombre: 'Gustavo Adolfo Petro', carga: 'Sociales-10-B;Sociales-11-A' },
    { email: 'diana.osorio@edu.co', nombre: 'Diana Carolina Osorio', carga: 'Artes-10-A;Artes-11-B' },
    { email: 'ricardo.merchan@edu.co', nombre: 'Ricardo Antonio Merchán', carga: 'Tecnología-10-B;Tecnología-11-B' }
  ];

  for (const doc of failedDocentes) {
    console.log(`\nDocente: ${doc.nombre}`);
    try {
      const assignments = doc.carga.split(/[,;]/).map(x => x.trim()).filter(Boolean);
      for (const assignmentStr of assignments) {
        let materiaNombre = "";
        let cursoNombreParsed = "";
        const match = assignmentStr.match(/^(.*?)-(\d{1,2}-[A-Za-z])$/);
        if (match) {
          materiaNombre = match[1].trim();
          cursoNombreParsed = match[2].trim();
        } else {
          const parts = assignmentStr.split('-');
          if (parts.length < 2) throw new Error(`Formato inválido: ${assignmentStr}`);
          cursoNombreParsed = parts[parts.length - 1].trim();
          materiaNombre = parts.slice(0, parts.length - 1).join('-').trim();
        }

        console.log(`  - Intentando resolver Curso: "${cursoNombreParsed}"...`);
        let { data: curso } = await supabase
          .from('cursos')
          .select('id_curso')
          .eq('id_institucion', idInstitucion)
          .eq('nombre', cursoNombreParsed)
          .maybeSingle();

        if (!curso) {
          console.log(`    * Curso no encontrado. Intentando crearlo...`);
          const { data: newCurso, error: newCursoErr } = await supabase
            .from('cursos')
            .insert({
              id_institucion: idInstitucion,
              nombre: cursoNombreParsed,
              jornada: 'Mañana'
            })
            .select('id_curso')
            .single();

          if (newCursoErr) {
            throw new Error(`Error al crear curso ${cursoNombreParsed}: ${newCursoErr.message}`);
          }
          curso = newCurso;
        }

        console.log(`    * Curso resuelto ID: ${curso.id_curso}`);

        console.log(`  - Intentando resolver Materia: "${materiaNombre}"...`);
        let { data: materia } = await supabase
          .from('materias')
          .select('id_materia')
          .eq('id_institucion', idInstitucion)
          .eq('nombre', materiaNombre)
          .maybeSingle();

        if (!materia) {
          console.log(`    * Materia no encontrada. Intentando crearla...`);
          const { data: newMateria, error: newMateriaErr } = await supabase
            .from('materias')
            .insert({
              id_institucion: idInstitucion,
              nombre: materiaNombre,
              area: 'General'
            })
            .select('id_materia')
            .single();

          if (newMateriaErr) {
            throw new Error(`Error al crear materia ${materiaNombre}: ${newMateriaErr.message}`);
          }
          materia = newMateria;
        }
        console.log(`    * Materia resuelta ID: ${materia.id_materia}`);
      }
      console.log(`  ✅ OK! Sin errores para ${doc.nombre}`);
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
    }
  }
}

main();
