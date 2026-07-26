/* eslint-disable */
const { supabase, FIXED_INST_ID } = require('./env');

async function seedObservadorYAsistencia({
  rawRows,
  userEmailsMap,
  estudiantesMatriculados,
  asignacionesList,
}) {
  // Generar Asistencias
  console.log('Generando historial de asistencias...');
  const asistenciasList = [];

  estudiantesMatriculados.forEach((est) => {
    const asigns = asignacionesList.filter((a) => a.id_curso === est.cursoId);
    asigns.forEach((asig) => {
      // 8% de probabilidad de registrar falta
      if (Math.random() < 0.08) {
        asistenciasList.push({
          id_institucion: FIXED_INST_ID,
          id_matricula: est.id_matricula,
          id_asignacion: asig.id_asignacion,
          fecha: '2026-05-15',
          estado: Math.random() > 0.5 ? 'FALTA_JUSTIFICADA' : 'FALTA_INJUSTIFICADA',
          observacion: 'Falla a clase sin soporte registrada.',
        });
      }
    });
  });

  if (asistenciasList.length > 0) {
    for (let i = 0; i < asistenciasList.length; i += 200) {
      const chunk = asistenciasList.slice(i, i + 200);
      await supabase.from('asistencias').insert(chunk);
    }
    console.log(`Insertados ${asistenciasList.length} registros de fallas de asistencia.`);
  }

  // Observador digital
  console.log('Generando anotaciones del observador digital...');
  const docDocente = rawRows.find((r) => r.rol === 'DOCENTE');
  const idDocente = docDocente ? userEmailsMap.get(docDocente.email) : null;

  if (idDocente && estudiantesMatriculados.length > 3) {
    const anotaciones = [
      {
        id_institucion: FIXED_INST_ID,
        id_estudiante: estudiantesMatriculados[0].id_estudiante,
        id_docente: idDocente,
        tipo_nota: 'PEDAGOGICA',
        observacion_informal: 'El estudiante muestra gran interés en los talleres y análisis crítico.',
        observacion_formal_ia:
          'Se evidencia un avance destacado en los procesos cognitivos y análisis analítico en el aula de clases.',
        fecha_registro: new Date().toISOString(),
      },
      {
        id_institucion: FIXED_INST_ID,
        id_estudiante: estudiantesMatriculados[1].id_estudiante,
        id_docente: idDocente,
        tipo_nota: 'DISCIPLINARIA',
        observacion_informal: 'Interrumpe con frecuencia y conversa con compañeros.',
        observacion_formal_ia:
          'Se recomienda al estudiante mayor autorregulación y apego a los acuerdos de convivencia grupal.',
        fecha_registro: new Date().toISOString(),
      },
    ];
    const { error: obsErr } = await supabase.from('observador_digital').insert(anotaciones);
    if (obsErr) console.error('Error insertando anotaciones observador:', obsErr.message);
    else console.log('Anotaciones del observador creadas exitosamente.');
  }
}

module.exports = {
  seedObservadorYAsistencia,
};
