import { Lock, Linkedin, Chrome, Mail, Download, Trash2, AlertTriangle } from 'lucide-react'
import type { PrivacySettings } from '../types'

interface PrivacyTabProps {
  privacy: PrivacySettings
  onUpdatePrivacy?: (updates: Partial<PrivacySettings>) => void
  onDisconnectAccount?: (accountId: string) => void
  onExportData?: () => void
  onDeleteAccount?: () => void
}

export function PrivacyTab({ privacy, onDisconnectAccount, onExportData, onDeleteAccount }: PrivacyTabProps) {
  // onUpdatePrivacy functionality not yet implemented
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'linkedin': return Linkedin
      case 'google': return Chrome
      default: return Mail
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Connected Accounts */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Connected Accounts
        </h3>
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
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
