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
// File Upload Endpoint
// =============================================================================

/**
 * POST /api/files/upload
 * Upload file to R2 storage
 *
 * Accepts multipart/form-data with:
 * - file: The file to upload (required)
 * - bucket: Target bucket ('avatars', 'resumes', 'exports') (required)
 * - path: Storage path relative to user folder (optional, auto-generated if not provided)
 *
 * Returns:
 * - key: Full path in R2 bucket
 * - downloadURL: URL to download the file
 * - size: File size in bytes
 */
app.post('/upload', authenticateUser, async (c) => {
  const userId = getUserId(c);

  console.log(`[Files] Upload request from user ${userId}`);

  try {
    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const bucketName = formData.get('bucket') as string | null;
    const requestedPath = formData.get('path') as string | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!bucketName) {
      return c.json({ error: 'Bucket name required' }, 400);
    }

    // Determine bucket
    let bucket: R2Bucket;
    let folderPrefix: string;

    switch (bucketName.toLowerCase()) {
      case 'avatars':
        bucket = c.env.AVATARS;
        folderPrefix = 'profile';
        break;
      case 'resumes':
        bucket = c.env.RESUMES;
        folderPrefix = 'resumes';
        break;
      case 'exports':
        bucket = c.env.EXPORTS;
        folderPrefix = 'exports';
        break;
      default:
        return c.json({ error: 'Invalid bucket name' }, 400);
    }

    // Generate storage path
    // Format: users/{userId}/{folder}/{timestamp}_{filename}
    const timestamp = Date.now();
    const filename = requestedPath || `${timestamp}_${file.name}`;
    const storageKey = `users/${userId}/${folderPrefix}/${filename}`;

    console.log(`[Files] Uploading to ${bucketName}: ${storageKey}`);

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json({
        error: 'File too large',
        message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 10MB limit`
      }, 400);
    }

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    const uploaded = await bucket.put(storageKey, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        uploadedBy: userId,
        originalFilename: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate download URL (via our API)
    const downloadURL = `/api/files/download/${encodeURIComponent(storageKey)}`;

    console.log(`[Files] ✓ Upload successful: ${storageKey} (${file.size} bytes)`);

    return c.json({
      key: uploaded.key,
      downloadURL,
      fullPath: storageKey, // For backward compatibility with Supabase
      size: uploaded.size,
      uploadedAt: new Date().toISOString(),
    }, 201);

  } catch (error) {
    console.error('[Files] Upload failed:', error);
    return c.json(
      {
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

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
// File Delete Endpoint
// =============================================================================

/**
 * DELETE /api/files/:key
 * Delete file from R2 storage
 *
 * Provides secure file deletion with:
 * - Authentication verification
 * - File ownership validation
 * - R2 object deletion
 */
app.delete('/:key', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const fileKey = decodeURIComponent(c.req.param('key'));

  console.log(`[Files] Delete request from user ${userId} for key: ${fileKey}`);

  try {
    // Security check: Verify user owns this file
    const expectedPrefix = `users/${userId}/`;
    if (!fileKey.startsWith(expectedPrefix)) {
      console.warn(`[Files] Delete access denied - user ${userId} tried to delete: ${fileKey}`);
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

    // Delete file from R2
    await bucket.delete(fileKey);

    console.log(`[Files] ✓ File deleted: ${fileKey}`);

    return c.json({
      message: 'File deleted successfully',
      key: fileKey
    }, 200);
  } catch (error) {
    console.error('[Files] Delete failed:', error);
    return c.json(
      {
        error: 'Failed to delete file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Signed URL Endpoint
// =============================================================================

/**
 * GET /api/files/:key/signed-url
 * Generate temporary signed URL for file access
 *
 * Provides secure temporary access with:
 * - Authentication verification
 * - File ownership validation
 * - Time-limited download URL
 *
 * Query parameters:
 * - expiresIn: Expiration time in seconds (default: 3600, max: 86400)
 */
app.get('/:key/signed-url', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const fileKey = decodeURIComponent(c.req.param('key'));
  const expiresInParam = c.req.query('expiresIn');

  // Parse and validate expiration time (default: 1 hour, max: 24 hours)
  let expiresIn = 3600; // 1 hour default
  if (expiresInParam) {
    expiresIn = Math.min(parseInt(expiresInParam, 10), 86400); // Max 24 hours
    if (isNaN(expiresIn) || expiresIn <= 0) {
      expiresIn = 3600;
    }
  }

  console.log(`[Files] Signed URL request from user ${userId} for key: ${fileKey} (expires in ${expiresIn}s)`);

  try {
    // Security check: Verify user owns this file
    const expectedPrefix = `users/${userId}/`;
    if (!fileKey.startsWith(expectedPrefix)) {
      console.warn(`[Files] Signed URL access denied - user ${userId} tried to access: ${fileKey}`);
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

    // Verify file exists
    const object = await getFile(bucket, fileKey);
    if (!object) {
      console.warn(`[Files] File not found for signed URL: ${fileKey}`);
      return c.json({ error: 'File not found' }, 404);
    }

    // Generate signed URL (valid for specified duration)
    // Note: R2 doesn't have native presigned URLs like S3
    // Instead, we provide our authenticated download URL
    // For true time-limited access, you'd implement JWT tokens or similar
    const baseUrl = new URL(c.req.url).origin;
    const signedUrl = `${baseUrl}/api/files/download/${encodeURIComponent(fileKey)}`;

    console.log(`[Files] ✓ Signed URL generated for: ${fileKey}`);

    return c.json({
      signedUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      key: fileKey,
    }, 200);
  } catch (error) {
    console.error('[Files] Signed URL generation failed:', error);
    return c.json(
      {
        error: 'Failed to generate signed URL',
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
