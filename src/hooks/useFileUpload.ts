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
 * Generic file upload hook for Supabase Storage
 * Handles file validation, upload progress, and error handling
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
   * Upload file to Supabase Storage
   * @param file - File to upload
   * @param storagePath - Path in storage bucket (e.g., 'users/123/profile/avatar.jpg')
   * @param bucket - Storage bucket name (default: 'files')
   * @returns Promise with download URL and storage path
   */
  const uploadFile = async (
    file: File,
    storagePath: string,
    bucket: string = 'files'
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
      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite if exists
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath)

      const result: UploadResult = {
        downloadURL: urlData.publicUrl,
        fullPath: data.path,
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
