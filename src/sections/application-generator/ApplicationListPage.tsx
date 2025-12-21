import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApplicationList } from './components/ApplicationList'
import { useApplications } from '@/hooks/useApplications'
import { toast } from 'sonner'
import type { GeneratedApplication } from './types'

export default function ApplicationListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('jobId')

  // Use Firestore hook to fetch applications
  const { applications = [], loading, error, updateApplication, deleteApplication } = useApplications()

  const handleViewApplication = (applicationId: string) => {
    navigate(`/applications/${applicationId}`)
  }

  const handleGenerateNew = (jobId?: string) => {
    if (jobId) {
      // Navigate to generation page with job ID
      navigate(`/applications/new?jobId=${jobId}`)
    } else {
      // No job selected, send to jobs page
      navigate('/jobs')
    }
  }

  const handleExport = (applicationId: string, format: 'pdf' | 'docx') => {
    toast.info(`Export as ${format.toUpperCase()} - coming soon!`)
    // TODO: Implement export via Cloud Function
  }

  const handleEmail = (_applicationId: string) => {
    toast.info('Email sending - coming soon!')
    // TODO: Implement email dialog
  }

  const handleSubmit = async (applicationId: string) => {
    try {
      await updateApplication(applicationId, {
        status: 'submitted',
        submittedAt: new Date().toISOString()
      })
      toast.success('Application submitted!')
      navigate('/tracker')
    } catch (error) {
      toast.error('Failed to submit application')
      console.error(error)
    }
  }

  const handleDelete = async (applicationId: string) => {
    try {
      await deleteApplication(applicationId)
      toast.success('Application deleted')
    } catch (error) {
      toast.error('Failed to delete application')
      console.error(error)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading applications...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
            Error Loading Applications
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {error.message}
          </p>
        </div>
      </div>
    )
  }

  // If jobId is in URL, show message to generate
  if (jobId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Generate Application
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            AI-powered application generation will create tailored resume and cover letter for this job.
          </p>
          <button
            onClick={() => handleGenerateNew(jobId)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Generate Now
          </button>
        </div>
      </div>
    )
  }

  return (
    <ApplicationList
      applications={applications}
      onViewApplication={handleViewApplication}
      onGenerateNew={handleGenerateNew}
      onExport={handleExport}
      onEmail={handleEmail}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  )
}
