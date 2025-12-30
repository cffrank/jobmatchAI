/**
 * Resume Routes for Cloudflare Workers
 *
 * Handles resume parsing and import functionality.
 *
 * Endpoints:
 * - POST /api/resume/parse - Parse resume file using AI
 *   - PDF files: Text extracted with unpdf → parsed with Workers AI (Llama 3.1 8B)
 *   - Image files: Parsed with OpenAI GPT-4o Vision
 *   - Supports: PDF, PNG, JPG, JPEG, GIF, WEBP
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
        note: 'Text extracted using Workers AI Vision (Llama 3.2 11B), then parsed with Cloudflare Workers AI (Llama 3.3 70B). Completely free and fully serverless.',
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

export default app;
