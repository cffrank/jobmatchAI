import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { JobDetail } from './components/JobDetail'
import { EditJobForm, type EditJobData } from './components/EditJobForm'
import { useJob } from '../../hooks/useJobs'
import { toast } from 'sonner'

export default function JobDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { job, loading, error, saveJob, unsaveJob, updateJob } = useJob(id)
  const [isEditing, setIsEditing] = useState(false)

  if (error) {
    toast.error('Failed to load job details', {
      description: error.message || 'Please try again',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4 animate-pulse">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
            Loading job details...
          </h1>
        </div>
      </div>
    )
  }

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

  const handleSaveJob = async () => {
    try {
      await saveJob(job.id)
      toast.success('Job saved successfully')
    } catch (err) {
      console.error('Failed to save job:', err)
      toast.error('Failed to save job')
    }
  }

  const handleUnsaveJob = async () => {
    try {
      await unsaveJob(job.id)
      toast.success('Job removed from saved')
    } catch (err) {
      console.error('Failed to unsave job:', err)
      toast.error('Failed to unsave job')
    }
  }

  const handleApply = () => {
    console.log('Apply to job:', job.id)
    navigate(`/applications/new?jobId=${job.id}`)
  }

  const handleEditJob = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleSubmitEdit = async (jobData: EditJobData) => {
    if (!id) return

    try {
      await updateJob(id, jobData)
      toast.success('Job updated successfully')
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update job:', err)
      toast.error('Failed to update job')
    }
  }

  // Show edit form if in editing mode
  if (isEditing && job) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
        <EditJobForm
          job={job}
          onSubmit={handleSubmitEdit}
          onCancel={handleCancelEdit}
        />
      </div>
    )
  }

  return (
    <JobDetail
      job={job}
      onBack={handleBack}
      onSaveJob={handleSaveJob}
      onUnsaveJob={handleUnsaveJob}
      onApply={handleApply}
      onEdit={handleEditJob}
    />
  )
}
