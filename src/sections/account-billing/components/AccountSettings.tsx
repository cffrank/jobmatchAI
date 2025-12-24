import { User, Shield, Bell, Lock, Mail, Camera, Smartphone, Monitor, MapPin, AlertTriangle, Download, Trash2, LogOut, Linkedin, Chrome } from 'lucide-react'
import { useState } from 'react'
import type {
  AccountSettingsProps,
  SecuritySettingsProps,
  NotificationSettingsProps,
  PrivacySettingsProps,
  UserProfile,
  SecuritySettings,
  NotificationPreferences,
  PrivacySettings
} from '../types'

interface CombinedSettingsProps {
  profile: UserProfile
  security: SecuritySettings
  notifications: NotificationPreferences
  privacy: PrivacySettings
  onUpdateProfile?: (updates: Partial<UserProfile>) => void
  onChangePassword?: (currentPassword: string, newPassword: string) => void
  onUploadPhoto?: (file: File) => void
  photoUploading?: boolean
  photoError?: Error | null
  onResendVerification?: () => void
  onEnable2FA?: () => void
  onDisable2FA?: () => void
  onGenerateBackupCodes?: () => void
  onRevokeSession?: (sessionId: string) => void
  onUpdateNotifications?: (updates: Partial<NotificationPreferences>) => void
  onUpdatePrivacy?: (updates: Partial<PrivacySettings>) => void
  onDisconnectAccount?: (accountId: string) => void
  onExportData?: () => void
  onDeleteAccount?: () => void
}

export function AccountSettings({
  profile,
  security,
  notifications,
  privacy,
  onUpdateProfile,
  onChangePassword: _onChangePassword,
  onUploadPhoto,
  photoUploading,
  photoError,
  onResendVerification,
  onEnable2FA,
  onDisable2FA,
  onGenerateBackupCodes,
  onRevokeSession,
  onUpdateNotifications,
  onUpdatePrivacy,
  onDisconnectAccount,
  onExportData,
  onDeleteAccount
}: CombinedSettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'privacy'>('profile')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
            Account Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Manage your profile, security, and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex overflow-x-auto">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'privacy', label: 'Privacy', icon: Lock }
              ].map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
              <ProfileSettings
                profile={profile}
                onUpdateProfile={onUpdateProfile}
                onUploadPhoto={onUploadPhoto}
                photoUploading={photoUploading}
                photoError={photoError}
                onResendVerification={onResendVerification}
              />
            )}
            {activeTab === 'security' && (
              <SecurityTab
                security={security}
                onEnable2FA={onEnable2FA}
                onDisable2FA={onDisable2FA}
                onGenerateBackupCodes={onGenerateBackupCodes}
                onRevokeSession={onRevokeSession}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab
                preferences={notifications}
                onUpdatePreferences={onUpdateNotifications}
              />
            )}
            {activeTab === 'privacy' && (
              <PrivacyTab
                privacy={privacy}
                onUpdateSettings={onUpdatePrivacy}
                onDisconnectAccount={onDisconnectAccount}
                onExportData={onExportData}
                onDeleteAccount={onDeleteAccount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileSettings({ profile, onUpdateProfile, onUploadPhoto, photoUploading, photoError, onResendVerification }: AccountSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState(profile)

  const handleSave = () => {
    onUpdateProfile?.(editedProfile)
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Profile Photo */}
      <div className="flex items-center gap-6">
        <div className="relative">
          {profile.profilePhotoUrl ? (
            <img
              src={profile.profilePhotoUrl}
              alt={profile.fullName}
              className="w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700">
              <span className="text-3xl font-bold text-white">
                {profile.fullName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
          )}

          {/* Upload Progress Overlay */}
          {photoUploading && (
            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-white font-medium">Uploading...</span>
              </div>
            </div>
          )}

          <button
            onClick={() => document.getElementById('photo-upload')?.click()}
            disabled={photoUploading}
            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            disabled={photoUploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUploadPhoto?.(file)
            }}
          />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-1">{profile.fullName}</h3>
          <p className="text-slate-600 dark:text-slate-400">{profile.email}</p>

          {/* Upload Error */}
          {photoError && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Upload failed: {photoError.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={isEditing ? editedProfile.fullName : profile.fullName}
            onChange={(e) => setEditedProfile({ ...editedProfile, fullName: e.target.value })}
            disabled={!isEditing}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Email Address
          </label>
          <div className="flex gap-3">
            <input
              type="email"
              value={isEditing ? editedProfile.email : profile.email}
              onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
              disabled={!isEditing}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {profile.emailVerified ? (
              <div className="px-4 py-2.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Verified
              </div>
            ) : (
              <button
                onClick={onResendVerification}
                className="px-4 py-2.5 bg-orange-100 dark:bg-orange-950/30 hover:bg-orange-200 dark:hover:bg-orange-950/50 text-orange-700 dark:text-orange-400 rounded-lg font-medium transition-colors"
              >
                Verify Email
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            value={isEditing ? editedProfile.phone || '' : profile.phone || ''}
            onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
            disabled={!isEditing}
            placeholder="+1 (555) 123-4567"
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditedProfile(profile)
                  setIsEditing(false)
                }}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SecurityTab({ security, onEnable2FA, onDisable2FA, onGenerateBackupCodes: _onGenerateBackupCodes, onRevokeSession }: SecuritySettingsProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-8">
      {/* Two-Factor Authentication */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Two-Factor Authentication</h3>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-slate-50 mb-1">
                {security.twoFactorEnabled ? 'Enabled' : 'Not Enabled'}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {security.twoFactorEnabled
                  ? 'Your account is protected with 2FA'
                  : 'Add an extra layer of security to your account'
                }
              </p>
            </div>
            {security.twoFactorEnabled ? (
              <button
                onClick={onDisable2FA}
                className="px-4 py-2 bg-red-100 dark:bg-red-950/30 hover:bg-red-200 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 rounded-lg font-medium transition-colors text-sm"
              >
                Disable 2FA
              </button>
            ) : (
              <button
                onClick={onEnable2FA}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Enable 2FA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Active Sessions</h3>
        <div className="space-y-3">
          {security.activeSessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    {session.device.includes('Mac') || session.device.includes('Windows') ? (
                      <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">{session.device}</p>
                      {session.current && (
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded text-xs font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{session.browser}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {session.location}
                      </span>
                      <span>Last active {formatDate(session.lastActive)}</span>
                    </div>
                  </div>
                </div>
                {!session.current && (
                  <button
                    onClick={() => onRevokeSession?.(session.id)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {security.recentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-50 text-sm">{activity.action}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activity.device} • {activity.location} • {formatDate(activity.date)}
                </p>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                activity.status === 'success'
                  ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
              }`}>
                {activity.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotificationsTab({ preferences, onUpdatePreferences }: NotificationSettingsProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences)

  const handleToggle = (category: 'email' | 'inApp', key: string, value: boolean) => {
    const updated = {
      ...localPrefs,
      [category]: {
        ...localPrefs[category],
        [key]: value
      }
    }
    setLocalPrefs(updated)
    onUpdatePreferences?.(updated)
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Email Notifications</h3>
        <div className="space-y-3">
          {[
            { key: 'applicationUpdates', label: 'Application Status Updates', description: 'Get notified when application status changes' },
            { key: 'interviewReminders', label: 'Interview Reminders', description: 'Reminders for upcoming interviews' },
            { key: 'followUpReminders', label: 'Follow-up Action Reminders', description: 'Reminders for pending follow-up actions' },
            { key: 'weeklyJobDigest', label: 'Weekly Job Match Digest', description: 'Weekly summary of new job matches' },
            { key: 'productUpdates', label: 'Product Updates & Tips', description: 'News about new features and tips' }
          ].map((item) => (
            <div key={item.key} className="flex items-start justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-slate-50 text-sm mb-1">{item.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
              <button
                onClick={() => handleToggle('email', item.key, !localPrefs.email[item.key as keyof typeof localPrefs.email])}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  localPrefs.email[item.key as keyof typeof localPrefs.email]
                    ? 'bg-blue-600'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localPrefs.email[item.key as keyof typeof localPrefs.email] ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* In-App Notifications */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">In-App Notifications</h3>
        <div className="space-y-3">
          {[
            { key: 'enabled', label: 'Desktop Notifications', description: 'Show desktop notifications' },
            { key: 'soundEnabled', label: 'Notification Sounds', description: 'Play sound for notifications' }
          ].map((item) => (
            <div key={item.key} className="flex items-start justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-slate-50 text-sm mb-1">{item.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
              <button
                onClick={() => handleToggle('inApp', item.key, !localPrefs.inApp[item.key as keyof typeof localPrefs.inApp])}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  localPrefs.inApp[item.key as keyof typeof localPrefs.inApp]
                    ? 'bg-blue-600'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localPrefs.inApp[item.key as keyof typeof localPrefs.inApp] ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PrivacyTab({ privacy, onUpdateSettings: _onUpdateSettings, onDisconnectAccount, onExportData, onDeleteAccount }: PrivacySettingsProps) {
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'linkedin': return Linkedin
      case 'google': return Chrome
      default: return Mail
    }
  }

  return (
    <div className="space-y-8">
      {/* Connected Accounts */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Connected Accounts</h3>
        <div className="space-y-3">
          {privacy.connectedAccounts.map((account) => {
            const Icon = getProviderIcon(account.provider)
            return (
              <div
                key={account.id}
                className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50 text-sm capitalize">{account.provider}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{account.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => onDisconnectAccount?.(account.id)}
                  className="px-3 py-1.5 bg-red-100 dark:bg-red-950/30 hover:bg-red-200 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 rounded-lg font-medium transition-colors text-sm"
                >
                  Disconnect
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Data Management */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Data Management</h3>
        <div className="space-y-3">
          <button
            onClick={onExportData}
            className="w-full flex items-center justify-between py-3 px-4 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/30 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900 dark:text-slate-50 text-sm">Export Your Data</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Download all your data in JSON format</p>
              </div>
            </div>
          </button>

          <button
            onClick={onDeleteAccount}
            className="w-full flex items-center justify-between py-3 px-4 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-950/30 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-red-900 dark:text-red-300 text-sm">Delete Account</p>
                <p className="text-xs text-red-700 dark:text-red-400">Permanently delete your account and all data</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Privacy Warning */}
      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-900 dark:text-orange-300 text-sm mb-1">Account Deletion is Permanent</p>
            <p className="text-xs text-orange-800 dark:text-orange-400">
              Once you delete your account, all your data will be permanently removed and cannot be recovered.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
