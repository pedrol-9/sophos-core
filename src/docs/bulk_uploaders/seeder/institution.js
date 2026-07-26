/* eslint-disable */
const { supabase, FIXED_INST_ID } = require('./env');

async function seedInstitution() {
  console.log('\n=== CREANDO INSTITUCIÓN Y ADMINISTRADOR DEMO ===');

  const { data: inst, error: instError } = await supabase
    .from('instituciones')
    .upsert({
      id_institucion: FIXED_INST_ID,
      nombre_legal: 'IE Jose María Carbonell',
      nit: '900.123.456-7',
      dominio_personalizado: 'jm-carbonell.edu.co',
      estado_suscripcion: 'PRUEBA',
    })
    .select('id_institucion')
    .single();

  if (instError || !inst) {
    console.error('Error creando la institución:', instError?.message || instError);
    process.exit(1);
  }
  const idInstitucion = FIXED_INST_ID;
  console.log(`Institución "IE Jose María Carbonell" configurada: ${idInstitucion}`);

  // Crear administrador en Auth
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.admin.createUser({
    email: 'contacto@jm-carbonell.edu.co',
    password: 'Sophos2026!',
    email_confirm: true,
    app_metadata: {
      id_institucion: idInstitucion,
      rol: 'ADMIN',
    },
    user_metadata: {
      nombre_completo: 'Administrador Carbonell',
    },
  });

  if (adminAuthErr || !adminAuth?.user) {
    console.error('Error registrando Administrador:', adminAuthErr?.message || adminAuthErr);
    process.exit(1);
  }

  const adminUserId = adminAuth.user.id;
  await supabase.from('usuarios').insert({
    id_usuario: adminUserId,
    email: 'contacto@jm-carbonell.edu.co',
    nombre_completo: 'Administrador Carbonell',
    rol: 'ADMIN',
    id_institucion: idInstitucion,
  });

  console.log('Administrador contacto@jm-carbonell.edu.co registrado correctamente.');

  // Escalas de valoración
  const escalas = [
    { id_institucion: idInstitucion, nombre_desempeno: 'BAJO', nota_minima: 0, nota_maxima: 2.9 },
    { id_institucion: idInstitucion, nombre_desempeno: 'BASICO', nota_minima: 3.0, nota_maxima: 3.9 },
    { id_institucion: idInstitucion, nombre_desempeno: 'ALTO', nota_minima: 4.0, nota_maxima: 4.5 },
    { id_institucion: idInstitucion, nombre_desempeno: 'SUPERIOR', nota_minima: 4.6, nota_maxima: 5.0 },
  ];
  const { error: escError } = await supabase.from('escala_valoracion').insert(escalas);
  if (escError) console.error('Error configurando escalas:', escError.message);

  // Periodos Académicos
  const periodos = [
    { id_institucion: idInstitucion, numero_periodo: 1, fecha_inicio: '2026-02-01', fecha_fin: '2026-04-15', activo: false },
    { id_institucion: idInstitucion, numero_periodo: 2, fecha_inicio: '2026-04-16', fecha_fin: '2026-06-20', activo: false },
    { id_institucion: idInstitucion, numero_periodo: 3, fecha_inicio: '2026-06-21', fecha_fin: '2026-08-31', activo: true },
    { id_institucion: idInstitucion, numero_periodo: 4, fecha_inicio: '2026-09-01', fecha_fin: '2026-11-30', activo: false },
  ];
  const { data: savedPeriods, error: perError } = await supabase
    .from('periodos_academicos')
    .insert(periodos)
    .select('*');

  if (perError || !savedPeriods) {
    console.error('Error configurando periodos:', perError?.message || perError);
    process.exit(1);
  }
  console.log('Periodos académicos configurados. Periodo 3 ACTIVO.');

  return {
    idInstitucion,
    savedPeriods,
    idPeriodo1: savedPeriods.find((p) => p.numero_periodo === 1).id_periodo,
    idPeriodo2: savedPeriods.find((p) => p.numero_periodo === 2).id_periodo,
    idPeriodo3: savedPeriods.find((p) => p.numero_periodo === 3).id_periodo,
  };
}

module.exports = {
  seedInstitution,
};
