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
  fileUrl: z
    .string()
    .url('Invalid file URL')
    .min(1, 'File URL is required'),
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
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { fileUrl } = parseResult.data;

    console.log(`Parsing resume for user ${userId}`);

    // Parse resume using OpenAI
    const parsedData = await parseResume(fileUrl);

    console.log(`Resume parsed successfully for user ${userId}`);

    res.status(200).json(parsedData);
  })
);

export default router;
