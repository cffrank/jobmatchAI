import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JobList } from './components/JobList'
import { JobSearchForm } from './components/JobSearchForm'
import { useJobScraping } from '../../hooks/useJobScraping'
import { toast } from 'sonner'
import data from './data.json'
import type { Job, JobFilters, JobSearchParams } from './types'

export default function JobListPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>(data.jobs)
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

  const handleSaveJob = (jobId: string) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, isSaved: true } : job
      )
    )
    console.log('Save job:', jobId)
  }

  const handleUnsaveJob = (jobId: string) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === jobId ? { ...job, isSaved: false } : job
      )
    )
    console.log('Unsave job:', jobId)
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
      // Add scraped jobs to the list
      const scrapedJobs: Job[] = result.jobs.map(job => ({
        ...job,
        id: job.id || `scraped-${Date.now()}-${Math.random()}`,
        compatibilityBreakdown: job.compatibilityBreakdown || {
          skillMatch: 0,
          experienceMatch: 0,
          industryMatch: 0,
          locationMatch: 0,
        },
        requiredSkills: job.requiredSkills || [],
        missingSkills: job.missingSkills || [],
        recommendations: job.recommendations || [],
      }))

      setJobs(prevJobs => [...scrapedJobs, ...prevJobs])

      toast.success(
        `Found ${result.jobCount} jobs!`,
        {
          description: result.errors
            ? `Some sources had errors: ${result.errors.join(', ')}`
            : 'Jobs have been added to your list',
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

  // Apply filters to jobs
  const filteredJobs = jobs.filter(job => {
    if (filters.showSavedOnly && !job.isSaved) return false
    if (filters.matchScoreMin && job.matchScore < filters.matchScoreMin) return false
    if (filters.matchScoreMax && job.matchScore > filters.matchScoreMax) return false
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
