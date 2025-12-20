import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JobList } from './components/JobList'
import { JobSearchForm } from './components/JobSearchForm'
import { useJobs } from '../../hooks/useJobs'
import { useJobScraping } from '../../hooks/useJobScraping'
import { toast } from 'sonner'
import type { JobFilters, JobSearchParams } from './types'

export default function JobListPage() {
  const navigate = useNavigate()
  const { jobs, loading, error, saveJob, unsaveJob } = useJobs()
  const [filters, setFilters] = useState<JobFilters>({
    matchScoreMin: 0,
    workArrangement: 'All',
    showSavedOnly: false
  })
  const [showSearchForm, setShowSearchForm] = useState(false)
  const { scrapeJobs, loading: scrapingLoading, error: scrapingError } = useJobScraping()

  const handleViewDetails = (jobId: string) => {
    navigate(`/jobs/${jobId}`)
  }

  const handleSaveJob = async (jobId: string) => {
    try {
      await saveJob(jobId)
      toast.success('Job saved successfully')
    } catch (err) {
      console.error('Failed to save job:', err)
      toast.error('Failed to save job')
    }
  }

  const handleUnsaveJob = async (jobId: string) => {
    try {
      await unsaveJob(jobId)
      toast.success('Job removed from saved')
    } catch (err) {
      console.error('Failed to unsave job:', err)
      toast.error('Failed to unsave job')
    }
  }

  const handleApply = (jobId: string) => {
    console.log('Apply to job:', jobId)
    navigate(`/applications/new?jobId=${jobId}`)
  }

  const handleSearch = (query: string) => {
    console.log('Search:', query)
    // Toggle search form visibility
    if (query) {
      setShowSearchForm(true)
    }
  }

  const handleJobScraping = async (params: JobSearchParams) => {
    const result = await scrapeJobs(params)

    if (result) {
      toast.success(
        `Found ${result.jobCount} jobs!`,
        {
          description: result.errors
            ? `Some sources had errors: ${result.errors.join(', ')}`
            : 'Jobs have been added to your list and ranked by compatibility',
        }
      )

      // Close search form after successful search
      setShowSearchForm(false)
    } else if (scrapingError) {
      toast.error('Job search failed', {
        description: scrapingError,
      })
    }
  }

  const handleFilter = (newFilters: JobFilters) => {
    setFilters(newFilters)
    console.log('Apply filters:', newFilters)
    // In a real app, this would filter jobs based on the filters
  }

  // Show error toast if jobs fetch fails
  if (error) {
    toast.error('Failed to load jobs', {
      description: error.message || 'Please try refreshing the page',
    })
  }

  // Apply filters to jobs
  const filteredJobs = jobs.filter(job => {
    if (filters.showSavedOnly && !job.isSaved) return false
    if (filters.matchScoreMin && job.matchScore && job.matchScore < filters.matchScoreMin) return false
    if (filters.matchScoreMax && job.matchScore && job.matchScore > filters.matchScoreMax) return false
    if (filters.workArrangement && filters.workArrangement !== 'All' && job.workArrangement !== filters.workArrangement) return false
    if (filters.salaryMin && job.salaryMax < filters.salaryMin) return false
    if (filters.salaryMax && job.salaryMin > filters.salaryMax) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Job Search Form */}
      {showSearchForm && (
        <div className="relative">
          <JobSearchForm
            onSearch={handleJobScraping}
            loading={scrapingLoading}
          />
          <button
            onClick={() => setShowSearchForm(false)}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            aria-label="Close search form"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      )}

      {/* Job List */}
      <JobList
        jobs={filteredJobs}
        loading={loading}
        onViewDetails={handleViewDetails}
        onSaveJob={handleSaveJob}
        onUnsaveJob={handleUnsaveJob}
        onApply={handleApply}
        onSearch={handleSearch}
        onFilter={handleFilter}
      />
    </div>
  )
}
