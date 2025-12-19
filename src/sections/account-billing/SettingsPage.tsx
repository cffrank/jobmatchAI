import { useState, useEffect } from 'react'
import { User, Shield, Lock, CreditCard } from 'lucide-react'
import { ProfileSettings } from './components/ProfileSettings'
import { SecurityTab } from './components/SecurityTab'
import { PrivacyTab } from './components/PrivacyTab'
import { SubscriptionOverview } from './components/SubscriptionOverview'
import { useProfile } from '@/hooks/useProfile'
import { useProfilePhoto } from '@/hooks/useProfilePhoto'
import { useAuth } from '@/contexts/AuthContext'
import data from './data.json'
import type {
  UserProfile,
  SecuritySettings,
  NotificationPreferences,
  PrivacySettings,
  Subscription,
  Usage,
  BillingCycle,
  PlanTier
} from './types'

export default function SettingsPage() {
  const [activeView, setActiveView] = useState<'profile' | 'security' | 'privacy' | 'subscription'>('profile')
  const { user } = useAuth()
  const { profile: firestoreProfile, loading: profileLoading, updateProfile: updateFirestoreProfile } = useProfile()
  const { uploadProfilePhoto, uploading: photoUploading, error: photoError } = useProfilePhoto()
  const [profileInitialized, setProfileInitialized] = useState(false)

  // Debug logging
  console.log('SettingsPage - Firestore profile:', firestoreProfile)
  console.log('SettingsPage - Loading:', profileLoading)

  // Create a default profile if user doesn't have one
  useEffect(() => {
    async function initializeProfile() {
      if (!profileLoading && !firestoreProfile && user && !profileInitialized) {
        console.log('Creating default profile for new user:', user.email)
        try {
          await updateFirestoreProfile({
            firstName: user.displayName?.split(' ')[0] || 'User',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            email: user.email || '',
            phone: '',
            location: '',
            linkedInUrl: '',
            profileImageUrl: user.photoURL || null,
            headline: '',
            summary: '',
            createdAt: new Date().toISOString(),
          })
          setProfileInitialized(true)
          console.log('Default profile created successfully')
        } catch (error) {
          console.error('Failed to create default profile:', error)
        }
      }
    }
    initializeProfile()
  }, [profileLoading, firestoreProfile, user, updateFirestoreProfile, profileInitialized])

  // Account state - use Firestore profile or fallback to mock data
  const profile: UserProfile = firestoreProfile ? {
    id: firestoreProfile.id,
    fullName: `${firestoreProfile.firstName} ${firestoreProfile.lastName}`,
    email: firestoreProfile.email || '',
    phone: firestoreProfile.phone || '',
    profilePhotoUrl: firestoreProfile.profileImageUrl || '',
    emailVerified: true, // Assume verified for now
    createdAt: firestoreProfile.createdAt || new Date().toISOString(),
  } : data.userProfile

  console.log('SettingsPage - Using profile:', profile)

  const [security, setSecurity] = useState<SecuritySettings>(data.securitySettings)
  const [notifications, setNotifications] = useState<NotificationPreferences>(data.notificationPreferences)
  const [privacy, setPrivacy] = useState<PrivacySettings>(data.privacySettings)

  // Subscription state
  const [subscription, setSubscription] = useState<Subscription>(data.subscription)
  const [usage, setUsage] = useState<Usage>(data.usage)

  // Account handlers
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    console.log('handleUpdateProfile called with:', updates)
    try {
      // Map UserProfile fields to User fields for Firestore
      const mappedUpdates: any = {}

      if (updates.fullName) {
        const [firstName, ...lastNameParts] = updates.fullName.split(' ')
        mappedUpdates.firstName = firstName
        mappedUpdates.lastName = lastNameParts.join(' ')
      }

      if (updates.email) mappedUpdates.email = updates.email
      if (updates.phone !== undefined) mappedUpdates.phone = updates.phone
      if (updates.profilePhotoUrl !== undefined) mappedUpdates.profileImageUrl = updates.profilePhotoUrl

      console.log('Mapped updates for Firestore:', mappedUpdates)
      await updateFirestoreProfile(mappedUpdates)
      console.log('Profile updated in Firestore successfully')
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleChangePassword = (currentPassword: string, newPassword: string) => {
    console.log('Change password:', { currentPassword, newPassword })
  }

  const handleUploadPhoto = async (file: File) => {
    console.log('handleUploadPhoto called with file:', file.name, file.size, file.type)
    try {
      console.log('Starting upload...')
      const downloadURL = await uploadProfilePhoto(file)
      console.log('Profile photo uploaded successfully! Download URL:', downloadURL)
      alert(`Photo uploaded! URL: ${downloadURL}`)
    } catch (error) {
      console.error('Error uploading profile photo:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleResendVerification = () => {
    console.log('Resend verification email')
  }

  const handleEnable2FA = () => {
    setSecurity({ ...security, twoFactorEnabled: true, twoFactorSetupComplete: true })
    console.log('Enable 2FA')
  }

  const handleDisable2FA = () => {
    setSecurity({ ...security, twoFactorEnabled: false })
    console.log('Disable 2FA')
  }

  const handleGenerateBackupCodes = () => {
    setSecurity({ ...security, backupCodesGenerated: true })
    console.log('Generate backup codes')
  }

  const handleRevokeSession = (sessionId: string) => {
    setSecurity({
      ...security,
      activeSessions: security.activeSessions.filter(s => s.id !== sessionId)
    })
    console.log('Revoke session:', sessionId)
  }

  const handleUpdateNotifications = (updates: Partial<NotificationPreferences>) => {
    setNotifications({ ...notifications, ...updates })
    console.log('Update notifications:', updates)
  }

  const handleUpdatePrivacy = (updates: Partial<PrivacySettings>) => {
    setPrivacy({ ...privacy, ...updates })
    console.log('Update privacy:', updates)
  }

  const handleDisconnectAccount = (accountId: string) => {
    setPrivacy({
      ...privacy,
      connectedAccounts: privacy.connectedAccounts.filter(a => a.id !== accountId)
    })
    console.log('Disconnect account:', accountId)
  }

  const handleExportData = () => {
    console.log('Export data')
    // In a real app, this would generate and download a data export
  }

  const handleDeleteAccount = () => {
    console.log('Delete account')
    // In a real app, this would show confirmation and delete account
  }

  // Subscription handlers
  const handleUpgrade = (tier: PlanTier, billingCycle: BillingCycle) => {
    setSubscription({
      ...subscription,
      plan: tier,
      billingCycle,
      status: 'active'
    })
    console.log('Upgrade to:', tier, billingCycle)
  }

  const handleDowngrade = (tier: PlanTier) => {
    setSubscription({
      ...subscription,
      plan: tier,
      cancelAtPeriodEnd: false
    })
    console.log('Downgrade to:', tier)
  }

  const handleChangeBillingCycle = (billingCycle: BillingCycle) => {
    setSubscription({
      ...subscription,
      billingCycle
    })
    console.log('Change billing cycle to:', billingCycle)
  }

  const handleCancelSubscription = () => {
    setSubscription({
      ...subscription,
      cancelAtPeriodEnd: true
    })
    console.log('Cancel subscription at period end')
  }

  const handleReactivateSubscription = () => {
    setSubscription({
      ...subscription,
      cancelAtPeriodEnd: false
    })
    console.log('Reactivate subscription')
  }

  const currentPlan = data.availablePlans.find(p => p.tier === subscription.plan)!

  // Show loading state while profile is being fetched
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* View Switcher */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveView('profile')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeView === 'profile'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
              }`}
            >
              <User className="w-5 h-5" />
              Profile
            </button>
            <button
              onClick={() => setActiveView('security')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeView === 'security'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
              }`}
            >
              <Shield className="w-5 h-5" />
              Security
            </button>
            <button
              onClick={() => setActiveView('privacy')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeView === 'privacy'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
              }`}
            >
              <Lock className="w-5 h-5" />
              Privacy
            </button>
            <button
              onClick={() => setActiveView('subscription')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeView === 'subscription'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Subscription
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeView === 'profile' && (
        <ProfileSettings
          profile={profile}
          onUpdateProfile={handleUpdateProfile}
          onUploadPhoto={handleUploadPhoto}
          photoUploading={photoUploading}
          photoError={photoError}
          onResendVerification={handleResendVerification}
        />
      )}
      {activeView === 'security' && (
        <SecurityTab
          security={security}
          onEnable2FA={handleEnable2FA}
          onDisable2FA={handleDisable2FA}
          onGenerateBackupCodes={handleGenerateBackupCodes}
          onRevokeSession={handleRevokeSession}
        />
      )}
      {activeView === 'privacy' && (
        <PrivacyTab
          privacy={privacy}
          onUpdatePrivacy={handleUpdatePrivacy}
          onDisconnectAccount={handleDisconnectAccount}
          onExportData={handleExportData}
          onDeleteAccount={handleDeleteAccount}
        />
      )}
      {activeView === 'subscription' && (
        <SubscriptionOverview
          subscription={subscription}
          currentPlan={currentPlan}
          availablePlans={data.availablePlans}
          usage={subscription.plan === 'basic' ? usage : undefined}
          onUpgrade={handleUpgrade}
          onDowngrade={handleDowngrade}
          onChangeBillingCycle={handleChangeBillingCycle}
          onCancelSubscription={handleCancelSubscription}
          onReactivateSubscription={handleReactivateSubscription}
        />
      )}
    </div>
  )
}
