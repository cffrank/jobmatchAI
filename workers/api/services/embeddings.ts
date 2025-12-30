/**
 * Embedding Service for Cloudflare Workers
 *
 * Generates semantic embeddings using Cloudflare Workers AI.
 * Uses @cf/baai/bge-base-en-v1.5 model to create 768-dimensional vectors
 * for job listings and user resumes/profiles.
 *
 * These embeddings enable semantic job matching beyond keyword matching.
 */

import type { Env, Job, UserProfile, WorkExperience, Skill } from '../types';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Workers AI model for text embeddings
 * @cf/baai/bge-base-en-v1.5 produces 768-dimensional vectors
 * Free tier: Included in Workers AI plan
 */
const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';

/**
 * Expected embedding dimension count
 */
const EXPECTED_DIMENSIONS = 768;

/**
 * Retry configuration for transient failures
 */
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRY_BACKOFF_MULTIPLIER = 2;

// =============================================================================
// Types
// =============================================================================

interface WorkersAIEmbeddingResponse {
  shape: number[];
  data: number[][];
}

// =============================================================================
// Core Embedding Generation
// =============================================================================

/**
 * Generate embedding vector for a text string
 *
 * Uses Workers AI binding with @cf/baai/bge-base-en-v1.5 model
 * Includes exponential backoff retry logic for transient failures
 *
 * @param env - Environment bindings (includes AI binding)
 * @param text - Input text to embed (max ~1000 tokens)
 * @returns 768-dimensional embedding vector
 * @throws Error if embedding generation fails after retries
 */
export async function generateEmbedding(env: Env, text: string): Promise<number[]> {
  const startTime = Date.now();

  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  // Truncate very long text (Workers AI has token limits)
  const maxChars = 8000; // ~2000 tokens
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

  console.log(`[Embeddings] Generating embedding for text (${truncatedText.length} chars)`);

  let lastError: Error | null = null;

  // Retry loop with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Call Workers AI
      const response = (await env.AI.run(EMBEDDING_MODEL, {
        text: [truncatedText],
      })) as WorkersAIEmbeddingResponse;

      // Validate response structure
      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response structure from Workers AI');
      }

      // Extract embedding vector (first result since we sent single text)
      const embedding = response.data[0];

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Embedding data is missing or invalid');
      }

      // Validate dimensions
      if (embedding.length !== EXPECTED_DIMENSIONS) {
        throw new Error(
          `Unexpected embedding dimensions: got ${embedding.length}, expected ${EXPECTED_DIMENSIONS}`
        );
      }

      const duration = Date.now() - startTime;
      console.log(
        `[Embeddings] Successfully generated ${EXPECTED_DIMENSIONS}D embedding in ${duration}ms (attempt ${attempt}/${MAX_RETRIES})`
      );

      return embedding;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[Embeddings] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        lastError.message
      );

      // If this was the last attempt, don't sleep
      if (attempt < MAX_RETRIES) {
        const delayMs = RETRY_DELAY_MS * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt - 1);
        console.log(`[Embeddings] Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  // All retries exhausted
  const totalDuration = Date.now() - startTime;
  console.error(
    `[Embeddings] Failed to generate embedding after ${MAX_RETRIES} attempts (${totalDuration}ms total)`
  );
  throw new Error(
    `Failed to generate embedding after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

// =============================================================================
// Job Embedding
// =============================================================================

/**
 * Generate embedding for a job listing
 *
 * Constructs a comprehensive text representation of the job including:
 * - Job title
 * - Company name
 * - Job description
 * - Required skills
 * - Preferred skills
 *
 * @param env - Environment bindings
 * @param job - Job object
 * @returns 768-dimensional embedding vector
 * @throws Error if embedding generation fails
 */
export async function generateJobEmbedding(env: Env, job: Job): Promise<number[]> {
  console.log(`[Embeddings] Generating job embedding for: ${job.title} at ${job.company}`);

  // Construct comprehensive job text
  const jobText = [
    job.title,
    job.company,
    job.description,
    job.requiredSkills?.join(' ') || '',
    job.preferredSkills?.join(' ') || '',
  ]
    .filter((part) => part && part.trim().length > 0)
    .join(' ');

  if (!jobText.trim()) {
    throw new Error('Job data is empty - cannot generate embedding');
  }

  console.log(`[Embeddings] Job text length: ${jobText.length} chars`);

  // Generate embedding
  const embedding = await generateEmbedding(env, jobText);

  // Validate dimensions
  if (embedding.length !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `Invalid job embedding dimensions: ${embedding.length} (expected ${EXPECTED_DIMENSIONS})`
    );
  }

  console.log(`[Embeddings] Successfully generated job embedding (${embedding.length}D)`);
  return embedding;
}

// =============================================================================
// Resume/Profile Embedding
// =============================================================================

/**
 * Generate embedding for a user's resume/profile
 *
 * Constructs a comprehensive text representation including:
 * - Profile headline and summary
 * - Work experience (positions, companies, descriptions)
 * - Skills
 *
 * Handles incomplete profiles gracefully by using available data.
 *
 * @param env - Environment bindings
 * @param profile - User profile object
 * @param workExperience - Array of work experience entries
 * @param skills - Array of user skills
 * @returns 768-dimensional embedding vector
 * @throws Error if no profile data available or embedding generation fails
 */
export async function generateResumeEmbedding(
  env: Env,
  profile: UserProfile,
  workExperience: WorkExperience[],
  skills: Skill[]
): Promise<number[]> {
  console.log(`[Embeddings] Generating resume embedding for user: ${profile.id}`);

  // Construct profile text components
  const textParts: string[] = [];

  // Add profile headline and summary
  if (profile.headline) {
    textParts.push(profile.headline);
  }
  if (profile.summary) {
    textParts.push(profile.summary);
  }

  // Add work experience
  if (workExperience && workExperience.length > 0) {
    for (const exp of workExperience) {
      const expText = [
        exp.position,
        exp.company,
        exp.description || '',
      ]
        .filter((part) => part && part.trim().length > 0)
        .join(' ');

      if (expText) {
        textParts.push(expText);
      }
    }
  }

  // Add skills
  if (skills && skills.length > 0) {
    const skillsText = skills.map((s) => s.name).join(' ');
    if (skillsText) {
      textParts.push(skillsText);
    }
  }

  // Combine all parts
  const resumeText = textParts.join(' ').trim();

  if (!resumeText) {
    console.warn(
      `[Embeddings] User ${profile.id} has incomplete profile - no text available for embedding`
    );
    throw new Error('Profile is empty - cannot generate embedding. Please complete your profile.');
  }

  console.log(
    `[Embeddings] Resume text length: ${resumeText.length} chars (headline: ${!!profile.headline}, summary: ${!!profile.summary}, experience: ${workExperience?.length || 0}, skills: ${skills?.length || 0})`
  );

  // Generate embedding
  const embedding = await generateEmbedding(env, resumeText);

  // Validate dimensions
  if (embedding.length !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `Invalid resume embedding dimensions: ${embedding.length} (expected ${EXPECTED_DIMENSIONS})`
    );
  }

  console.log(`[Embeddings] Successfully generated resume embedding (${embedding.length}D)`);
  return embedding;
}

// =============================================================================
// User Profile Embedding Management
// =============================================================================

/**
 * Generate and store user resume embedding
 *
 * Fetches user profile, work experience, and skills from the database,
 * generates an embedding, and updates the users table.
 *
 * This function is called automatically when:
 * - User updates their profile (headline/summary)
 * - User adds/updates work experience
 * - User adds/updates skills
 *
 * @param env - Environment bindings
 * @param supabase - Supabase client instance
 * @param userId - User ID to update embedding for
 * @throws Error if user not found or embedding generation fails
 */
export async function updateUserResumeEmbedding(
  env: Env,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any, // SupabaseClient type - avoid circular dependency
  userId: string
): Promise<void> {
  const startTime = Date.now();
  console.log(`[Embeddings] Starting resume embedding update for user ${userId}`);

  try {
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, current_title, professional_summary')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error(`User not found: ${userId}`);
    }

    // Fetch work experience
    const { data: workExperience, error: workError } = await supabase
      .from('work_experience')
      .select('position, company, description, start_date')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (workError) {
      console.error(`[Embeddings] Warning: Failed to fetch work experience: ${workError.message}`);
    }

    // Fetch skills
    const { data: skills, error: skillsError } = await supabase
      .from('skills')
      .select('name')
      .eq('user_id', userId);

    if (skillsError) {
      console.error(`[Embeddings] Warning: Failed to fetch skills: ${skillsError.message}`);
    }

    // Generate embedding
    const embedding = await generateResumeEmbedding(
      env,
      {
        id: profile.id,
        headline: profile.current_title,
        summary: profile.professional_summary,
      } as UserProfile,
      workExperience || [],
      skills || []
    );

    console.log(`[Embeddings] Generated embedding with ${embedding.length} dimensions`);

    // Update database with new embedding
    const { error: updateError } = await supabase
      .from('users')
      .update({ resume_embedding: embedding })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update resume embedding: ${updateError.message}`);
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Embeddings] Successfully updated resume embedding for user ${userId} in ${duration}ms`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Embeddings] Failed to update user embedding for ${userId} after ${duration}ms:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
