import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp } from 'lucide-react';
import { EnhancedJobCard } from './components/EnhancedJobCard';
import { FeedbackFilterControls } from './components/FeedbackFilterControls';
import type { EnhancedJob, FeedbackFilters, JobFeedback } from './types-feedback';

// Mock data for demonstration
const MOCK_JOBS: EnhancedJob[] = [
  {
    id: '1',
    title: 'Senior Frontend Engineer',
    company: 'TechCorp',
    companyLogo: 'https://via.placeholder.com/64',
    location: 'San Francisco, CA',
    workArrangement: 'Remote',
    salaryMin: 140000,
    salaryMax: 180000,
    postedDate: '2024-01-15',
    matchScore: 92,
    isSaved: true,
    requiredSkills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'Tailwind CSS'],
    missingSkills: [],
    description: 'We are looking for a senior frontend engineer to join our team...',
    matchReasoning: {
      strengths: ['Strong React & TypeScript skills', 'Remote work experience', '5+ years frontend development'],
      concerns: ['GraphQL experience is basic'],
      topSkillMatches: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js'],
    },
  },
  {
    id: '2',
    title: 'Full Stack Developer',
    company: 'StartupXYZ',
    companyLogo: 'https://via.placeholder.com/64',
    location: 'Austin, TX',
    workArrangement: 'Hybrid',
    salaryMin: 110000,
    salaryMax: 150000,
    postedDate: '2024-01-14',
    matchScore: 78,
    isSaved: false,
    requiredSkills: ['JavaScript', 'Python', 'PostgreSQL', 'Docker', 'AWS'],
    missingSkills: ['Python'],
    description: 'Join our fast-growing startup as a full stack developer...',
    matchReasoning: {
      strengths: ['Strong JavaScript skills', 'Docker & AWS experience'],
      concerns: ['Limited Python experience', 'Hybrid work may require relocation'],
      topSkillMatches: ['JavaScript', 'PostgreSQL', 'Docker'],
    },
    spamReports: 0,
  },
  {
    id: '3',
    title: 'Software Engineer',
    company: 'BigTech Inc',
    companyLogo: 'https://via.placeholder.com/64',
    location: 'Seattle, WA',
    workArrangement: 'On-site',
    salaryMin: 150000,
    salaryMax: 200000,
    postedDate: '2024-01-13',
    matchScore: 65,
    isSaved: false,
    requiredSkills: ['Java', 'Kubernetes', 'Microservices', 'CI/CD'],
    missingSkills: ['Java', 'Kubernetes'],
    description: 'We need a software engineer with strong backend experience...',
    matchReasoning: {
      strengths: ['CI/CD pipeline experience', 'Large-scale system design'],
      concerns: ['Java is not your primary language', 'On-site work required'],
      topSkillMatches: ['Microservices', 'CI/CD'],
    },
  },
  {
    id: '4',
    title: 'React Developer',
    company: 'WebAgency',
    companyLogo: 'https://via.placeholder.com/64',
    location: 'Remote',
    workArrangement: 'Remote',
    salaryMin: 90000,
    salaryMax: 120000,
    postedDate: '2024-01-12',
    matchScore: 88,
    isSaved: true,
    requiredSkills: ['React', 'CSS', 'REST APIs', 'Git'],
    missingSkills: [],
    description: 'Looking for a React developer to build modern web applications...',
    matchReasoning: {
      strengths: ['Expert React skills', 'Strong CSS & styling', 'Remote-first company'],
      concerns: ['Salary below market average'],
      topSkillMatches: ['React', 'CSS', 'REST APIs', 'Git'],
    },
    userFeedback: {
      id: 'f1',
      jobId: '4',
      userId: 'user1',
      feedbackType: 'interested',
      createdAt: '2024-01-15T10:00:00Z',
    },
  },
  {
    id: '5',
    title: 'Frontend Lead - URGENT',
    company: 'ShadyCompany',
    companyLogo: 'https://via.placeholder.com/64',
    location: 'Unknown',
    workArrangement: 'Unknown',
    salaryMin: 200000,
    salaryMax: 300000,
    postedDate: '2024-01-15',
    matchScore: 45,
    isSaved: false,
    requiredSkills: ['HTML', 'CSS', 'JavaScript'],
    missingSkills: [],
    description: 'URGENT!!! Make $300k/year!!! Work from home!!! Apply now!!!',
    spamReports: 12,
  },
];

export default function EnhancedJobListPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<EnhancedJob[]>(MOCK_JOBS);
  const [filters, setFilters] = useState<FeedbackFilters>({
    hideNotInterested: false,
    hideSpam: false,
    hideDuplicates: true, // Default to hiding duplicates
    showOnlyVerified: false,
    minMatchScore: 0,
    showOnlyHighQuality: false,
    sortBy: 'match_score',
    sortOrder: 'desc',
  });

  // Apply filters
  const filteredJobs = jobs.filter((job) => {
    // Hide based on feedback
    if (filters.hideNotInterested && job.userFeedback?.feedbackType === 'not_interested') {
      return false;
    }
    if (filters.hideSpam && (job.userFeedback?.feedbackType === 'spam' || (job.spamReports && job.spamReports > 5))) {
      return false;
    }

    // Hide duplicates (show only canonical or non-duplicate jobs)
    if (filters.hideDuplicates && job.dedupStatus === 'duplicate') {
      return false;
    }

    // Show only verified jobs
    if (filters.showOnlyVerified && job.spamStatus !== 'clean') {
      return false;
    }

    // Match score filters
    if (filters.minMatchScore && job.matchScore && job.matchScore < filters.minMatchScore) {
      return false;
    }
    if (filters.showOnlyHighQuality && (!job.matchScore || job.matchScore < 75)) {
      return false;
    }

    return true;
  });

  // Apply sorting
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const order = filters.sortOrder === 'asc' ? 1 : -1;

    switch (filters.sortBy) {
      case 'match_score':
        return ((b.matchScore || 0) - (a.matchScore || 0)) * order;
      case 'date_posted':
        return (new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()) * order;
      case 'salary':
        return ((b.salaryMax + b.salaryMin) / 2 - (a.salaryMax + a.salaryMin) / 2) * order;
      default:
        return 0;
    }
  });

  const handleSaveJob = (jobId: string) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, isSaved: !job.isSaved } : job))
    );
  };

  const handleFeedback = (jobId: string, feedback: JobFeedback) => {
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, userFeedback: feedback } : job))
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-emerald-950/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
                Enhanced Job Discovery
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Premium UI with feedback system and intelligent filtering
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/jobs/add')}
                className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 dark:bg-lime-600 dark:hover:bg-lime-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Job
              </button>
              <button
                onClick={() => navigate('/jobs/feedback-dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <TrendingUp className="w-4 h-4" />
                View Insights
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <FeedbackFilterControls
            filters={filters}
            onFilterChange={setFilters}
            jobCount={jobs.length}
            filteredJobCount={sortedJobs.length}
          />
        </div>

        {/* Job Cards Grid */}
        {sortedJobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900/30 dark:to-emerald-900/30 mb-6">
              <TrendingUp className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">
              No jobs match your filters
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 max-w-md mx-auto">
              Try adjusting your filter settings to see more results
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedJobs.map((job) => (
              <EnhancedJobCard
                key={job.id}
                job={job}
                onViewDetails={() => navigate(`/jobs/${job.id}`)}
                onSave={() => handleSaveJob(job.id)}
                onApply={() => navigate(`/applications/create?jobId=${job.id}`)}
                onFeedback={(feedback) => handleFeedback(job.id, feedback)}
                showFeedbackWidget={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
