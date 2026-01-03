/**
 * Applications Routes for Cloudflare Workers
 *
 * Handles application generation and management.
 *
 * Endpoints:
 * - POST /api/applications/generate - Generate application variants for a job (with AI)
 * - POST /api/applications - Create new application (without AI generation)
 * - GET /api/applications - List user's applications with pagination
 * - GET /api/applications/:id - Get application by ID with variants
 * - PATCH /api/applications/:id - Update application (status, selectedVariantId)
 * - DELETE /api/applications/:id - Delete application
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables, Job, UserProfile, WorkExperience, Education, Skill, GenerateApplicationResponse } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { generateApplicationVariants } from '../services/openai';

// =============================================================================
// Router Setup
// =============================================================================

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// =============================================================================
// Validation Schemas
// =============================================================================

const generateApplicationSchema = z.object({
  jobId: z
    .string()
    .min(1, 'Job ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid job ID format'),
});

const updateApplicationSchema = z.object({
  status: z
    .enum(['draft', 'submitted', 'viewed', 'interviewing', 'offered', 'rejected', 'withdrawn', 'accepted'])
    .optional(),
  selectedVariantId: z.string().optional(),
});

const listApplicationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/applications/generate
 * Generate application variants for a job using AI
 */
app.post('/generate', authenticateUser, rateLimiter(), async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  // Validate input
  const parseResult = generateApplicationSchema.safeParse(body);
  if (!parseResult.success) {
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { jobId } = parseResult.data;

  console.log(`Generating application for user ${userId}, job ${jobId}`);

  // Fetch job data from D1
  const { results: jobResults } = await c.env.DB.prepare(
    'SELECT * FROM jobs WHERE id = ?'
  )
    .bind(jobId)
    .all();

  const job = jobResults[0];

  if (!job) {
    throw createNotFoundError('Job', jobId);
  }

  // Fetch user profile from D1
  const { results: profileResults } = await c.env.DB.prepare(
    'SELECT * FROM users WHERE id = ?'
  )
    .bind(userId)
    .all();

  const profile = profileResults[0];

  if (!profile) {
    throw createNotFoundError('User profile');
  }

  // Fetch work experience from D1
  const { results: workExperience } = await c.env.DB.prepare(
    'SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC'
  )
    .bind(userId)
    .all();

  if (!workExperience || workExperience.length === 0) {
    throw createValidationError('Add work experience to your profile first', {
      workExperience: 'At least one work experience entry is required',
    });
  }

  // Fetch education from D1
  const { results: education } = await c.env.DB.prepare(
    'SELECT * FROM education WHERE user_id = ? ORDER BY end_date DESC'
  )
    .bind(userId)
    .all();

  // Fetch skills from D1
  const { results: skills } = await c.env.DB.prepare(
    'SELECT * FROM skills WHERE user_id = ? ORDER BY endorsements DESC'
  )
    .bind(userId)
    .all();

  // Map database records to type interfaces
  const mappedJob: Job = mapDatabaseJob(job);
  const mappedProfile: UserProfile = mapDatabaseProfile(profile);
  const mappedWorkExperience: WorkExperience[] = (workExperience || []).map(mapDatabaseWorkExperience);
  const mappedEducation: Education[] = (education || []).map(mapDatabaseEducation);
  const mappedSkills: Skill[] = (skills || []).map(mapDatabaseSkill);

  // Generate variants using OpenAI
  const variants = await generateApplicationVariants(c.env, {
    job: mappedJob,
    profile: mappedProfile,
    workExperience: mappedWorkExperience,
    education: mappedEducation,
    skills: mappedSkills,
  });

  // Save application to D1 database
  // Note: In D1 schema, variants are stored as JSON in applications.variants column
  const applicationId = crypto.randomUUID();
  const now = new Date().toISOString();

  const variantsJson = JSON.stringify(variants.map((v) => ({
    id: v.id,
    name: v.name,
    resume: v.resume,
    cover_letter: v.coverLetter,
    ai_rationale: v.aiRationale,
  })));

  try {
    await c.env.DB.prepare(
      `INSERT INTO applications (
        id, user_id, job_id, status, variants, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        applicationId,
        userId,
        jobId,
        'draft',
        variantsJson,
        now,
        now
      )
      .run();
  } catch (error) {
    console.error('Failed to save application to D1:', error);
    throw new Error('Failed to save application');
  }

  console.log(`Application created: ${applicationId}`);

  const response: GenerateApplicationResponse = {
    id: applicationId,
    jobId,
    jobTitle: mappedJob.title,
    company: mappedJob.company,
    status: 'draft',
    createdAt: new Date().toISOString(),
    variants,
    selectedVariantId: variants[0]?.id || '',
  };

  return c.json(response, 201);
});

/**
 * POST /api/applications
 * Create a new application (without AI generation)
 */
const createApplicationSchema = z.object({
  jobId: z.string().optional().nullable(),
  jobTitle: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  status: z.enum(['draft', 'submitted', 'viewed', 'interviewing', 'offered', 'rejected', 'withdrawn', 'accepted']).optional(),
  selectedVariantId: z.string().optional().nullable(),
  variants: z.array(z.any()).optional(),
});

app.post('/', authenticateUser, rateLimiter(), async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = createApplicationSchema.safeParse(body);
  if (!parseResult.success) {
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { jobId, jobTitle, company, status, selectedVariantId, variants } = parseResult.data;

  const applicationId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Store variants as JSON in D1
  const variantsJson = variants && variants.length > 0
    ? JSON.stringify(variants.map((v) => ({
        id: v.id,
        name: v.name,
        resume: v.resume,
        cover_letter: v.coverLetter,
        ai_rationale: v.aiRationale,
      })))
    : null;

  try {
    await c.env.DB.prepare(
      `INSERT INTO applications (
        id, user_id, job_id, job_title, company, status,
        selected_variant_id, variants, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        applicationId,
        userId,
        jobId || null,
        jobTitle,
        company,
        status || 'draft',
        selectedVariantId || null,
        variantsJson,
        now,
        now
      )
      .run();
  } catch (error) {
    console.error('Failed to create application:', error);
    throw new Error('Failed to create application');
  }

  return c.json({
    id: applicationId,
    jobId,
    jobTitle,
    company,
    status: status || 'draft',
    createdAt: now,
    selectedVariantId,
    variants: variants || [],
  }, 201);
});

/**
 * GET /api/applications
 * List user's applications with pagination
 */
app.get('/', authenticateUser, async (c) => {
  const userId = getUserId(c);

  const parseResult = listApplicationsSchema.safeParse({
    page: c.req.query('page'),
    limit: c.req.query('limit'),
    status: c.req.query('status'),
  });

  if (!parseResult.success) {
    throw createValidationError(
      'Invalid query parameters',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const { page, limit, status } = parseResult.data;
  const offset = (page - 1) * limit;

  // Build query with optional status filter
  let query = 'SELECT * FROM applications WHERE user_id = ?';
  const params: unknown[] = [userId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results: applications } = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  // Get total count
  let countQuery = 'SELECT COUNT(*) as count FROM applications WHERE user_id = ?';
  const countParams: unknown[] = [userId];

  if (status) {
    countQuery += ' AND status = ?';
    countParams.push(status);
  }

  const { results: countResults } = await c.env.DB.prepare(countQuery)
    .bind(...countParams)
    .all();

  const count = (countResults[0] as Record<string, number>)?.count || 0;

  return c.json({
    applications: applications || [],
    total: count,
    page,
    limit,
    hasMore: count > offset + limit,
  });
});

/**
 * GET /api/applications/:id
 * Get application by ID with variants
 */
app.get('/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');

  // Fetch application from D1
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM applications WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .all();

  const application = results[0];

  if (!application) {
    throw createNotFoundError('Application', id);
  }

  // Parse variants from JSON
  const variants = application.variants
    ? JSON.parse(application.variants as string)
    : [];

  return c.json({
    ...application,
    variants,
  });
});

/**
 * PATCH /api/applications/:id
 * Update application status or selected variant
 */
app.patch('/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');
  const body = await c.req.json();

  const parseResult = updateApplicationSchema.safeParse(body);
  if (!parseResult.success) {
    throw createValidationError(
      'Invalid request body',
      Object.fromEntries(
        parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
      )
    );
  }

  const updates = parseResult.data;
  const now = new Date().toISOString();

  // Build dynamic UPDATE query
  const updateFields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    updateFields.push('status = ?');
    values.push(updates.status);

    // Set submitted_at if status is submitted
    if (updates.status === 'submitted') {
      updateFields.push('submitted_at = ?');
      values.push(now);
    }
  }

  if (updates.selectedVariantId !== undefined) {
    updateFields.push('selected_variant_id = ?');
    values.push(updates.selectedVariantId);
  }

  updateFields.push('updated_at = ?');
  values.push(now);

  // Add WHERE clause values
  values.push(id, userId);

  const { meta } = await c.env.DB.prepare(
    `UPDATE applications SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`
  )
    .bind(...values)
    .run();

  if (meta.changes === 0) {
    throw createNotFoundError('Application', id);
  }

  // Fetch updated application
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM applications WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .all();

  const application = results[0];

  return c.json(application);
});

/**
 * DELETE /api/applications/:id
 * Delete application
 */
app.delete('/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const id = c.req.param('id');

  // Delete application from D1
  const { meta } = await c.env.DB.prepare(
    'DELETE FROM applications WHERE id = ? AND user_id = ?'
  )
    .bind(id, userId)
    .run();

  if (meta.changes === 0) {
    throw createNotFoundError('Application', id);
  }

  return c.body(null, 204);
});

// =============================================================================
// Database Mapping Functions
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

function mapDatabaseJob(record: any): Job {
  return {
    id: record.id,
    userId: record.user_id,
    title: record.title,
    company: record.company,
    companyLogo: record.company_logo,
    location: record.location,
    workArrangement: record.work_arrangement,
    salaryMin: record.salary_min,
    salaryMax: record.salary_max,
    postedDate: record.posted_date,
    description: record.description,
    url: record.url,
    source: record.source,
    requiredSkills: record.required_skills,
    preferredSkills: record.preferred_skills,
    experienceLevel: record.experience_level,
    matchScore: record.match_score,
    isSaved: record.is_saved,
    isArchived: record.is_archived,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapDatabaseProfile(record: any): UserProfile {
  return {
    id: record.id,
    email: record.email,
    firstName: record.first_name,
    lastName: record.last_name,
    phone: record.phone,
    location: record.location,
    summary: record.summary,
    headline: record.headline,
    profileImageUrl: record.profile_image_url,
    linkedInUrl: record.linkedin_url,
    linkedInImported: record.linkedin_imported,
    linkedInImportedAt: record.linkedin_imported_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapDatabaseWorkExperience(record: any): WorkExperience {
  return {
    id: record.id,
    userId: record.user_id,
    position: record.position,
    company: record.company,
    location: record.location,
    startDate: record.start_date,
    endDate: record.end_date,
    current: record.current,
    description: record.description,
    accomplishments: record.accomplishments || [],
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapDatabaseEducation(record: any): Education {
  return {
    id: record.id,
    userId: record.user_id,
    degree: record.degree,
    field: record.field,
    school: record.school,
    location: record.location,
    startDate: record.start_date,
    endDate: record.end_date,
    graduationYear: record.graduation_year,
    gpa: record.gpa,
    honors: record.honors,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapDatabaseSkill(record: any): Skill {
  return {
    id: record.id,
    userId: record.user_id,
    name: record.name,
    level: record.level,
    endorsements: record.endorsements,
    yearsOfExperience: record.years_of_experience,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

export default app;
