import { useState, useEffect, useMemo } from 'react'
import { User, Shield, Lock, CreditCard } from 'lucide-react'
import { ProfileSettings } from './components/ProfileSettings'
import { SecurityTab } from './components/SecurityTab'
import { PrivacyTab } from './components/PrivacyTab'
import { SubscriptionOverview } from './components/SubscriptionOverview'
import { useProfile } from '@/hooks/useProfile'
import { useProfilePhoto } from '@/hooks/useProfilePhoto'
import { useSecuritySettings } from '@/hooks/useSecuritySettings'
import { useSubscription, useUsageLimits } from '@/hooks/useSubscription'
import { useUsageMetrics } from '@/hooks/useUsageMetrics'
import { useAuth } from '@/contexts/AuthContext'
import data from './data.json'
import type {
  UserProfile,
  PrivacySettings,
  Subscription,
  SubscriptionPlan,
  UsageLimits,
  BillingCycle,
  PlanTier
} from './types'

export default function SettingsPage() {
  const [activeView, setActiveView] = useState<'profile' | 'security' | 'privacy' | 'subscription'>('profile')
  const { user } = useAuth()
  const { profile: userProfile, loading: profileLoading, updateProfile } = useProfile()
  const { uploadProfilePhoto, uploading: photoUploading, error: photoError } = useProfilePhoto()
  const { security, loading: securityLoading, revokeSession, enable2FA, disable2FA, generateBackupCodes } = useSecuritySettings()
  const { subscription: dbSubscription, loading: subscriptionLoading, updateSubscription } = useSubscription()
  const { loading: usageLimitsLoading } = useUsageLimits()
  const { metrics: usageMetrics, loading: metricsLoading } = useUsageMetrics()
  const [profileInitialized, setProfileInitialized] = useState(false)

  // Debug logging
  console.log('SettingsPage - User profile:', userProfile)
  console.log('SettingsPage - Loading:', profileLoading)

  // Create a default profile if user doesn't have one
  useEffect(() => {
    async function initializeProfile() {
      if (!profileLoading && !userProfile && user && !profileInitialized) {
        console.log('Creating default profile for new user:', user.email)
        try {
          // Get name from user_metadata or email
          const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'User'
          const lastName = user.user_metadata?.last_name || ''

          await updateProfile({
            firstName,
            lastName,
            email: user.email || '',
            phone: '',
            location: '',
            linkedInUrl: '',
            profileImageUrl: user.user_metadata?.avatar_url || null,
            headline: '',
            summary: '',
          })
          setProfileInitialized(true)
          console.log('Default profile created successfully')
        } catch (error) {
          console.error('Failed to create default profile:', error)
        }
      }
    }
    initializeProfile()
  }, [profileLoading, userProfile, user, updateProfile, profileInitialized])

  // Account state - use Supabase profile or fallback to mock data
  const profile: UserProfile = userProfile ? {
    id: userProfile.id,
    fullName: `${userProfile.firstName} ${userProfile.lastName}`,
    email: userProfile.email || '',
    phone: userProfile.phone || '',
    profilePhotoUrl: userProfile.profileImageUrl || '',
    emailVerified: true, // Assume verified for now
    createdAt: new Date().toISOString(),
  } : data.userProfile

  console.log('SettingsPage - Using profile:', profile)
  console.log('SettingsPage - Security data:', security)

  // Notification preferences are not currently used in the UI
  // const [notifications, setNotifications] = useState<NotificationPreferences>({
  //   ...data.notificationPreferences,
  //   frequency: data.notificationPreferences.frequency as 'immediate' | 'daily' | 'weekly'
  // })

  // Build connected accounts from user data directly (no useEffect needed)
  const connectedAccounts = useMemo(() => {
    if (!user) {
      return data.privacySettings.connectedAccounts.map(acc => ({
        ...acc,
        provider: acc.provider as 'linkedin' | 'google' | 'github'
      }))
    }

    const provider = user.app_metadata?.provider
    let accountProvider: 'linkedin' | 'google' | 'github' = 'google'

    if (provider === 'linkedin_oidc' || provider === 'linkedin') {
      accountProvider = 'linkedin'
    } else if (provider === 'google') {
      accountProvider = 'google'
    } else if (provider === 'github') {
      accountProvider = 'github'
    }

    return [{
      id: user.id,
      provider: accountProvider,
      email: user.email || '',
      connectedAt: user.created_at || new Date().toISOString()
    }]
  }, [user])

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    ...data.privacySettings,
    connectedAccounts: connectedAccounts
  })

  // Build real subscription data - memoize to avoid Date.now() in render
  // Default subscription for users without active subscriptions
  const defaultSubscription: Subscription = useMemo(() => {
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    return {
      id: '',
      userId: user?.id || '',
      plan: 'basic',
      billingCycle: 'monthly',
      status: 'active',
      currentPeriodStart: today.toISOString().split('T')[0],
      currentPeriodEnd: thirtyDaysFromNow.toISOString().split('T')[0],
      cancelAtPeriodEnd: false,
    }
  }, [user?.id])

  const subscription: Subscription = dbSubscription || defaultSubscription

  // Build real usage data
  const usage: UsageLimits = {
    userId: user?.id || '',
    period: new Date().toISOString().slice(0, 7), // YYYY-MM format
    applicationsTracked: usageMetrics.applicationsTracked,
    resumeVariantsCreated: usageMetrics.resumeVariantsCreated,
    jobSearchesPerformed: usageMetrics.jobSearchesPerformed,
    limits: {
      maxApplications: subscription.plan === 'premium' ? 'unlimited' : 10,
      maxResumeVariants: subscription.plan === 'premium' ? 'unlimited' : 3,
      maxJobSearches: subscription.plan === 'premium' ? 'unlimited' : 50,
    },
  }

  // Account handlers
  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    console.log('handleUpdateProfile called with:', updates)
    try {
      // Map UserProfile fields to database User fields
      const mappedUpdates: Record<string, unknown> = {}

      if (updates.fullName) {
        const [firstName, ...lastNameParts] = updates.fullName.split(' ')
        mappedUpdates.firstName = firstName
        mappedUpdates.lastName = lastNameParts.join(' ')
      }

      if (updates.email) mappedUpdates.email = updates.email
      if (updates.phone !== undefined) mappedUpdates.phone = updates.phone
      if (updates.profilePhotoUrl !== undefined) mappedUpdates.profileImageUrl = updates.profilePhotoUrl

      console.log('Mapped updates for database:', mappedUpdates)
      await updateProfile(mappedUpdates)
      console.log('Profile updated successfully')
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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

  const handleEnable2FA = async () => {
    try {
      await enable2FA()
      alert('2FA enabled successfully!')
    } catch (error) {
      console.error('Failed to enable 2FA:', error)
      alert(`Failed to enable 2FA: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDisable2FA = async () => {
    try {
      await disable2FA()
      alert('2FA disabled successfully!')
    } catch (error) {
      console.error('Failed to disable 2FA:', error)
      alert(`Failed to disable 2FA: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleGenerateBackupCodes = async () => {
    try {
      await generateBackupCodes()
      alert('Backup codes generated successfully!')
    } catch (error) {
      console.error('Failed to generate backup codes:', error)
      alert(`Failed to generate backup codes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId)
      alert('Session revoked successfully!')
    } catch (error) {
      console.error('Failed to revoke session:', error)
      alert(`Failed to revoke session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
  const handleUpgrade = async (tier: PlanTier, billingCycle: BillingCycle) => {
    try {
      await updateSubscription({
        plan: tier,
        billingCycle: billingCycle,
        status: 'active',
      })
      alert(`Upgraded to ${tier} plan!`)
      console.log('Upgrade to:', tier, billingCycle)
    } catch (error) {
      console.error('Failed to upgrade:', error)
      alert(`Failed to upgrade: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDowngrade = async (tier: PlanTier) => {
    try {
      await updateSubscription({
        plan: tier,
        cancelAtPeriodEnd: false,
      })
      alert(`Downgraded to ${tier} plan!`)
      console.log('Downgrade to:', tier)
    } catch (error) {
      console.error('Failed to downgrade:', error)
      alert(`Failed to downgrade: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleChangeBillingCycle = async (billingCycle: BillingCycle) => {
    try {
      await updateSubscription({
        billingCycle: billingCycle,
      })
      alert(`Billing cycle changed to ${billingCycle}!`)
      console.log('Change billing cycle to:', billingCycle)
    } catch (error) {
      console.error('Failed to change billing cycle:', error)
      alert(`Failed to change billing cycle: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCancelSubscription = async () => {
    try {
      await updateSubscription({
        cancelAtPeriodEnd: true,
      })
      alert('Subscription will be canceled at the end of the current period.')
      console.log('Cancel subscription at period end')
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
      alert(`Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleReactivateSubscription = async () => {
    try {
      await updateSubscription({
        cancelAtPeriodEnd: false,
      })
      alert('Subscription reactivated!')
      console.log('Reactivate subscription')
    } catch (error) {
      console.error('Failed to reactivate subscription:', error)
      alert(`Failed to reactivate: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const availablePlans = data.availablePlans as unknown as SubscriptionPlan[]
  const currentPlan = availablePlans.find(p => p.tier === subscription.plan)!

  // Show loading state while data is being fetched
  if (profileLoading || securityLoading || subscriptionLoading || usageLimitsLoading || metricsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">
            Loading settings...
          </p>
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
          availablePlans={availablePlans}
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
