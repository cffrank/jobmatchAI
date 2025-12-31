import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Flag, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { JobFeedbackWidgetProps, NotInterestedReason } from '../types-feedback';

const NOT_INTERESTED_REASONS: { value: NotInterestedReason; label: string }[] = [
  { value: 'wrong_location', label: 'Wrong location' },
  { value: 'salary_too_low', label: 'Salary too low' },
  { value: 'wrong_role_type', label: 'Wrong role type' },
  { value: 'skill_mismatch', label: 'Skills don\'t match' },
  { value: 'company_culture', label: 'Company culture concerns' },
  { value: 'experience_level', label: 'Experience level mismatch' },
  { value: 'other', label: 'Other reason' },
];

export function JobFeedbackWidget({
  currentFeedback,
  onThumbsUp,
  onThumbsDown,
  onReportSpam,
  disabled = false,
}: JobFeedbackWidgetProps) {
  const [showReasonSelector, setShowReasonSelector] = useState(false);
  const [selectedReason, setSelectedReason] = useState<NotInterestedReason | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleThumbsUp = async () => {
    if (disabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onThumbsUp?.();
      toast.success('Thanks for your feedback!', {
        description: 'We\'ll show you more jobs like this.',
        duration: 3000,
      });
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleThumbsDown = () => {
    if (disabled || isSubmitting) return;
    setShowReasonSelector(true);
  };

  const handleReasonSubmit = async () => {
    if (!selectedReason || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onThumbsDown?.(selectedReason, customReason || undefined);
      toast.success('Feedback received', {
        description: 'We\'ll improve your job matches based on this.',
        duration: 3000,
      });
      setShowReasonSelector(false);
      setSelectedReason(null);
      setCustomReason('');
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportSpam = async () => {
    if (disabled || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onReportSpam?.();
      toast.success('Job reported as spam', {
        description: 'Thank you for helping us maintain quality listings.',
        duration: 3000,
      });
    } catch (error) {
      toast.error('Failed to report spam');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If feedback already exists, show compact indicator
  if (currentFeedback && !showReasonSelector) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        {currentFeedback.feedbackType === 'interested' && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ThumbsUp className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">Interested</span>
          </div>
        )}
        {currentFeedback.feedbackType === 'not_interested' && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <ThumbsDown className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">Not interested</span>
          </div>
        )}
        {currentFeedback.feedbackType === 'spam' && (
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Flag className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">Reported</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {!showReasonSelector ? (
        <div className="flex items-center gap-2">
          {/* Thumbs Up Button */}
          <button
            onClick={handleThumbsUp}
            disabled={disabled || isSubmitting}
            className="group relative p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:shadow-emerald-500/10"
            title="I'm interested in this job"
          >
            <ThumbsUp className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Interested
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
            </div>
          </button>

          {/* Thumbs Down Button */}
          <button
            onClick={handleThumbsDown}
            disabled={disabled || isSubmitting}
            className="group relative p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:shadow-amber-500/10"
            title="Not interested in this job"
          >
            <ThumbsDown className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-200" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Not interested
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
            </div>
          </button>

          {/* Report Spam Button */}
          <button
            onClick={handleReportSpam}
            disabled={disabled || isSubmitting}
            className="group relative p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md hover:shadow-red-500/10"
            title="Report as spam"
          >
            <Flag className="w-4 h-4 text-slate-600 dark:text-slate-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-200" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Report spam
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
            </div>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/30 p-5 z-50 animate-slide-in-from-bottom">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
              Why aren't you interested?
            </h3>
            <button
              onClick={() => {
                setShowReasonSelector(false);
                setSelectedReason(null);
                setCustomReason('');
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Reason Options */}
          <div className="space-y-2 mb-4">
            {NOT_INTERESTED_REASONS.map((reason) => (
              <button
                key={reason.value}
                onClick={() => setSelectedReason(reason.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-all duration-200 ${
                  selectedReason === reason.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    selectedReason === reason.value
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selectedReason === reason.value && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    selectedReason === reason.value
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {reason.label}
                </span>
              </button>
            ))}
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'other' && (
            <div className="mb-4 animate-fade-in">
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Tell us more (optional)..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleReasonSubmit}
            disabled={!selectedReason || isSubmitting}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      )}
    </div>
  );
}
