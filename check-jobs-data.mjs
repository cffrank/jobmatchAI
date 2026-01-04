import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wpupbucinufbaiphwogc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkJobs() {
  console.log('📊 Checking jobs table data...\n');

  // Count total jobs
  const { count, error: countError } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.log('❌ Error counting jobs:', countError.message);
    return;
  }

  console.log(`📈 Total jobs in database: ${count || 0}`);

  if (count > 0) {
    // Get sample job with new fields
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, company, required_skills, work_arrangement, compatibility_breakdown, company_logo')
      .limit(3);

    if (jobsError) {
      console.log('❌ Error fetching jobs:', jobsError.message);
      return;
    }

    console.log('\n📋 Sample jobs (first 3):');
    jobs.forEach((job, idx) => {
      console.log(`\n${idx + 1}. ${job.title} at ${job.company}`);
      console.log(`   ID: ${job.id}`);
      console.log(`   Required Skills: ${JSON.stringify(job.required_skills || [])}`);
      console.log(`   Work Arrangement: ${job.work_arrangement || 'not set'}`);
      console.log(`   Company Logo: ${job.company_logo || 'not set'}`);
      console.log(`   Compatibility: ${JSON.stringify(job.compatibility_breakdown || {})}`);
    });

    // Count jobs with populated required_skills
    const { data: jobsWithSkills } = await supabase
      .from('jobs')
      .select('id')
      .not('required_skills', 'eq', '{}');

    console.log(`\n📊 Jobs with required_skills populated: ${jobsWithSkills?.length || 0} out of ${count}`);

    if (jobsWithSkills?.length === 0) {
      console.log('\n💡 Note: Existing jobs don\'t have required_skills populated yet.');
      console.log('   New jobs scraped will automatically have required_skills extracted.');
      console.log('   You can manually update existing jobs or wait for new job searches.');
    }
  } else {
    console.log('\n💡 No jobs in database yet.');
    console.log('   Run a job search to populate the database with jobs that have compatibility data.');
  }
}

checkJobs();
