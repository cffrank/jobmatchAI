import { User, Mail, Phone, Camera, MapPin } from 'lucide-react'
import { useState } from 'react'
import type { UserProfile } from '../types'

interface ProfileSettingsProps {
  profile: UserProfile
  onUpdateProfile?: (updates: Partial<UserProfile>) => void
  onUploadPhoto?: (file: File) => void
  photoUploading?: boolean
  photoError?: Error | null
  onResendVerification?: () => void
}

export function ProfileSettings({
  profile,
  onUpdateProfile,
  onUploadPhoto,
  photoUploading,
  photoError,
  onResendVerification
}: ProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdateProfile?.(formData)
    setIsEditing(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onUploadPhoto) {
      onUploadPhoto(file)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Profile Photo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Profile Photo
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile.profilePhotoUrl ? (
              <img
                src={profile.profilePhotoUrl}
                alt={profile.fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 dark:border-blue-900"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-blue-100 dark:border-blue-900">
                {profile.fullName.split(' ').map(n => n[0]).join('')}
              </div>
            )}
            <label
              htmlFor="photo-upload"
              className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full cursor-pointer transition-colors shadow-lg"
            >
              <Camera className="w-4 h-4" />
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
                disabled={photoUploading}
              />
            </label>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              {photoUploading ? 'Uploading...' : 'Upload a new profile photo'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              JPG, PNG or GIF. Max 2MB.
            </p>
            {photoError && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {photoError.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Basic Information
        </h2>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setFormData({
                    fullName: profile.fullName,
                    email: profile.email,
                    phone: profile.phone || ''
                  })
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <User className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Full Name</p>
                <p className="font-medium text-slate-900 dark:text-slate-50">{profile.fullName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Mail className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                <p className="font-medium text-slate-900 dark:text-slate-50">{profile.email}</p>
                {!profile.emailVerified && (
                  <button
                    onClick={onResendVerification}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
                  >
                    Verify email
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Phone className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">Phone</p>
                <p className="font-medium text-slate-900 dark:text-slate-50">
                  {profile.phone || 'Not set'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
