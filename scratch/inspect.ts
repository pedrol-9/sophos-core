import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: insts } = await supabase.from('instituciones').select('*');
  const instMap = new Map(insts?.map(i => [i.id_institucion, i.nombre_legal]) || []);

  const { data: users, error } = await supabase.from('usuarios').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n--- ALL USERS WITH INSTITUTIONS ---');
  users.forEach((u: any) => {
    const instName = instMap.get(u.id_institucion) || 'Unknown';
    console.log(`- [${u.rol}] ${u.nombre_completo} | ${u.email} | Institution: ${instName} (${u.id_institucion})`);
  });
}

run().catch(console.error);
