/* eslint-disable */
/**
 * ============================================================================
 * SOPHOS CORE - SCRIPT OFICIAL DE DEMO Y SEEDING DE BASE DE DATOS
 * ============================================================================
 * Lee los datos de SOPHOS_DB_UPLOADER_carbonell.csv y puebla la base de datos
 * de Supabase con datos de prueba realistas para todos los roles (Admin, Docente,
 * Estudiante, Acudiente) y grados (6º a 11º).
 * 
 * Uso:
 *   node src/docs/bulk_uploaders/seed-full-demo.js
 * ============================================================================
 */

const { cleanDatabase } = require('./seeder/cleaner');
const { seedInstitution } = require('./seeder/institution');
const { parseAndSeedCSV } = require('./seeder/csvParser');
const { seedEvidenciasYCalificaciones } = require('./seeder/evidenciasSeeder');
const { seedObservadorYAsistencia } = require('./seeder/observadorAsistencia');

async function runSeed() {
  console.time('Tiempo total de seeding');

  // 1. Limpieza de tablas públicas y Auth usuarios
  await cleanDatabase();

  // 2. Creación de Institución, Admin, Escalas y Periodos
  const instData = await seedInstitution();

  // 3. Parsing de CSV e inserción de Cursos, Materias, Usuarios, Matrículas, Asignaciones y Acudientes
  const csvData = await parseAndSeedCSV(instData.idInstitucion);

  // 4. Generación de 9 Evidencias Máster por materia/grado, configuraciones de periodo y calificaciones
  const evidenciasData = await seedEvidenciasYCalificaciones({
    ...csvData,
    idPeriodo1: instData.idPeriodo1,
    idPeriodo2: instData.idPeriodo2,
    idPeriodo3: instData.idPeriodo3,
  });

  // 5. Generación de historial de asistencias y observador digital
  await seedObservadorYAsistencia({
    rawRows: csvData.rawRows,
    userEmailsMap: csvData.userEmailsMap,
    estudiantesMatriculados: evidenciasData.estudiantesMatriculados,
    asignacionesList: csvData.asignacionesList,
  });

  console.log('\n==================================================');
  console.log('✅ SEEDING Y CONFIGURACIÓN INICIAL GENERADO SATISFACTORIAMENTE.');
  console.log('==================================================');
  console.timeEnd('Tiempo total de seeding');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Unhandled Exception en el script de seeding:', err);
  process.exit(1);
});
