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
  userId: string
): void {
  c.executionCtx.waitUntil(
    Promise.allSettled([
      // Update user resume embedding for semantic search
      updateUserResumeEmbedding(env, userId).catch((err) => {
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

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    )
      .bind(userId)
      .all();

    const profile = results[0];

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

  try {
    const timestamp = new Date().toISOString();

    // Build dynamic UPDATE query
    const updateFields: string[] = [];
    const values: unknown[] = [];

    Object.entries(parseResult.data).forEach(([key, value]) => {
      updateFields.push(`${key} = ?`);
      values.push(value);
    });

    updateFields.push('updated_at = ?');
    values.push(timestamp);
    values.push(userId);

    const { meta } = await c.env.DB.prepare(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Fetch updated profile
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    )
      .bind(userId)
      .all();

    const profile = results[0];

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
    console.log(`[Profile] Updated profile for user ${userId}, background updates queued`);

    return c.json({
      message: 'Profile updated successfully',
      profile,
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

  try {
    const { results: experiences } = await c.env.DB.prepare(
      'SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC'
    )
      .bind(userId)
      .all();

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

  try {
    const experienceId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO work_experience (
        id, user_id, position, company, description, start_date, end_date,
        is_current, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        experienceId,
        userId,
        parseResult.data.position,
        parseResult.data.company,
        parseResult.data.description || null,
        parseResult.data.start_date,
        parseResult.data.end_date || null,
        parseResult.data.is_current || false,
        timestamp,
        timestamp
      )
      .run();

    // Fetch inserted experience
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM work_experience WHERE id = ?'
    )
      .bind(experienceId)
      .all();

    const experience = results[0];

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
    console.log(`[Profile] Added work experience for user ${userId}, background updates queued`);

    return c.json({
      message: 'Work experience added successfully',
      experience,
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

  try {
    const timestamp = new Date().toISOString();

    // Build dynamic UPDATE query
    const updateFields: string[] = [];
    const values: unknown[] = [];

    Object.entries(parseResult.data).forEach(([key, value]) => {
      updateFields.push(`${key} = ?`);
      values.push(value);
    });

    updateFields.push('updated_at = ?');
    values.push(timestamp);
    values.push(experienceId, userId);

    const { meta } = await c.env.DB.prepare(
      `UPDATE work_experience SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`
    )
      .bind(...values)
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Work experience not found or access denied' }, 404);
    }

    // Fetch updated experience
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM work_experience WHERE id = ? AND user_id = ?'
    )
      .bind(experienceId, userId)
      .all();

    const experience = results[0];

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
    console.log(
      `[Profile] Updated work experience ${experienceId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Work experience updated successfully',
      experience,
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

  try {
    const { meta } = await c.env.DB.prepare(
      'DELETE FROM work_experience WHERE id = ? AND user_id = ?'
    )
      .bind(experienceId, userId)
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Work experience not found or access denied' }, 404);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
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

  try {
    const { results: skills } = await c.env.DB.prepare(
      'SELECT * FROM skills WHERE user_id = ? ORDER BY created_at DESC'
    )
      .bind(userId)
      .all();

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

  try {
    const skillId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO skills (id, user_id, name, proficiency_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        skillId,
        userId,
        parseResult.data.name,
        parseResult.data.level || null,
        timestamp,
        timestamp
      )
      .run();

    // Fetch inserted skill
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM skills WHERE id = ?'
    )
      .bind(skillId)
      .all();

    const skill = results[0];

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
    console.log(`[Profile] Added skill for user ${userId}, background updates queued`);

    return c.json({
      message: 'Skill added successfully',
      skill,
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

  try {
    const timestamp = new Date().toISOString();

    // Build dynamic UPDATE query
    const updateFields: string[] = [];
    const values: unknown[] = [];

    if (parseResult.data.name !== undefined) {
      updateFields.push('name = ?');
      values.push(parseResult.data.name);
    }
    if (parseResult.data.level !== undefined) {
      updateFields.push('proficiency_level = ?');
      values.push(parseResult.data.level);
    }

    updateFields.push('updated_at = ?');
    values.push(timestamp);
    values.push(skillId, userId);

    const { meta } = await c.env.DB.prepare(
      `UPDATE skills SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`
    )
      .bind(...values)
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Skill not found or access denied' }, 404);
    }

    // Fetch updated skill
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM skills WHERE id = ? AND user_id = ?'
    )
      .bind(skillId, userId)
      .all();

    const skill = results[0];

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
    console.log(
      `[Profile] Updated skill ${skillId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Skill updated successfully',
      skill,
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

  try {
    const { meta } = await c.env.DB.prepare(
      'DELETE FROM skills WHERE id = ? AND user_id = ?'
    )
      .bind(skillId, userId)
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Skill not found or access denied' }, 404);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
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

  try {
    const { results: education } = await c.env.DB.prepare(
      'SELECT * FROM education WHERE user_id = ? ORDER BY start_date DESC'
    )
      .bind(userId)
      .all();

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

  try {
    const educationId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Transform frontend format to database format
    await c.env.DB.prepare(
      `INSERT INTO education (
        id, user_id, institution, degree, field_of_study,
        start_date, end_date, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        educationId,
        userId,
        parseResult.data.school,
        parseResult.data.degree || null,
        parseResult.data.field || null,
        parseResult.data.startDate || null,
        parseResult.data.endDate || null,
        parseResult.data.highlights?.join('\n') || null,
        timestamp,
        timestamp
      )
      .run();

    // Fetch inserted education
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM education WHERE id = ?'
    )
      .bind(educationId)
      .all();

    const education = results[0];

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
    console.log(`[Profile] Added education for user ${userId}, background updates queued`);

    return c.json({
      message: 'Education added successfully',
      education,
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

  try {
    const timestamp = new Date().toISOString();

    // Build dynamic UPDATE query with field mapping
    const updateFields: string[] = [];
    const values: unknown[] = [];

    if (parseResult.data.school !== undefined) {
      updateFields.push('institution = ?');
      values.push(parseResult.data.school);
    }
    if (parseResult.data.degree !== undefined) {
      updateFields.push('degree = ?');
      values.push(parseResult.data.degree || null);
    }
    if (parseResult.data.field !== undefined) {
      updateFields.push('field_of_study = ?');
      values.push(parseResult.data.field || null);
    }
    if (parseResult.data.startDate !== undefined) {
      updateFields.push('start_date = ?');
      values.push(parseResult.data.startDate || null);
    }
    if (parseResult.data.endDate !== undefined) {
      updateFields.push('end_date = ?');
      values.push(parseResult.data.endDate || null);
    }
    if (parseResult.data.highlights !== undefined) {
      updateFields.push('description = ?');
      values.push(parseResult.data.highlights?.join('\n') || null);
    }

    updateFields.push('updated_at = ?');
    values.push(timestamp);
    values.push(educationId, userId);

    const { meta } = await c.env.DB.prepare(
      `UPDATE education SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`
    )
      .bind(...values)
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Education not found or access denied' }, 404);
    }

    // Fetch updated education
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM education WHERE id = ? AND user_id = ?'
    )
      .bind(educationId, userId)
      .all();

    const education = results[0];

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
    console.log(
      `[Profile] Updated education ${educationId} for user ${userId}, background updates queued`
    );

    return c.json({
      message: 'Education updated successfully',
      education,
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

  try {
    const { meta } = await c.env.DB.prepare(
      'DELETE FROM education WHERE id = ? AND user_id = ?'
    )
      .bind(educationId, userId)
      .run();

    if (meta.changes === 0) {
      return c.json({ error: 'Education not found or access denied' }, 404);
    }

    // Trigger background updates (embedding + cache invalidation)
    triggerProfileChangeBackgroundUpdates(c, c.env, userId);
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
    const timestamp = new Date().toISOString();
    const { meta } = await c.env.DB.prepare(
      'UPDATE users SET photo_url = ?, updated_at = ? WHERE id = ?'
    )
      .bind(downloadUrlResult.url, timestamp, userId)
      .run();

    if (meta.changes === 0) {
      console.error('[Profile] Failed to update profile with avatar URL - user not found');
      // Clean up uploaded file
      await deleteFile(c.env.AVATARS, fileKey);
      throw new Error('Failed to update profile');
    }

    // Fetch updated profile
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    )
      .bind(userId)
      .all();

    const updatedProfile = results[0];

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
    // Get current avatar URL
    const { results } = await c.env.DB.prepare(
      'SELECT photo_url FROM users WHERE id = ?'
    )
      .bind(userId)
      .all();

    const profile = results[0];

    if (!profile || !profile.photo_url) {
      return c.json({ error: 'No avatar found' }, 404);
    }

    const fileKey = profile.photo_url as string;

    // Delete from R2
    await deleteFile(c.env.AVATARS, fileKey);

    // Update profile
    const timestamp = new Date().toISOString();
    const { meta } = await c.env.DB.prepare(
      'UPDATE users SET photo_url = NULL, updated_at = ? WHERE id = ?'
    )
      .bind(timestamp, userId)
      .run();

    if (meta.changes === 0) {
      console.error('[Profile] Failed to update profile after avatar deletion');
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
