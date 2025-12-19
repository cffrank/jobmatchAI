import { Shield, Smartphone, Monitor, MapPin, LogOut } from 'lucide-react'
import type { SecuritySettings } from '../types'

interface SecurityTabProps {
  security: SecuritySettings
  onEnable2FA?: () => void
  onDisable2FA?: () => void
  onGenerateBackupCodes?: () => void
  onRevokeSession?: (sessionId: string) => void
}

export function SecurityTab({ security, onEnable2FA, onDisable2FA, onGenerateBackupCodes, onRevokeSession }: SecurityTabProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Two-Factor Authentication */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Two-Factor Authentication
        </h3>
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
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
