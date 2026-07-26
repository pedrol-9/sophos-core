/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { supabase } = require('./env');

async function parseAndSeedCSV(idInstitucion) {
  console.log('\n=== PROCESANDO ARCHIVO CSV ===');
  const csvPath = path.join(__dirname, '../SOPHOS_DB_UPLOADER_carbonell.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: No se encontró el archivo CSV en la ruta: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const csvLines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== '');

  const headers = csvLines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  const emailIdx = headers.indexOf('email');
  const nameIdx = headers.indexOf('nombre_completo');
  const rolIdx = headers.indexOf('rol');
  const cursoIdx = headers.indexOf('curso');
  const jornadaIdx = headers.indexOf('jornada');
  const anoLectivoIdx = headers.indexOf('ano_lectivo');
  const cargaAcademicaIdx = headers.indexOf('carga_academica');
  const emailEstudianteVinculadoIdx = headers.indexOf('email_estudiante_vinculado');
  const parentescoIdx = headers.indexOf('parentesco');

  const rawRows = [];
  for (let i = 1; i < csvLines.length; i++) {
    const fields = csvLines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((f) => f.trim().replace(/"/g, ''));
    if (fields.length <= emailIdx) continue;

    rawRows.push({
      nombreCompleto: fields[nameIdx],
      email: fields[emailIdx]?.toLowerCase().trim(),
      rol: fields[rolIdx]?.toUpperCase().trim(),
      curso: cursoIdx !== -1 ? fields[cursoIdx] : null,
      jornada: (jornadaIdx !== -1 && fields[jornadaIdx]) || 'Mañana',
      anoLectivo: anoLectivoIdx !== -1 ? parseInt(fields[anoLectivoIdx], 10) || 2026 : 2026,
      cargaAcademica: cargaAcademicaIdx !== -1 ? fields[cargaAcademicaIdx] : null,
      emailEstudianteVinculado:
        emailEstudianteVinculadoIdx !== -1 ? fields[emailEstudianteVinculadoIdx]?.toLowerCase().trim() : null,
      parentesco: (parentescoIdx !== -1 && fields[parentescoIdx]) || 'Acudiente',
      line: i + 1,
    });
  }

  // Identificar materias y cursos a crear
  const coursesToCreate = new Set();
  const materiasToCreate = new Set();

  rawRows.forEach((row) => {
    if (row.rol === 'ESTUDIANTE' && row.curso) {
      coursesToCreate.add(`${row.curso}-${row.jornada}`);
    } else if (row.rol === 'DOCENTE') {
      const load = row.cargaAcademica || row.curso;
      if (load) {
        const assignments = load.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
        assignments.forEach((assign) => {
          let materia = '';
          let curso = '';
          const match = assign.match(/^(.*?)-(\d{1,2}-[A-Za-z])$/);
          if (match) {
            materia = match[1].trim();
            curso = match[2].trim();
          } else {
            const parts = assign.split('-');
            if (parts.length >= 2) {
              curso = parts[parts.length - 1].trim();
              materia = parts.slice(0, parts.length - 1).join('-').trim();
            }
          }
          if (materia) materiasToCreate.add(materia);
          if (curso) coursesToCreate.add(`${curso}-${row.jornada}`);
        });
      }
    }
  });

  // Crear Cursos
  console.log(`Creando ${coursesToCreate.size} cursos...`);
  const coursesMap = new Map();
  for (const cStr of coursesToCreate) {
    const parts = cStr.split('-');
    const jornada = parts[parts.length - 1];
    const nombre = parts.slice(0, parts.length - 1).join('-');
    const { data: cursoRow, error: cError } = await supabase
      .from('cursos')
      .insert({
        id_institucion: idInstitucion,
        nombre,
        jornada,
      })
      .select('id_curso')
      .single();

    if (cError) {
      console.error(`Error creando curso ${cStr}:`, cError.message);
    } else {
      coursesMap.set(cStr, cursoRow.id_curso);
    }
  }

  // Crear Materias
  console.log(`Creando ${materiasToCreate.size} materias...`);
  const materiasMap = new Map();
  for (const mName of materiasToCreate) {
    const { data: matRow, error: mError } = await supabase
      .from('materias')
      .insert({
        id_institucion: idInstitucion,
        nombre: mName,
        area: 'General',
      })
      .select('id_materia')
      .single();

    if (mError) {
      console.error(`Error creando materia ${mName}:`, mError.message);
    } else {
      materiasMap.set(mName, matRow.id_materia);
    }
  }

  // Crear usuarios en Supabase Auth y perfiles públicos
  console.log(`Registrando ${rawRows.length} usuarios en Supabase...`);
  const userEmailsMap = new Map();

  for (const u of rawRows) {
    const tempPassword = 'Sophos2026!';
    const { data: newAuth, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: {
        id_institucion: idInstitucion,
        rol: u.rol,
        must_change_password: true,
      },
      user_metadata: {
        nombre_completo: u.nombreCompleto,
      },
    });

    if (authErr || !newAuth?.user) {
      console.error(`Línea ${u.line} - Error registrando a ${u.email}:`, authErr?.message || authErr);
      continue;
    }

    const userId = newAuth.user.id;
    userEmailsMap.set(u.email, userId);

    const { error: userErr } = await supabase.from('usuarios').insert({
      id_usuario: userId,
      email: u.email,
      nombre_completo: u.nombreCompleto,
      rol: u.rol,
      id_institucion: idInstitucion,
    });

    if (userErr) {
      console.error(`Error insertando perfil público para ${u.email}:`, userErr.message);
    }
  }

  // Crear matrículas para estudiantes
  console.log('Matriculando estudiantes...');
  const matriculaMap = new Map();

  for (const row of rawRows.filter((r) => r.rol === 'ESTUDIANTE')) {
    const userId = userEmailsMap.get(row.email);
    const cursoKey = `${row.curso}-${row.jornada}`;
    const cursoId = coursesMap.get(cursoKey);

    if (userId && cursoId) {
      const { data: matRow, error: matErr } = await supabase
        .from('estudiantes_matriculados')
        .insert({
          id_estudiante: userId,
          id_curso: cursoId,
          id_institucion: idInstitucion,
          ano_lectivo: row.anoLectivo,
        })
        .select('id_matricula')
        .single();

      if (matErr) {
        console.error(`Error matriculando estudiante ${row.email}:`, matErr.message);
      } else {
        matriculaMap.set(row.email, matRow.id_matricula);
      }
    }
  }

  // Crear asignaciones académicas para docentes
  console.log('Asignando carga académica a docentes...');
  const asignacionMap = new Map();
  const asignacionesList = [];

  for (const row of rawRows.filter((r) => r.rol === 'DOCENTE')) {
    const teacherId = userEmailsMap.get(row.email);
    const load = row.cargaAcademica || row.curso;
    if (teacherId && load) {
      const assignments = load.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
      for (const assign of assignments) {
        let materia = '';
        let curso = '';
        const match = assign.match(/^(.*?)-(\d{1,2}-[A-Za-z])$/);
        if (match) {
          materia = match[1].trim();
          curso = match[2].trim();
        } else {
          const parts = assign.split('-');
          if (parts.length >= 2) {
            curso = parts[parts.length - 1].trim();
            materia = parts.slice(0, parts.length - 1).join('-').trim();
          }
        }

        const cursoId = coursesMap.get(`${curso}-${row.jornada}`);
        const materiaId = materiasMap.get(materia);

        if (cursoId && materiaId) {
          const { data: asigRow, error: asigErr } = await supabase
            .from('asignaciones_academicas')
            .insert({
              id_docente: teacherId,
              id_materia: materiaId,
              id_curso: cursoId,
              id_institucion: idInstitucion,
              ano_lectivo: row.anoLectivo,
            })
            .select('id_asignacion')
            .single();

          if (asigErr) {
            console.error(`Error en asignación docente ${row.email} -> ${assign}:`, asigErr.message);
          } else {
            asignacionMap.set(`${row.email}-${materia}-${curso}`, asigRow.id_asignacion);
            asignacionesList.push({
              id_asignacion: asigRow.id_asignacion,
              materiaNombre: materia,
              cursoNombre: curso,
              id_curso: cursoId,
              id_materia: materiaId,
            });
          }
        }
      }
    }
  }

  // Vincular acudientes
  console.log('Vinculando acudientes con estudiantes...');
  for (const row of rawRows.filter((r) => r.rol === 'ACUDIENTE')) {
    const acudienteId = userEmailsMap.get(row.email);
    const estudianteId = userEmailsMap.get(row.emailEstudianteVinculado);

    if (acudienteId && estudianteId) {
      const { error: relErr } = await supabase.from('perfiles_acudientes_estudiantes').insert({
        id_acudiente: acudienteId,
        id_estudiante: estudianteId,
        id_institucion: idInstitucion,
        parentesco: row.parentesco,
      });

      if (relErr) {
        console.error(`Error vinculando acudiente ${row.email} con ${row.emailEstudianteVinculado}:`, relErr.message);
      }
    }
  }

  // Vincular acudientes adicionales (multi-acudiente para pruebas de selector familiar)
  console.log('Generando vínculos adicionales para acudientes con múltiples estudiantes a cargo...');
  const padresMultiples = ['rodrigo.silva@parent.co', 'beatriz.ortiz@parent.co', 'patricia.mendoza@parent.co'];
  const hijosMultiples = ['juan.rojas@edu.co', 'carolina.marin@edu.co', 'sofia.castro@edu.co'];

  for (let i = 0; i < padresMultiples.length; i++) {
    const padreEmail = padresMultiples[i];
    const hijoExtraEmail = hijosMultiples[i];

    const padreId = userEmailsMap.get(padreEmail);
    const hijoId = userEmailsMap.get(hijoExtraEmail);

    if (padreId && hijoId) {
      const { error: multiRelErr } = await supabase.from('perfiles_acudientes_estudiantes').insert({
        id_acudiente: padreId,
        id_estudiante: hijoId,
        id_institucion: idInstitucion,
        parentesco: 'Responsable Adicional',
      });
      if (multiRelErr) {
        console.error(`Error vinculando acudiente adicional ${padreEmail} con ${hijoExtraEmail}:`, multiRelErr.message);
      } else {
        console.log(`Vínculo adicional creado: ${padreEmail} -> ${hijoExtraEmail}`);
      }
    }
  }

  return {
    rawRows,
    coursesMap,
    materiasMap,
    userEmailsMap,
    matriculaMap,
    asignacionesList,
  };
}

module.exports = {
  parseAndSeedCSV,
};
