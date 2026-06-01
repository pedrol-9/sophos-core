const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
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

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log("Checking RLS status and policies...");

  // Since we cannot run raw sql directly without execute_sql rpc, let's try querying pg_policies through a view or pg_catalog tables
  // Let's see if we can query pg_catalog pg_policies or pg_tables
  const { data: policies, error } = await supabase.from('pg_policies').select('*').limit(1);
  if (error) {
    console.log("Cannot query pg_policies directly. Let's try executing standard queries with an authenticated user context!");
  } else {
    console.log("Policies:", policies);
  }

  // Let's simulate a query as Carlos Mendoza!
  // To do that, we can instantiate a supabase client with the anon key and login as Carlos
  const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log("Logging in as Carlos Mendoza...");
  const { data: authData, error: loginError } = await userClient.auth.signInWithPassword({
    email: 'carlos.mendoza+profesor@gmail.com',
    password: 'Sophos2026!'
  });

  if (loginError) {
    console.error("Login failed:", loginError.message);
    return;
  }

  console.log("Login successful! User ID:", authData.user.id);
  console.log("Querying asignaciones_academicas with user context...");
  const { data: userAssignments, error: assError } = await userClient
    .from('asignaciones_academicas')
    .select('*');

  console.log("User Assignments result:", { userAssignments, error: assError?.message });

  const { data: userCursos, error: curError } = await userClient
    .from('cursos')
    .select('*');

  console.log("User Cursos result:", { userCursos, error: curError?.message });
}

main();
