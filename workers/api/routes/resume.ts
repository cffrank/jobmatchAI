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
import type { Env, Variables, UserProfile } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { createValidationError } from '../middleware/errorHandler';
import { parseResume } from '../services/openai';
import { analyzeResumeGaps } from '../services/resumeGapAnalysis';
import {
  uploadFile,
  deleteFile,
  generateUserFileKey,
  generateUniqueFilename,
  validateFileSize,
  validateFileType
} from '../services/storage';

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
 * GET /api/resume
 * Fetch all resumes for the user
 */
app.get('/', authenticateUser, async (c) => {
  const userId = getUserId(c);

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userId)
      .all();

    return c.json(results || []);
  } catch (error) {
    console.error('[Resume] Error fetching resumes:', error);
    return c.json(
      {
        error: 'Failed to fetch resumes',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

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

    // Map to UserProfile format (camelCase)
    const profileData: UserProfile = {
      id: userId,
      email: profile.email || '',
      firstName: profile.full_name?.split(' ')[0] || '',
      lastName: profile.full_name?.split(' ').slice(1).join(' ') || '',
      phone: profile.phone_number,
      linkedInUrl: profile.linkedin_url,
      summary: profile.professional_summary,
      location: profile.city && profile.state ? `${profile.city}, ${profile.state}` : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

  console.log(`[/api/resume/gap-analysis/:id] Fetching analysis ${analysisId} for user ${userId}`);

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM resume_gap_analyses WHERE id = ? AND user_id = ?'
    )
      .bind(analysisId, userId)
      .all();

    const analysis = results[0];

    if (!analysis) {
      return c.json({ error: 'Gap analysis not found' }, 404);
    }

    return c.json(analysis, 200);
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
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM resume_gap_analyses WHERE id = ? AND user_id = ?'
    )
      .bind(analysisId, userId)
      .all();

    const analysis = results[0];

    if (!analysis) {
      return c.json({ error: 'Gap analysis not found' }, 404);
    }

    // Parse clarification_questions from JSON
    const questions = analysis.clarification_questions
      ? JSON.parse(analysis.clarification_questions as string)
      : [];

    const questionIndex = questions.findIndex((q: any) => q.question_id === question_id);

    if (questionIndex === -1) {
      return c.json({ error: 'Question not found' }, 404);
    }

    // Add answer to question
    questions[questionIndex].answer = answer;

    // Count how many questions have been answered
    const answeredCount = questions.filter((q: any) => q.answer && q.answer.trim().length > 0).length;

    // Update status based on progress
    let status = analysis.status as string;
    if (answeredCount === questions.length) {
      status = 'completed';
    } else if (answeredCount > 0) {
      status = 'in_progress';
    }

    const timestamp = new Date().toISOString();
    const completedAt = status === 'completed' ? timestamp : null;

    // Save updated analysis
    const { meta } = await c.env.DB.prepare(
      `UPDATE resume_gap_analyses
       SET clarification_questions = ?, questions_answered = ?, status = ?,
           completed_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
      .bind(
        JSON.stringify(questions),
        answeredCount,
        status,
        completedAt,
        timestamp,
        analysisId,
        userId
      )
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Gap analysis not found' }, 404);
    }

    // Fetch updated analysis
    const { results: updatedResults } = await c.env.DB.prepare(
      'SELECT * FROM resume_gap_analyses WHERE id = ? AND user_id = ?'
    )
      .bind(analysisId, userId)
      .all();

    const updatedAnalysis = updatedResults[0];

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

  console.log(`[/api/resume/gap-analyses] Fetching all analyses for user ${userId}`);

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM resume_gap_analyses WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userId)
      .all();

    return c.json(results || [], 200);
  } catch (error) {
    console.error(`[/api/resume/gap-analyses] Failed:`, error);
    throw error;
  }
});

// =============================================================================
// Resume File Upload (Phase 3.2: R2 Integration)
// =============================================================================

/**
 * POST /api/resume/upload
 * Upload resume file to R2
 *
 * Phase 3.2: Migrated from Supabase Storage to R2
 * - Uploads to R2 RESUMES bucket
 * - Stores metadata in D1 file_uploads table
 * - Returns file key for parsing endpoint
 *
 * Accepted formats: PDF, PNG, JPG, JPEG, GIF, WebP
 * Max size: 10MB
 */
app.post('/upload', authenticateUser, rateLimiter(), async (c) => {
  const userId = getUserId(c);

  console.log(`[Resume] File upload request from user ${userId}`);

  try {
    // Parse form data
    const formData = await c.req.formData();
    const fileEntry = formData.get('resume');

    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }

    const file = fileEntry as File;
    console.log(`[Resume] Received file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Validate file type
    const allowedTypes = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
    validateFileType(file.name, allowedTypes);

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    validateFileSize(file.size, maxSize);

    // Generate unique file key
    const uniqueFilename = generateUniqueFilename(file.name);
    const fileKey = generateUserFileKey(userId, 'resumes', uniqueFilename);

    console.log(`[Resume] Uploading to R2 with key: ${fileKey}`);

    // Read file data
    const fileData = await file.arrayBuffer();

    // Upload to R2 RESUMES bucket
    const uploadResult = await uploadFile(c.env.RESUMES, fileKey, fileData, {
      contentType: file.type,
      metadata: {
        userId,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log(`[Resume] Upload successful: ${uploadResult.key}`);

    // Generate presigned download URL for the uploaded resume (Phase 3.3)
    const { getDownloadUrl } = await import('../services/storage');
    const downloadUrlResult = await getDownloadUrl(c.env.RESUMES, fileKey, 3600); // 1 hour expiry

    return c.json({
      message: 'Resume uploaded successfully',
      file: {
        key: uploadResult.key,
        size: uploadResult.size,
        originalName: file.name,
        contentType: file.type,
        downloadUrl: downloadUrlResult.url, // Phase 3.3: Presigned URL
        expiresAt: downloadUrlResult.expiresAt,
      },
      storagePath: fileKey, // For use with /parse endpoint
    });
  } catch (error) {
    console.error('[Resume] Upload failed:', error);
    return c.json(
      {
        error: 'Failed to upload resume',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /api/resume/:fileKey
 * Delete resume file from R2
 */
app.delete('/:fileKey', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const fileKey = c.req.param('fileKey');

  console.log(`[Resume] File deletion request from user ${userId} for key: ${fileKey}`);

  try {
    // Verify user owns this file (check if fileKey starts with users/{userId}/)
    const expectedPrefix = `users/${userId}/resumes/`;
    if (!fileKey.startsWith(expectedPrefix)) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Delete from R2
    await deleteFile(c.env.RESUMES, fileKey);

    console.log(`[Resume] File deleted successfully for user ${userId}`);

    return c.json({
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    console.error('[Resume] Deletion failed:', error);
    return c.json(
      {
        error: 'Failed to delete resume',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
