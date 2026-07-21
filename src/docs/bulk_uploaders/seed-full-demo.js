/* eslint-disable */
/**
 * ============================================================================
 * NOTA DE MANTENIMIENTO:
 * Al modificar o re-escribir este script, asegúrate de mantener o crear 
 * las relaciones de multi-acudiente (acudientes con 2 o más estudiantes).
 * Esto permite validar el selector familiar en el dashboard de acudientes.
 * Ejemplo: 'rodrigo.silva@parent.co' representa a Mateo Silva y Juan Diego Rojas.
 * ============================================================================
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Inicializar Supabase con service_role para operaciones administrativas bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSeed() {
  console.log('=== INICIANDO LIMPIEZA DE BASE DE DATOS ===');

  // 1. Borrar datos de las tablas públicas en orden de dependencias
  const tablesToWipe = [
    'asistencias',
    'calificaciones',
    'configuracion_evidencias_periodo',
    'evidencias_logros',
    'evidencias',
    'observador_digital',
    'perfiles_acudientes_estudiantes',
    'estudiantes_matriculados',
    'asignaciones_academicas',
    'cursos',
    'materias',
    'periodos_academicos',
    'escala_valoracion',
    'usuarios',
    'instituciones'
  ];

  for (const table of tablesToWipe) {
    console.log(`Limpiando tabla: ${table}...`);
    try {
      let pkField = 'id';
      if (table === 'calificaciones') pkField = 'id_calificacion';
      else if (table === 'asistencias') pkField = 'id_asistencia';
      else if (table === 'evidencias_logros') pkField = 'id_logro';
      else if (table === 'evidencias') pkField = 'id_evidencia';
      else if (table === 'observador_digital') pkField = 'id_observador';
      else if (table === 'perfiles_acudientes_estudiantes') pkField = 'id_acudiente_estudiante';
      else if (table === 'estudiantes_matriculados') pkField = 'id_matricula';
      else if (table === 'asignaciones_academicas') pkField = 'id_asignacion';
      else if (table === 'cursos') pkField = 'id_curso';
      else if (table === 'materias') pkField = 'id_materia';
      else if (table === 'periodos_academicos') pkField = 'id_periodo';
      else if (table === 'escala_valoracion') pkField = 'id_escala';
      else if (table === 'usuarios') pkField = 'id_usuario';
      else if (table === 'instituciones') pkField = 'id_institucion';

      const { error } = await supabase.from(table).delete().not(pkField, 'is', null);
      if (error) {
        console.error(`Error borrando en tabla ${table}: ${error.message}`);
      }
    } catch (err) {
      console.error(`Excepción limpiando tabla ${table}:`, err.message || err);
    }
  }

  // 2. Listar y borrar usuarios de Supabase Auth
  try {
    let deletedCount = 0;
    while (true) {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 50
      });
      if (listError) throw listError;
      if (!users || users.length === 0) break;
      
      console.log(`Eliminando lote de ${users.length} usuarios de Supabase Auth...`);
      for (const u of users) {
        const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
        if (delError) {
          console.error(`Error eliminando usuario ${u.email}:`, delError.message);
        } else {
          deletedCount++;
        }
      }
    }
    console.log(`Total de usuarios eliminados de Supabase Auth: ${deletedCount}`);
  } catch (err) {
    console.warn('Advertencia o error limpiando Supabase Auth:', err.message || err);
  }

  console.log('\n=== CREANDO INSTITUCIÓN Y ADMINISTRADOR DEMO ===');

  // Crear la institución
  const { data: inst, error: instError } = await supabase
    .from('instituciones')
    .insert({
      nombre_legal: 'IE Jose María Carbonell',
      nit: '900.123.456-7',
      dominio_personalizado: 'jm-carbonell.edu.co',
      estado_suscripcion: 'PRUEBA'
    })
    .select('id_institucion')
    .single();

  if (instError || !inst) {
    console.error('Error creando la institución:', instError?.message || instError);
    process.exit(1);
  }
  const idInstitucion = inst.id_institucion;
  console.log(`Institución "IE Jose María Carbonell" creada: ${idInstitucion}`);

  // Crear administrador en Auth
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.admin.createUser({
    email: 'contacto@jm-carbonell.edu.co',
    password: 'Sophos2026!',
    email_confirm: true,
    app_metadata: {
      id_institucion: idInstitucion,
      rol: 'ADMIN'
    },
    user_metadata: {
      nombre_completo: 'Administrador Carbonell'
    }
  });

  if (adminAuthErr || !adminAuth?.user) {
    console.error('Error al registrar administrador en Auth:', adminAuthErr?.message || adminAuthErr);
    process.exit(1);
  }
  const adminId = adminAuth.user.id;

  // Insertar perfil de administrador público
  const { error: adminUserErr } = await supabase.from('usuarios').insert({
    id_usuario: adminId,
    email: 'contacto@jm-carbonell.edu.co',
    nombre_completo: 'Administrador Carbonell',
    rol: 'ADMIN',
    id_institucion: idInstitucion
  });

  if (adminUserErr) {
    console.error('Error al insertar perfil público del administrador:', adminUserErr.message);
    process.exit(1);
  }
  console.log('Administrador contacto@jm-carbonell.edu.co registrado correctamente.');



  // Configurar Escalas de valoración
  const escalas = [
    { id_institucion: idInstitucion, nombre_desempeno: 'BAJO', nota_minima: 0, nota_maxima: 2.9 },
    { id_institucion: idInstitucion, nombre_desempeno: 'BASICO', nota_minima: 3.0, nota_maxima: 3.9 },
    { id_institucion: idInstitucion, nombre_desempeno: 'ALTO', nota_minima: 4.0, nota_maxima: 4.5 },
    { id_institucion: idInstitucion, nombre_desempeno: 'SUPERIOR', nota_minima: 4.6, nota_maxima: 5.0 }
  ];
  const { error: escError } = await supabase.from('escala_valoracion').insert(escalas);
  if (escError) console.error('Error configurando escalas:', escError.message);

  // Configurar Periodos Académicos
  const periodos = [
    { id_institucion: idInstitucion, numero_periodo: 1, fecha_inicio: '2026-02-01', fecha_fin: '2026-04-15', activo: false },
    { id_institucion: idInstitucion, numero_periodo: 2, fecha_inicio: '2026-04-16', fecha_fin: '2026-06-20', activo: true },
    { id_institucion: idInstitucion, numero_periodo: 3, fecha_inicio: '2026-06-21', fecha_fin: '2026-08-31', activo: false },
    { id_institucion: idInstitucion, numero_periodo: 4, fecha_inicio: '2026-09-01', fecha_fin: '2026-11-30', activo: false }
  ];
  const { data: savedPeriods, error: perError } = await supabase.from('periodos_academicos').insert(periodos).select('*');
  if (perError || !savedPeriods) {
    console.error('Error configurando periodos:', perError?.message || perError);
    process.exit(1);
  }
  console.log('Periodos académicos configurados. Periodo 2 ACTIVO, cierra el 20 de Junio.');

  const idPeriodo1 = savedPeriods.find(p => p.numero_periodo === 1).id_periodo;
  const idPeriodo2 = savedPeriods.find(p => p.numero_periodo === 2).id_periodo;

  console.log('\n=== PROCESANDO ARCHIVO CSV ===');
  const csvPath = path.join(__dirname, 'SOPHOS_DB_UPLOADER_carbonell.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: No se encontró el archivo CSV en la ruta: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const csvLines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');

  const headers = csvLines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
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
    const fields = csvLines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(f => f.trim().replace(/"/g, ''));
    if (fields.length <= emailIdx) continue;

    rawRows.push({
      nombreCompleto: fields[nameIdx],
      email: fields[emailIdx]?.toLowerCase().trim(),
      rol: fields[rolIdx]?.toUpperCase().trim(),
      curso: cursoIdx !== -1 ? fields[cursoIdx] : null,
      jornada: (jornadaIdx !== -1 && fields[jornadaIdx]) || 'Mañana',
      anoLectivo: anoLectivoIdx !== -1 ? parseInt(fields[anoLectivoIdx], 10) || 2026 : 2026,
      cargaAcademica: cargaAcademicaIdx !== -1 ? fields[cargaAcademicaIdx] : null,
      emailEstudianteVinculado: emailEstudianteVinculadoIdx !== -1 ? fields[emailEstudianteVinculadoIdx]?.toLowerCase().trim() : null,
      parentesco: (parentescoIdx !== -1 && fields[parentescoIdx]) || 'Acudiente',
      line: i + 1
    });
  }

  // Identificar materias y cursos a crear
  const coursesToCreate = new Set();
  const materiasToCreate = new Set();

  rawRows.forEach(row => {
    if (row.rol === 'ESTUDIANTE' && row.curso) {
      coursesToCreate.add(`${row.curso}-${row.jornada}`);
    } else if (row.rol === 'DOCENTE') {
      const load = row.cargaAcademica || row.curso;
      if (load) {
        const assignments = load.split(/[,;]/).map(x => x.trim()).filter(Boolean);
        assignments.forEach(assign => {
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
    const { data: cursoRow, error: cError } = await supabase.from('cursos').insert({
      id_institucion: idInstitucion,
      nombre,
      jornada
    }).select('id_curso').single();
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
    const { data: matRow, error: mError } = await supabase.from('materias').insert({
      id_institucion: idInstitucion,
      nombre: mName,
      area: 'General'
    }).select('id_materia').single();
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
        must_change_password: true
      },
      user_metadata: {
        nombre_completo: u.nombreCompleto
      }
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
      id_institucion: idInstitucion
    });

    if (userErr) {
      console.error(`Error insertando perfil público para ${u.email}:`, userErr.message);
    }
  }

  // Crear matrículas para estudiantes
  console.log('Matriculando estudiantes...');
  const matriculaMap = new Map();

  for (const row of rawRows.filter(r => r.rol === 'ESTUDIANTE')) {
    const userId = userEmailsMap.get(row.email);
    const cursoKey = `${row.curso}-${row.jornada}`;
    const cursoId = coursesMap.get(cursoKey);

    if (userId && cursoId) {
      const { data: matRow, error: matErr } = await supabase.from('estudiantes_matriculados').insert({
        id_estudiante: userId,
        id_curso: cursoId,
        id_institucion: idInstitucion,
        ano_lectivo: row.anoLectivo
      }).select('id_matricula').single();

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

  for (const row of rawRows.filter(r => r.rol === 'DOCENTE')) {
    const teacherId = userEmailsMap.get(row.email);
    const load = row.cargaAcademica || row.curso;
    if (teacherId && load) {
      const assignments = load.split(/[,;]/).map(x => x.trim()).filter(Boolean);
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
          const { data: asigRow, error: asigErr } = await supabase.from('asignaciones_academicas').insert({
            id_docente: teacherId,
            id_materia: materiaId,
            id_curso: cursoId,
            id_institucion: idInstitucion,
            ano_lectivo: row.anoLectivo
          }).select('id_asignacion').single();

          if (asigErr) {
            console.error(`Error en asignación docente ${row.email} -> ${assign}:`, asigErr.message);
          } else {
            asignacionMap.set(`${row.email}-${materia}-${curso}`, asigRow.id_asignacion);
            asignacionesList.push({
              id_asignacion: asigRow.id_asignacion,
              materiaNombre: materia,
              cursoNombre: curso,
              id_curso: cursoId,
              id_materia: materiaId
            });
          }
        }
      }
    }
  }

  // Vincular acudientes
  console.log('Vinculando acudientes con estudiantes...');
  for (const row of rawRows.filter(r => r.rol === 'ACUDIENTE')) {
    const acudienteId = userEmailsMap.get(row.email);
    const estudianteId = userEmailsMap.get(row.emailEstudianteVinculado);

    if (acudienteId && estudianteId) {
      const { error: relErr } = await supabase.from('perfiles_acudientes_estudiantes').insert({
        id_acudiente: acudienteId,
        id_estudiante: estudianteId,
        id_institucion: idInstitucion,
        parentesco: row.parentesco
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
        parentesco: 'Responsable Adicional'
      });
      if (multiRelErr) {
        console.error(`Error vinculando acudiente adicional ${padreEmail} con ${hijoExtraEmail}:`, multiRelErr.message);
      } else {
        console.log(`Vínculo adicional creado: ${padreEmail} -> ${hijoExtraEmail}`);
      }
    }
  }

  console.log('\n=== GENERANDO EVIDENCIAS Y CALIFICACIONES ===');
  const materiasImportantes = ['Matemáticas', 'Español', 'Inglés', 'Biología', 'Física', 'Química', 'Ciencias Naturales'];

  // Obtener lista completa de estudiantes matriculados estructurados
  const estudiantesMatriculados = [];
  rawRows.filter(r => r.rol === 'ESTUDIANTE').forEach(stud => {
    const idMatricula = matriculaMap.get(stud.email);
    const idEstudiante = userEmailsMap.get(stud.email);
    if (idMatricula && idEstudiante) {
      estudiantesMatriculados.push({
        email: stud.email,
        id_matricula: idMatricula,
        id_estudiante: idEstudiante,
        curso: stud.curso,
        jornada: stud.jornada,
        cursoId: coursesMap.get(`${stud.curso}-${stud.jornada}`)
      });
    }
  });

  const calificacionesAInsertar = [];
  const configEvidenciasPeriodoAInsertar = [];
  const logrosAInsertar = [];

  for (const asig of asignacionesList) {
    const cursoEstudiantes = estudiantesMatriculados.filter(e => e.cursoId === asig.id_curso);
    if (cursoEstudiantes.length === 0) continue;

    // --- PERIODO 1 (CERRADO CON ACCESO A BOLETINES) ---
    const evsP1 = getEvidenciasPorMateria(asig.materiaNombre, 1);

    const { data: evP1_1 } = await supabase.from('evidencias').insert({
      id_institucion: idInstitucion,
      id_materia: asig.id_materia,
      grado: extractGrado(asig.cursoNombre),
      nombre: evsP1[0].nombre,
      descripcion: evsP1[0].descripcion,
      orden: 1,
      activo: true,
      ano_lectivo: 2026
    }).select('id_evidencia').single();

    const { data: evP1_2 } = await supabase.from('evidencias').insert({
      id_institucion: idInstitucion,
      id_materia: asig.id_materia,
      grado: extractGrado(asig.cursoNombre),
      nombre: evsP1[1].nombre,
      descripcion: evsP1[1].descripcion,
      orden: 2,
      activo: true,
      ano_lectivo: 2026
    }).select('id_evidencia').single();

    if (evP1_1 && evP1_2) {
      // Activar y configurar pesos (50% y 50%) para Periodo 1
      configEvidenciasPeriodoAInsertar.push({
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo1,
        id_evidencia: evP1_1.id_evidencia,
        activo: true,
        peso: 0.50
      });
      configEvidenciasPeriodoAInsertar.push({
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo1,
        id_evidencia: evP1_2.id_evidencia,
        activo: true,
        peso: 0.50
      });

      // Insertar logro de Periodo 1
      logrosAInsertar.push({
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo1,
        descripcion: `Demuestra desempeño práctico y apropiación conceptual de los contenidos fundamentales de ${asig.materiaNombre} del Periodo 1.`
      });

      // Notas para Periodo 1 (todos los estudiantes, materias completas)
      cursoEstudiantes.forEach(est => {
        const nota1 = parseFloat((Math.random() * (5.0 - 2.5) + 2.5).toFixed(1));
        calificacionesAInsertar.push({
          id_institucion: idInstitucion,
          id_matricula: est.id_matricula,
          id_asignacion: asig.id_asignacion,
          id_periodo: idPeriodo1,
          periodo: 1,
          id_evidencia: evP1_1.id_evidencia,
          actividad: 'evidencia',
          nota: nota1,
          fecha_registro: '2026-03-20T10:00:00Z'
        });

        const nota2 = parseFloat((Math.random() * (5.0 - 3.0) + 3.0).toFixed(1));
        calificacionesAInsertar.push({
          id_institucion: idInstitucion,
          id_matricula: est.id_matricula,
          id_asignacion: asig.id_asignacion,
          id_periodo: idPeriodo1,
          periodo: 1,
          id_evidencia: evP1_2.id_evidencia,
          actividad: 'evidencia',
          nota: nota2,
          fecha_registro: '2026-04-12T10:00:00Z'
        });
      });
    }

    // --- PERIODO 2 (COMPLETO CON NOTAS PARA TODAS LAS MATERIAS Y ESTUDIANTES) ---
    const evsP2 = getEvidenciasPorMateria(asig.materiaNombre, 2);

    const { data: evP2_1 } = await supabase.from('evidencias').insert({
      id_institucion: idInstitucion,
      id_materia: asig.id_materia,
      grado: extractGrado(asig.cursoNombre),
      nombre: evsP2[0].nombre,
      descripcion: evsP2[0].descripcion,
      orden: 1,
      activo: true,
      ano_lectivo: 2026
    }).select('id_evidencia').single();

    const { data: evP2_2 } = await supabase.from('evidencias').insert({
      id_institucion: idInstitucion,
      id_materia: asig.id_materia,
      grado: extractGrado(asig.cursoNombre),
      nombre: evsP2[1].nombre,
      descripcion: evsP2[1].descripcion,
      orden: 2,
      activo: true,
      ano_lectivo: 2026
    }).select('id_evidencia').single();

    if (evP2_1 && evP2_2) {
      // Registrar configuración de periodo 2 (50% y 50%)
      configEvidenciasPeriodoAInsertar.push({
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo2,
        id_evidencia: evP2_1.id_evidencia,
        activo: true,
        peso: 0.50
      });
      configEvidenciasPeriodoAInsertar.push({
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo2,
        id_evidencia: evP2_2.id_evidencia,
        activo: true,
        peso: 0.50
      });

      // Logro Periodo 2
      logrosAInsertar.push({
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo2,
        descripcion: `Desarrolla habilidades analíticas en la resolución de problemas en el área de ${asig.materiaNombre} correspondientes al segundo periodo.`
      });

      // Insertar notas en Periodo 2 para AMBAS evidencias en todos los estudiantes
      cursoEstudiantes.forEach(est => {
        const notaP2_1 = parseFloat((Math.random() * (5.0 - 2.8) + 2.8).toFixed(1));
        calificacionesAInsertar.push({
          id_institucion: idInstitucion,
          id_matricula: est.id_matricula,
          id_asignacion: asig.id_asignacion,
          id_periodo: idPeriodo2,
          periodo: 2,
          id_evidencia: evP2_1.id_evidencia,
          actividad: 'evidencia',
          nota: notaP2_1,
          fecha_registro: '2026-05-20T10:00:00Z'
        });

        const notaP2_2 = parseFloat((Math.random() * (5.0 - 3.0) + 3.0).toFixed(1));
        calificacionesAInsertar.push({
          id_institucion: idInstitucion,
          id_matricula: est.id_matricula,
          id_asignacion: asig.id_asignacion,
          id_periodo: idPeriodo2,
          periodo: 2,
          id_evidencia: evP2_2.id_evidencia,
          actividad: 'evidencia',
          nota: notaP2_2,
          fecha_registro: '2026-06-15T10:00:00Z'
        });
      });
    }
  }

  // Insertar configuraciones de periodo en lotes
  if (configEvidenciasPeriodoAInsertar.length > 0) {
    console.log(`Insertando ${configEvidenciasPeriodoAInsertar.length} configuraciones de periodo...`);
    for (let i = 0; i < configEvidenciasPeriodoAInsertar.length; i += 200) {
      const chunk = configEvidenciasPeriodoAInsertar.slice(i, i + 200);
      const { error } = await supabase.from('configuracion_evidencias_periodo').insert(chunk);
      if (error) console.error('Error insertando configuraciones de periodo:', error.message);
    }
  }

  // Insertar logros en lote
  if (logrosAInsertar.length > 0) {
    console.log(`Insertando ${logrosAInsertar.length} logros de asignaturas...`);
    const { error } = await supabase.from('evidencias_logros').insert(logrosAInsertar);
    if (error) console.error('Error insertando logros:', error.message);
  }

  // Insertar calificaciones en lotes
  if (calificacionesAInsertar.length > 0) {
    console.log(`Insertando ${calificacionesAInsertar.length} calificaciones...`);
    for (let i = 0; i < calificacionesAInsertar.length; i += 300) {
      const chunk = calificacionesAInsertar.slice(i, i + 300);
      const { error: calErr } = await supabase.from('calificaciones').insert(chunk);
      if (calErr) console.error('Error insertando calificaciones:', calErr.message);
    }
  }

  // Generar Asistencias
  console.log('Generando historial de asistencias...');
  const asistenciasList = [];
  
  estudiantesMatriculados.forEach(est => {
    const asigns = asignacionesList.filter(a => a.id_curso === est.cursoId);
    asigns.forEach(asig => {
      // 8% de probabilidad de registrar falta en periodo 1
      if (Math.random() < 0.08) {
        asistenciasList.push({
          id_institucion: idInstitucion,
          id_matricula: est.id_matricula,
          id_asignacion: asig.id_asignacion,
          fecha: '2026-03-10',
          estado: Math.random() > 0.4 ? 'FALTA_JUSTIFICADA' : 'FALTA_INJUSTIFICADA',
          observacion: 'Inasistencia reportada por enfermedad o calamidad.'
        });
      }
      // 5% de probabilidad de falta en periodo 2
      if (Math.random() < 0.05) {
        asistenciasList.push({
          id_institucion: idInstitucion,
          id_matricula: est.id_matricula,
          id_asignacion: asig.id_asignacion,
          fecha: '2026-05-15',
          estado: Math.random() > 0.5 ? 'FALTA_JUSTIFICADA' : 'FALTA_INJUSTIFICADA',
          observacion: 'Falla a clase sin soporte registrada.'
        });
      }
    });
  });

  if (asistenciasList.length > 0) {
    for (let i = 0; i < asistenciasList.length; i += 200) {
      const chunk = asistenciasList.slice(i, i + 200);
      await supabase.from('asistencias').insert(chunk);
    }
    console.log(`Insertadas ${asistenciasList.length} registros de fallas de asistencia.`);
  }

  // Observador digital
  console.log('Generando anotaciones del observador digital...');
  const docDocente = rawRows.find(r => r.rol === 'DOCENTE');
  const idDocente = docDocente ? userEmailsMap.get(docDocente.email) : null;
  
  if (idDocente && estudiantesMatriculados.length > 3) {
    const anotaciones = [
      {
        id_institucion: idInstitucion,
        id_estudiante: estudiantesMatriculados[0].id_estudiante,
        id_docente: idDocente,
        tipo_nota: 'PEDAGOGICA',
        observacion_informal: 'El estudiante muestra gran interés en los talleres y análisis crítico.',
        observacion_formal_ia: 'Se evidencia un avance destacado en los procesos cognitivos y análisis analítico en el aula de clases.',
        fecha_registro: new Date().toISOString()
      },
      {
        id_institucion: idInstitucion,
        id_estudiante: estudiantesMatriculados[1].id_estudiante,
        id_docente: idDocente,
        tipo_nota: 'DISCIPLINARIA',
        observacion_informal: 'Interrumpe con frecuencia y conversa con compañeros.',
        observacion_formal_ia: 'Se recomienda al estudiante mayor autorregulación y apego a los acuerdos de convivencia grupal.',
        fecha_registro: new Date().toISOString()
      }
    ];
    const { error: obsErr } = await supabase.from('observador_digital').insert(anotaciones);
    if (obsErr) console.error('Error insertando anotaciones observador:', obsErr.message);
    else console.log('Anotaciones creadas.');
  }

  console.log('\n✅ SEEDING Y CONFIGURACIÓN INICIAL GENERADO SATISFACTORIAMENTE.');
  process.exit(0);
}

function extractGrado(nombreCurso) {
  const match = nombreCurso.match(/^(\d+)/);
  if (match) {
    const num = match[1];
    if (num.length >= 3) {
      return num.slice(0, -2);
    }
    return num;
  }
  return nombreCurso;
}

function getEvidenciasPorMateria(materiaNombre, numeroPeriodo, gradoStr) {
  const normalized = (materiaNombre || '').toLowerCase().trim();
  const gradoNum = parseInt(gradoStr || '6', 10);
  const esCiclo67 = gradoNum === 6 || gradoNum === 7;
  const esCiclo89 = gradoNum === 8 || gradoNum === 9;

  if (normalized.includes('lectura') || normalized.includes('español') || normalized.includes('lengua') || normalized.includes('castellana')) {
    if (numeroPeriodo === 1) {
      return [
        { nombre: "Comprensión Literal", descripcion: "Llevo a cabo una lectura continua del plan lector haciendo una comprensión LITERAL del mismo." },
        { nombre: "Comprensión Inferencial", descripcion: "Llevo a cabo una lectura continua del plan lector haciendo una comprensión INFERENCIAL del mismo." }
      ];
    } else if (numeroPeriodo === 2) {
      return [
        { nombre: "Comprensión Crítica", descripcion: "Llevo a cabo una lectura continua del plan lector haciendo una comprensión CRÍTICA e INTERTEXTUAL del mismo." },
        { nombre: "Escritura de Reseña", descripcion: "Escribo una RESEÑA a partir de la interpretación coherente del plan lector." }
      ];
    } else if (numeroPeriodo === 3) {
      return [
        { nombre: esCiclo67 ? "Análisis Gramatical" : "Análisis Sintáctico y Estilístico", descripcion: "Identifico las estructuras gramaticales y recursos de cohesión en textos narrativos." },
        { nombre: "Producción de Texto Argumentativo", descripcion: "Redacto ensayos cortos argumentando posturas sobre temas socioculturales." }
      ];
    } else {
      return [
        { nombre: "Exposición Oral sobre Autores", descripcion: "Sustento verbalmente un análisis literario comparando diversas corrientes." },
        { nombre: "Evaluación Final de Plan Lector", descripcion: "Evaluación acumulativa del componente lector del ciclo académico." }
      ];
    }
  }

  if (normalized.includes('historia') || normalized.includes('sociales') || normalized.includes('geografía')) {
    if (numeroPeriodo === 1) {
      return [
        { nombre: "Conquista y Colonización", descripcion: "Periodizo y caracterizo los procesos de conquista y colonización de América." },
        { nombre: "Geopolítica de Oriente", descripcion: "Establezco la relación entre la geopolítica actual y la historia regional." }
      ];
    } else if (numeroPeriodo === 2) {
      return [
        { nombre: "Independencia de Colombia", descripcion: "Defino y comprendo el proceso de Independencia de Colombia y la transición a la República." },
        { nombre: "Cimentación de la República", descripcion: "Entiendo y caracterizo el periodo de cimentación de la Gran Colombia hasta el siglo XIX." }
      ];
    } else if (numeroPeriodo === 3) {
      return [
        { nombre: esCiclo67 ? "Geografía Física de Colombia" : esCiclo89 ? "Revolución Industrial y Siglo XX" : "Constitución y Democracia Participativa", descripcion: "Analizo los procesos territoriales, económicos y democráticos clave del ciclo." },
        { nombre: "Cartografía y Análisis Espacial", descripcion: "Elaboro e interpreto mapas temáticos y gráficos sociodemográficos." }
      ];
    } else {
      return [
        { nombre: "Conflicto Armado y Paz", descripcion: "Debato los procesos de paz y memoria histórica en el contexto contemporáneo." },
        { nombre: "Evaluación Final de Ciencias Sociales", descripcion: "Evaluación integral de competencias ciudadanas y sociales." }
      ];
    }
  }

  if (normalized.includes('matemáticas') || normalized.includes('álgebra') || normalized.includes('geometría') || normalized.includes('cálculo')) {
    if (numeroPeriodo === 1) {
      return [
        { nombre: "Operaciones de Conjuntos", descripcion: "Resuelvo problemas utilizando operaciones de conjuntos y diagramas de Venn de manera lógica." },
        { nombre: "Propiedades Numéricas", descripcion: "Reconozco y utilizo las propiedades numéricas para solucionar situaciones cotidianas." }
      ];
    } else if (numeroPeriodo === 2) {
      return [
        { nombre: "Factorización Algebraica", descripcion: "Identifico y simplifico expresiones algebraicas complejas utilizando diversos métodos." },
        { nombre: "Sistemas de Ecuaciones", descripcion: "Planteo y resuelvo sistemas de ecuaciones lineales aplicados a situaciones del entorno." }
      ];
    } else if (numeroPeriodo === 3) {
      return [
        { nombre: esCiclo67 ? "Fracciones y Porcentajes" : esCiclo89 ? "Funciones Cuadráticas" : "Cálculo Limites y Funciones", descripcion: "Analizo representaciones gráficas y modelos funcionales aplicados." },
        { nombre: "Razonamiento Geométrico", descripcion: "Demuestro teoremas geométricos y calculo áreas/volúmenes de cuerpos tridimensionales." }
      ];
    } else {
      return [
        { nombre: "Estadística y Probabilidad", descripcion: "Organizo conjuntos de datos y calculo medidas de tendencia central y variabilidad." },
        { nombre: "Resolución de Problemas ICFES/SABER", descripcion: "Resuelvo situaciones problema de alta complejidad razonando matemáticamente." }
      ];
    }
  }

  if (normalized.includes('inglés') || normalized.includes('english')) {
    if (numeroPeriodo === 1) {
      return [
        { nombre: "Reading Comprehension", descripcion: "Extracts main ideas and specific details from medium-length academic texts." },
        { nombre: "Oral Debate", descripcion: "Participates in active conversations and debates using fluent grammar." }
      ];
    } else if (numeroPeriodo === 2) {
      return [
        { nombre: "Written Essay", descripcion: "Writes structured and coherent essays using transition words and connectors." },
        { nombre: "Listening Ability", descripcion: "Understands main points of standard spoken English on academic matters." }
      ];
    } else if (numeroPeriodo === 3) {
      return [
        { nombre: "Vocabulary Expansion", descripcion: "Applies specialized B2/C1 vocabulary in contextualized group workshops." },
        { nombre: "Grammar & Syntax Project", descripcion: "Constructs complex conditional and passive voice sentences accurately." }
      ];
    } else {
      return [
        { nombre: "Final Oral Presentation", descripcion: "Delivers an individual monologue on a global issues topic." },
        { nombre: "Standardized Test Review", descripcion: "Completes mocks and exercises based on international proficiency frameworks." }
      ];
    }
  }

  if (normalized.includes('biología') || normalized.includes('naturales') || normalized.includes('química') || normalized.includes('física') || normalized.includes('ciencias')) {
    if (numeroPeriodo === 1) {
      return [
        { nombre: "Estructura Celular", descripcion: "Explico y relaciono la estructura y funciones de los orgánulos de la célula." },
        { nombre: "Diseño Experimental", descripcion: "Formulo hipótesis coherentes y diseño montajes experimentales sencillos." }
      ];
    } else if (numeroPeriodo === 2) {
      return [
        { nombre: "Leyes del Movimiento", descripcion: "Analizo y describo situaciones de equilibrio y movimiento mediante la dinámica." },
        { nombre: "Modelos Atómicos", descripcion: "Relaciono las propiedades químicas de los elementos con su configuración electrónica." }
      ];
    } else if (numeroPeriodo === 3) {
      return [
        { nombre: esCiclo67 ? "Ecosistemas y Cadenas Tróficas" : esCiclo89 ? "Estequiometría y Gases" : "Termodinámica y Fluidos", descripcion: "Modela las interacciones ecológicas o físico-químicas del entorno natural." },
        { nombre: "Informe de Laboratorio", descripcion: "Presenta informes científicos estructurados con análisis de gráficos y conclusiones." }
      ];
    } else {
      return [
        { nombre: "Genética y Herencia", descripcion: "Resuelvo problemas de genética mendeliana y biotecnología moderna." },
        { nombre: "Proyecto de Educación Ambiental (PRAE)", descripcion: "Desarrolla iniciativas de sostenibilidad y conservación ecológica en la sede." }
      ];
    }
  }

  // Genéricas por defecto para otras asignaturas
  return [
    {
      nombre: `Evidencia Teórica P${numeroPeriodo}`,
      descripcion: `Demuestra comprensión y apropiación conceptual de los contenidos del Periodo ${numeroPeriodo}.`
    },
    {
      nombre: `Evidencia Práctica P${numeroPeriodo}`,
      descripcion: `Desarrolla talleres y actividades prácticas aplicadas para el Periodo ${numeroPeriodo}.`
    }
  ];
}

runSeed().catch(err => {
  console.error('Unhandled Exception en el seeding script:', err);
  process.exit(1);
});
