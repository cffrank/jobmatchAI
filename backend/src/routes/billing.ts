/**
 * Billing Routes
 *
 * Handles subscription and billing management.
 *
 * Endpoints:
 * - GET /api/billing/subscription - Get current user's subscription
 * - PATCH /api/billing/subscription - Update/create subscription
 * - GET /api/billing/invoices - Get user's invoices
 * - GET /api/billing/payment-methods - Get user's payment methods
 * - GET /api/billing/usage-limits - Get user's usage limits
 * - PATCH /api/billing/usage-limits - Update usage limits
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { authenticateUser, getUserId } from '../middleware/auth';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const updateSubscriptionSchema = z.object({
  plan: z.enum(['basic', 'premium']).optional(),
  status: z.enum(['active', 'canceled', 'past_due', 'trialing']).optional(),
  currentPeriodStart: z.string().optional(),
  currentPeriodEnd: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

const updateUsageLimitsSchema = z.object({
  period: z.string().optional(), // YYYY-MM format
  applicationsTracked: z.number().int().min(0).optional(),
  resumeVariantsCreated: z.number().int().min(0).optional(),
  jobSearchesPerformed: z.number().int().min(0).optional(),
  limits: z.object({
    maxApplications: z.union([z.number().int().min(0), z.literal('unlimited')]).optional(),
    maxResumeVariants: z.union([z.number().int().min(0), z.literal('unlimited')]).optional(),
    maxJobSearches: z.union([z.number().int().min(0), z.literal('unlimited')]).optional(),
  }).optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/billing/subscription
 * Get current user's subscription
 */
router.get(
  '/subscription',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { data: subscription, error } = await supabaseAdmin
      .from(TABLES.SUBSCRIPTIONS)
      .select('*')
      .eq('user_id', userId)
      .single();

    // If subscription doesn't exist yet, return null (not an error)
    if (error && error.code === 'PGRST116') {
      res.json({ subscription: null });
      return;
    }

    if (error) {
      throw error;
    }

    // Transform database fields (snake_case) to frontend format (camelCase)
    const transformedSubscription = {
      id: subscription.id,
      userId: subscription.user_id,
      plan: subscription.plan,
      billingCycle: 'monthly' as const, // Default to monthly, billing_cycle column doesn't exist in DB
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    };

    res.json({ subscription: transformedSubscription });
  })
);

/**
 * PATCH /api/billing/subscription
 * Update/create subscription
 */
router.patch(
  '/subscription',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Validate request body
    const validation = updateSubscriptionSchema.safeParse(req.body);
    if (!validation.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          validation.error.errors.map((err) => [err.path.join('.'), err.message])
        )
      );
    }

    const updates = validation.data;

    // Map camelCase to snake_case for database
    const dbData: Record<string, unknown> = {
      user_id: userId,
    };

    if (updates.plan !== undefined) dbData.plan = updates.plan;
    if (updates.status !== undefined) dbData.status = updates.status;
    if (updates.currentPeriodStart !== undefined) dbData.current_period_start = updates.currentPeriodStart;
    if (updates.currentPeriodEnd !== undefined) dbData.current_period_end = updates.currentPeriodEnd;
    if (updates.cancelAtPeriodEnd !== undefined) dbData.cancel_at_period_end = updates.cancelAtPeriodEnd;

    const { data: subscription, error } = await supabaseAdmin
      .from(TABLES.SUBSCRIPTIONS)
      .upsert(dbData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Transform response back to frontend format
    const transformedSubscription = {
      id: subscription.id,
      userId: subscription.user_id,
      plan: subscription.plan,
      billingCycle: 'monthly' as const,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    };

    res.json({ subscription: transformedSubscription });
  })
);

/**
 * GET /api/billing/invoices
 * Get user's invoices
 */
router.get(
  '/invoices',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { data: invoices, error } = await supabaseAdmin
      .from(TABLES.INVOICES)
      .select('*')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform database fields (snake_case) to frontend format (camelCase)
    const transformedInvoices = (invoices || []).map((dbInvoice) => ({
      id: dbInvoice.id,
      userId: dbInvoice.user_id,
      date: dbInvoice.invoice_date,
      amount: dbInvoice.amount_due,
      status: dbInvoice.status,
      paymentMethod: {
        brand: 'visa', // Default, can be enhanced later
        last4: '0000', // Default, can be enhanced later
      },
      description: `Invoice ${dbInvoice.invoice_number || dbInvoice.id}`,
      pdfUrl: dbInvoice.invoice_pdf_url || undefined,
      lineItems: [], // Not stored in current schema
    }));

    res.json({ invoices: transformedInvoices });
  })
);

/**
 * GET /api/billing/payment-methods
 * Get user's payment methods
 */
router.get(
  '/payment-methods',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { data: paymentMethods, error } = await supabaseAdmin
      .from(TABLES.PAYMENT_METHODS)
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform database fields (snake_case) to frontend format (camelCase)
    const transformedPaymentMethods = (paymentMethods || []).map((dbMethod) => ({
      id: dbMethod.id,
      type: 'card' as const,
      brand: (dbMethod.brand || 'visa') as 'visa' | 'mastercard' | 'amex' | 'discover',
      last4: dbMethod.last4 || '0000',
      expiryMonth: dbMethod.exp_month || 12,
      expiryYear: dbMethod.exp_year || new Date().getFullYear(),
      isDefault: dbMethod.is_default || false,
      addedAt: dbMethod.added_at || new Date().toISOString(),
    }));

    res.json({ paymentMethods: transformedPaymentMethods });
  })
);

/**
 * GET /api/billing/usage-limits
 * Get user's usage limits
 */
router.get(
  '/usage-limits',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const { data: usageLimits, error } = await supabaseAdmin
      .from(TABLES.USAGE_LIMITS)
      .select('*')
      .eq('user_id', userId)
      .single();

    // If usage limits don't exist yet, return null (not an error)
    if (error && error.code === 'PGRST116') {
      res.json({ usageLimits: null });
      return;
    }

    if (error) {
      throw error;
    }

    res.json({ usageLimits });
  })
);

/**
 * PATCH /api/billing/usage-limits
 * Update usage limits
 */
router.patch(
  '/usage-limits',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Validate request body
    const validation = updateUsageLimitsSchema.safeParse(req.body);
    if (!validation.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          validation.error.errors.map((err) => [err.path.join('.'), err.message])
        )
      );
    }

    const updates = validation.data;

    const { data: usageLimits, error } = await supabaseAdmin
      .from(TABLES.USAGE_LIMITS)
      .upsert({
        user_id: userId,
        ...updates,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ usageLimits });
  })
);

// =============================================================================
// Export Router
// =============================================================================

export default router;
