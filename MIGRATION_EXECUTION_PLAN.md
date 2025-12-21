# Firebase to Supabase Migration Execution Plan

**Project:** JobMatch AI
**Created:** December 20, 2025
**Migration Manager:** Context Orchestration AI
**Status:** Planning Complete - Ready for Execution

---

## Executive Summary

This document outlines the complete execution plan to migrate JobMatch AI from a hybrid Firebase/Supabase architecture to a pure Supabase architecture. The migration is structured into 3 phases with specialized agent assignments, clear dependencies, and quality gates.

**Current State:** 70% migrated (core data on Supabase, serverless functions on Firebase)
**Target State:** 100% on Supabase (zero Firebase dependencies)
**Estimated Duration:** 2-3 weeks
**Risk Level:** Medium (mitigated by incremental approach)

---

## Migration Architecture Overview

### Current (Hybrid) Architecture
```
Frontend App
    ├── Auth: Supabase ✅
    ├── Database: Supabase ✅
    ├── Storage: Supabase (new) + Firebase (legacy) ⚠️
    └── Functions: Firebase Cloud Functions ❌
        ├── scrapeJobs (Apify integration)
        ├── generateApplication (OpenAI integration)
        ├── sendApplicationEmail (SendGrid integration)
        ├── checkRateLimit (rate limiting)
        └── linkedInAuth + linkedInCallback (OAuth)
```

### Target (Pure Supabase) Architecture
```
Frontend App
    ├── Auth: Supabase ✅
    ├── Database: Supabase ✅
    ├── Storage: Supabase ✅
    └── Edge Functions: Supabase Edge Functions ✅
        ├── scrape-jobs (Deno runtime)
        ├── generate-application (Deno runtime)
        ├── send-email (Deno runtime)
        ├── rate-limit (Deno runtime)
        └── linkedin-oauth (Deno runtime)
```

---

## Phase 1: Infrastructure & Data Migration (Quick Wins)

**Duration:** 2-3 days
**Risk:** Low
**Agent:** Database Migration Specialist

### Task 1.1: Set Up Supabase Edge Functions Infrastructure

**Objective:** Create the foundation for Edge Functions development

**Actions:**
1. Initialize Supabase CLI in project
   ```bash
   npx supabase init
   ```

2. Create Edge Functions directory structure:
   ```
   supabase/
   ├── functions/
   │   ├── scrape-jobs/
   │   │   └── index.ts
   │   ├── generate-application/
   │   │   └── index.ts
   │   ├── send-email/
   │   │   └── index.ts
   │   ├── rate-limit/
   │   │   └── index.ts
   │   └── linkedin-oauth/
   │       └── index.ts
   └── config.toml
   ```

3. Set up local development environment with Supabase CLI

4. Configure environment variables for Edge Functions:
   - `OPENAI_API_KEY` (for AI generation)
   - `SENDGRID_API_KEY` (for email)
   - `APIFY_API_KEY` (for job scraping)
   - `LINKEDIN_CLIENT_ID` (for OAuth)
   - `LINKEDIN_CLIENT_SECRET` (for OAuth)

**Deliverables:**
- [ ] `supabase/` directory initialized
- [ ] Edge Functions templates created
- [ ] Local development environment working
- [ ] Environment variables configured in Supabase dashboard

**Dependencies:** None

---

### Task 1.2: Migrate Billing/Subscription Data (Firestore → Supabase)

**Objective:** Move all billing-related data from Firestore subcollections to Supabase tables

**Current Firebase Structure:**
```
users/{userId}/subscription → Document
users/{userId}/invoices → Collection
users/{userId}/paymentMethods → Collection
users/{userId}/usageLimits → Document
```

**Target Supabase Schema:**

```sql
-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL, -- 'free', 'basic', 'premium'
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- 'draft', 'open', 'paid', 'void'
  invoice_number VARCHAR(100),
  invoice_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payment methods table
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'card', 'bank_account'
  last4 VARCHAR(4),
  brand VARCHAR(50), -- 'visa', 'mastercard', etc.
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT now()
);

-- Usage limits table
CREATE TABLE usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_generations_used INTEGER DEFAULT 0,
  ai_generations_limit INTEGER DEFAULT 10,
  job_searches_used INTEGER DEFAULT 0,
  job_searches_limit INTEGER DEFAULT 50,
  emails_sent_used INTEGER DEFAULT 0,
  emails_sent_limit INTEGER DEFAULT 20,
  period_start TIMESTAMPTZ DEFAULT now(),
  period_end TIMESTAMPTZ DEFAULT (now() + interval '1 month'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage limits"
  ON usage_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_usage_limits_user_id ON usage_limits(user_id);
```

**Migration Script:**

Create `scripts/migrate-billing-data.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
const firebaseApp = initializeApp()
const firestore = getFirestore(firebaseApp)

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for migration
)

async function migrateBillingData() {
  console.log('Starting billing data migration...')

  // Get all users from Firestore
  const usersSnapshot = await firestore.collection('users').get()

  let successCount = 0
  let errorCount = 0

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id
    console.log(`Migrating user: ${userId}`)

    try {
      // 1. Migrate subscription
      const subscriptionDoc = await firestore
        .collection(`users/${userId}/subscription`)
        .doc('current')
        .get()

      if (subscriptionDoc.exists) {
        const subData = subscriptionDoc.data()
        await supabase.from('subscriptions').insert({
          user_id: userId,
          plan: subData.plan,
          status: subData.status,
          current_period_start: subData.currentPeriodStart?.toDate(),
          current_period_end: subData.currentPeriodEnd?.toDate(),
          cancel_at_period_end: subData.cancelAtPeriodEnd,
          created_at: subData.createdAt?.toDate(),
        })
      }

      // 2. Migrate invoices
      const invoicesSnapshot = await firestore
        .collection(`users/${userId}/invoices`)
        .get()

      for (const invoiceDoc of invoicesSnapshot.docs) {
        const invData = invoiceDoc.data()
        await supabase.from('invoices').insert({
          user_id: userId,
          amount_due: invData.amountDue,
          amount_paid: invData.amountPaid,
          currency: invData.currency || 'USD',
          status: invData.status,
          invoice_number: invData.invoiceNumber,
          invoice_date: invData.date?.toDate(),
          due_date: invData.dueDate?.toDate(),
          paid_at: invData.paidAt?.toDate(),
          created_at: invData.createdAt?.toDate(),
        })
      }

      // 3. Migrate payment methods
      const paymentMethodsSnapshot = await firestore
        .collection(`users/${userId}/paymentMethods`)
        .get()

      for (const pmDoc of paymentMethodsSnapshot.docs) {
        const pmData = pmDoc.data()
        await supabase.from('payment_methods').insert({
          user_id: userId,
          type: pmData.type,
          last4: pmData.last4,
          brand: pmData.brand,
          exp_month: pmData.expMonth,
          exp_year: pmData.expYear,
          is_default: pmData.isDefault,
          added_at: pmData.addedAt?.toDate(),
        })
      }

      // 4. Migrate usage limits
      const usageLimitsDoc = await firestore
        .collection(`users/${userId}/usageLimits`)
        .doc('current')
        .get()

      if (usageLimitsDoc.exists) {
        const ulData = usageLimitsDoc.data()
        await supabase.from('usage_limits').insert({
          user_id: userId,
          ai_generations_used: ulData.aiGenerationsUsed || 0,
          ai_generations_limit: ulData.aiGenerationsLimit || 10,
          job_searches_used: ulData.jobSearchesUsed || 0,
          job_searches_limit: ulData.jobSearchesLimit || 50,
          emails_sent_used: ulData.emailsSentUsed || 0,
          emails_sent_limit: ulData.emailsSentLimit || 20,
          period_start: ulData.periodStart?.toDate(),
          period_end: ulData.periodEnd?.toDate(),
          created_at: ulData.createdAt?.toDate(),
        })
      }

      successCount++
      console.log(`✓ Successfully migrated user ${userId}`)

    } catch (error) {
      errorCount++
      console.error(`✗ Error migrating user ${userId}:`, error)
    }
  }

  console.log('\nMigration complete!')
  console.log(`Success: ${successCount} users`)
  console.log(`Errors: ${errorCount} users`)
}

migrateBillingData()
```

**Actions:**
1. Create Supabase migration file for schema
2. Run migration to create tables
3. Create and run TypeScript migration script
4. Verify data integrity with spot checks
5. Update TypeScript types from Supabase

**Deliverables:**
- [ ] Billing tables created in Supabase
- [ ] All billing data migrated
- [ ] RLS policies tested
- [ ] Data integrity verified

**Dependencies:** None

---

### Task 1.3: Update Frontend Billing Hooks

**Objective:** Replace Firebase Firestore calls with Supabase in `useSubscription.ts`

**Files to Update:**
- `/home/carl/application-tracking/jobmatch-ai/src/hooks/useSubscription.ts`

**New Implementation:**

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Subscription, Invoice, PaymentMethod, UsageLimits } from '@/sections/account-billing/types'

/**
 * Hook to manage subscription data in Supabase
 */
export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let mounted = true

    async function fetchSubscription() {
      try {
        const { data, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!mounted) return

        if (fetchError) throw fetchError
        setSubscription(data)
        setError(null)
      } catch (err) {
        if (mounted) {
          setError(err as Error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchSubscription()

    // Set up real-time subscription
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (mounted) {
            setSubscription(payload.new as Subscription)
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      channel.unsubscribe()
    }
  }, [user])

  const updateSubscription = async (data: Partial<Omit<Subscription, 'id'>>) => {
    if (!user) throw new Error('User not authenticated')

    const { error: updateError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        ...data,
        updated_at: new Date().toISOString(),
      })

    if (updateError) throw updateError
  }

  return {
    subscription,
    loading,
    error,
    updateSubscription,
  }
}

// Similar updates for useInvoices, usePaymentMethods, useUsageLimits...
```

**Deliverables:**
- [ ] `useSubscription.ts` updated
- [ ] `useInvoices.ts` updated
- [ ] `usePaymentMethods.ts` updated
- [ ] `useUsageLimits.ts` updated
- [ ] Real-time subscriptions working
- [ ] UI tested with new hooks

**Dependencies:** Task 1.2 complete

---

## Phase 2: Edge Functions Migration (Critical Path)

**Duration:** 1-2 weeks
**Risk:** Medium-High
**Agents:** Backend TypeScript Architect, API Integration Specialist

### Task 2.1: Migrate Rate Limiting Function

**Objective:** Implement rate limiting using Supabase Edge Functions and PostgreSQL

**Complexity:** Medium
**Estimated Time:** 6-8 hours

**Implementation:**

Create `supabase/functions/rate-limit/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RateLimitRequest {
  operation: 'ai_generation' | 'job_search' | 'email_send'
}

interface RateLimitResponse {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: string
}

serve(async (req) => {
  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { operation }: RateLimitRequest = await req.json()

    // Get usage limits for user
    const { data: limits, error: limitsError } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (limitsError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch limits' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if we need to reset the period
    const now = new Date()
    const periodEnd = new Date(limits.period_end)

    if (now > periodEnd) {
      // Reset usage counters
      const { error: resetError } = await supabase
        .from('usage_limits')
        .update({
          ai_generations_used: 0,
          job_searches_used: 0,
          emails_sent_used: 0,
          period_start: now.toISOString(),
          period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
        })
        .eq('user_id', user.id)

      if (resetError) throw resetError

      // Refetch limits
      const { data: newLimits } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', user.id)
        .single()

      limits = newLimits
    }

    // Check rate limit for the specific operation
    let allowed = false
    let remaining = 0
    let limit = 0
    let fieldToIncrement = ''

    switch (operation) {
      case 'ai_generation':
        allowed = limits.ai_generations_used < limits.ai_generations_limit
        remaining = limits.ai_generations_limit - limits.ai_generations_used
        limit = limits.ai_generations_limit
        fieldToIncrement = 'ai_generations_used'
        break
      case 'job_search':
        allowed = limits.job_searches_used < limits.job_searches_limit
        remaining = limits.job_searches_limit - limits.job_searches_used
        limit = limits.job_searches_limit
        fieldToIncrement = 'job_searches_used'
        break
      case 'email_send':
        allowed = limits.emails_sent_used < limits.emails_sent_limit
        remaining = limits.emails_sent_limit - limits.emails_sent_used
        limit = limits.emails_sent_limit
        fieldToIncrement = 'emails_sent_used'
        break
    }

    // If allowed, increment the counter
    if (allowed) {
      const { error: updateError } = await supabase
        .from('usage_limits')
        .update({
          [fieldToIncrement]: limits[fieldToIncrement] + 1,
          updated_at: now.toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      remaining -= 1 // Decrement remaining
    }

    const response: RateLimitResponse = {
      allowed,
      remaining,
      limit,
      resetAt: limits.period_end,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Rate limit error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

**Frontend Hook Update:**

Update `/home/carl/application-tracking/jobmatch-ai/src/hooks/useRateLimit.ts`:

```typescript
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface RateLimitResponse {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: string
}

export function useRateLimit() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const checkRateLimit = useCallback(
    async (operation: 'ai_generation' | 'job_search' | 'email_send'): Promise<RateLimitResponse> => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: invokeError } = await supabase.functions.invoke('rate-limit', {
          body: { operation },
        })

        if (invokeError) throw invokeError

        return data as RateLimitResponse
      } catch (err) {
        setError(err as Error)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    checkRateLimit,
    loading,
    error,
  }
}
```

**Deliverables:**
- [ ] Edge Function deployed
- [ ] Frontend hook updated
- [ ] Rate limiting tested for all operations
- [ ] Error handling verified

**Dependencies:** Task 1.1, Task 1.2 complete

---

### Task 2.2: Migrate Email Sending Function

**Objective:** Port SendGrid email integration to Supabase Edge Function

**Complexity:** Medium
**Estimated Time:** 6-8 hours

**Implementation:**

Create `supabase/functions/send-email/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EmailRequest {
  to: string
  subject: string
  html: string
  text?: string
  applicationId?: string
}

serve(async (req) => {
  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const emailData: EmailRequest = await req.json()

    // Get SendGrid API key from environment
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendGridApiKey) {
      throw new Error('SendGrid API key not configured')
    }

    // Send email via SendGrid API
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: emailData.to }],
            subject: emailData.subject,
          },
        ],
        from: {
          email: Deno.env.get('SENDGRID_FROM_EMAIL') ?? 'noreply@jobmatch.ai',
          name: 'JobMatch AI',
        },
        content: [
          {
            type: 'text/plain',
            value: emailData.text || emailData.html.replace(/<[^>]*>/g, ''),
          },
          {
            type: 'text/html',
            value: emailData.html,
          },
        ],
      }),
    })

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text()
      console.error('SendGrid error:', errorText)
      throw new Error(`SendGrid API error: ${sendGridResponse.status}`)
    }

    // Log email in database
    const { error: logError } = await supabase.from('email_history').insert({
      user_id: user.id,
      application_id: emailData.applicationId,
      recipient: emailData.to,
      subject: emailData.subject,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    if (logError) {
      console.error('Failed to log email:', logError)
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Email sending error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send email' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
```

**Frontend Update:**

Update `/home/carl/application-tracking/jobmatch-ai/src/sections/application-generator/components/EmailDialog.tsx`:

Replace Firebase function call with:

```typescript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: recipientEmail,
    subject: emailSubject,
    html: emailBody,
    applicationId: application.id,
  },
})

if (error) throw error
```

**Deliverables:**
- [ ] Edge Function deployed
- [ ] SendGrid integration working
- [ ] Email history logging verified
- [ ] Frontend EmailDialog updated
- [ ] Test emails sent successfully

**Dependencies:** Task 1.1 complete

---

### Task 2.3: Migrate AI Generation Function

**Objective:** Port OpenAI integration to Supabase Edge Function

**Complexity:** High
**Estimated Time:** 8-12 hours

**Implementation:**

Create `supabase/functions/generate-application/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface GenerateRequest {
  jobId: string
}

interface GeneratedApplication {
  resumeVariant: string
  coverLetter: string
  keySkillsHighlighted: string[]
  tailoredExperiences: string[]
}

serve(async (req) => {
  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with service role for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { jobId }: GenerateRequest = await req.json()

    // Fetch job details
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch work experience
    const { data: workExperience } = await supabaseClient
      .from('work_experience')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })

    // Fetch education
    const { data: education } = await supabaseClient
      .from('education')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false })

    // Fetch skills
    const { data: skills } = await supabaseClient
      .from('skills')
      .select('*')
      .eq('user_id', user.id)

    // Call OpenAI API
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `
You are an expert resume and cover letter writer. Generate a tailored application for the following job:

Job Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Requirements: ${job.requirements || 'N/A'}

Candidate Profile:
Name: ${profile.full_name}
Email: ${profile.email}
Phone: ${profile.phone_number}
Location: ${profile.location}
Professional Summary: ${profile.professional_summary}

Work Experience:
${workExperience?.map(exp => `
- ${exp.job_title} at ${exp.company} (${exp.start_date} - ${exp.end_date || 'Present'})
  ${exp.description}
`).join('\n')}

Education:
${education?.map(edu => `
- ${edu.degree} in ${edu.field_of_study} from ${edu.institution} (${edu.start_date} - ${edu.end_date || 'Present'})
`).join('\n')}

Skills:
${skills?.map(skill => `- ${skill.name} (${skill.level})`).join('\n')}

Please generate:
1. A tailored resume variant highlighting the most relevant experience and skills
2. A compelling cover letter (3-4 paragraphs)
3. A list of key skills to highlight (5-7 skills)
4. Tailored experience bullets (3-5 bullets)

Return the response as JSON with the following structure:
{
  "resumeVariant": "Full resume text here",
  "coverLetter": "Full cover letter here",
  "keySkillsHighlighted": ["skill1", "skill2", ...],
  "tailoredExperiences": ["bullet1", "bullet2", ...]
}
`

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert resume and cover letter writer. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text()
      console.error('OpenAI error:', errorText)
      throw new Error(`OpenAI API error: ${openAiResponse.status}`)
    }

    const openAiData = await openAiResponse.json()
    const generatedContent = openAiData.choices[0]?.message?.content

    if (!generatedContent) {
      throw new Error('No content generated from OpenAI')
    }

    // Parse the JSON response
    const result: GeneratedApplication = JSON.parse(generatedContent)

    // Save the generated application
    const { data: savedApp, error: saveError } = await supabaseClient
      .from('applications')
      .insert({
        user_id: user.id,
        job_id: jobId,
        resume_variant: result.resumeVariant,
        cover_letter: result.coverLetter,
        key_skills_highlighted: result.keySkillsHighlighted,
        tailored_experiences: result.tailoredExperiences,
        status: 'draft',
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save application:', saveError)
      throw new Error('Failed to save generated application')
    }

    return new Response(
      JSON.stringify({
        ...result,
        applicationId: savedApp.id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('AI generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate application' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
```

**Frontend Update:**

Update `/home/carl/application-tracking/jobmatch-ai/src/lib/aiGenerator.ts`:

```typescript
import { supabase } from './supabase'
import type { GeneratedApplication } from '@/sections/application-generator/types'

export async function generateApplicationVariants(jobId: string): Promise<GeneratedApplication> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-application', {
      body: { jobId },
    })

    if (error) {
      // Map error codes to user-friendly messages
      if (error.message?.includes('Unauthorized')) {
        throw new Error('Please sign in to generate applications')
      }
      if (error.message?.includes('not found')) {
        throw new Error('Job or profile not found. Please try again.')
      }
      throw new Error(error.message || 'Failed to generate application')
    }

    return data as GeneratedApplication
  } catch (error) {
    console.error('AI generation error:', error)
    throw error
  }
}
```

**Deliverables:**
- [ ] Edge Function deployed
- [ ] OpenAI integration working
- [ ] Generated applications saved to database
- [ ] Frontend updated
- [ ] Error handling tested
- [ ] Rate limiting integrated

**Dependencies:** Task 1.1, Task 2.1 complete

---

### Task 2.4: Migrate Job Scraping Function

**Objective:** Port Apify integration to Supabase Edge Function

**Complexity:** High
**Estimated Time:** 8-12 hours

**Implementation:**

Create `supabase/functions/scrape-jobs/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ScrapeRequest {
  keywords: string
  location: string
  sources: string[] // ['linkedin', 'indeed']
  limit?: number
}

interface ScrapedJob {
  title: string
  company: string
  location: string
  description: string
  url: string
  salary?: string
  postedDate?: string
  source: string
}

serve(async (req) => {
  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const scrapeParams: ScrapeRequest = await req.json()

    const apifyApiKey = Deno.env.get('APIFY_API_KEY')
    if (!apifyApiKey) {
      throw new Error('Apify API key not configured')
    }

    const allJobs: ScrapedJob[] = []
    const errors: string[] = []

    // Scrape from each source
    for (const source of scrapeParams.sources) {
      try {
        let actorId = ''
        let input = {}

        if (source === 'linkedin') {
          actorId = 'apify/linkedin-jobs-scraper'
          input = {
            keywords: scrapeParams.keywords,
            location: scrapeParams.location,
            maxResults: scrapeParams.limit || 50,
          }
        } else if (source === 'indeed') {
          actorId = 'apify/indeed-scraper'
          input = {
            queries: `${scrapeParams.keywords} ${scrapeParams.location}`,
            maxItems: scrapeParams.limit || 50,
          }
        }

        // Start Apify actor
        const runResponse = await fetch(
          `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          }
        )

        if (!runResponse.ok) {
          throw new Error(`Failed to start ${source} scraper`)
        }

        const runData = await runResponse.json()
        const runId = runData.data.id

        // Wait for the run to finish (with timeout)
        let attempts = 0
        const maxAttempts = 60 // 5 minutes max
        let runStatus = 'RUNNING'

        while (runStatus === 'RUNNING' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

          const statusResponse = await fetch(
            `https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${apifyApiKey}`
          )
          const statusData = await statusResponse.json()
          runStatus = statusData.data.status

          attempts++
        }

        if (runStatus !== 'SUCCEEDED') {
          throw new Error(`${source} scraper did not complete successfully`)
        }

        // Get results
        const resultsResponse = await fetch(
          `https://api.apify.com/v2/acts/${actorId}/runs/${runId}/dataset/items?token=${apifyApiKey}`
        )
        const results = await resultsResponse.json()

        // Normalize results
        const normalizedJobs = results.map((item: any) => ({
          title: item.title || item.positionName,
          company: item.company || item.companyName,
          location: item.location || item.jobLocation,
          description: item.description || item.descriptionText,
          url: item.url || item.link,
          salary: item.salary,
          postedDate: item.postedAt || item.postedDate,
          source,
        }))

        allJobs.push(...normalizedJobs)
      } catch (error) {
        console.error(`Error scraping from ${source}:`, error)
        errors.push(`Failed to scrape from ${source}: ${error.message}`)
      }
    }

    // Save jobs to database
    const searchId = crypto.randomUUID()

    const jobInserts = allJobs.map(job => ({
      user_id: user.id,
      search_id: searchId,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      url: job.url,
      salary: job.salary,
      posted_date: job.postedDate,
      source: job.source,
      scraped_at: new Date().toISOString(),
    }))

    const { error: insertError } = await supabase.from('jobs').insert(jobInserts)

    if (insertError) {
      console.error('Failed to save jobs:', insertError)
      throw new Error('Failed to save scraped jobs')
    }

    return new Response(
      JSON.stringify({
        searchId,
        jobCount: allJobs.length,
        jobs: allJobs,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Job scraping error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to scrape jobs' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
```

**Frontend Update:**

Update `/home/carl/application-tracking/jobmatch-ai/src/hooks/useJobScraping.ts`:

```typescript
import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { JobSearchParams, JobSearchResult } from '../sections/job-discovery-matching/types'

export function useJobScraping() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSearchId, setLastSearchId] = useState<string | null>(null)

  const scrapeJobs = useCallback(async (params: JobSearchParams): Promise<JobSearchResult | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('scrape-jobs', {
        body: params,
      })

      if (invokeError) throw invokeError

      setLastSearchId(data.searchId)

      if (data.errors && data.errors.length > 0) {
        console.warn('Some job sources failed:', data.errors)
      }

      return data as JobSearchResult
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scrape jobs'
      setError(errorMessage)
      console.error('Job scraping error:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    scrapeJobs,
    loading,
    error,
    lastSearchId,
  }
}
```

**Deliverables:**
- [ ] Edge Function deployed
- [ ] Apify integration working for LinkedIn
- [ ] Apify integration working for Indeed
- [ ] Jobs saved to Supabase database
- [ ] Frontend hook updated
- [ ] Error handling tested

**Dependencies:** Task 1.1 complete

---

### Task 2.5: Migrate LinkedIn OAuth Function

**Objective:** Port LinkedIn OAuth flow to Supabase Edge Function

**Complexity:** High
**Estimated Time:** 6-10 hours

**Implementation:**

Create `supabase/functions/linkedin-oauth/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const action = url.searchParams.get('action') // 'initiate' or 'callback'

  if (action === 'initiate') {
    // Step 1: Redirect to LinkedIn OAuth
    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')
    const redirectUri = `${url.origin}/supabase/functions/v1/linkedin-oauth?action=callback`
    const state = crypto.randomUUID()

    // Store state in a temporary table or use JWT
    const linkedInAuthUrl = new URL('https://www.linkedin.com/oauth/v2/authorization')
    linkedInAuthUrl.searchParams.set('response_type', 'code')
    linkedInAuthUrl.searchParams.set('client_id', clientId!)
    linkedInAuthUrl.searchParams.set('redirect_uri', redirectUri)
    linkedInAuthUrl.searchParams.set('scope', 'r_liteprofile r_emailaddress')
    linkedInAuthUrl.searchParams.set('state', state)

    return new Response(null, {
      status: 302,
      headers: {
        'Location': linkedInAuthUrl.toString(),
      },
    })
  } else if (action === 'callback') {
    // Step 2: Handle OAuth callback
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    if (!code) {
      return new Response('Authorization code missing', { status: 400 })
    }

    const clientId = Deno.env.get('LINKEDIN_CLIENT_ID')
    const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET')
    const redirectUri = `${url.origin}/supabase/functions/v1/linkedin-oauth?action=callback`

    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Fetch LinkedIn profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const profile = await profileResponse.json()

    // Fetch email
    const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const emailData = await emailResponse.json()
    const email = emailData.elements?.[0]?.['handle~']?.emailAddress

    // Redirect back to app with profile data
    const appRedirectUrl = new URL(Deno.env.get('APP_URL') ?? 'http://localhost:5173')
    appRedirectUrl.pathname = '/linkedin-callback'
    appRedirectUrl.searchParams.set('firstName', profile.localizedFirstName)
    appRedirectUrl.searchParams.set('lastName', profile.localizedLastName)
    appRedirectUrl.searchParams.set('email', email)

    return new Response(null, {
      status: 302,
      headers: {
        'Location': appRedirectUrl.toString(),
      },
    })
  }

  return new Response('Invalid action', { status: 400 })
})
```

**Frontend Update:**

Create new hook or update existing LinkedIn integration to use the Edge Function.

**Deliverables:**
- [ ] Edge Function deployed
- [ ] LinkedIn OAuth flow working
- [ ] Profile data imported correctly
- [ ] Frontend integration updated

**Dependencies:** Task 1.1 complete

---

## Phase 3: Cleanup & Documentation

**Duration:** 2-3 days
**Risk:** Low
**Agent:** Code Cleanup Specialist, Documentation Writer

### Task 3.1: Remove Firebase Dependencies

**Actions:**
1. Remove Firebase from package.json
2. Delete `src/lib/firebase.ts`
3. Remove Firebase environment variables
4. Delete `functions/` directory (after backup)
5. Update `.gitignore`

**Deliverables:**
- [ ] Firebase SDK removed from dependencies
- [ ] Firebase files deleted
- [ ] No Firebase imports remaining
- [ ] Build passes without errors

**Dependencies:** All Phase 2 tasks complete

---

### Task 3.2: Update Documentation

**Actions:**
1. Update README with Supabase-only setup
2. Create environment variables guide
3. Update deployment documentation
4. Document Edge Functions
5. Create migration completion report

**Deliverables:**
- [ ] README updated
- [ ] Environment guide created
- [ ] Deployment docs updated
- [ ] Edge Functions documented
- [ ] Migration report completed

**Dependencies:** Task 3.1 complete

---

## Agent Coordination Strategy

### Agent Roles & Responsibilities

**1. Context Manager (Primary Orchestrator)**
- Maintain this execution plan
- Coordinate between agents
- Track overall progress
- Handle blockers and dependencies
- Ensure knowledge sharing

**2. Database Migration Specialist**
- Phase 1 tasks (billing data migration)
- Schema design and RLS policies
- Data integrity verification
- Type generation

**3. Backend TypeScript Architect**
- Edge Functions development
- API integrations (OpenAI, SendGrid, Apify)
- Error handling and logging
- Performance optimization

**4. Frontend Integration Specialist**
- Update React hooks
- Remove Firebase SDK calls
- Replace with Supabase client
- UI testing

**5. Testing & QA Agent**
- End-to-end testing
- Integration testing
- Performance testing
- Security validation

**6. Documentation Specialist**
- Update README
- Write migration guides
- Document new architecture
- Create runbooks

### Communication Protocol

**Daily Standup (Async)**
- Each agent reports: completed tasks, blockers, next steps
- Context manager updates execution plan
- Adjust priorities as needed

**Knowledge Sharing**
- Agents document decisions in code comments
- Share learnings in migration log
- Update execution plan with discoveries

**Quality Gates**
- No task marked complete without testing
- All changes peer-reviewed by another agent
- Context manager validates before next phase

---

## Risk Mitigation

### Technical Risks

**Risk 1: Edge Functions Runtime Differences**
- **Mitigation:** Thoroughly test each function in Supabase local environment
- **Fallback:** Keep Firebase functions running during transition

**Risk 2: API Rate Limits (OpenAI, SendGrid, Apify)**
- **Mitigation:** Implement retry logic with exponential backoff
- **Monitoring:** Track API usage in Edge Function logs

**Risk 3: Data Migration Failures**
- **Mitigation:** Run migration script in dry-run mode first
- **Backup:** Keep Firebase data until verified

**Risk 4: Authentication Issues**
- **Mitigation:** Test auth thoroughly before going live
- **Fallback:** Have rollback plan ready

### Process Risks

**Risk 1: Agent Coordination Overhead**
- **Mitigation:** Clear task boundaries and dependencies
- **Communication:** Async updates, minimal meetings

**Risk 2: Scope Creep**
- **Mitigation:** Stick to migration plan, no feature additions
- **Focus:** Complete migration first, optimize later

---

## Success Metrics

**Functional Metrics:**
- [ ] All Firebase Cloud Functions ported to Edge Functions
- [ ] All Firestore data in Supabase tables
- [ ] All Firebase Storage files in Supabase Storage
- [ ] Zero Firebase SDK imports
- [ ] All tests passing

**Performance Metrics:**
- [ ] Edge Function latency < 500ms p95
- [ ] Database query performance maintained or improved
- [ ] No increase in error rates

**Quality Metrics:**
- [ ] 100% test coverage for new Edge Functions
- [ ] Zero security vulnerabilities
- [ ] Complete documentation

---

## Timeline & Milestones

**Week 1: Phase 1 (Infrastructure & Data)**
- Day 1-2: Set up Edge Functions infrastructure
- Day 3-4: Migrate billing data
- Day 5: Update frontend billing hooks, test

**Week 2: Phase 2 Part 1 (Edge Functions - Easy)**
- Day 1-2: Rate limiting function
- Day 3-4: Email sending function
- Day 5: Testing and integration

**Week 3: Phase 2 Part 2 (Edge Functions - Complex)**
- Day 1-3: AI generation function
- Day 4-5: Job scraping function

**Week 4: Phase 2 Part 3 & Phase 3**
- Day 1-2: LinkedIn OAuth function
- Day 3: Remove Firebase dependencies
- Day 4-5: Documentation and final testing

---

## Appendix

### Environment Variables Mapping

**Firebase → Supabase**
```
VITE_FIREBASE_API_KEY → (removed)
VITE_FIREBASE_AUTH_DOMAIN → (removed)
VITE_FIREBASE_PROJECT_ID → (removed)
VITE_FIREBASE_STORAGE_BUCKET → (removed)
VITE_FIREBASE_MESSAGING_SENDER_ID → (removed)
VITE_FIREBASE_APP_ID → (removed)

VITE_SUPABASE_URL → (keep)
VITE_SUPABASE_ANON_KEY → (keep)
```

**Edge Functions Secrets**
```
OPENAI_API_KEY
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
APIFY_API_KEY
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
APP_URL
```

### Commands Reference

```bash
# Initialize Supabase
npx supabase init

# Start local Supabase
npx supabase start

# Create new Edge Function
npx supabase functions new function-name

# Serve Edge Functions locally
npx supabase functions serve

# Deploy Edge Function
npx supabase functions deploy function-name

# Set Edge Function secret
npx supabase secrets set SECRET_NAME=value

# Generate TypeScript types
npx supabase gen types typescript --local > src/lib/database.types.ts

# Run migration
npx supabase migration up

# Reset local database
npx supabase db reset
```

---

## Next Steps

**Immediate Actions:**
1. Review and approve this execution plan
2. Assign primary context manager
3. Set up agent coordination channel
4. Begin Phase 1, Task 1.1: Set up Supabase Edge Functions infrastructure

**Questions for Stakeholder:**
1. Timeline preference: aggressive (2 weeks) or conservative (4 weeks)?
2. Testing requirements: manual, automated, or both?
3. Rollback criteria: what conditions trigger rollback to Firebase?
4. Budget for additional API costs during transition?

---

**Status:** ✅ Execution plan complete - Ready to begin implementation
