import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { JobDetail } from './components/JobDetail'
import data from './data.json'
import type { Job } from './types'

export default function JobDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | undefined>(
    data.jobs.find(j => j.id === id)
  )

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Job Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            The job you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    )
  }

  const handleBack = () => {
    navigate('/jobs')
  }

  const handleSaveJob = () => {
    setJob({ ...job, isSaved: true })
    console.log('Save job:', job.id)
  }

  const handleUnsaveJob = () => {
    setJob({ ...job, isSaved: false })
    console.log('Unsave job:', job.id)
  }

  const handleApply = () => {
    console.log('Apply to job:', job.id)
    navigate(`/applications/new?jobId=${job.id}`)
  }

  return (
    <JobDetail
      job={job}
      onBack={handleBack}
      onSaveJob={handleSaveJob}
      onUnsaveJob={handleUnsaveJob}
      onApply={handleApply}
    />
  )
}
