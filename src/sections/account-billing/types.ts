export type PlanTier = 'basic' | 'premium'
export type BillingCycle = 'monthly' | 'annual'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'
export type InvoiceStatus = 'paid' | 'failed' | 'pending' | 'refunded'

export interface UserProfile {
  id: string
  fullName: string
  email: string
  emailVerified: boolean
  phone?: string
  profilePhotoUrl?: string
  createdAt: string
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
  twoFactorSetupComplete: boolean
  backupCodesGenerated: boolean
  activeSessions: ActiveSession[]
  recentActivity: ActivityLogEntry[]
}

export interface ActiveSession {
  id: string
  device: string
  browser: string
  location: string
  ipAddress: string
  lastActive: string
  current: boolean
}

export interface ActivityLogEntry {
  id: string
  date: string
  action: string
  device: string
  location: string
  ipAddress: string
  status: 'success' | 'failed'
}

export interface NotificationPreferences {
  email: {
    applicationUpdates: boolean
    interviewReminders: boolean
    followUpReminders: boolean
    weeklyJobDigest: boolean
    productUpdates: boolean
  }
  inApp: {
    enabled: boolean
    soundEnabled: boolean
  }
  frequency: 'immediate' | 'daily' | 'weekly'
}

export interface PrivacySettings {
  dataCollection: boolean
  thirdPartySharing: boolean
  connectedAccounts: ConnectedAccount[]
}

export interface ConnectedAccount {
  id: string
  provider: 'linkedin' | 'google' | 'github'
  email: string
  connectedAt: string
}

export interface PlanFeature {
  name: string
  description: string
  includedInBasic: boolean
  includedInPremium: boolean
}

export interface PlanLimits {
  maxApplications: number | 'unlimited'
  maxResumeVariants: number | 'unlimited'
  maxJobSearches: number | 'unlimited' // per month
}

export interface SubscriptionPlan {
  tier: PlanTier
  displayName: string
  description: string
  monthlyPrice: number
  annualPrice: number // per month
  annualTotal: number
  annualSavings: number
  features: string[]
  limits: PlanLimits
  popular?: boolean
}

export interface Subscription {
  id: string
  userId: string
  plan: PlanTier
  billingCycle: BillingCycle
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  nextBillingDate?: string
  cancelAtPeriodEnd: boolean
  trialEnd?: string

  // Payment method
  paymentMethod?: {
    type: 'card'
    brand: 'visa' | 'mastercard' | 'amex' | 'discover'
    last4: string
    expiryMonth: number
    expiryYear: number
  }
}

export interface UsageLimits {
  userId: string
  period: string // YYYY-MM format
  applicationsTracked: number
  resumeVariantsCreated: number
  jobSearchesPerformed: number
  limits: PlanLimits
}

export interface Invoice {
  id: string
  userId: string
  date: string
  amount: number
  status: InvoiceStatus
  paymentMethod: {
    brand: string
    last4: string
  }
  description: string
  pdfUrl?: string
  lineItems: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface PaymentMethod {
  id: string
  type: 'card'
  brand: 'visa' | 'mastercard' | 'amex' | 'discover'
  last4: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
  addedAt: string
}

// Component Props
export interface AccountSettingsProps {
  profile: UserProfile
  onUpdateProfile?: (updates: Partial<UserProfile>) => void
  onChangePassword?: (currentPassword: string, newPassword: string) => void
  onUploadPhoto?: (file: File) => void
  onResendVerification?: () => void
}

export interface SecuritySettingsProps {
  security: SecuritySettings
  onEnable2FA?: () => void
  onDisable2FA?: () => void
  onGenerateBackupCodes?: () => void
  onRevokeSession?: (sessionId: string) => void
}

export interface NotificationSettingsProps {
  preferences: NotificationPreferences
  onUpdatePreferences?: (updates: Partial<NotificationPreferences>) => void
}

export interface PrivacySettingsProps {
  privacy: PrivacySettings
  onUpdateSettings?: (updates: Partial<PrivacySettings>) => void
  onDisconnectAccount?: (accountId: string) => void
  onExportData?: () => void
  onDeleteAccount?: () => void
}

export interface SubscriptionOverviewProps {
  subscription: Subscription
  currentPlan: SubscriptionPlan
  availablePlans: SubscriptionPlan[]
  usage?: UsageLimits
  onUpgrade?: (plan: PlanTier, cycle: BillingCycle) => void
  onDowngrade?: (plan: PlanTier) => void
  onChangeBillingCycle?: (cycle: BillingCycle) => void
  onCancelSubscription?: () => void
  onReactivateSubscription?: () => void
}

export interface BillingHistoryProps {
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
  onDownloadInvoice?: (invoiceId: string) => void
  onAddPaymentMethod?: (method: Omit<PaymentMethod, 'id' | 'addedAt'>) => void
  onRemovePaymentMethod?: (methodId: string) => void
  onSetDefaultPaymentMethod?: (methodId: string) => void
}

export interface UpgradePromptProps {
  currentUsage: UsageLimits
  limitType: 'applications' | 'resumes' | 'searches'
  onUpgrade?: () => void
  onDismiss?: () => void
}
