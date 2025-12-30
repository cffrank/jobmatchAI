/**
 * Backfill Job Embeddings Script
 *
 * Generates embeddings for all jobs that don't have one yet.
 *
 * Usage:
 *   npx tsx workers/scripts/backfill-job-embeddings.ts
 *
 * Features:
 * - Processes jobs in batches of 10 (parallel within batch)
 * - Handles missing job data gracefully
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

// =============================================================================
// Configuration
// =============================================================================

const BATCH_SIZE = 10;
const DRY_RUN = process.env.DRY_RUN === 'true';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// =============================================================================
// Types
// =============================================================================

interface JobRecord {
  id: string;
  title: string;
  company: string;
  description: string | null;
  required_skills: string[] | null;
  preferred_skills: string[] | null;
}

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
 * Generate job embedding from job data
 * This is a simplified version for the backfill script
 */
function generateJobEmbeddingLocal(job: JobRecord): number[] {
  const parts: string[] = [];

  // Add job title and company (always present)
  parts.push(job.title);
  parts.push(job.company);

  // Add description if present
  if (job.description) {
    parts.push(job.description);
  }

  // Add required skills
  if (job.required_skills && job.required_skills.length > 0) {
    parts.push(job.required_skills.join(' '));
  }

  // Add preferred skills
  if (job.preferred_skills && job.preferred_skills.length > 0) {
    parts.push(job.preferred_skills.join(' '));
  }

  if (parts.length === 0) {
    throw new Error('No job data available for embedding');
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

export async function main() {
  console.log('='.repeat(80));
  console.log('Job Embeddings Backfill Script');
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

  // Step 1: Fetch jobs without embeddings
  console.log('[1/3] Fetching jobs without embeddings...');

  const { data: jobs, error: fetchError } = await supabase
    .from('jobs')
    .select('id, title, company, description, required_skills, preferred_skills')
    .is('embedding', null)
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('ERROR: Failed to fetch jobs:', fetchError.message);
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.log('No jobs found without embeddings. All done!');
    process.exit(0);
  }

  console.log(`Found ${jobs.length} jobs without embeddings`);
  console.log('');

  // Step 2: Process in batches (parallel within batch)
  console.log('[2/3] Processing jobs in batches...');
  console.log('');

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(jobs.length / BATCH_SIZE);

    console.log(`Batch ${batchNumber}/${totalBatches} (${batch.length} jobs):`);

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (job) => {
        totalProcessed++;

        try {
          // Check if job has meaningful data
          const hasData =
            job.title &&
            job.company &&
            (job.description ||
              (job.required_skills && job.required_skills.length > 0) ||
              (job.preferred_skills && job.preferred_skills.length > 0));

          if (!hasData) {
            return {
              status: 'skipped' as const,
              job,
              reason: 'no job data',
            };
          }

          // Generate embedding
          const embedding = generateJobEmbeddingLocal(job as JobRecord);

          // Update database (unless dry run)
          if (!DRY_RUN) {
            const { error: updateError } = await supabase
              .from('jobs')
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .update({ embedding: embedding as any }) // Supabase type mismatch with Workers AI embeddings
              .eq('id', job.id);

            if (updateError) {
              throw new Error(`Failed to update: ${updateError.message}`);
            }
          }

          return {
            status: 'success' as const,
            job,
            embedding,
          };
        } catch (error) {
          return {
            status: 'failed' as const,
            job,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    // Process results and update counters
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const jobIndex = i + j + 1;

      if (result.status === 'rejected') {
        console.error(
          `  [${jobIndex}/${jobs.length}] Job ${batch[j].id}: ERROR - ${result.reason}`
        );
        totalFailed++;
      } else if (result.value.status === 'skipped') {
        console.log(
          `  [${jobIndex}/${jobs.length}] ${result.value.job.title} at ${result.value.job.company}: SKIPPED (${result.value.reason})`
        );
        totalSkipped++;
      } else if (result.value.status === 'failed') {
        console.error(
          `  [${jobIndex}/${jobs.length}] ${result.value.job.title} at ${result.value.job.company}: FAILED - ${result.value.error}`
        );
        totalFailed++;
      } else {
        console.log(
          `  [${jobIndex}/${jobs.length}] ${result.value.job.title} at ${result.value.job.company}: ${DRY_RUN ? 'DRY RUN - ' : ''}SUCCESS (${result.value.embedding.length}D embedding)`
        );
        totalSuccess++;
      }
    }

    console.log('');
  }

  // Step 3: Summary
  console.log('[3/3] Summary:');
  console.log('');
  console.log(`  Total Jobs: ${jobs.length}`);
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

// Only run if executed directly (not imported)
if (require.main === module) {
  main().catch((error) => {
    console.error('');
    console.error('FATAL ERROR:', error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  });
}
