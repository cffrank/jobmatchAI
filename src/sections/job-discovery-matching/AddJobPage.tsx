import { useNavigate } from 'react-router-dom'
import { ManualJobForm, type ManualJobData } from './components/ManualJobForm'
import { createJob } from '@/hooks/useJobs'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

export default function AddJobPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSubmit = async (jobData: ManualJobData) => {
    if (!user) {
      toast.error('You must be signed in to add jobs')
      return
    }

    try {
      const jobId = await createJob({
        ...jobData,
        userId: user.id,
      })

      toast.success('Job added successfully!')
      // Navigate to the job detail page
      navigate(`/jobs/${jobId}`)
    } catch (error) {
      console.error('Error creating job:', error)
      const err = error as { message?: string }
      toast.error(err.message || 'Failed to add job. Please try again.')
    }
  }

  const handleCancel = () => {
    navigate('/jobs')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </button>

        {/* Form */}
        <ManualJobForm onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </div>
  )
}
