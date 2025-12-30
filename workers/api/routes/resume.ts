/**
 * Resume Routes for Cloudflare Workers
 *
 * Handles resume parsing, gap analysis, and import functionality.
 *
 * Endpoints:
 * - POST /api/resume/parse - Parse resume file using AI
 *   - PDF files: Text extracted with Railway → parsed with Workers AI (Llama 3.3 70B)
 *   - Image files: Parsed with OpenAI GPT-4o Vision
 *   - Supports: PDF, PNG, JPG, JPEG, GIF, WEBP
 * - POST /api/resume/analyze-gaps - Analyze resume for gaps and generate improvement questions
 * - GET /api/resume/gap-analysis/:id - Get gap analysis by ID
 * - PATCH /api/resume/gap-analysis/:id/answer - Answer a question in gap analysis
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { createValidationError } from '../middleware/errorHandler';
import { parseResume } from '../services/openai';
import { analyzeResumeGaps, type ResumeGapAnalysis } from '../services/resumeGapAnalysis';
import { createSupabaseAdmin } from '../services/supabase';

// =============================================================================
// Router Setup
// =============================================================================

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// =============================================================================
// Validation Schemas
// =============================================================================

const parseResumeSchema = z.object({
  storagePath: z.string().min(1, 'Storage path is required'),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/resume/parse
 * Parse resume file using AI
 *
 * PDF files (recommended):
 * - Text extracted using Workers AI Vision (Llama 3.2 11B Vision Instruct)
 * - Parsed with Cloudflare Workers AI (Llama 3.3 70B Instruct)
 * - Completely free, no external APIs needed
 * - Cost-effective, fully serverless
 *
 * Image files:
 * - Parsed with OpenAI GPT-4o Vision
 * - Supports: PNG, JPG, JPEG, GIF, WEBP
 *
 * The file should already be uploaded to Supabase storage.
 * This endpoint takes the storage path and returns parsed resume data.
 */
app.post('/parse', authenticateUser, rateLimiter(), async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  // Log request details for debugging
  console.log(`[/api/resume/parse] Request received from user ${userId}`);
  console.log(`[/api/resume/parse] Request body:`, JSON.stringify(body));

  // Validate input
  const parseResult = parseResumeSchema.safeParse(body);
  if (!parseResult.success) {
    console.error(`[/api/resume/parse] Validation failed for user ${userId}`);
    console.error(`[/api/resume/parse] Validation errors:`, JSON.stringify(parseResult.error.errors, null, 2));
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { storagePath } = parseResult.data;

  console.log(`[/api/resume/parse] Validation passed - starting parse for user ${userId}, path: ${storagePath}`);

  try {
    // Parse resume using OpenAI Vision API
    const parsedData = await parseResume(c.env, storagePath);

    console.log(`[/api/resume/parse] Resume parsed successfully for user ${userId}`);

    return c.json(parsedData, 200);
  } catch (error) {
    console.error(`[/api/resume/parse] Parse failed for user ${userId}:`, error);

    // Re-throw the error to be handled by the error handler
    throw error;
  }
});

/**
 * GET /api/resume/supported-formats
 * Returns information about supported file formats
 */
app.get('/supported-formats', async (c) => {
  return c.json({
    supported: [
      {
        format: 'PNG',
        extension: '.png',
        mimeType: 'image/png',
        status: 'fully_supported',
      },
      {
        format: 'JPEG',
        extension: '.jpg, .jpeg',
        mimeType: 'image/jpeg',
        status: 'fully_supported',
      },
      {
        format: 'GIF',
        extension: '.gif',
        mimeType: 'image/gif',
        status: 'fully_supported',
      },
      {
        format: 'WebP',
        extension: '.webp',
        mimeType: 'image/webp',
        status: 'fully_supported',
      },
      {
        format: 'PDF',
        extension: '.pdf',
        mimeType: 'application/pdf',
        status: 'fully_supported',
        note: 'Text extracted using Railway PDF parser, then parsed with Cloudflare Workers AI (Llama 3.3 70B). Completely free and fully serverless.',
      },
    ],
    recommendations: [
      'PDF format is recommended for best results and cost-effectiveness.',
      'Works with both selectable text and scanned image PDFs (uses Vision AI).',
      'Multi-page PDFs are fully supported and processed automatically.',
      'Images (PNG, JPEG) are also supported via OpenAI Vision API.',
      'For all uploads, ensure text is clearly visible and high-resolution.',
    ],
  });
});

/**
 * POST /api/resume/analyze-gaps
 * Analyze user's current profile for gaps and generate improvement questions
 *
 * Uses Workers AI (Llama 3.3 70B) to identify gaps, red flags, and generate
 * 5-10 targeted questions to help strengthen the resume/profile.
 *
 * Completely free - no external API costs.
 */
app.post('/analyze-gaps', authenticateUser, rateLimiter(), async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  console.log(`[/api/resume/analyze-gaps] Starting analysis for user ${userId}`);

  try {
    // Get parsed resume data from request body (before import)
    const body = await c.req.json();
    const { profile, workExperience, education, skills } = body;

    console.log(`[/api/resume/analyze-gaps] Received parsed data:`, {
      hasProfile: !!profile,
      workExperienceCount: workExperience?.length || 0,
      educationCount: education?.length || 0,
      skillsCount: skills?.length || 0,
    });

    // Validate required data
    if (!profile) {
      throw new Error('Profile data is required');
    }

    // Use parsed data for analysis
    const profileData = {
      id: userId,
      email: profile.email || '',
      full_name: profile.full_name || '',
      phone_number: profile.phone_number || '',
      linkedin_url: profile.linkedin_url || '',
      portfolio_url: profile.portfolio_url || '',
      professional_summary: profile.professional_summary || '',
      city: profile.city || '',
      state: profile.state || '',
      country: profile.country || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`[/api/resume/analyze-gaps] Using parsed data for analysis`);

    // Analyze resume with Workers AI
    const analysis = await analyzeResumeGaps(
      c.env,
      profileData,
      workExperience || [],
      education || [],
      skills || []
    );

    console.log(
      `[/api/resume/analyze-gaps] Analysis complete for user ${userId}: ${analysis.resume_analysis.gap_count} gaps, ${analysis.resume_analysis.red_flag_count} red flags`
    );

    // Return analysis to frontend (frontend will save it during import)
    return c.json(analysis, 200);
  } catch (error) {
    console.error(`[/api/resume/analyze-gaps] Failed for user ${userId}:`, error);
    throw error;
  }
});

/**
 * GET /api/resume/gap-analysis/:id
 * Get a gap analysis by ID
 */
app.get('/gap-analysis/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const analysisId = c.req.param('id');
  const supabase = createSupabaseAdmin(c.env);

  console.log(`[/api/resume/gap-analysis/:id] Fetching analysis ${analysisId} for user ${userId}`);

  try {
    const { data, error } = await supabase
      .from('resume_gap_analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return c.json({ error: 'Gap analysis not found' }, 404);
    }

    return c.json(data, 200);
  } catch (error) {
    console.error(`[/api/resume/gap-analysis/:id] Failed:`, error);
    throw error;
  }
});

/**
 * PATCH /api/resume/gap-analysis/:id/answer
 * Answer a question in a gap analysis
 *
 * Request body: { question_id: number, answer: string }
 */
app.patch('/gap-analysis/:id/answer', authenticateUser, rateLimiter(), async (c) => {
  const userId = getUserId(c);
  const analysisId = c.req.param('id');
  const supabase = createSupabaseAdmin(c.env);

  const body = await c.req.json();
  const { question_id, answer } = z
    .object({
      question_id: z.number(),
      answer: z.string().min(1, 'Answer cannot be empty'),
    })
    .parse(body);

  console.log(
    `[/api/resume/gap-analysis/:id/answer] Answering question ${question_id} in analysis ${analysisId}`
  );

  try {
    // Fetch existing analysis
    const { data: analysis, error: fetchError } = await supabase
      .from('resume_gap_analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !analysis) {
      return c.json({ error: 'Gap analysis not found' }, 404);
    }

    // Update the specific question with the answer
    const questions = analysis.clarification_questions as ResumeGapAnalysis['clarification_questions'];
    const questionIndex = questions.findIndex((q) => q.question_id === question_id);

    if (questionIndex === -1) {
      return c.json({ error: 'Question not found' }, 404);
    }

    // Add answer to question
    questions[questionIndex].answer = answer;

    // Count how many questions have been answered
    const answeredCount = questions.filter((q) => q.answer && q.answer.trim().length > 0).length;

    // Update status based on progress
    let status = analysis.status;
    if (answeredCount === questions.length) {
      status = 'completed';
    } else if (answeredCount > 0) {
      status = 'in_progress';
    }

    // Save updated analysis
    const { data: updatedAnalysis, error: updateError } = await supabase
      .from('resume_gap_analyses')
      .update({
        clarification_questions: questions,
        questions_answered: answeredCount,
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', analysisId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update gap analysis');
    }

    console.log(
      `[/api/resume/gap-analysis/:id/answer] Answer saved, progress: ${answeredCount}/${questions.length}`
    );

    return c.json(updatedAnalysis, 200);
  } catch (error) {
    console.error(`[/api/resume/gap-analysis/:id/answer] Failed:`, error);
    throw error;
  }
});

/**
 * GET /api/resume/gap-analyses
 * List all gap analyses for the current user
 */
app.get('/gap-analyses', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  console.log(`[/api/resume/gap-analyses] Fetching all analyses for user ${userId}`);

  try {
    const { data, error } = await supabase
      .from('resume_gap_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch gap analyses');
    }

    return c.json(data || [], 200);
  } catch (error) {
    console.error(`[/api/resume/gap-analyses] Failed:`, error);
    throw error;
  }
});

export default app;
