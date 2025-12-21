/**
 * Email Routes
 *
 * Handles application email sending.
 *
 * Endpoints:
 * - POST /api/emails/send - Send application email
 * - GET /api/emails/history - Get user's email history
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { sendApplicationEmail, isValidEmail, isSendGridConfigured } from '../services/sendgrid.service';
import type { UserProfile, Application, ApplicationVariant, SendEmailResponse } from '../types';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const sendEmailSchema = z.object({
  applicationId: z
    .string()
    .min(1, 'Application ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid application ID format'),
  recipientEmail: z
    .string()
    .email('Invalid email address')
    .optional()
    .default('carl.f.frank@gmail.com'),
});

const emailHistorySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  applicationId: z.string().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/emails/send
 * Send application email with cover letter and resume
 *
 * Rate limited: 10 emails per hour per user
 */
router.post(
  '/send',
  authenticateUser,
  rateLimiter({ maxRequests: 10, windowMs: 60 * 60 * 1000 }), // 10 per hour
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Check if SendGrid is configured
    if (!isSendGridConfigured()) {
      throw createValidationError('Email service not configured', {
        sendgrid: 'SendGrid API key is not configured',
      });
    }

    // Validate input
    const parseResult = sendEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { applicationId, recipientEmail } = parseResult.data;

    // Validate email format
    if (!isValidEmail(recipientEmail)) {
      throw createValidationError('Invalid email address', {
        recipientEmail: 'Email address format is invalid',
      });
    }

    console.log(`Sending application email for user ${userId}, application ${applicationId}`);

    // Fetch application
    const { data: applicationRecord, error: applicationError } = await supabaseAdmin
      .from(TABLES.APPLICATIONS)
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', userId)
      .single();

    if (applicationError || !applicationRecord) {
      throw createNotFoundError('Application', applicationId);
    }

    // Fetch selected variant
    const { data: variantRecords, error: variantError } = await supabaseAdmin
      .from(TABLES.APPLICATION_VARIANTS)
      .select('*')
      .eq('application_id', applicationId);

    if (variantError || !variantRecords || variantRecords.length === 0) {
      throw createNotFoundError('Application variants');
    }

    // Find selected variant or use first one
    const selectedVariantRecord =
      variantRecords.find((v) => v.variant_id === applicationRecord.selected_variant_id) ||
      variantRecords[0];

    if (!selectedVariantRecord) {
      throw createNotFoundError('Selected variant');
    }

    // Fetch user profile
    const { data: profileRecord, error: profileError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profileRecord) {
      throw createNotFoundError('User profile');
    }

    // Map to typed objects
    const application: Application = {
      id: applicationRecord.id,
      userId: applicationRecord.user_id,
      jobId: applicationRecord.job_id,
      jobTitle: applicationRecord.job_title,
      company: applicationRecord.company,
      status: applicationRecord.status,
      createdAt: applicationRecord.created_at,
      updatedAt: applicationRecord.updated_at,
      submittedAt: applicationRecord.submitted_at,
      variants: [],
      selectedVariantId: applicationRecord.selected_variant_id,
      editHistory: applicationRecord.edit_history || [],
    };

    const variant: ApplicationVariant = {
      id: selectedVariantRecord.variant_id,
      name: selectedVariantRecord.name,
      resume: selectedVariantRecord.resume,
      coverLetter: selectedVariantRecord.cover_letter,
      aiRationale: selectedVariantRecord.ai_rationale || [],
    };

    const profile: UserProfile = {
      id: profileRecord.id,
      email: profileRecord.email,
      firstName: profileRecord.first_name,
      lastName: profileRecord.last_name,
      phone: profileRecord.phone,
      location: profileRecord.location,
      summary: profileRecord.summary,
      headline: profileRecord.headline,
      profileImageUrl: profileRecord.profile_image_url,
      linkedInUrl: profileRecord.linkedin_url,
      linkedInImported: profileRecord.linkedin_imported,
      linkedInImportedAt: profileRecord.linkedin_imported_at,
      createdAt: profileRecord.created_at,
      updatedAt: profileRecord.updated_at,
    };

    // Send email
    const result = await sendApplicationEmail({
      userId,
      application,
      variant,
      profile,
      recipientEmail,
    });

    console.log(`Email sent successfully: ${result.emailId}`);

    const response: SendEmailResponse = {
      success: result.success,
      emailId: result.emailId,
      message: result.message,
    };

    res.json(response);
  })
);

/**
 * GET /api/emails/history
 * Get user's email history with pagination
 */
router.get(
  '/history',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = emailHistorySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid query parameters',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { page, limit, applicationId } = parseResult.data;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from(TABLES.EMAILS)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (applicationId) {
      query = query.eq('application_id', applicationId);
    }

    const { data: emails, error, count } = await query;

    if (error) {
      console.error('Failed to fetch email history:', error);
      throw new Error('Failed to fetch email history');
    }

    res.json({
      emails: emails || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  })
);

/**
 * GET /api/emails/remaining
 * Get remaining emails in the current rate limit window
 */
router.get(
  '/remaining',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Check rate limit without incrementing
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { count } = await supabaseAdmin
      .from(TABLES.EMAILS)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('sent_at', oneHourAgo.toISOString());

    const sent = count || 0;
    const limit = 10;
    const remaining = Math.max(0, limit - sent);

    res.json({
      limit,
      sent,
      remaining,
      resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  })
);

export default router;
