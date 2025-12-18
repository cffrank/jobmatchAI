import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { JobList } from './components/JobList'
import data from './data.json'
import type { Job, JobFilters } from './types'

export default function JobListPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>(data.jobs)
  const [filters, setFilters] = useState<JobFilters>({
    matchScoreMin: 0,
    workArrangement: 'All',
    showSavedOnly: false
  })

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
    // In a real app, this would filter jobs based on the query
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
    <JobList
      jobs={filteredJobs}
      onViewDetails={handleViewDetails}
      onSaveJob={handleSaveJob}
      onUnsaveJob={handleUnsaveJob}
      onApply={handleApply}
      onSearch={handleSearch}
      onFilter={handleFilter}
    />
  )
}
