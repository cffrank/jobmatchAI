import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { FeedbackDashboard } from './components/FeedbackDashboard';
import type { JobFeedback, FeedbackStats } from './types-feedback';

// Mock data for demonstration
const MOCK_FEEDBACKS: JobFeedback[] = [
  {
    id: 'f1',
    jobId: '1',
    userId: 'user1',
    feedbackType: 'interested',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'f2',
    jobId: '2',
    userId: 'user1',
    feedbackType: 'not_interested',
    reason: 'salary_too_low',
    createdAt: '2024-01-14T15:30:00Z',
  },
  {
    id: 'f3',
    jobId: '3',
    userId: 'user1',
    feedbackType: 'not_interested',
    reason: 'wrong_location',
    createdAt: '2024-01-14T12:00:00Z',
  },
  {
    id: 'f4',
    jobId: '4',
    userId: 'user1',
    feedbackType: 'interested',
    createdAt: '2024-01-13T09:00:00Z',
  },
  {
    id: 'f5',
    jobId: '5',
    userId: 'user1',
    feedbackType: 'spam',
    createdAt: '2024-01-13T08:00:00Z',
  },
  {
    id: 'f6',
    jobId: '6',
    userId: 'user1',
    feedbackType: 'not_interested',
    reason: 'skill_mismatch',
    createdAt: '2024-01-12T16:00:00Z',
  },
  {
    id: 'f7',
    jobId: '7',
    userId: 'user1',
    feedbackType: 'not_interested',
    reason: 'wrong_role_type',
    createdAt: '2024-01-12T14:00:00Z',
  },
  {
    id: 'f8',
    jobId: '8',
    userId: 'user1',
    feedbackType: 'interested',
    createdAt: '2024-01-11T11:00:00Z',
  },
  {
    id: 'f9',
    jobId: '9',
    userId: 'user1',
    feedbackType: 'not_interested',
    reason: 'salary_too_low',
    createdAt: '2024-01-11T10:00:00Z',
  },
  {
    id: 'f10',
    jobId: '10',
    userId: 'user1',
    feedbackType: 'not_interested',
    reason: 'experience_level',
    createdAt: '2024-01-10T13:00:00Z',
  },
  {
    id: 'f11',
    jobId: '11',
    userId: 'user1',
    feedbackType: 'not_interested',
    reason: 'other',
    customReason: 'Company has poor reviews on Glassdoor',
    createdAt: '2024-01-10T12:00:00Z',
  },
  {
    id: 'f12',
    jobId: '12',
    userId: 'user1',
    feedbackType: 'spam',
    createdAt: '2024-01-09T15:00:00Z',
  },
];

const MOCK_STATS: FeedbackStats = {
  totalFeedback: 12,
  positiveCount: 3,
  negativeCount: 7,
  spamCount: 2,
  topNotInterestedReasons: [
    { reason: 'salary_too_low', count: 2 },
    { reason: 'wrong_location', count: 1 },
    { reason: 'skill_mismatch', count: 1 },
    { reason: 'wrong_role_type', count: 1 },
    { reason: 'experience_level', count: 1 },
    { reason: 'other', count: 1 },
  ],
  matchQualityImprovement: 23,
};

export default function FeedbackDashboardPage() {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<JobFeedback[]>(MOCK_FEEDBACKS);
  const [stats] = useState<FeedbackStats>(MOCK_STATS);

  const handleDeleteFeedback = (feedbackId: string) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
  };

  const handleExportFeedback = () => {
    // Create CSV export
    const headers = ['Job ID', 'Feedback Type', 'Reason', 'Custom Reason', 'Date'];
    const rows = feedbacks.map((f) => [
      f.jobId,
      f.feedbackType,
      f.reason || '',
      f.customReason || '',
      new Date(f.createdAt).toISOString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-feedback-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <button
          onClick={() => navigate('/jobs')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Jobs
        </button>
      </div>

      {/* Dashboard */}
      <FeedbackDashboard
        feedbacks={feedbacks}
        stats={stats}
        onDeleteFeedback={handleDeleteFeedback}
        onExportFeedback={handleExportFeedback}
      />
    </div>
  );
}
