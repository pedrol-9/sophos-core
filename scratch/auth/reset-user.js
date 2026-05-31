const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const emails = [
    'carlos.mendoza+profesor@gmail.com',
    'mrestrepo@colegiofalso.edu.co',
    'jorge.cerquera@sophostest.com',
    'juan.perez+estudiante@gmail.com',
    'sofia.gomez+estudiante@gmail.com',
    'diego.ruiz+estudiante@gmail.com',
    'camila.torres+estudiante@gmail.com',
    'mateo.diaz+estudiante@gmail.com'
  ];

  // List users to find the correct user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }
  
  for (const email of emails) {
    const user = users.find(u => u.email === email);
    if (!user) {
      console.error(`User ${email} not found!`);
      continue;
    }
    
    console.log(`Found user: ${user.id} (${email}). Updating password...`);
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'Sophos2026!',
      app_metadata: {
        ...user.app_metadata,
        must_change_password: true,
      }
    });
    
    if (error) {
      console.error(`Error updating user ${email}:`, error);
    } else {
      console.log(`Successfully updated password for ${email} to "Sophos2026!" and set must_change_password to true.`);
    }
  }
}

main();
