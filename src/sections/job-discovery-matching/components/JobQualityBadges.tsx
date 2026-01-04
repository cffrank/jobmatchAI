/**
 * Job Quality Badges
 *
 * Visual indicators for job quality, spam detection, and duplicate status.
 * Premium design with smooth animations and accessibility.
 */

import { AlertTriangle, Copy, Shield, ShieldAlert, TrendingUp, Clock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Type Definitions
// =============================================================================

interface JobQualityBadgesProps {
  // Spam detection
  spamDetected?: boolean;
  spamProbability?: number;
  spamStatus?: 'clean' | 'suspicious' | 'spam' | 'scam' | 'expired' | 'pending_review';

  // Deduplication
  dedupStatus?: 'canonical' | 'duplicate' | 'merged' | null;
  canonicalJobId?: string;

  // Quality metrics
  qualityScore?: number;

  // Freshness
  postedAt?: string;
  lastSeenAt?: string;

  // Spam reports from users
  spamReportCount?: number;

  // Compact mode (smaller badges)
  compact?: boolean;

  // Click handlers
  onViewCanonical?: () => void;
  onViewSpamDetails?: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getSpamBadgeColor(spamProbability: number): string {
  if (spamProbability >= 0.7) {
    return 'bg-red-500 dark:bg-red-600 text-white border-red-600 dark:border-red-700';
  }
  if (spamProbability >= 0.4) {
    return 'bg-amber-500 dark:bg-amber-600 text-white border-amber-600 dark:border-amber-700';
  }
  return 'bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-700';
}

function getSpamLabel(spamProbability: number): string {
  if (spamProbability >= 0.7) return 'High Risk';
  if (spamProbability >= 0.4) return 'Suspicious';
  return 'Verified';
}

function getQualityBadgeColor(score: number): string {
  if (score >= 80) {
    return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  }
  if (score >= 60) {
    return 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  }
  return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';
}

function getFreshnessLabel(postedAt: string): { label: string; color: string } {
  const now = new Date();
  const posted = new Date(postedAt);
  const daysAgo = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo === 0) {
    return {
      label: 'Posted today',
      color: 'text-emerald-600 dark:text-emerald-400'
    };
  }
  if (daysAgo === 1) {
    return {
      label: 'Posted yesterday',
      color: 'text-emerald-600 dark:text-emerald-400'
    };
  }
  if (daysAgo <= 7) {
    return {
      label: `Posted ${daysAgo}d ago`,
      color: 'text-blue-600 dark:text-blue-400'
    };
  }
  if (daysAgo <= 30) {
    return {
      label: `Posted ${daysAgo}d ago`,
      color: 'text-slate-600 dark:text-slate-400'
    };
  }
  return {
    label: `Posted ${Math.floor(daysAgo / 30)}mo ago`,
    color: 'text-slate-500 dark:text-slate-500'
  };
}

// =============================================================================
// Component
// =============================================================================

export function JobQualityBadges({
  spamDetected,
  spamProbability,
  spamStatus,
  dedupStatus,
  canonicalJobId,
  qualityScore,
  postedAt,
  spamReportCount = 0,
  compact = false,
  onViewCanonical,
  onViewSpamDetails,
}: JobQualityBadgesProps) {
  const badges: React.ReactNode[] = [];

  // Spam Detection Badge
  if (spamDetected && spamProbability !== undefined) {
    const spamColor = getSpamBadgeColor(spamProbability);
    const spamLabel = getSpamLabel(spamProbability);

    badges.push(
      <button
        key="spam"
        onClick={onViewSpamDetails}
        className={cn(
          'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border-2 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl',
          spamColor,
          compact && 'px-2 py-1 text-[10px]'
        )}
        title={`Spam probability: ${(spamProbability * 100).toFixed(1)}%`}
      >
        <ShieldAlert className={cn('flex-shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        <span>{spamLabel}</span>
        {!compact && spamProbability && (
          <span className="opacity-90">
            {(spamProbability * 100).toFixed(0)}%
          </span>
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
          Click for spam analysis details
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
        </div>
      </button>
    );
  } else if (spamStatus === 'clean') {
    badges.push(
      <div
        key="clean"
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
          compact && 'px-2 py-1 text-[10px]'
        )}
        title="Verified as legitimate"
      >
        <Shield className={cn('flex-shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        <span>Verified</span>
      </div>
    );
  }

  // User Spam Reports Badge
  if (spamReportCount > 0) {
    badges.push(
      <div
        key="reports"
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border-2 bg-red-500 dark:bg-red-600 text-white border-red-600 dark:border-red-700 shadow-md',
          compact && 'px-2 py-1 text-[10px]'
        )}
        title={`${spamReportCount} user${spamReportCount > 1 ? 's' : ''} reported this as spam`}
      >
        <AlertTriangle className={cn('flex-shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        <span>{spamReportCount} Report{spamReportCount > 1 ? 's' : ''}</span>
      </div>
    );
  }

  // Duplicate Status Badge
  if (dedupStatus === 'duplicate' && canonicalJobId) {
    badges.push(
      <button
        key="duplicate"
        onClick={onViewCanonical}
        className={cn(
          'group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-950/50 hover:scale-105',
          compact && 'px-2 py-1 text-[10px]'
        )}
        title="This is a duplicate listing"
      >
        <Copy className={cn('flex-shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        <span>Duplicate</span>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
          Click to view original listing
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
        </div>
      </button>
    );
  } else if (dedupStatus === 'canonical') {
    badges.push(
      <div
        key="canonical"
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
          compact && 'px-2 py-1 text-[10px]'
        )}
        title="Original listing (duplicates merged)"
      >
        <Eye className={cn('flex-shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        <span>Original</span>
      </div>
    );
  }

  // Quality Score Badge
  if (qualityScore !== undefined) {
    badges.push(
      <div
        key="quality"
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border',
          getQualityBadgeColor(qualityScore),
          compact && 'px-2 py-1 text-[10px]'
        )}
        title={`Quality score: ${qualityScore}/100`}
      >
        <TrendingUp className={cn('flex-shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
        <span>Quality {qualityScore}</span>
      </div>
    );
  }

  // Freshness Badge
  if (postedAt && !compact) {
    const freshness = getFreshnessLabel(postedAt);
    badges.push(
      <div
        key="freshness"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
        title={`Posted: ${new Date(postedAt).toLocaleDateString()}`}
      >
        <Clock className={cn('flex-shrink-0 w-3.5 h-3.5', freshness.color)} />
        <span className={freshness.color}>{freshness.label}</span>
      </div>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', compact && 'gap-1.5')}>
      {badges}
    </div>
  );
}
