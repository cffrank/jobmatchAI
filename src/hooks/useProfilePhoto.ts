import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from './useProfile'
import { useFileUpload } from './useFileUpload'

/**
 * Hook to manage user profile photo uploads to Firebase Storage
 * Automatically updates user profile in Firestore with new photo URL
 */
export function useProfilePhoto() {
  const { user } = useAuth()
  const { updateProfile } = useProfile()

  const {
    uploadFile,
    deleteFile,
    uploading,
    progress,
    error,
  } = useFileUpload({
    maxSizeMB: 2, // 2MB limit for profile photos
    allowedTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
  })

  /**
   * Upload profile photo and update user profile
   * @param file - Image file to upload
   * @returns Download URL of uploaded photo
   */
  const uploadProfilePhoto = async (file: File): Promise<string> => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    // Generate storage path
    const fileExtension = file.name.split('.').pop()
    const storagePath = `users/${user.uid}/profile/avatar.${fileExtension}`

    // Upload file
    const result = await uploadFile(file, storagePath)

    // Update user profile with new photo URL
    await updateProfile({
      profileImageUrl: result.downloadURL,
    })

    return result.downloadURL
  }

  /**
   * Delete profile photo and remove from user profile
   */
  const deleteProfilePhoto = async (): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    // Get current photo path from storage
    // Note: We assume the file extension is preserved in the filename
    const storagePath = `users/${user.uid}/profile/`

    try {
      // Delete all possible image extensions
      const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
      const deletePromises = extensions.map(ext =>
        deleteFile(`${storagePath}avatar.${ext}`).catch(() => {
          // Ignore errors if file doesn't exist
        })
      )

      await Promise.all(deletePromises)

      // Update user profile to remove photo URL
      await updateProfile({
        profileImageUrl: null,
      })
    } catch (error) {
      throw new Error('Failed to delete profile photo')
    }
  }

  return {
    uploadProfilePhoto,
    deleteProfilePhoto,
    uploading,
    progress,
    error,
  }
}
