import { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Sparkles,
  MapPin,
  Briefcase,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { JobFeedbackWidget } from './JobFeedbackWidget';
import { JobQualityBadges } from './JobQualityBadges';
import type { EnhancedJobCardProps } from '../types-feedback';
import { submitJobFeedback } from '@/lib/jobQualityService';
import { toast } from 'sonner';

export function EnhancedJobCard({
  job,
  onViewDetails,
  onSave,
  onApply,
  onFeedback,
  showFeedbackWidget = true,
}: EnhancedJobCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getMatchScoreColor = (score: number) => {
    if (score >= 70)
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    if (score >= 50)
      return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
  };

  const getMatchScoreLabel = (score: number) => {
    if (score >= 70) return 'Good Match';
    if (score >= 50) return 'Potential Match';
    return 'Weak Match';
  };

  const getMatchScoreGradient = (score: number) => {
    if (score >= 70) return 'from-emerald-500 to-emerald-600';
    if (score >= 50) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const formatSalary = (min: number, max: number) => {
    const format = (num: number) => {
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
      return `$${num}`;
    };
    return `${format(min)} - ${format(max)}`;
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1 cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Match Score Badge - Floating with premium design */}
      {job.matchScore !== undefined && (
        <div className="absolute -top-3 -right-3 z-10">
          <div
            className={`relative px-4 py-2 rounded-xl border-2 font-bold text-sm shadow-lg backdrop-blur-sm ${getMatchScoreColor(
              job.matchScore
            )}`}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>{job.matchScore}%</span>
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-semibold whitespace-nowrap opacity-90">
              {getMatchScoreLabel(job.matchScore)}
            </div>
          </div>
        </div>
      )}

      {/* Bookmark Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave?.();
        }}
        className="absolute top-6 right-6 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:shadow-md hover:scale-110 active:scale-95"
      >
        {job.isSaved ? (
          <BookmarkCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-current" />
        ) : (
          <Bookmark className="w-5 h-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        )}
      </button>

      {/* Company Logo & Header */}
      <div className="flex items-start gap-4 mb-4 pr-8">
        {job.companyLogo ? (
          <img
            src={job.companyLogo}
            alt={`${job.company} logo`}
            className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0 object-contain shadow-sm"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.querySelector('.company-initials')!.classList.remove(
                'hidden'
              );
            }}
          />
        ) : null}
        <div
          className={`company-initials w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-500 to-emerald-500 flex-shrink-0 flex items-center justify-center shadow-lg ${
            job.companyLogo ? 'hidden' : ''
          }`}
        >
          <span className="text-white font-bold text-lg">
            {job.company
              .split(' ')
              .map((word) => word[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-1 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
            {job.title}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{job.company}</p>
        </div>
      </div>

      {/* Quality Badges - Spam, Duplicates, Quality Score */}
      <div className="mb-4">
        <JobQualityBadges
          spamDetected={job.spamDetected}
          spamProbability={job.spamProbability}
          spamStatus={job.spamStatus}
          dedupStatus={job.dedupStatus}
          canonicalJobId={job.canonicalJobId}
          qualityScore={job.qualityScore}
          postedAt={job.postedAt || job.postedDate}
          lastSeenAt={job.lastSeenAt}
          spamReportCount={job.spamReports}
          onViewCanonical={() => {
            if (job.canonicalJobId) {
              // Navigate to canonical job
              window.location.href = `/jobs/${job.canonicalJobId}`;
            }
          }}
          onViewSpamDetails={() => {
            // Could open a modal with spam analysis details
            toast.info('Spam analysis details coming soon');
          }}
        />
      </div>

      {/* Match Quality Progress Bar - Premium Design */}
      {job.matchScore !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Match Quality
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {job.matchScore}%
            </span>
          </div>
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            {/* Progress bar with gradient */}
            <div
              className={`h-full bg-gradient-to-r ${getMatchScoreGradient(
                job.matchScore
              )} rounded-full transition-all duration-1000 ease-out shadow-lg`}
              style={{ width: `${job.matchScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Match Reasoning - Premium Insight Cards */}
      {job.matchReasoning && (
        <div className="mb-4 space-y-2">
          {/* Strengths */}
          {job.matchReasoning.strengths.length > 0 && (
            <div className="flex items-start gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 mb-0.5">
                  Key Strengths
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  {job.matchReasoning.strengths.slice(0, 2).join(' • ')}
                </p>
              </div>
            </div>
          )}

          {/* Concerns */}
          {job.matchReasoning.concerns.length > 0 && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-300 mb-0.5">
                  Considerations
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  {job.matchReasoning.concerns.slice(0, 2).join(' • ')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Job Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 group/item">
          <MapPin className="w-4 h-4 flex-shrink-0 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors" />
          <span className="truncate">{job.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 group/item">
          <Briefcase className="w-4 h-4 flex-shrink-0 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors" />
          <span className="truncate">{job.workArrangement}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 group/item">
          <DollarSign className="w-4 h-4 flex-shrink-0 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors" />
          <span className="truncate">{formatSalary(job.salaryMin, job.salaryMax)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 group/item">
          <TrendingUp className="w-4 h-4 flex-shrink-0 group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors" />
          <span className="truncate">
            Posted{' '}
            {new Date(job.postedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Skills with Premium Design */}
      {job.requiredSkills && job.requiredSkills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Top Skill Matches
          </p>
          <div className="flex flex-wrap gap-2">
            {job.matchReasoning?.topSkillMatches
              ? job.matchReasoning.topSkillMatches.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm"
                  >
                    {skill}
                  </span>
                ))
              : job.requiredSkills.slice(0, 4).map((skill) => {
                  const isMissing = job.missingSkills?.includes(skill) ?? false;
                  return (
                    <span
                      key={skill}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm ${
                        isMissing
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {skill}
                    </span>
                  );
                })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
          className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          View Details
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply?.();
          }}
          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          Apply Now
        </button>
      </div>

      {/* Feedback Widget */}
      {showFeedbackWidget && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Rate this match:
          </span>
          <JobFeedbackWidget
            jobId={job.id}
            currentFeedback={job.userFeedback}
            onThumbsUp={async () => {
              try {
                await submitJobFeedback(job.id, {
                  feedbackType: 'interested'
                });
                onFeedback?.({
                  id: crypto.randomUUID(),
                  jobId: job.id,
                  userId: '', // Filled by service
                  feedbackType: 'interested',
                  createdAt: new Date().toISOString(),
                });
              } catch (error) {
                console.error('Failed to submit feedback:', error);
                throw error; // Re-throw to show error toast in widget
              }
            }}
            onThumbsDown={async (reason, customReason) => {
              try {
                await submitJobFeedback(job.id, {
                  feedbackType: 'not_interested',
                  reason,
                  customReason
                });
                onFeedback?.({
                  id: crypto.randomUUID(),
                  jobId: job.id,
                  userId: '',
                  feedbackType: 'not_interested',
                  reason,
                  customReason,
                  createdAt: new Date().toISOString(),
                });
              } catch (error) {
                console.error('Failed to submit feedback:', error);
                throw error;
              }
            }}
            onReportSpam={async () => {
              try {
                await submitJobFeedback(job.id, {
                  feedbackType: 'spam'
                });
                onFeedback?.({
                  id: crypto.randomUUID(),
                  jobId: job.id,
                  userId: '',
                  feedbackType: 'spam',
                  createdAt: new Date().toISOString(),
                });
              } catch (error) {
                console.error('Failed to report spam:', error);
                throw error;
              }
            }}
          />
        </div>
      )}

      {/* Hover Effect Overlay with Shimmer */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-emerald-500/5 pointer-events-none transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>
    </div>
  );
}

// Add shimmer animation to tailwind config or use inline style
// This creates a subtle moving highlight effect on hover
