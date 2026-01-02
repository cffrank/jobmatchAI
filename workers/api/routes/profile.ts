/**
 * Profile Management Routes
 *
 * Handles user profile, work experience, and skills updates.
 * Automatically triggers resume embedding regeneration after changes.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { createSupabaseAdmin } from '../services/supabase';
import { updateUserResumeEmbedding } from '../services/embeddings';
import { invalidateCacheForUser } from '../services/jobAnalysisCache';
import {
  uploadFile,
  deleteFile,
  generateUserFileKey,
  generateUniqueFilename,
  validateFileSize,
  validateFileType
} from '../services/storage';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to trigger background updates after profile changes
 *
 * Updates both resume embeddings and invalidates job compatibility analysis cache
 * Runs asynchronously in background to avoid blocking the response
 */
function triggerProfileChangeBackgroundUpdates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any, // Hono Context - using any to avoid circular dependency with full Context type
  env: Env,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any, // SupabaseClient - using any to avoid @supabase/supabase-js dependency in types
  userId: string
): void {
  c.executionCtx.waitUntil(
    Promise.allSettled([
      // Update user resume embedding for semantic search
      updateUserResumeEmbedding(env, supabase, userId).catch((err) => {
        console.error('[Profile] Failed to update user embedding:', err);
      }),
      // Invalidate job compatibility analysis cache (stale after profile changes)
      invalidateCacheForUser(env, userId).catch((err) => {
        console.error('[Profile] Failed to invalidate job analysis cache:', err);
      }),
    ])
  );
}

// =============================================================================
// Validation Schemas
// =============================================================================

const profileUpdateSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin_url: z.string().optional(),
  photo_url: z.string().optional().nullable(),
  current_title: z.string().optional(), // headline
  professional_summary: z.string().optional(), // summary
});

const workExperienceSchema = z.object({
  position: z.string().min(1, 'Position is required'),
  company: z.string().min(1, 'Company is required'),
  description: z.string().optional().nullable(),
  start_date: z.string(),
  end_date: z.string().optional().nullable(),
  is_current: z.boolean().optional(),
});

const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
});

const educationSchema = z.object({
  school: z.string().min(1, 'School/institution is required'),
  degree: z.string().optional(),
  field: z.string().optional(), // field_of_study
  startDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  highlights: z.array(z.string()).optional(),
});

// =============================================================================
// Profile Routes
// =============================================================================

/**
 * GET /api/profile
 * Fetch user profile
 */
app.get('/', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  try {
    const { data: profile, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch profile: ${fetchError.message}`);
    }

    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({
      message: 'Profile fetched successfully',
      profile,
    });
  } catch (error) {
    console.error('[Profile] Error fetching profile:', error);
    return c.json(
      {
        error: 'Failed to fetch profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PATCH /api/profile
 * Update user profile (headline, summary, contact info)
 */
app.patch('/', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = profileUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid profile data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    // Update profile
    const { data, error: updateError } = await supabase
      .from('users')
      .update({
        ...parseResult.data,
        updated_at: timestamp,
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Profile] Updated profile for user ${userId}, background updates queued`);

    return c.json({
      message: 'Profile updated successfully',
      profile: data,
    });
  } catch (error) {
    console.error('[Profile] Error updating profile:', error);
    return c.json(
      {
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Work Experience Routes
// =============================================================================

/**
 * GET /api/profile/work-experience
 * Fetch all work experience entries for the user
 */
app.get('/work-experience', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  try {
    const { data: experiences, error: fetchError } = await supabase
      .from('work_experience')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch work experience: ${fetchError.message}`);
    }

    return c.json({
      message: 'Work experience fetched successfully',
      experiences: experiences || [],
    });
  } catch (error) {
    console.error('[Profile] Error fetching work experience:', error);
    return c.json(
      {
        error: 'Failed to fetch work experience',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/profile/work-experience
 * Add new work experience entry
 */
app.post('/work-experience', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = workExperienceSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid work experience data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    const { data, error: insertError } = await supabase
      .from('work_experience')
      .insert({
        user_id: userId,
        ...parseResult.data,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to add work experience: ${insertError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Profile] Added work experience for user ${userId}, background updates queued`);

    return c.json({
      message: 'Work experience added successfully',
      experience: data,
    });
  } catch (error) {
    console.error('[Profile] Error adding work experience:', error);
    return c.json(
      {
        error: 'Failed to add work experience',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PATCH /api/profile/work-experience/:id
 * Update existing work experience entry
 */
app.patch('/work-experience/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const experienceId = c.req.param('id');
  const body = await c.req.json();

  const parseResult = workExperienceSchema.partial().safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid work experience data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    // Update work experience (ensure user owns it)
    const { data, error: updateError } = await supabase
      .from('work_experience')
      .update({
        ...parseResult.data,
        updated_at: timestamp,
      })
      .eq('id', experienceId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update work experience: ${updateError.message}`);
    }

    if (!data) {
      return c.json({ error: 'Work experience not found or access denied' }, 404);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(
      `[Profile] Updated work experience ${experienceId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Work experience updated successfully',
      experience: data,
    });
  } catch (error) {
    console.error('[Profile] Error updating work experience:', error);
    return c.json(
      {
        error: 'Failed to update work experience',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /api/profile/work-experience/:id
 * Delete work experience entry
 */
app.delete('/work-experience/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const experienceId = c.req.param('id');

  const supabase = createSupabaseAdmin(c.env);

  try {
    const { error: deleteError } = await supabase
      .from('work_experience')
      .delete()
      .eq('id', experienceId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete work experience: ${deleteError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(
      `[Profile] Deleted work experience ${experienceId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Work experience deleted successfully',
    });
  } catch (error) {
    console.error('[Profile] Error deleting work experience:', error);
    return c.json(
      {
        error: 'Failed to delete work experience',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Skills Routes
// =============================================================================

/**
 * GET /api/profile/skills
 * Fetch all skills for the user
 */
app.get('/skills', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  try {
    const { data: skills, error: fetchError } = await supabase
      .from('skills')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch skills: ${fetchError.message}`);
    }

    return c.json({
      message: 'Skills fetched successfully',
      skills: skills || [],
    });
  } catch (error) {
    console.error('[Profile] Error fetching skills:', error);
    return c.json(
      {
        error: 'Failed to fetch skills',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/profile/skills
 * Add new skill
 */
app.post('/skills', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = skillSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid skill data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    const { data, error: insertError } = await supabase
      .from('skills')
      .insert({
        user_id: userId,
        ...parseResult.data,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to add skill: ${insertError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Profile] Added skill for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill added successfully',
      skill: data,
    });
  } catch (error) {
    console.error('[Profile] Error adding skill:', error);
    return c.json(
      {
        error: 'Failed to add skill',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PATCH /api/profile/skills/:id
 * Update existing skill
 */
app.patch('/skills/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const skillId = c.req.param('id');
  const body = await c.req.json();

  const parseResult = skillSchema.partial().safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid skill data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    const { data, error: updateError } = await supabase
      .from('skills')
      .update({
        ...parseResult.data,
        updated_at: timestamp,
      })
      .eq('id', skillId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update skill: ${updateError.message}`);
    }

    if (!data) {
      return c.json({ error: 'Skill not found or access denied' }, 404);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(
      `[Profile] Updated skill ${skillId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Skill updated successfully',
      skill: data,
    });
  } catch (error) {
    console.error('[Profile] Error updating skill:', error);
    return c.json(
      {
        error: 'Failed to update skill',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /api/profile/skills/:id
 * Delete skill
 */
app.delete('/skills/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const skillId = c.req.param('id');

  const supabase = createSupabaseAdmin(c.env);

  try {
    const { error: deleteError } = await supabase
      .from('skills')
      .delete()
      .eq('id', skillId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete skill: ${deleteError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Profile] Deleted skill ${skillId} for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill deleted successfully',
    });
  } catch (error) {
    console.error('[Profile] Error deleting skill:', error);
    return c.json(
      {
        error: 'Failed to delete skill',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Education Routes
// =============================================================================

/**
 * GET /api/profile/education
 * Fetch all education entries for the user
 */
app.get('/education', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const supabase = createSupabaseAdmin(c.env);

  try {
    const { data: education, error: fetchError } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch education: ${fetchError.message}`);
    }

    return c.json({
      message: 'Education fetched successfully',
      education: education || [],
    });
  } catch (error) {
    console.error('[Profile] Error fetching education:', error);
    return c.json(
      {
        error: 'Failed to fetch education',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/profile/education
 * Add new education entry
 */
app.post('/education', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = educationSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid education data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    // Transform frontend format to database format
    const { data, error: insertError } = await supabase
      .from('education')
      .insert({
        user_id: userId,
        institution: parseResult.data.school,
        degree: parseResult.data.degree || null,
        field_of_study: parseResult.data.field || null,
        start_date: parseResult.data.startDate || null,
        end_date: parseResult.data.endDate || null,
        description: parseResult.data.highlights?.join('\n') || null,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to add education: ${insertError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(`[Profile] Added education for user ${userId}, background updates queued`);

    return c.json({
      message: 'Education added successfully',
      education: data,
    });
  } catch (error) {
    console.error('[Profile] Error adding education:', error);
    return c.json(
      {
        error: 'Failed to add education',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PATCH /api/profile/education/:id
 * Update existing education entry
 */
app.patch('/education/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const educationId = c.req.param('id');
  const body = await c.req.json();

  const parseResult = educationSchema.partial().safeParse(body);
  if (!parseResult.success) {
    return c.json(
      { error: 'Invalid education data', details: parseResult.error.errors },
      400
    );
  }

  const supabase = createSupabaseAdmin(c.env);

  try {
    const timestamp = new Date().toISOString();

    // Transform frontend format to database format
    const updateData: Record<string, unknown> = {
      updated_at: timestamp,
    };

    if (parseResult.data.school !== undefined) {
      updateData.institution = parseResult.data.school;
    }
    if (parseResult.data.degree !== undefined) {
      updateData.degree = parseResult.data.degree || null;
    }
    if (parseResult.data.field !== undefined) {
      updateData.field_of_study = parseResult.data.field || null;
    }
    if (parseResult.data.startDate !== undefined) {
      updateData.start_date = parseResult.data.startDate || null;
    }
    if (parseResult.data.endDate !== undefined) {
      updateData.end_date = parseResult.data.endDate || null;
    }
    if (parseResult.data.highlights !== undefined) {
      updateData.description = parseResult.data.highlights?.join('\n') || null;
    }

    const { data, error: updateError } = await supabase
      .from('education')
      .update(updateData)
      .eq('id', educationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update education: ${updateError.message}`);
    }

    if (!data) {
      return c.json({ error: 'Education not found or access denied' }, 404);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(
      `[Profile] Updated education ${educationId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Education updated successfully',
      education: data,
    });
  } catch (error) {
    console.error('[Profile] Error updating education:', error);
    return c.json(
      {
        error: 'Failed to update education',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /api/profile/education/:id
 * Delete education entry
 */
app.delete('/education/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const educationId = c.req.param('id');

  const supabase = createSupabaseAdmin(c.env);

  try {
    const { error: deleteError } = await supabase
      .from('education')
      .delete()
      .eq('id', educationId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete education: ${deleteError.message}`);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, supabase, userId);
    console.log(
      `[Profile] Deleted education ${educationId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Education deleted successfully',
    });
  } catch (error) {
    console.error('[Profile] Error deleting education:', error);
    return c.json(
      {
        error: 'Failed to delete education',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Avatar Upload (Phase 3.2: R2 Integration)
// =============================================================================

/**
 * POST /api/profile/avatar
 * Upload user avatar to R2
 *
 * Phase 3.2: Migrated from Supabase Storage to R2
 * - Uploads to R2 AVATARS bucket
 * - Stores metadata in D1 file_uploads table
 * - Returns presigned URL for avatar access (Phase 3.3)
 *
 * Accepted formats: JPEG, PNG, WebP, GIF
 * Max size: 5MB
 */
app.post('/avatar', authenticateUser, async (c) => {
  const userId = getUserId(c);

  console.log(`[Profile] Avatar upload request from user ${userId}`);

  try {
    // Parse form data
    const formData = await c.req.formData();
    const fileEntry = formData.get('avatar');

    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }

    const file = fileEntry as File;
    console.log(`[Profile] Received file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    // Validate file type
    const allowedTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    validateFileType(file.name, allowedTypes);

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    validateFileSize(file.size, maxSize);

    // Generate unique file key
    const uniqueFilename = generateUniqueFilename(file.name);
    const fileKey = generateUserFileKey(userId, 'profile', uniqueFilename);

    console.log(`[Profile] Uploading to R2 with key: ${fileKey}`);

    // Read file data
    const fileData = await file.arrayBuffer();

    // Upload to R2 AVATARS bucket
    const uploadResult = await uploadFile(c.env.AVATARS, fileKey, fileData, {
      contentType: file.type,
      metadata: {
        userId,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log(`[Profile] Upload successful: ${uploadResult.key}`);

    // Generate presigned download URL for the uploaded avatar
    const { getDownloadUrl } = await import('../services/storage');
    const downloadUrlResult = await getDownloadUrl(c.env.AVATARS, fileKey, 86400); // 24 hour expiry for avatars

    // Update user profile with avatar download URL (Phase 3.3: Using presigned URL)
    const supabase = createSupabaseAdmin(c.env);
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update({
        photo_url: downloadUrlResult.url, // Phase 3.3: Presigned download URL
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[Profile] Failed to update profile with avatar URL:', updateError);
      // Clean up uploaded file
      await deleteFile(c.env.AVATARS, fileKey);
      throw new Error('Failed to update profile');
    }

    console.log(`[Profile] Avatar uploaded successfully for user ${userId}`);

    return c.json({
      message: 'Avatar uploaded successfully',
      file: {
        key: uploadResult.key,
        size: uploadResult.size,
        url: downloadUrlResult.url, // Phase 3.3: Presigned URL for secure access
        expiresAt: downloadUrlResult.expiresAt,
      },
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('[Profile] Avatar upload failed:', error);
    return c.json(
      {
        error: 'Failed to upload avatar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /api/profile/avatar
 * Delete user avatar from R2
 */
app.delete('/avatar', authenticateUser, async (c) => {
  const userId = getUserId(c);

  console.log(`[Profile] Avatar deletion request from user ${userId}`);

  try {
    const supabase = createSupabaseAdmin(c.env);

    // Get current avatar URL
    const { data: profile, error: fetchError } = await supabase
      .from('users')
      .select('photo_url')
      .eq('id', userId)
      .single();

    if (fetchError || !profile?.photo_url) {
      return c.json({ error: 'No avatar found' }, 404);
    }

    const fileKey = profile.photo_url;

    // Delete from R2
    await deleteFile(c.env.AVATARS, fileKey);

    // Update profile
    const { error: updateError } = await supabase
      .from('users')
      .update({
        photo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[Profile] Failed to update profile after avatar deletion:', updateError);
      throw new Error('Failed to update profile');
    }

    console.log(`[Profile] Avatar deleted successfully for user ${userId}`);

    return c.json({
      message: 'Avatar deleted successfully',
    });
  } catch (error) {
    console.error('[Profile] Avatar deletion failed:', error);
    return c.json(
      {
        error: 'Failed to delete avatar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
