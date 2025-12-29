/**
 * Applications Routes
 *
 * Handles application generation and management.
 *
 * Endpoints:
 * - POST /api/applications/generate - Generate application variants for a job
 * - GET /api/applications/:id - Get application by ID
 * - GET /api/applications - List user's applications
 * - PATCH /api/applications/:id - Update application
 * - DELETE /api/applications/:id - Delete application
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { generateApplicationVariants } from '../services/openai.service';
import type {
  GenerateApplicationRequest,
  GenerateApplicationResponse,
  Job,
  UserProfile,
  WorkExperience,
  Education,
  Skill,
} from '../types';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

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
router.post(
  '/generate',
  authenticateUser,
  rateLimiter(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Validate input
    const parseResult = generateApplicationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { jobId } = parseResult.data as GenerateApplicationRequest;

    console.log(`Generating application for user ${userId}, job ${jobId}`);

    // Fetch job data
    const { data: job, error: jobError } = await supabaseAdmin
      .from(TABLES.JOBS)
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw createNotFoundError('Job', jobId);
    }

    // Enforce save-before-apply rule
    if (!job.saved) {
      throw createValidationError('You must save this job before applying', {
        job: 'Please save this job first, then you can generate an application for it',
      });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw createNotFoundError('User profile');
    }

    // Fetch work experience
    const { data: workExperience } = await supabaseAdmin
      .from(TABLES.WORK_EXPERIENCE)
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (!workExperience || workExperience.length === 0) {
      throw createValidationError('Add work experience to your profile first', {
        workExperience: 'At least one work experience entry is required',
      });
    }

    // Fetch education
    const { data: education } = await supabaseAdmin
      .from(TABLES.EDUCATION)
      .select('*')
      .eq('user_id', userId)
      .order('end_date', { ascending: false });

    // Fetch skills
    const { data: skills } = await supabaseAdmin
      .from(TABLES.SKILLS)
      .select('*')
      .eq('user_id', userId)
      .order('endorsements', { ascending: false });

    // Map database records to type interfaces
    const mappedJob: Job = mapDatabaseJob(job);
    const mappedProfile: UserProfile = mapDatabaseProfile(profile);
    const mappedWorkExperience: WorkExperience[] = (workExperience || []).map(mapDatabaseWorkExperience);
    const mappedEducation: Education[] = (education || []).map(mapDatabaseEducation);
    const mappedSkills: Skill[] = (skills || []).map(mapDatabaseSkill);

    // Generate variants using OpenAI
    const variants = await generateApplicationVariants({
      job: mappedJob,
      profile: mappedProfile,
      workExperience: mappedWorkExperience,
      education: mappedEducation,
      skills: mappedSkills,
    });

    // Save application to database
    const applicationData = {
      user_id: userId,
      job_id: jobId,
      job_title: mappedJob.title,
      company: mappedJob.company,
      status: 'draft',
      selected_variant_id: variants[0]?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: application, error: insertError } = await supabaseAdmin
      .from(TABLES.APPLICATIONS)
      .insert(applicationData)
      .select('id')
      .single();

    if (insertError || !application) {
      console.error('Failed to save application:', insertError);
      throw new Error('Failed to save application');
    }

    // Save variants
    const variantRecords = variants.map((v) => ({
      application_id: application.id,
      variant_id: v.id,
      name: v.name,
      resume: v.resume,
      cover_letter: v.coverLetter,
      ai_rationale: v.aiRationale,
      created_at: new Date().toISOString(),
    }));

    await supabaseAdmin.from(TABLES.APPLICATION_VARIANTS).insert(variantRecords);

    console.log(`Application created: ${application.id}`);

    const response: GenerateApplicationResponse = {
      id: application.id,
      jobId,
      jobTitle: mappedJob.title,
      company: mappedJob.company,
      status: 'draft',
      createdAt: new Date().toISOString(),
      variants,
      selectedVariantId: variants[0]?.id || '',
    };

    res.status(201).json(response);
  })
);

/**
 * GET /api/applications
 * List user's applications with pagination
 */
router.get(
  '/',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = listApplicationsSchema.safeParse(req.query);
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

    // Build query
    let query = supabaseAdmin
      .from(TABLES.APPLICATIONS)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: applications, error, count } = await query;

    if (error) {
      console.error('Failed to fetch applications:', error);
      throw new Error('Failed to fetch applications');
    }

    res.json({
      applications: applications || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  })
);

/**
 * GET /api/applications/:id
 * Get application by ID with variants
 */
router.get(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // Fetch application
    const { data: application, error } = await supabaseAdmin
      .from(TABLES.APPLICATIONS)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !application) {
      throw createNotFoundError('Application', id);
    }

    // Fetch variants
    const { data: variants } = await supabaseAdmin
      .from(TABLES.APPLICATION_VARIANTS)
      .select('*')
      .eq('application_id', id);

    res.json({
      ...application,
      variants: variants || [],
    });
  })
);

/**
 * PATCH /api/applications/:id
 * Update application status or selected variant
 */
router.patch(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    const parseResult = updateApplicationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const updates = parseResult.data;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from(TABLES.APPLICATIONS)
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      throw createNotFoundError('Application', id);
    }

    // Update application
    const { data: application, error } = await supabaseAdmin
      .from(TABLES.APPLICATIONS)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        ...(updates.status === 'submitted' && { submitted_at: new Date().toISOString() }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update application:', error);
      throw new Error('Failed to update application');
    }

    res.json(application);
  })
);

/**
 * DELETE /api/applications/:id
 * Delete application
 */
router.delete(
  '/:id',
  authenticateUser,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { id } = req.params;

    // Verify ownership and delete
    const { error } = await supabaseAdmin
      .from(TABLES.APPLICATIONS)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete application:', error);
      throw new Error('Failed to delete application');
    }

    res.status(204).send();
  })
);

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

export default router;
