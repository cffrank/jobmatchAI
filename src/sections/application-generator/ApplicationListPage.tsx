import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApplicationList } from './components/ApplicationList'
import data from './data.json'
import type { GeneratedApplication } from './types'

export default function ApplicationListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('jobId')

  const [applications, setApplications] = useState<GeneratedApplication[]>(data.applications)

  const handleViewApplication = (applicationId: string) => {
    navigate(`/applications/${applicationId}`)
  }

  const handleGenerateNew = (jobId: string) => {
    console.log('Generate new application for job:', jobId)
    // In a real app, this would call AI API to generate application
    // For now, just navigate to job discovery to select a job
    navigate(`/jobs/${jobId}`)
  }

  const handleExport = (applicationId: string, format: 'pdf' | 'docx') => {
    console.log('Export application:', applicationId, 'as', format)
    // In a real app, this would generate and download the file
  }

  const handleEmail = (applicationId: string) => {
    console.log('Email application:', applicationId)
    // In a real app, this would open email dialog
  }

  const handleSubmit = (applicationId: string) => {
    setApplications(prevApps =>
      prevApps.map(app =>
        app.id === applicationId
          ? { ...app, status: 'submitted' as const, submittedAt: new Date().toISOString() }
          : app
      )
    )
    console.log('Submit application:', applicationId)
    // In a real app, this would submit to backend and create tracker entry
    navigate('/tracker')
  }

  const handleDelete = (applicationId: string) => {
    setApplications(prevApps =>
      prevApps.filter(app => app.id !== applicationId)
    )
    console.log('Delete application:', applicationId)
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
