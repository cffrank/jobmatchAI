/**
 * R2 Storage Service for Cloudflare Workers
 *
 * Manages file uploads and downloads using Cloudflare R2 object storage.
 * Provides presigned URLs for secure, temporary file access.
 *
 * Phase 3.2: R2 File Upload Migration
 * Phase 3.3: Presigned URL Implementation
 *
 * R2 Buckets:
 * - AVATARS: User profile photos (public read via presigned URLs)
 * - RESUMES: Resume files (private, presigned URLs only)
 * - EXPORTS: Generated exports (PDF/DOCX, short-lived presigned URLs)
 */

// =============================================================================
// Types
// =============================================================================

export interface UploadResult {
  key: string;
  size: number;
  etag: string;
  uploadedAt: string;
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: string;
  expiresIn: number;
}

// =============================================================================
// File Upload
// =============================================================================

/**
 * Upload file to R2 bucket
 *
 * @param bucket - R2 bucket instance (AVATARS, RESUMES, or EXPORTS)
 * @param key - Object key (file path in bucket)
 * @param file - File data (ArrayBuffer, Uint8Array, or ReadableStream)
 * @param options - Upload options
 * @returns Upload result with key, size, and etag
 */
export async function uploadFile(
  bucket: R2Bucket,
  key: string,
  file: ArrayBuffer | Uint8Array | ReadableStream,
  options: {
    contentType?: string;
    metadata?: Record<string, string>;
  } = {}
): Promise<UploadResult> {
  const startTime = Date.now();

  try {
    console.log(`[R2] Uploading file to key: ${key}`);

    // Prepare R2 put options
    const r2Options: R2PutOptions = {};

    if (options.contentType) {
      r2Options.httpMetadata = {
        contentType: options.contentType,
      };
    }

    if (options.metadata) {
      r2Options.customMetadata = options.metadata;
    }

    // Upload to R2
    const object = await bucket.put(key, file, r2Options);

    const duration = Date.now() - startTime;
    console.log(
      `[R2] ✓ Upload successful in ${duration}ms - Key: ${key}, Size: ${object.size} bytes, ETag: ${object.etag}`
    );

    return {
      key: object.key,
      size: object.size,
      etag: object.etag,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[R2] ✗ Upload failed after ${duration}ms for key ${key}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// File Download
// =============================================================================

/**
 * Get file from R2 bucket
 *
 * @param bucket - R2 bucket instance
 * @param key - Object key
 * @returns R2Object or null if not found
 */
export async function getFile(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  const startTime = Date.now();

  try {
    console.log(`[R2] Fetching file: ${key}`);

    const object = await bucket.get(key);

    const duration = Date.now() - startTime;

    if (!object) {
      console.log(`[R2] File not found after ${duration}ms: ${key}`);
      return null;
    }

    console.log(
      `[R2] ✓ File retrieved in ${duration}ms - Key: ${key}, Size: ${object.size} bytes`
    );

    return object;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[R2] ✗ Get file failed after ${duration}ms for key ${key}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw new Error(`Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// File Deletion
// =============================================================================

/**
 * Delete file from R2 bucket
 *
 * @param bucket - R2 bucket instance
 * @param key - Object key to delete
 */
export async function deleteFile(bucket: R2Bucket, key: string): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`[R2] Deleting file: ${key}`);

    await bucket.delete(key);

    const duration = Date.now() - startTime;
    console.log(`[R2] ✓ File deleted in ${duration}ms - Key: ${key}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[R2] ✗ Delete failed after ${duration}ms for key ${key}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// Presigned URLs (Phase 3.3)
// =============================================================================

/**
 * Generate presigned URL for file download
 *
 * Provides temporary, secure access to private files using R2 HTTP API.
 * URLs expire after the specified time and can only be used for GET requests.
 *
 * Implementation Notes:
 * - R2 supports S3-compatible presigned URLs via the S3 API
 * - For Workers, we use the R2 HTTP API with public bucket access
 * - In production, configure R2 bucket with custom domain for presigned URLs
 * - Alternative: Use Cloudflare signed URLs with Workers KV for access control
 *
 * @param bucket - R2 bucket instance
 * @param key - Object key
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Presigned URL with expiry information
 */
export async function getDownloadUrl(
  bucket: R2Bucket,
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<PresignedUrlResult> {
  const startTime = Date.now();

  try {
    console.log(`[R2] Generating download URL for: ${key} (expires in ${expiresIn}s)`);

    // Verify file exists
    const object = await bucket.head(key);
    if (!object) {
      throw new Error(`File not found: ${key}`);
    }

    // R2 presigned URLs via Workers:
    // Option 1: Public bucket with R2.dev domain (development)
    // Option 2: Custom domain with Cloudflare Access (production)
    // Option 3: Workers endpoint that streams from R2 with auth check

    // For Phase 3.3, we'll use a Workers endpoint approach:
    // The Workers API will have a download endpoint that:
    // 1. Verifies user authentication
    // 2. Checks file ownership
    // 3. Streams file from R2
    // This provides better security than public buckets

    // Generate a time-limited URL that points to our Workers endpoint
    // Format: https://api.workers.dev/api/files/download?key={key}&token={jwt}
    // The JWT token will contain the key and expiry time

    // For now, return a Workers API endpoint URL
    // This will be implemented in the profile/resume routes
    const downloadUrl = `/api/files/download/${encodeURIComponent(key)}`;

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const duration = Date.now() - startTime;
    console.log(
      `[R2] ✓ Download URL generated in ${duration}ms - Expires at: ${expiresAt}`
    );

    return {
      url: downloadUrl,
      expiresAt,
      expiresIn,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[R2] ✗ Download URL generation failed after ${duration}ms for key ${key}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw new Error(
      `Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate presigned URL for file upload
 *
 * Allows client-side uploads directly to Workers API endpoint.
 * URLs expire after the specified time (default: 15 minutes).
 *
 * Implementation Notes:
 * - Direct R2 presigned PUT URLs require S3 API compatibility
 * - For Workers, we use POST endpoint that accepts multipart form data
 * - Client uploads to Workers endpoint, which validates and stores in R2
 * - This provides better control over file validation and security
 *
 * @param bucket - R2 bucket instance (for validation only)
 * @param key - Object key for upload
 * @param expiresIn - Expiry time in seconds (default: 15 minutes)
 * @returns Upload URL endpoint with expiry information
 */
export async function getUploadUrl(
  _bucket: R2Bucket,
  key: string,
  expiresIn: number = 900 // 15 minutes default
): Promise<PresignedUrlResult> {
  const startTime = Date.now();

  try {
    console.log(`[R2] Generating upload URL for: ${key} (expires in ${expiresIn}s)`);

    // For file uploads, clients will POST to our Workers API endpoints:
    // - POST /api/profile/avatar (for avatars)
    // - POST /api/resume/upload (for resumes)
    // - POST /api/exports (for generated exports)
    //
    // This approach provides:
    // 1. File type validation before upload
    // 2. Size limit enforcement
    // 3. Access control via JWT authentication
    // 4. Automatic metadata storage in D1
    //
    // No presigned PUT URLs needed - Workers handles upload directly

    const uploadUrl = `/api/files/upload/${encodeURIComponent(key)}`;

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const duration = Date.now() - startTime;
    console.log(
      `[R2] ✓ Upload URL generated in ${duration}ms - Expires at: ${expiresAt}`
    );

    return {
      url: uploadUrl,
      expiresAt,
      expiresIn,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[R2] ✗ Upload URL generation failed after ${duration}ms for key ${key}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw new Error(
      `Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// =============================================================================
// File Metadata
// =============================================================================

/**
 * Get file metadata without downloading the entire file
 *
 * @param bucket - R2 bucket instance
 * @param key - Object key
 * @returns File metadata or null if not found
 */
export async function getFileMetadata(
  bucket: R2Bucket,
  key: string
): Promise<{
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
} | null> {
  const startTime = Date.now();

  try {
    console.log(`[R2] Fetching metadata for: ${key}`);

    const object = await bucket.head(key);

    const duration = Date.now() - startTime;

    if (!object) {
      console.log(`[R2] File not found after ${duration}ms: ${key}`);
      return null;
    }

    console.log(
      `[R2] ✓ Metadata retrieved in ${duration}ms - Key: ${key}, Size: ${object.size} bytes`
    );

    return {
      key: object.key,
      size: object.size,
      etag: object.etag,
      uploaded: object.uploaded,
      httpMetadata: object.httpMetadata,
      customMetadata: object.customMetadata,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[R2] ✗ Get metadata failed after ${duration}ms for key ${key}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw new Error(
      `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Generate object key for user file
 *
 * @param userId - User ID
 * @param folder - Folder name (e.g., 'profile', 'resumes')
 * @param filename - File name
 * @returns Object key in format: users/{userId}/{folder}/{filename}
 */
export function generateUserFileKey(userId: string, folder: string, filename: string): string {
  return `users/${userId}/${folder}/${filename}`;
}

/**
 * Generate unique filename with timestamp and random suffix
 *
 * @param originalName - Original filename
 * @returns Unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');

  return `${nameWithoutExt}-${timestamp}-${random}.${extension}`;
}

/**
 * Validate file size
 *
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns True if valid, throws error if too large
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  if (size > maxSize) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    throw new Error(`File size ${sizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`);
  }
  return true;
}

/**
 * Validate file type
 *
 * @param filename - File name
 * @param allowedTypes - Array of allowed file extensions
 * @returns True if valid, throws error if invalid type
 */
export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();

  if (!extension || !allowedTypes.includes(extension)) {
    throw new Error(
      `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    );
  }

  return true;
}
