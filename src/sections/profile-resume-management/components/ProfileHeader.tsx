import { Mail, Phone, MapPin, Linkedin, Edit2 } from 'lucide-react'
import type { User } from '../types'

interface ProfileHeaderProps {
  user?: User | null
  onEditProfile?: () => void
}

export function ProfileHeader({ user, onEditProfile }: ProfileHeaderProps) {
  // Handle new users with no profile yet
  if (!user) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 rounded-2xl p-8 border border-blue-100 dark:border-blue-900">
        <div className="text-center py-8">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center ring-4 ring-white dark:ring-slate-800 mx-auto mb-4">
            <span className="text-3xl font-bold text-white">?</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Welcome! Let's set up your profile
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Start by adding your professional information to unlock AI-powered job matching
          </p>
          {onEditProfile && (
            <button
              onClick={onEditProfile}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
              <Edit2 className="w-5 h-5" />
              <span>Create Profile</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 rounded-2xl p-8 border border-blue-100 dark:border-blue-900">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative flex flex-col md:flex-row gap-6 items-start">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={`${user.firstName} ${user.lastName}`}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-800"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center ring-4 ring-white dark:ring-slate-800">
              <span className="text-3xl font-bold text-white">{initials}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                {user.headline}
              </p>
            </div>

            {onEditProfile && (
              <button
                onClick={onEditProfile}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md"
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm font-medium">Edit Profile</span>
              </button>
            )}
          </div>

          <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
            {user.summary}
          </p>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <a
              href={`mailto:${user.email}`}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </a>
            <a
              href={`tel:${user.phone}`}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>{user.phone}</span>
            </a>
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <MapPin className="w-4 h-4" />
              <span>{user.location}</span>
            </span>
            {user.linkedInUrl && (
              <a
                href={user.linkedInUrl.startsWith('http') ? user.linkedInUrl : `https://${user.linkedInUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
              >
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn Profile</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
