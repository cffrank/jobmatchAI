/**
 * Resume Routes
 *
 * Handles resume parsing and import functionality.
 *
 * Endpoints:
 * - POST /api/resume/parse - Parse resume file using OpenAI
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';
import { parseResume } from '../services/openai.service';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const parseResumeSchema = z.object({
  storagePath: z
    .string()
    .min(1, 'Storage path is required'),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/resume/parse
 * Parse resume file using OpenAI GPT-4o with Vision
 */
router.post(
  '/parse',
  authenticateUser,
  rateLimiter(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Validate input
    const parseResult = parseResumeSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error(`[/api/resume/parse] Validation failed for user ${userId}:`, parseResult.error);
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { storagePath } = parseResult.data;

    console.log(`[/api/resume/parse] Starting parse for user ${userId}, path: ${storagePath}`);

    try {
      // Parse resume using OpenAI (will generate signed URL internally)
      const parsedData = await parseResume(storagePath);

      console.log(`[/api/resume/parse] Resume parsed successfully for user ${userId}`);

      res.status(200).json(parsedData);
    } catch (error) {
      console.error(`[/api/resume/parse] Parse failed for user ${userId}:`, error);

      // The error from parseResume should already be well-formatted
      // Just re-throw it and let the error handler deal with it
      throw error;
    }
  })
);

export default router;
