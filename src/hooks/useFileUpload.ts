import { useState } from 'react'
import { storage } from '@/lib/firebase'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'

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
 * Generic file upload hook for Firebase Storage
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
   * Upload file to Firebase Storage
   * @param file - File to upload
   * @param storagePath - Path in storage bucket (e.g., 'users/123/profile/avatar.jpg')
   * @returns Promise with download URL and storage path
   */
  const uploadFile = async (
    file: File,
    storagePath: string
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
    setProgress(null)

    const storageRef = ref(storage, storagePath)
    const uploadTask = uploadBytesResumable(storageRef, file)

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress monitoring
          const progressData: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          }
          setProgress(progressData)
          onProgress?.(progressData)
        },
        (error) => {
          // Error handling
          setUploading(false)
          setError(error)
          onError?.(error)
          reject(error)
        },
        async () => {
          // Upload complete
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            const result: UploadResult = {
              downloadURL,
              fullPath: uploadTask.snapshot.ref.fullPath,
            }
            setUploading(false)
            setProgress(null)
            onSuccess?.(result)
            resolve(result)
          } catch (error) {
            setUploading(false)
            const err = error as Error
            setError(err)
            onError?.(err)
            reject(err)
          }
        }
      )
    })
  }

  /**
   * Delete file from Firebase Storage
   * @param storagePath - Path in storage bucket
   */
  const deleteFile = async (storagePath: string): Promise<void> => {
    try {
      const storageRef = ref(storage, storagePath)
      await deleteObject(storageRef)
    } catch (error) {
      const err = error as Error
      setError(err)
      throw err
    }
  }

  return {
    uploadFile,
    deleteFile,
    uploading,
    progress,
    error,
  }
}
