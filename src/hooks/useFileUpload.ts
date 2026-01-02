import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface UploadProgress {
  bytesTransferred: number
  totalBytes: number
  progress: number // 0-100
}

export interface UploadResult {
  downloadURL: string
  fullPath: string
}

export interface UseFileUploadOptions {
  maxSizeMB?: number
  allowedTypes?: string[] // e.g., ['image/jpeg', 'image/png', 'application/pdf']
  onProgress?: (progress: UploadProgress) => void
  onSuccess?: (result: UploadResult) => void
  onError?: (error: Error) => void
}

/**
 * Generic file upload hook for Cloudflare R2 Storage
 * Handles file validation, upload progress, and error handling
 * Uploads via Workers API to R2 buckets (avatars, resumes, exports)
 */
export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const {
    maxSizeMB = 5,
    allowedTypes = [],
    onProgress,
    onSuccess,
    onError,
  } = options

  /**
   * Validate file before upload
   */
  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      const allowedExtensions = allowedTypes.map(type => {
        const parts = type.split('/')
        return parts[parts.length - 1].toUpperCase()
      }).join(', ')
      return `File type must be one of: ${allowedExtensions}`
    }

    return null
  }

  /**
   * Upload file to Cloudflare R2 via Workers API
   * @param file - File to upload
   * @param storagePath - Path in storage bucket (e.g., 'resumes/123/resume.pdf')
   * @param bucketType - Bucket type: 'avatars', 'resumes', or 'exports' (maps to old 'files')
   * @returns Promise with download URL and storage path
   */
  const uploadFile = async (
    file: File,
    storagePath: string,
    bucketType: string = 'files'
  ): Promise<UploadResult> => {
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      const error = new Error(validationError)
      setError(error)
      onError?.(error)
      throw error
    }

    setUploading(true)
    setError(null)

    // Initial progress
    const initialProgress: UploadProgress = {
      bytesTransferred: 0,
      totalBytes: file.size,
      progress: 0,
    }
    setProgress(initialProgress)
    onProgress?.(initialProgress)

    try {
      // Map old bucket names to R2 bucket names
      // 'files' was generic Supabase bucket, now map to specific R2 buckets
      let bucket = bucketType
      if (bucketType === 'files') {
        // Determine bucket from path
        if (storagePath.includes('profile') || storagePath.includes('avatar')) {
          bucket = 'avatars'
        } else if (storagePath.includes('resume')) {
          bucket = 'resumes'
        } else if (storagePath.includes('export')) {
          bucket = 'exports'
        } else {
          bucket = 'resumes' // default to resumes
        }
      }

      // Get auth session for API call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Get backend URL
      const backendUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL
      if (!backendUrl) {
        throw new Error('Backend URL not configured')
      }

      // Create FormData for upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)
      // Extract filename from storagePath for backward compatibility
      const filename = storagePath.split('/').pop() || file.name
      formData.append('path', filename)

      // Upload to Cloudflare Workers API
      const response = await fetch(`${backendUrl}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as {
        key: string
        downloadURL: string
        fullPath: string
        size: number
      }

      const result: UploadResult = {
        downloadURL: backendUrl + data.downloadURL,
        fullPath: data.fullPath,
      }

      // Final progress
      const finalProgress: UploadProgress = {
        bytesTransferred: file.size,
        totalBytes: file.size,
        progress: 100,
      }
      setProgress(finalProgress)
      onProgress?.(finalProgress)

      setUploading(false)
      setProgress(null)
      onSuccess?.(result)
      return result
    } catch (err) {
      const error = err as Error
      setUploading(false)
      setError(error)
      onError?.(error)
      throw error
    }
  }

  /**
   * Delete file from Supabase Storage
   * @param storagePath - Path in storage bucket
   * @param bucket - Storage bucket name (default: 'files')
   */
  const deleteFile = async (storagePath: string, bucket: string = 'files'): Promise<void> => {
    try {
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([storagePath])

      if (deleteError) throw deleteError
    } catch (error) {
      const err = error as Error
      setError(err)
      throw err
    }
  }

  /**
   * Get signed URL for private file access
   * @param storagePath - Path in storage bucket
   * @param bucket - Storage bucket name (default: 'files')
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   */
  const getSignedUrl = async (
    storagePath: string,
    bucket: string = 'files',
    expiresIn: number = 3600
  ): Promise<string> => {
    try {
      const { data, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresIn)

      if (signError) throw signError
      if (!data?.signedUrl) throw new Error('Failed to generate signed URL')

      return data.signedUrl
    } catch (error) {
      const err = error as Error
      setError(err)
      throw err
    }
  }

  return {
    uploadFile,
    deleteFile,
    getSignedUrl,
    uploading,
    progress,
    error,
  }
}
