/**
 * Resume Routes for Cloudflare Workers
 *
 * Handles resume parsing and import functionality.
 *
 * Endpoints:
 * - POST /api/resume/parse - Parse resume file using OpenAI GPT-4o Vision
 *   - Supports: PNG, JPG, JPEG, GIF, WEBP, PDF
 *   - PDFs are processed as visual documents
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { createValidationError } from '../middleware/errorHandler';
import { parseResume } from '../services/openai';

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
 * Parse resume file using OpenAI GPT-4o with Vision
 *
 * Supports:
 * - PDF files - Processed as visual documents
 * - Image files (PNG, JPG, JPEG, GIF, WEBP)
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
        note: 'Processed as visual document using OpenAI GPT-4o Vision.',
      },
    ],
    recommendations: [
      'For best results, upload a high-resolution image (PNG or JPEG) of your resume.',
      'Ensure text is clearly visible and not blurry.',
      'Single-page resumes work best; for multi-page, upload each page as a separate image.',
      'If using a PDF, consider taking a screenshot or using a PDF-to-image converter.',
    ],
  });
});

export default app;
