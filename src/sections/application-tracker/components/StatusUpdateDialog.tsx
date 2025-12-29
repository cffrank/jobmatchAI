import { useState } from 'react'
import { X, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ApplicationStatus } from '../types'
import { getStatusInfo, getAllowedTransitions, getStatusLabel } from '../utils/statusHelpers'

interface StatusUpdateDialogProps {
  currentStatus: ApplicationStatus
  applicationTitle: string
  onUpdate: (newStatus: ApplicationStatus, note?: string) => Promise<void>
  onClose: () => void
}

export function StatusUpdateDialog({
  currentStatus,
  applicationTitle,
  onUpdate,
  onClose
}: StatusUpdateDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | null>(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allowedStatuses = getAllowedTransitions(currentStatus)
  const currentInfo = getStatusInfo(currentStatus)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStatus) {
      setError('Please select a status')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onUpdate(selectedStatus, note.trim() || undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-1">Update Application Status</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{applicationTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Current Status
            </label>
            <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium ${currentInfo.color}`}>
              <CheckCircle2 className="w-4 h-4" />
              {currentInfo.label}
            </div>
          </div>

          {/* New Status Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              New Status *
            </label>

            {allowedStatuses.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-1">
                      No Further Transitions Available
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      This application is in a final state and cannot be changed to another status.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allowedStatuses.map((status) => {
                  const statusInfo = getStatusInfo(status)
                  const isSelected = selectedStatus === status

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSelectedStatus(status)}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        isSelected
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                          {statusInfo.label}
                        </h3>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {statusInfo.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add any notes about this status change..."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              This note will be saved in the status history
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedStatus || allowedStatuses.length === 0}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Simplified status dropdown for inline updates
 */
interface StatusDropdownProps {
  currentStatus: ApplicationStatus
  onUpdate: (newStatus: ApplicationStatus) => Promise<void>
  disabled?: boolean
}

export function StatusDropdown({ currentStatus, onUpdate, disabled }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const allowedStatuses = getAllowedTransitions(currentStatus)
  const currentInfo = getStatusInfo(currentStatus)

  const handleStatusSelect = async (status: ApplicationStatus) => {
    setIsUpdating(true)
    try {
      await onUpdate(status)
      setIsOpen(false)
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  if (allowedStatuses.length === 0) {
    // No transitions available - show current status as static
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${currentInfo.color}`}>
        <span>{currentInfo.label}</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isUpdating}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${currentInfo.color} hover:shadow-md disabled:opacity-50`}
      >
        <span>{currentInfo.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute top-full mt-2 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 min-w-[200px] overflow-hidden">
            <div className="p-2 space-y-1">
              {allowedStatuses.map((status) => {
                const statusInfo = getStatusInfo(status)
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusSelect(status)}
                    disabled={isUpdating}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-50 text-sm">
                      {statusInfo.label}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {statusInfo.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
