import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export async function createInstitutionAndAdmin(
  nombreLegal: string,
  nit: string,
  dominio: string | null,
  nombreAdmin: string,
  emailAdmin: string,
  password: string
) {
  const adminClient = createAdminClient();
  const supabase = await createClient();

  const { data: inst, error: instError } = await adminClient
    .from('instituciones')
    .insert({
      nombre_legal: nombreLegal,
      nit: nit,
      dominio_personalizado: dominio,
      estado_suscripcion: 'PRUEBA',
    })
    .select('id_institucion')
    .single();

  if (instError || !inst) {
    if (instError?.code === '23505') {
      throw new Error('Ya existe una institución registrada con ese NIT.');
    }
    throw new Error(`Error al crear la institución: ${instError?.message}`);
  }

  const idInstitucion = inst.id_institucion;

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: emailAdmin,
    password: password,
    email_confirm: true,
    app_metadata: {
      id_institucion: idInstitucion,
      rol: 'ADMIN',
    },
    user_metadata: {
      nombre_completo: nombreAdmin,
    },
  });

  if (authError || !authData.user) {
    await adminClient.from('instituciones').delete().eq('id_institucion', idInstitucion);
    if (authError?.message?.includes('already registered')) {
      throw new Error('Este correo electrónico ya está registrado en el sistema.');
    }
    throw new Error(`Error al crear las credenciales de acceso: ${authError?.message}`);
  }

  const newUserId = authData.user.id;

  const { error: userError } = await adminClient.from('usuarios').insert({
    id_usuario: newUserId,
    email: emailAdmin,
    nombre_completo: nombreAdmin,
    rol: 'ADMIN',
    id_institucion: idInstitucion,
  });

  if (userError) {
    await adminClient.auth.admin.deleteUser(newUserId);
    await adminClient.from('instituciones').delete().eq('id_institucion', idInstitucion);
    throw new Error(`Error al crear el perfil de usuario: ${userError.message}`);
  }

  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: emailAdmin,
    password: password,
  });

  if (loginError) {
    throw new Error('La institución fue registrada correctamente, pero ocurrió un error al iniciar sesión automáticamente. Por favor, ingresa en /login manualmente.');
  }

  return { success: true, idInstitucion };
}

export async function removeMustChangePasswordFlag(userId: string) {
  const adminClient = createAdminClient();
  const { data: { user }, error: getUserError } = await adminClient.auth.admin.getUserById(userId);
  
  if (getUserError || !user) {
    throw new Error('No se pudo encontrar el usuario para actualizar sus metadatos.');
  }

  const currentMetadata = user.app_metadata || {};
  
  const { error: adminError } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...currentMetadata,
      must_change_password: false,
    },
  });

  if (adminError) {
    throw new Error(`Falló la actualización del perfil administrativo: ${adminError.message}`);
  }
}
