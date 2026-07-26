/* eslint-disable */
const { supabase } = require('./env');

async function cleanDatabase() {
  console.log('=== INICIANDO LIMPIEZA DE BASE DE DATOS ===');

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
    'instituciones',
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

  // Listar y borrar usuarios de Supabase Auth
  try {
    let deletedCount = 0;
    while (true) {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 50,
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
    console.warn('Advertencia limpiando Supabase Auth:', err.message || err);
  }
}

module.exports = {
  cleanDatabase,
};
