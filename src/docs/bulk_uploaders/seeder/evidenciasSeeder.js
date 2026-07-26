/* eslint-disable */
const { supabase, FIXED_INST_ID } = require('./env');

function extractGrado(nombreCurso) {
  const match = (nombreCurso || '').match(/^(\d+)/);
  if (match) {
    const num = match[1];
    if (num.length >= 3) {
      return num.slice(0, -2);
    }
    return num;
  }
  return nombreCurso;
}

async function seedEvidenciasYCalificaciones({
  rawRows,
  userEmailsMap,
  matriculaMap,
  coursesMap,
  asignacionesList,
  idPeriodo1,
  idPeriodo2,
  idPeriodo3,
}) {
  console.log('\n=== GENERANDO EVIDENCIAS Y CALIFICACIONES ===');

  // Obtener lista completa de estudiantes matriculados estructurados
  const estudiantesMatriculados = [];
  rawRows
    .filter((r) => r.rol === 'ESTUDIANTE')
    .forEach((stud) => {
      const idMatricula = matriculaMap.get(stud.email);
      const idEstudiante = userEmailsMap.get(stud.email);
      if (idMatricula && idEstudiante) {
        estudiantesMatriculados.push({
          email: stud.email,
          id_matricula: idMatricula,
          id_estudiante: idEstudiante,
          curso: stud.curso,
          jornada: stud.jornada,
          cursoId: coursesMap.get(`${stud.curso}-${stud.jornada}`),
        });
      }
    });

  // 1. Crear las 9 Evidencias Máster por cada combinación única de (id_materia, grado)
  console.log('Creando 9 evidencias máster estándar (Evidencia de Prueba 1..9) por cada combinación de materia y grado...');
  const evidenciasMapByMateriaGrado = new Map();

  const uniqueMateriaGradoMap = new Map();
  for (const asig of asignacionesList) {
    const grado = extractGrado(asig.cursoNombre);
    const key = `${asig.id_materia}_${grado}`;
    if (!uniqueMateriaGradoMap.has(key)) {
      uniqueMateriaGradoMap.set(key, { id_materia: asig.id_materia, grado });
    }
  }

  for (const [key, { id_materia, grado }] of uniqueMateriaGradoMap.entries()) {
    const masterEvidencesList = [];

    for (let i = 1; i <= 9; i++) {
      const { data: evData, error: evErr } = await supabase
        .from('evidencias')
        .insert({
          id_institucion: FIXED_INST_ID,
          id_materia: id_materia,
          grado: grado,
          nombre: `Evidencia de Prueba ${i}`,
          descripcion: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Evidencia de evaluación de aprendizaje.',
          orden: i,
          activo: true,
          ano_lectivo: 2026,
        })
        .select('id_evidencia, nombre')
        .single();

      if (evErr || !evData) {
        console.error(`Error creando Evidencia de Prueba ${i} para materia ${id_materia} grado ${grado}:`, evErr?.message);
      } else {
        masterEvidencesList.push(evData);
      }
    }
    evidenciasMapByMateriaGrado.set(key, masterEvidencesList);
  }

  const calificacionesAInsertar = [];
  const configEvidenciasPeriodoAInsertar = [];
  const logrosAInsertar = [];

  for (const asig of asignacionesList) {
    const cursoEstudiantes = estudiantesMatriculados.filter((e) => e.cursoId === asig.id_curso);
    if (cursoEstudiantes.length === 0) continue;

    const grado = extractGrado(asig.cursoNombre);
    const key = `${asig.id_materia}_${grado}`;
    const evList = evidenciasMapByMateriaGrado.get(key) || [];

    if (evList.length < 9) {
      console.warn(`Advertencia: Asignación ${asig.id_asignacion} no tiene 9 evidencias máster.`);
      continue;
    }

    const ev1 = evList[0];
    const ev2 = evList[1];
    const ev3 = evList[2];
    const ev4 = evList[3];
    const ev5 = evList[4];
    const ev6 = evList[5];
    const ev7 = evList[6];

    // PERIODO 1 (CERRADO): 2 Evidencias activas (Ev 1: 50%, Ev 2: 50%)
    configEvidenciasPeriodoAInsertar.push(
      { id_asignacion: asig.id_asignacion, id_periodo: idPeriodo1, id_evidencia: ev1.id_evidencia, activo: true, peso: 0.50 },
      { id_asignacion: asig.id_asignacion, id_periodo: idPeriodo1, id_evidencia: ev2.id_evidencia, activo: true, peso: 0.50 }
    );

    logrosAInsertar.push({
      id_asignacion: asig.id_asignacion,
      id_periodo: idPeriodo1,
      descripcion: `Demuestra desempeño práctico y apropiación conceptual de los contenidos fundamentales de ${asig.materiaNombre} del Periodo 1.`,
    });

    cursoEstudiantes.forEach((est) => {
      const nota1 = parseFloat((Math.random() * (5.0 - 3.0) + 3.0).toFixed(1));
      calificacionesAInsertar.push({
        id_institucion: FIXED_INST_ID,
        id_matricula: est.id_matricula,
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo1,
        periodo: 1,
        id_evidencia: ev1.id_evidencia,
        actividad: 'evidencia',
        nota: nota1,
        fecha_registro: '2026-03-20T10:00:00Z',
      });

      const nota2 = parseFloat((Math.random() * (5.0 - 3.0) + 3.0).toFixed(1));
      calificacionesAInsertar.push({
        id_institucion: FIXED_INST_ID,
        id_matricula: est.id_matricula,
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo1,
        periodo: 1,
        id_evidencia: ev2.id_evidencia,
        actividad: 'evidencia',
        nota: nota2,
        fecha_registro: '2026-04-12T10:00:00Z',
      });
    });

    // PERIODO 2 (CERRADO): 2 Evidencias activas (Ev 3: 50%, Ev 4: 50%)
    configEvidenciasPeriodoAInsertar.push(
      { id_asignacion: asig.id_asignacion, id_periodo: idPeriodo2, id_evidencia: ev3.id_evidencia, activo: true, peso: 0.50 },
      { id_asignacion: asig.id_asignacion, id_periodo: idPeriodo2, id_evidencia: ev4.id_evidencia, activo: true, peso: 0.50 }
    );

    logrosAInsertar.push({
      id_asignacion: asig.id_asignacion,
      id_periodo: idPeriodo2,
      descripcion: `Desarrolla habilidades analíticas en la resolución de problemas en el área de ${asig.materiaNombre} correspondientes al Periodo 2.`,
    });

    cursoEstudiantes.forEach((est) => {
      const nota3 = parseFloat((Math.random() * (5.0 - 3.0) + 3.0).toFixed(1));
      calificacionesAInsertar.push({
        id_institucion: FIXED_INST_ID,
        id_matricula: est.id_matricula,
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo2,
        periodo: 2,
        id_evidencia: ev3.id_evidencia,
        actividad: 'evidencia',
        nota: nota3,
        fecha_registro: '2026-05-18T10:00:00Z',
      });

      const nota4 = parseFloat((Math.random() * (5.0 - 3.0) + 3.0).toFixed(1));
      calificacionesAInsertar.push({
        id_institucion: FIXED_INST_ID,
        id_matricula: est.id_matricula,
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo2,
        periodo: 2,
        id_evidencia: ev4.id_evidencia,
        actividad: 'evidencia',
        nota: nota4,
        fecha_registro: '2026-06-15T10:00:00Z',
      });
    });

    // PERIODO 3 (VIGENTE/ACTIVO): 3 Evidencias activas (Ev 5: 50%, Ev 6: 25%, Ev 7: 25%)
    configEvidenciasPeriodoAInsertar.push(
      { id_asignacion: asig.id_asignacion, id_periodo: idPeriodo3, id_evidencia: ev5.id_evidencia, activo: true, peso: 0.50 },
      { id_asignacion: asig.id_asignacion, id_periodo: idPeriodo3, id_evidencia: ev6.id_evidencia, activo: true, peso: 0.25 },
      { id_asignacion: asig.id_asignacion, id_periodo: idPeriodo3, id_evidencia: ev7.id_evidencia, activo: true, peso: 0.25 }
    );

    logrosAInsertar.push({
      id_asignacion: asig.id_asignacion,
      id_periodo: idPeriodo3,
      descripcion: `Aplica conceptos avanzados y trabajo colaborativo en ${asig.materiaNombre} durante el Periodo 3.`,
    });

    cursoEstudiantes.forEach((est) => {
      const nota5 = parseFloat((Math.random() * (5.0 - 3.2) + 3.2).toFixed(1));
      calificacionesAInsertar.push({
        id_institucion: FIXED_INST_ID,
        id_matricula: est.id_matricula,
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo3,
        periodo: 3,
        id_evidencia: ev5.id_evidencia,
        actividad: 'evidencia',
        nota: nota5,
        fecha_registro: '2026-07-10T10:00:00Z',
      });

      const nota6 = parseFloat((Math.random() * (5.0 - 3.2) + 3.2).toFixed(1));
      calificacionesAInsertar.push({
        id_institucion: FIXED_INST_ID,
        id_matricula: est.id_matricula,
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo3,
        periodo: 3,
        id_evidencia: ev6.id_evidencia,
        actividad: 'evidencia',
        nota: nota6,
        fecha_registro: '2026-07-20T10:00:00Z',
      });

      const nota7 = parseFloat((Math.random() * (5.0 - 3.0) + 3.0).toFixed(1));
      calificacionesAInsertar.push({
        id_institucion: FIXED_INST_ID,
        id_matricula: est.id_matricula,
        id_asignacion: asig.id_asignacion,
        id_periodo: idPeriodo3,
        periodo: 3,
        id_evidencia: ev7.id_evidencia,
        actividad: 'evidencia',
        nota: nota7,
        fecha_registro: '2026-07-25T10:00:00Z',
      });
    });
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

  return {
    estudiantesMatriculados,
  };
}

module.exports = {
  seedEvidenciasYCalificaciones,
};
