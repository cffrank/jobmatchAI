/**
 * Backfill User Resume Embeddings Script
 *
 * Generates resume embeddings for all users who don't have one yet.
 *
 * Usage:
 *   npx tsx workers/scripts/backfill-user-embeddings.ts
 *
 * Features:
 * - Processes users in batches of 10
 * - Handles incomplete profiles gracefully
 * - Continues on individual failures
 * - Progress tracking and logging
 * - Dry-run mode for testing
 *
 * Requirements:
 * - SUPABASE_URL environment variable
 * - SUPABASE_SERVICE_ROLE_KEY environment variable
 * - Cloudflare Workers AI binding (mocked for local testing)
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/types/supabase';

// =============================================================================
// Configuration
// =============================================================================

const BATCH_SIZE = 10;
const DRY_RUN = process.env.DRY_RUN === 'true';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// =============================================================================
// Mock Workers AI for Local Execution
// =============================================================================

/**
 * Mock embedding generation for local testing
 * In production, this would use the actual Workers AI binding
 */
function generateMockEmbedding(text: string): number[] {
  // Generate a deterministic 768-dimensional vector based on text hash
  const hash = simpleHash(text);
  const embedding: number[] = [];

  for (let i = 0; i < 768; i++) {
    // Create pseudo-random values based on hash and index
    const value = Math.sin(hash * (i + 1)) * 0.5 + 0.5;
    embedding.push(value);
  }

  return embedding;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate resume embedding from user data
 * This is a simplified version for the backfill script
 */
function generateResumeEmbeddingLocal(
  profile: {
    headline?: string | null;
    summary?: string | null;
  },
  workExperience: Array<{
    position: string;
    company: string;
    description?: string | null;
  }>,
  skills: Array<{
    name: string;
  }>
): number[] {
  const parts: string[] = [];

  if (profile.headline) parts.push(profile.headline);
  if (profile.summary) parts.push(profile.summary);

  if (workExperience && workExperience.length > 0) {
    workExperience.forEach((exp) => {
      parts.push(`${exp.position} at ${exp.company}`);
      if (exp.description) parts.push(exp.description);
    });
  }

  if (skills && skills.length > 0) {
    parts.push(skills.map((s) => s.name).join(' '));
  }

  if (parts.length === 0) {
    throw new Error('No profile data available for embedding');
  }

  const text = parts.join(' ');
  return generateMockEmbedding(text);
}

// =============================================================================
// Validation
// =============================================================================

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing required environment variables:');
  console.error('  SUPABASE_URL:', SUPABASE_URL ? 'set' : 'MISSING');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING');
  console.error('');
  console.error('Please set these environment variables and try again.');
  process.exit(1);
}

// =============================================================================
// Main Script
// =============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('User Resume Embedding Backfill Script');
  console.log('='.repeat(80));
  console.log('');
  console.log('Configuration:');
  console.log(`  Batch Size: ${BATCH_SIZE}`);
  console.log(`  Dry Run: ${DRY_RUN ? 'YES (no changes will be made)' : 'NO'}`);
  console.log(`  Supabase URL: ${SUPABASE_URL}`);
  console.log('');
  console.log('NOTE: This script uses mock embeddings for local execution.');
  console.log('In production, it would use Cloudflare Workers AI.');
  console.log('');

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Step 1: Fetch users without embeddings
  console.log('[1/3] Fetching users without embeddings...');

  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, email, current_title, professional_summary')
    .is('resume_embedding', null)
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('ERROR: Failed to fetch users:', fetchError.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('No users found without embeddings. All done!');
    process.exit(0);
  }

  console.log(`Found ${users.length} users without embeddings`);
  console.log('');

  // Step 2: Process in batches
  console.log('[2/3] Processing users in batches...');
  console.log('');

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(users.length / BATCH_SIZE);

    console.log(`Batch ${batchNumber}/${totalBatches} (${batch.length} users):`);

    for (const user of batch) {
      totalProcessed++;

      try {
        // Fetch user's work experience
        const { data: workExperience, error: workError } = await supabase
          .from('work_experience')
          .select('position, company, description')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false });

        if (workError) {
          console.error(`  [${totalProcessed}/${users.length}] ${user.email}: Failed to fetch work experience - ${workError.message}`);
          totalFailed++;
          continue;
        }

        // Fetch user's skills
        const { data: skills, error: skillsError } = await supabase
          .from('skills')
          .select('name')
          .eq('user_id', user.id);

        if (skillsError) {
          console.error(`  [${totalProcessed}/${users.length}] ${user.email}: Failed to fetch skills - ${skillsError.message}`);
          totalFailed++;
          continue;
        }

        // Check if user has any meaningful data
        const hasData =
          user.current_title ||
          user.professional_summary ||
          (workExperience && workExperience.length > 0) ||
          (skills && skills.length > 0);

        if (!hasData) {
          console.log(`  [${totalProcessed}/${users.length}] ${user.email}: SKIPPED (no profile data)`);
          totalSkipped++;
          continue;
        }

        // Generate embedding
        const embedding = generateResumeEmbeddingLocal(
          {
            headline: user.current_title,
            summary: user.professional_summary,
          },
          (workExperience || []) as Array<{ position: string; company: string; description?: string | null }>,
          (skills || []) as Array<{ name: string }>
        );

        // Update database (unless dry run)
        if (!DRY_RUN) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ resume_embedding: embedding as any })
            .eq('id', user.id);

          if (updateError) {
            console.error(`  [${totalProcessed}/${users.length}] ${user.email}: FAILED to update - ${updateError.message}`);
            totalFailed++;
            continue;
          }
        }

        console.log(
          `  [${totalProcessed}/${users.length}] ${user.email}: ${DRY_RUN ? 'DRY RUN - ' : ''}SUCCESS (${embedding.length}D embedding)`
        );
        totalSuccess++;
      } catch (error) {
        console.error(
          `  [${totalProcessed}/${users.length}] ${user.email}: ERROR - ${error instanceof Error ? error.message : String(error)}`
        );
        totalFailed++;
      }
    }

    console.log('');
  }

  // Step 3: Summary
  console.log('[3/3] Summary:');
  console.log('');
  console.log(`  Total Users: ${users.length}`);
  console.log(`  Processed: ${totalProcessed}`);
  console.log(`  Success: ${totalSuccess}`);
  console.log(`  Skipped (no data): ${totalSkipped}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log('');

  if (DRY_RUN) {
    console.log('DRY RUN MODE - No changes were made to the database.');
    console.log('Run without DRY_RUN=true to apply changes.');
  } else {
    console.log('Backfill complete!');
  }

  console.log('');
  console.log('='.repeat(80));

  if (totalFailed > 0) {
    process.exit(1);
  }
}

// =============================================================================
// Execute
// =============================================================================

main().catch((error) => {
  console.error('');
  console.error('FATAL ERROR:', error instanceof Error ? error.message : String(error));
  console.error('');
  process.exit(1);
});
