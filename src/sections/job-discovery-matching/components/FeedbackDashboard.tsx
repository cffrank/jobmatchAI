import { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Flag,
  TrendingUp,
  Download,
  Trash2,
  BarChart3,
  Calendar,
  Target,
} from 'lucide-react';
import type { FeedbackDashboardProps, NotInterestedReason } from '../types-feedback';

const REASON_LABELS: Record<NotInterestedReason, string> = {
  wrong_location: 'Wrong Location',
  salary_too_low: 'Salary Too Low',
  wrong_role_type: 'Wrong Role Type',
  skill_mismatch: 'Skills Mismatch',
  company_culture: 'Company Culture',
  experience_level: 'Experience Level',
  other: 'Other',
};

export function FeedbackDashboard({
  feedbacks,
  stats,
  onDeleteFeedback,
  onExportFeedback,
}: FeedbackDashboardProps) {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'interested' | 'not_interested' | 'spam'>('all');

  const filteredFeedbacks = feedbacks.filter((feedback) => {
    if (selectedFilter === 'all') return true;
    return feedback.feedbackType === selectedFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-emerald-950/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
            Job Feedback Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Track your preferences and see how feedback improves your matches
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<BarChart3 className="w-6 h-6" />}
            label="Total Feedback"
            value={stats.totalFeedback}
            color="blue"
          />
          <StatCard
            icon={<ThumbsUp className="w-6 h-6" />}
            label="Interested"
            value={stats.positiveCount}
            color="emerald"
          />
          <StatCard
            icon={<ThumbsDown className="w-6 h-6" />}
            label="Not Interested"
            value={stats.negativeCount}
            color="amber"
          />
          <StatCard
            icon={<Flag className="w-6 h-6" />}
            label="Spam Reports"
            value={stats.spamCount}
            color="red"
          />
        </div>

        {/* Match Quality Improvement */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-1 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Match Quality Impact
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                How your feedback has improved job recommendations
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                +{stats.matchQualityImprovement}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Improvement
              </p>
            </div>
          </div>

          {/* Top Not Interested Reasons */}
          {stats.topNotInterestedReasons.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                Top Reasons for Passing
              </h3>
              <div className="space-y-2">
                {stats.topNotInterestedReasons.slice(0, 5).map((item) => {
                  const percentage = (item.count / stats.negativeCount) * 100;
                  return (
                    <div key={item.reason} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {REASON_LABELS[item.reason]}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {item.count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Feedback History */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  selectedFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                All ({feedbacks.length})
              </button>
              <button
                onClick={() => setSelectedFilter('interested')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  selectedFilter === 'interested'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Interested ({stats.positiveCount})
              </button>
              <button
                onClick={() => setSelectedFilter('not_interested')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  selectedFilter === 'not_interested'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Not Interested ({stats.negativeCount})
              </button>
              <button
                onClick={() => setSelectedFilter('spam')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  selectedFilter === 'spam'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Spam ({stats.spamCount})
              </button>
            </div>
            <button
              onClick={onExportFeedback}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
          </div>

          {/* Feedback List */}
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredFeedbacks.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <TrendingUp className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-600 dark:text-slate-400">
                  No feedback in this category yet
                </p>
              </div>
            ) : (
              filteredFeedbacks.map((feedback) => (
                <FeedbackItem
                  key={feedback.id}
                  feedback={feedback}
                  onDelete={() => onDeleteFeedback?.(feedback.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'emerald' | 'amber' | 'red';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
    emerald: 'from-emerald-500 to-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    amber: 'from-amber-500 to-amber-600 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
    red: 'from-red-500 to-red-600 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg hover:shadow-xl transition-shadow duration-200">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} flex items-center justify-center text-white mb-4 shadow-lg`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</div>
    </div>
  );
}

interface FeedbackItemProps {
  feedback: {
    id: string;
    jobId: string;
    feedbackType: 'interested' | 'not_interested' | 'spam';
    reason?: NotInterestedReason;
    customReason?: string;
    createdAt: string;
  };
  onDelete: () => void;
}

function FeedbackItem({ feedback, onDelete }: FeedbackItemProps) {
  const getFeedbackIcon = () => {
    switch (feedback.feedbackType) {
      case 'interested':
        return <ThumbsUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'not_interested':
        return <ThumbsDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'spam':
        return <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }
  };

  const getFeedbackBadgeClass = () => {
    switch (feedback.feedbackType) {
      case 'interested':
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'not_interested':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'spam':
        return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
    }
  };

  return (
    <div className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">{getFeedbackIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getFeedbackBadgeClass()}`}
              >
                {feedback.feedbackType === 'interested'
                  ? 'Interested'
                  : feedback.feedbackType === 'not_interested'
                  ? 'Not Interested'
                  : 'Spam'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(feedback.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {feedback.reason && (
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Reason: {REASON_LABELS[feedback.reason]}
              </p>
            )}
            {feedback.customReason && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                "{feedback.customReason}"
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Job ID: {feedback.jobId}
            </p>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 dark:hover:bg-red-950/30 rounded-lg transition-all duration-200"
          title="Delete feedback"
        >
          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
        </button>
      </div>
    </div>
  );
}
