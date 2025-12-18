import { useState } from 'react'
import { Settings, CreditCard } from 'lucide-react'
import { AccountSettings } from './components/AccountSettings'
import { SubscriptionOverview } from './components/SubscriptionOverview'
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
  const [activeView, setActiveView] = useState<'account' | 'subscription'>('account')

  // Account state
  const [profile, setProfile] = useState<UserProfile>(data.userProfile)
  const [security, setSecurity] = useState<SecuritySettings>(data.securitySettings)
  const [notifications, setNotifications] = useState<NotificationPreferences>(data.notificationPreferences)
  const [privacy, setPrivacy] = useState<PrivacySettings>(data.privacySettings)

  // Subscription state
  const [subscription, setSubscription] = useState<Subscription>(data.subscription)
  const [usage, setUsage] = useState<Usage>(data.usage)

  // Account handlers
  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    setProfile({ ...profile, ...updates })
    console.log('Update profile:', updates)
  }

  const handleChangePassword = (currentPassword: string, newPassword: string) => {
    console.log('Change password:', { currentPassword, newPassword })
  }

  const handleUploadPhoto = (file: File) => {
    console.log('Upload photo:', file.name)
    // In a real app, this would upload to storage and update profilePhotoUrl
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* View Switcher */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('account')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                activeView === 'account'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              Account Settings
            </button>
            <button
              onClick={() => setActiveView('subscription')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold transition-colors border-b-2 ${
                activeView === 'subscription'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              Subscription & Billing
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeView === 'account' ? (
        <AccountSettings
          profile={profile}
          security={security}
          notifications={notifications}
          privacy={privacy}
          onUpdateProfile={handleUpdateProfile}
          onChangePassword={handleChangePassword}
          onUploadPhoto={handleUploadPhoto}
          onResendVerification={handleResendVerification}
          onEnable2FA={handleEnable2FA}
          onDisable2FA={handleDisable2FA}
          onGenerateBackupCodes={handleGenerateBackupCodes}
          onRevokeSession={handleRevokeSession}
          onUpdateNotifications={handleUpdateNotifications}
          onUpdatePrivacy={handleUpdatePrivacy}
          onDisconnectAccount={handleDisconnectAccount}
          onExportData={handleExportData}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : (
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
