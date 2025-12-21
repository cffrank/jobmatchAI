import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from './useProfile'
import { useFileUpload } from './useFileUpload'

/**
 * Hook to manage user profile photo uploads to Supabase Storage
 * Automatically updates user profile in Supabase with new photo URL
 *
 * Storage bucket: 'avatars' (or 'files' if avatars bucket doesn't exist)
 * Storage path: users/{userId}/profile/avatar.{ext}
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
   * @param bucket - Storage bucket (default: 'avatars')
   * @returns Download URL of uploaded photo
   */
  const uploadProfilePhoto = async (file: File, bucket: string = 'avatars'): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    // Generate storage path
    const fileExtension = file.name.split('.').pop()
    const storagePath = `users/${user.id}/profile/avatar.${fileExtension}`

    // Upload file to Supabase Storage
    const result = await uploadFile(file, storagePath, bucket)

    // Update user profile with new photo URL
    await updateProfile({
      profileImageUrl: result.downloadURL,
    })

    return result.downloadURL
  }

  /**
   * Delete profile photo and remove from user profile
   * @param bucket - Storage bucket (default: 'avatars')
   */
  const deleteProfilePhoto = async (bucket: string = 'avatars'): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    try {
      // Try to delete all possible image extensions
      const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
      const deletePromises = extensions.map(ext =>
        deleteFile(`users/${user.id}/profile/avatar.${ext}`, bucket).catch(() => {
          // Ignore errors if file doesn't exist
        })
      )

      await Promise.all(deletePromises)

      // Update user profile to remove photo URL
      await updateProfile({
        profileImageUrl: null,
      })
    } catch {
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
