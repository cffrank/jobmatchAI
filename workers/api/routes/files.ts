/**
 * File Management Routes
 *
 * Handles secure file downloads and uploads with R2 storage.
 * Provides presigned URL functionality for avatars, resumes, and exports.
 *
 * Phase 3.3: Presigned URLs Implementation
 */

import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { getFile } from '../services/storage';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// =============================================================================
// File Download Endpoint
// =============================================================================

/**
 * GET /api/files/download/:key
 * Download file from R2 with authentication
 *
 * Provides secure file access with:
 * - Authentication verification
 * - File ownership validation
 * - Direct streaming from R2
 *
 * This replaces traditional presigned URLs with a more secure approach:
 * - User must be authenticated
 * - User can only access their own files
 * - No public bucket exposure
 */
app.get('/download/:key', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const fileKey = decodeURIComponent(c.req.param('key'));

  console.log(`[Files] Download request from user ${userId} for key: ${fileKey}`);

  try {
    // Security check: Verify user owns this file
    // File keys follow pattern: users/{userId}/{folder}/{filename}
    const expectedPrefix = `users/${userId}/`;
    if (!fileKey.startsWith(expectedPrefix)) {
      console.warn(`[Files] Access denied - user ${userId} tried to access: ${fileKey}`);
      return c.json({ error: 'Access denied' }, 403);
    }

    // Determine bucket based on file path
    let bucket: R2Bucket;
    if (fileKey.includes('/profile/')) {
      bucket = c.env.AVATARS;
    } else if (fileKey.includes('/resumes/')) {
      bucket = c.env.RESUMES;
    } else if (fileKey.includes('/exports/')) {
      bucket = c.env.EXPORTS;
    } else {
      console.error(`[Files] Unknown file type for key: ${fileKey}`);
      return c.json({ error: 'Invalid file path' }, 400);
    }

    // Get file from R2
    const object = await getFile(bucket, fileKey);

    if (!object) {
      console.warn(`[Files] File not found: ${fileKey}`);
      return c.json({ error: 'File not found' }, 404);
    }

    // Stream file to client
    console.log(`[Files] Streaming file ${fileKey} to user ${userId}`);

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Length': object.size.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `attachment; filename="${fileKey.split('/').pop()}"`,
      },
    });
  } catch (error) {
    console.error('[Files] Download failed:', error);
    return c.json(
      {
        error: 'Failed to download file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Avatar-specific Download Endpoint
// =============================================================================

/**
 * GET /api/files/avatar/:userId
 * Public avatar download endpoint
 *
 * Allows public access to user avatars for display purposes.
 * This is the only public file endpoint.
 */
app.get('/avatar/:targetUserId', async (c) => {
  const targetUserId = c.req.param('targetUserId');

  console.log(`[Files] Public avatar request for user: ${targetUserId}`);

  try {
    // Avatars are semi-public (can be viewed by other users)
    // Find the avatar file for this user
    // Note: In production, you'd query D1 to get the current avatar key

    // For now, we'll try common avatar paths
    const possiblePaths = [
      `users/${targetUserId}/profile/avatar.jpg`,
      `users/${targetUserId}/profile/avatar.png`,
      `users/${targetUserId}/profile/avatar.webp`,
    ];

    for (const path of possiblePaths) {
      const object = await getFile(c.env.AVATARS, path);
      if (object) {
        console.log(`[Files] Found avatar at: ${path}`);
        return new Response(object.body, {
          headers: {
            'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
            'Content-Length': object.size.toString(),
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
          },
        });
      }
    }

    // No avatar found
    console.log(`[Files] No avatar found for user: ${targetUserId}`);
    return c.json({ error: 'Avatar not found' }, 404);
  } catch (error) {
    console.error('[Files] Avatar download failed:', error);
    return c.json(
      {
        error: 'Failed to download avatar',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;
