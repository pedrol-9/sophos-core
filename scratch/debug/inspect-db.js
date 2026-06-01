const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function inspect() {
  console.log("🏫 CURSOS:");
  const { data: cursos } = await supabase.from('cursos').select('*');
  console.log(JSON.stringify(cursos, null, 2));

  console.log("\n📚 MATERIAS:");
  const { data: materias } = await supabase.from('materias').select('*');
  console.log(JSON.stringify(materias, null, 2));
}

inspect().catch(console.error);
