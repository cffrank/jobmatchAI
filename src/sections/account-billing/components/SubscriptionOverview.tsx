import { Check, Crown, Zap, TrendingUp, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { SubscriptionOverviewProps, BillingCycle } from '../types'

export function SubscriptionOverview({
  subscription,
  currentPlan,
  availablePlans,
  usage,
  onUpgrade,
  onDowngrade,
  onChangeBillingCycle,
  onCancelSubscription,
  onReactivateSubscription
}: SubscriptionOverviewProps) {
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(subscription.billingCycle)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const isBasic = subscription.plan === 'basic'
  const isPremium = subscription.plan === 'premium'
  const premiumPlan = availablePlans.find(p => p.tier === 'premium')!

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getUsagePercentage = (current: number, max: number | 'unlimited') => {
    if (max === 'unlimited') return 0
    return (current / max) * 100
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-600'
    if (percentage >= 70) return 'bg-orange-500'
    return 'bg-blue-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
            Subscription & Billing
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Manage your subscription, view usage, and update billing details
          </p>
        </div>

        {/* Current Plan Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {currentPlan.displayName} Plan
                </h2>
                {isPremium && (
                  <div className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5">
                    <Crown className="w-4 h-4" />
                    Premium
                  </div>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-400">{currentPlan.description}</p>
            </div>
            {isPremium && (
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                  {subscription.billingCycle === 'annual' ? 'Billed Annually' : 'Billed Monthly'}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                  ${subscription.billingCycle === 'annual' ? premiumPlan.annualPrice : premiumPlan.monthlyPrice}
                  <span className="text-lg text-slate-500 dark:text-slate-400">/mo</span>
                </p>
              </div>
            )}
          </div>

          {isPremium && subscription.nextBillingDate && !subscription.cancelAtPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-700">
              <AlertCircle className="w-4 h-4" />
              Next billing date: {formatDate(subscription.nextBillingDate)}
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
                    Subscription Canceled
                  </p>
                  <p className="text-sm text-orange-800 dark:text-orange-400 mb-3">
                    Your Premium access will remain active until {formatDate(subscription.currentPeriodEnd)}.
                    After that, you'll be downgraded to the Basic plan.
                  </p>
                  <button
                    onClick={onReactivateSubscription}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Reactivate Subscription
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage Limits (Basic Tier Only) */}
        {isBasic && usage && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Current Usage</h3>
              <button
                onClick={() => onUpgrade?.('premium', 'monthly')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
              >
                <Zap className="w-4 h-4" />
                Upgrade for Unlimited
              </button>
            </div>

            <div className="space-y-6">
              {/* Applications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">Tracked Applications</p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {usage.applicationsTracked}/{usage.limits.maxApplications}
                  </p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${getUsageColor(getUsagePercentage(usage.applicationsTracked, usage.limits.maxApplications))} transition-all`}
                    style={{ width: `${getUsagePercentage(usage.applicationsTracked, usage.limits.maxApplications)}%` }}
                  />
                </div>
                {getUsagePercentage(usage.applicationsTracked, usage.limits.maxApplications) >= 80 && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                    You're running low on application slots. Upgrade to track unlimited applications.
                  </p>
                )}
              </div>

              {/* Resume Variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">Resume Variants</p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {usage.resumeVariantsCreated}/{usage.limits.maxResumeVariants}
                  </p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${getUsageColor(getUsagePercentage(usage.resumeVariantsCreated, usage.limits.maxResumeVariants))} transition-all`}
                    style={{ width: `${getUsagePercentage(usage.resumeVariantsCreated, usage.limits.maxResumeVariants)}%` }}
                  />
                </div>
                {getUsagePercentage(usage.resumeVariantsCreated, usage.limits.maxResumeVariants) >= 80 && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                    You're close to your variant limit. Upgrade for unlimited resume variants.
                  </p>
                )}
              </div>

              {/* Job Searches */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">Job Searches This Month</p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {usage.jobSearchesPerformed}/{usage.limits.maxJobSearches}
                  </p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${getUsageColor(getUsagePercentage(usage.jobSearchesPerformed, usage.limits.maxJobSearches))} transition-all`}
                    style={{ width: `${getUsagePercentage(usage.jobSearchesPerformed, usage.limits.maxJobSearches)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Resets on the 1st of each month
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Comparison */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Available Plans</h3>
            {isPremium && (
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setSelectedCycle('monthly')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    selectedCycle === 'monthly'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedCycle('annual')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    selectedCycle === 'annual'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
                  }`}
                >
                  Annual
                  <span className="ml-2 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded text-xs font-semibold">
                    Save ${premiumPlan.annualSavings}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availablePlans.map((plan) => {
              const isCurrentPlan = plan.tier === subscription.plan
              const price = selectedCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice

              return (
                <div
                  key={plan.tier}
                  className={`relative bg-white dark:bg-slate-900 rounded-2xl border-2 p-6 shadow-sm transition-all ${
                    plan.popular
                      ? 'border-blue-500 dark:border-blue-400'
                      : 'border-slate-200 dark:border-slate-800'
                  } ${isCurrentPlan ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="px-4 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full text-sm font-semibold shadow-lg">
                        Most Popular
                      </div>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-4 right-6">
                      <div className="px-4 py-1 bg-emerald-600 text-white rounded-full text-sm font-semibold shadow-lg">
                        Current Plan
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
                      {plan.displayName}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-slate-900 dark:text-slate-50">
                        ${price}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">/month</span>
                    </div>
                    {selectedCycle === 'annual' && plan.tier === 'premium' && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">
                        ${plan.annualTotal}/year • Save ${plan.annualSavings} annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {!isCurrentPlan && (
                    <button
                      onClick={() => {
                        if (plan.tier === 'premium') {
                          onUpgrade?.(plan.tier, selectedCycle)
                        } else {
                          onDowngrade?.(plan.tier)
                        }
                      }}
                      className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                        plan.tier === 'premium'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {plan.tier === 'premium' ? (
                        <>
                          <TrendingUp className="w-5 h-5" />
                          Upgrade to Premium
                        </>
                      ) : (
                        'Switch to Basic'
                      )}
                    </button>
                  )}

                  {isCurrentPlan && isPremium && !subscription.cancelAtPeriodEnd && (
                    <div className="space-y-2">
                      {subscription.billingCycle !== selectedCycle && (
                        <button
                          onClick={() => onChangeBillingCycle?.(selectedCycle)}
                          className="w-full py-3 bg-blue-100 dark:bg-blue-950/30 hover:bg-blue-200 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-xl font-semibold transition-colors"
                        >
                          Switch to {selectedCycle === 'annual' ? 'Annual' : 'Monthly'} Billing
                        </button>
                      )}
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors text-sm"
                      >
                        Cancel Subscription
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                Cancel Premium Subscription?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                You'll lose access to Premium features at the end of your current billing period on{' '}
                {formatDate(subscription.currentPeriodEnd)}. You can reactivate anytime before then.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onCancelSubscription?.()
                    setShowCancelModal(false)
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                >
                  Yes, Cancel
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                >
                  Keep Premium
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
