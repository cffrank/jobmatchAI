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

// Get work experience
const { data: workExp, error: expError } = await supabase
  .from('work_experience')
  .select('*')
  .eq('user_id', user.id)
  .order('start_date', { ascending: false });

if (expError) {
  console.error('Work experience error:', expError);
  process.exit(1);
}

console.log('\n=== YOUR WORK EXPERIENCE IN DATABASE ===\n');
workExp.forEach((exp, idx) => {
  console.log(`${idx + 1}. POSITION: "${exp.position}"`);
  console.log(`   COMPANY: ${exp.company}`);
  console.log(`   DATES: ${exp.start_date} - ${exp.current ? 'Present' : exp.end_date}`);
  console.log(`   ACCOMPLISHMENTS: ${exp.accomplishments?.length || 0} listed`);
  if (exp.accomplishments?.length > 0) {
    exp.accomplishments.slice(0, 2).forEach(acc => {
      console.log(`   - ${acc}`);
    });
  }
  console.log('');
});
