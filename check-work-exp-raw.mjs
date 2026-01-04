import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get user ID from email
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

if (authError) {
  console.error('Auth error:', authError);
  process.exit(1);
}

const user = authUsers.users.find(u => u.email?.includes('cffrank'));

if (!user) {
  console.error('User not found');
  process.exit(1);
}

console.log('User ID:', user.id);

// Get work experience - SELECT ALL COLUMNS
const { data: workExp, error: expError } = await supabase
  .from('work_experience')
  .select('*')
  .eq('user_id', user.id)
  .order('start_date', { ascending: false });

if (expError) {
  console.error('Work experience error:', expError);
  process.exit(1);
}

console.log('\n=== RAW DATABASE RECORDS ===\n');
workExp.forEach((exp, idx) => {
  console.log(`\n--- Record ${idx + 1} ---`);
  console.log(JSON.stringify(exp, null, 2));
});
