import { useState } from 'react'
import { Search, SlidersHorizontal, Bookmark, BookmarkCheck, Sparkles, MapPin, Briefcase, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import type { JobDiscoveryProps, JobFilters, Job } from '../types'

export function JobList({
  jobs,
  onViewDetails,
  onSaveJob,
  onUnsaveJob,
  onApply,
  onSearch,
  onFilter
}: JobDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<JobFilters>({
    matchScoreMin: 0,
    workArrangement: 'All',
    location: '',
    showSavedOnly: false
  })

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const handleFilterChange = (newFilters: Partial<JobFilters>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)
    onFilter?.(updated)
  }

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
    return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
  }

  const getMatchScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent Match'
    if (score >= 70) return 'Good Match'
    return 'Potential Match'
  }

  const formatSalary = (min: number, max: number) => {
    const format = (num: number) => {
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`
      return `$${num}`
    }
    return `${format(min)} - ${format(max)}`
  }

  const filteredJobs = jobs.filter(job => {
    if (filters.showSavedOnly && !job.isSaved) return false
    if (filters.matchScoreMin && job.matchScore < filters.matchScoreMin) return false
    if (filters.workArrangement && filters.workArrangement !== 'All' && job.workArrangement !== filters.workArrangement) return false
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.requiredSkills.some(skill => skill.toLowerCase().includes(query))
      )
    }
    return true
  })

  const savedCount = jobs.filter(j => j.isSaved).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-emerald-950/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
                Discover Jobs
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                {filteredJobs.length} positions matched to your profile
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <Bookmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{savedCount} Saved</span>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by job title, company, or skills..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-shadow"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-3.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2 whitespace-nowrap ${
                showFilters
                  ? 'bg-blue-600 text-white border border-blue-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Minimum Match Score
                  </label>
                  <select
                    value={filters.matchScoreMin}
                    onChange={(e) => handleFilterChange({ matchScoreMin: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Any match</option>
                    <option value={85}>85%+ (Excellent)</option>
                    <option value={70}>70%+ (Good)</option>
                    <option value={60}>60%+ (Potential)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Work Arrangement
                  </label>
                  <select
                    value={filters.workArrangement}
                    onChange={(e) => handleFilterChange({ workArrangement: e.target.value as JobFilters['workArrangement'] })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All types</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="Enter location..."
                    value={filters.location || ''}
                    onChange={(e) => handleFilterChange({ location: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showSavedOnly}
                      onChange={(e) => handleFilterChange({ showSavedOnly: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Show saved jobs only
                    </span>
                  </label>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilters({ matchScoreMin: 0, workArrangement: 'All', location: '', showSavedOnly: false })
                      onFilter?.({ matchScoreMin: 0, workArrangement: 'All', location: '', showSavedOnly: false })
                    }}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Job Cards Grid */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">No jobs found</h3>
            <p className="text-slate-600 dark:text-slate-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onViewDetails={() => onViewDetails?.(job.id)}
                onSave={() => job.isSaved ? onUnsaveJob?.(job.id) : onSaveJob?.(job.id)}
                onApply={() => onApply?.(job.id)}
                getMatchScoreColor={getMatchScoreColor}
                getMatchScoreLabel={getMatchScoreLabel}
                formatSalary={formatSalary}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface JobCardProps {
  job: Job
  onViewDetails?: () => void
  onSave?: () => void
  onApply?: () => void
  getMatchScoreColor: (score: number) => string
  getMatchScoreLabel: (score: number) => string
  formatSalary: (min: number, max: number) => string
}

function JobCard({ job, onViewDetails, onSave, onApply, getMatchScoreColor, getMatchScoreLabel, formatSalary }: JobCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer"
      onClick={onViewDetails}
    >
      {/* Match Score Badge */}
      <div className="absolute -top-3 -right-3">
        <div className={`relative px-4 py-2 rounded-xl border-2 font-bold text-sm ${getMatchScoreColor(job.matchScore)} shadow-lg`}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>{job.matchScore}%</span>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap opacity-90">
            {getMatchScoreLabel(job.matchScore)}
          </div>
        </div>
      </div>

      {/* Bookmark Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onSave?.()
        }}
        className="absolute top-6 right-6 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        {job.isSaved ? (
          <BookmarkCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-current" />
        ) : (
          <Bookmark className="w-5 h-5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" />
        )}
      </button>

      {/* Company Logo & Header */}
      <div className="flex items-start gap-4 mb-4 pr-8">
        <img
          src={job.companyLogo}
          alt={`${job.company} logo`}
          className="w-14 h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-1 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {job.title}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{job.company}</p>
        </div>
      </div>

      {/* Job Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{job.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Briefcase className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{job.workArrangement}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <DollarSign className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{formatSalary(job.salaryMin, job.salaryMax)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <TrendingUp className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Posted {new Date(job.postedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Skills */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Required Skills
        </p>
        <div className="flex flex-wrap gap-2">
          {job.requiredSkills.slice(0, 5).map((skill) => {
            const isMissing = job.missingSkills.includes(skill)
            return (
              <span
                key={skill}
                className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                  isMissing
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {skill}
              </span>
            )
          })}
        </div>
      </div>

      {/* Missing Skills Alert */}
      {job.missingSkills.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            <span className="font-semibold">{job.missingSkills.length} skill gap{job.missingSkills.length > 1 ? 's' : ''}</span>
            {' '}— Consider highlighting transferable skills
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails?.()
          }}
          className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onApply?.()
          }}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
        >
          Apply Now
        </button>
      </div>

      {/* Hover Effect Overlay */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-emerald-500/5 pointer-events-none transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
