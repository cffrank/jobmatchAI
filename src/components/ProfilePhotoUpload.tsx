import { useRef, useState } from 'react'
import { Camera, Check, AlertCircle, User } from 'lucide-react'
import { useProfilePhoto } from '@/hooks/useProfilePhoto'

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string
  onUploadComplete?: (downloadURL: string) => void
}

/**
 * Component for uploading profile photos to Firebase Storage
 * Shows a preview of the current photo and handles uploads
 */
export function ProfilePhotoUpload({ currentPhotoUrl, onUploadComplete }: ProfilePhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const { uploadProfilePhoto, uploading, progress, error } = useProfilePhoto()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      setUploadSuccess(false)
      const downloadURL = await uploadProfilePhoto(file)
      setUploadSuccess(true)
      onUploadComplete?.(downloadURL)

      // Reset success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err) {
      console.error('Upload failed:', err)
      setPreviewUrl(null)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const displayPhotoUrl = previewUrl || currentPhotoUrl

  return (
    <div className="space-y-4">
      {/* Photo Preview */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            {displayPhotoUrl ? (
              <img
                src={displayPhotoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-slate-400 dark:text-slate-500" />
            )}
          </div>

          {/* Upload Progress Overlay */}
          {uploading && progress && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <div className="text-white text-sm font-medium">
                {progress.progress}%
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1">
          <button
            onClick={handleButtonClick}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
          >
            <Camera className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            JPG, PNG, GIF up to 2MB
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Progress Bar */}
      {uploading && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Uploading photo...</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">
            Profile photo updated successfully!
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              Upload failed
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error.message}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
