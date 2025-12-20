import { Sparkles, CheckCircle2, X, AlertTriangle, Info, Zap } from 'lucide-react'
import type { OptimizationSuggestion } from '../types'

interface OptimizationSidebarProps {
  suggestions: OptimizationSuggestion[]
  onAcceptSuggestion?: (id: string) => void
  onDismissSuggestion?: (id: string) => void
}

export function OptimizationSidebar({
  suggestions,
  onAcceptSuggestion,
  onDismissSuggestion,
}: OptimizationSidebarProps) {
  const activeSuggestions = suggestions.filter((s) => !s.accepted)

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
      case 'medium':
        return <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />
      case 'low':
        return <Zap className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
      default:
        return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
      case 'medium':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20'
      case 'low':
        return 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
      default:
        return 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20'
    }
  }

  return (
    <div className="sticky top-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-emerald-600 dark:from-blue-700 dark:to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-white/20 backdrop-blur">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">AI Optimization</h2>
        </div>
        <p className="text-sm text-white/90 leading-relaxed">
          {activeSuggestions.length === 0
            ? 'Your profile looks great! No suggestions at this time.'
            : `${activeSuggestions.length} ${
                activeSuggestions.length === 1 ? 'suggestion' : 'suggestions'
              } to improve your resume`}
        </p>
      </div>

      {/* Suggestions */}
      {activeSuggestions.length > 0 && (
        <div className="space-y-4">
          {activeSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={`rounded-xl p-4 border ${getPriorityColor(
                suggestion.priority
              )} transition-all hover:shadow-md`}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-0.5">{getPriorityIcon(suggestion.priority)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {suggestion.title}
                    </h3>
                    {onDismissSuggestion && (
                      <button
                        onClick={() => onDismissSuggestion(suggestion.id)}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {suggestion.section.charAt(0).toUpperCase() + suggestion.section.slice(1)} •{' '}
                    {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
                {suggestion.description}
              </p>

              {/* Suggestion */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-3 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Suggestion
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                  "{suggestion.suggestion}"
                </p>
              </div>

              {/* Actions */}
              {onAcceptSuggestion && (
                <button
                  onClick={() => onAcceptSuggestion(suggestion.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply Suggestion</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
