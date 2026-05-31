import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const INSTITUCION_ID = '2d3edb41-cc4c-43c1-b683-865907244524'; // Colegio de Prueba SAS

const ACUDIENTES_DATA = [
  {
    nombre_completo: 'Marta Lucía Gómez',
    email: 'marta.gomez+acudiente@gmail.com',
    student_email: 'juan.perez+estudiante@gmail.com',
    parentesco: 'Madre'
  },
  {
    nombre_completo: 'José Ignacio Pérez',
    email: 'jose.perez+acudiente@gmail.com',
    student_email: 'sofia.gomez+estudiante@gmail.com',
    parentesco: 'Padre'
  },
  {
    nombre_completo: 'Claudia Patricia Ruiz',
    email: 'claudia.ruiz+acudiente@gmail.com',
    student_email: 'diego.ruiz+estudiante@gmail.com',
    parentesco: 'Madre'
  },
  {
    nombre_completo: 'Fernando Antonio Díaz',
    email: 'fernando.diaz+acudiente@gmail.com',
    student_email: 'camila.torres+estudiante@gmail.com',
    parentesco: 'Padre'
  },
  {
    nombre_completo: 'Liliana María Muñoz',
    email: 'liliana.munoz+acudiente@gmail.com',
    student_email: 'mateo.diaz+estudiante@gmail.com',
    parentesco: 'Madre'
  }
];

async function run() {
  console.log('Starting seed process for acudientes...');

  for (const acudiente of ACUDIENTES_DATA) {
    console.log(`\nProcessing: ${acudiente.nombre_completo} (${acudiente.email})`);

    // 1. Get the student's ID
    const { data: studentUser, error: studentError } = await supabase
      .from('usuarios')
      .select('id_usuario')
      .eq('email', acudiente.student_email)
      .single();

    if (studentError || !studentUser) {
      console.error(`- Error: Student with email ${acudiente.student_email} not found. Skipping.`);
      continue;
    }
    const studentId = studentUser.id_usuario;
    console.log(`- Found student: ${acudiente.student_email} (ID: ${studentId})`);

    // 2. Check if acudiente user already exists in auth or usuarios
    let { data: existingUser } = await supabase
      .from('usuarios')
      .select('id_usuario')
      .eq('email', acudiente.email)
      .maybeSingle();

    let userId = existingUser?.id_usuario;

    if (!userId) {
      console.log(`- Creating auth user for: ${acudiente.email}`);
      const tempPassword = 'Sophos2026!';
      const { data: newAuthData, error: authErr } = await supabase.auth.admin.createUser({
        email: acudiente.email,
        password: tempPassword,
        email_confirm: true,
        app_metadata: {
          id_institucion: INSTITUCION_ID,
          rol: 'ACUDIENTE',
          must_change_password: true,
        },
        user_metadata: {
          nombre_completo: acudiente.nombre_completo,
        },
      });

      if (authErr || !newAuthData.user) {
        console.error(`- Error creating auth user: ${authErr?.message}`);
        continue;
      }

      userId = newAuthData.user.id;
      console.log(`- Created auth user (ID: ${userId})`);

      // Insert into usuarios
      const { error: userErr } = await supabase.from('usuarios').insert({
        id_usuario: userId,
        email: acudiente.email,
        nombre_completo: acudiente.nombre_completo,
        rol: 'ACUDIENTE',
        id_institucion: INSTITUCION_ID,
      });

      if (userErr) {
        console.error(`- Error creating public profile: ${userErr.message}`);
        // Clean up auth user
        await supabase.auth.admin.deleteUser(userId);
        continue;
      }
      console.log('- Created public profile in usuarios');
    } else {
      console.log(`- Public profile already exists (ID: ${userId})`);
    }

    // 3. Check if relationship exists in perfiles_acudientes_estudiantes
    const { data: existingRel } = await supabase
      .from('perfiles_acudientes_estudiantes')
      .select('id_acudiente_estudiante')
      .eq('id_acudiente', userId)
      .eq('id_estudiante', studentId)
      .maybeSingle();

    if (!existingRel) {
      console.log(`- Creating relation: Guardian (${userId}) -> Student (${studentId}) with parentesco: ${acudiente.parentesco}`);
      const { error: relErr } = await supabase.from('perfiles_acudientes_estudiantes').insert({
        id_acudiente: userId,
        id_estudiante: studentId,
        id_institucion: INSTITUCION_ID,
        parentesco: acudiente.parentesco
      });

      if (relErr) {
        console.error(`- Error creating relationship: ${relErr.message}`);
      } else {
        console.log('- Relationship created successfully');
      }
    } else {
      console.log('- Relationship already exists');
    }
  }

  console.log('\nSeed process complete!');
}

run().catch(console.error);
