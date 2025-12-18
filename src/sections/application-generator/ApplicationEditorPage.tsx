import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApplicationEditor } from './components/ApplicationEditor'
import data from './data.json'
import type { GeneratedApplication, ApplicationVariant } from './types'

export default function ApplicationEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [application, setApplication] = useState<GeneratedApplication | undefined>(
    data.applications.find(app => app.id === id)
  )

  if (!application) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Application Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            The application you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate('/applications')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Back to Applications
          </button>
        </div>
      </div>
    )
  }

  const selectedVariant = application.variants.find(
    v => v.id === application.selectedVariantId
  ) || application.variants[0]

  const handleBack = () => {
    navigate('/applications')
  }

  const handleSelectVariant = (variantId: string) => {
    setApplication({
      ...application,
      selectedVariantId: variantId
    })
    console.log('Select variant:', variantId)
  }

  const handleEdit = (field: string, value: string) => {
    console.log('Edit field:', field, 'value:', value)
    // In a real app, this would update the application state
    // and track in edit history
  }

  const handleSave = () => {
    console.log('Save application:', application.id)
    // In a real app, this would save to backend/localStorage
    navigate('/applications')
  }

  const handleExport = (format: 'pdf' | 'docx') => {
    console.log('Export application:', application.id, 'as', format)
    // In a real app, this would generate and download the file
  }

  const handleEmail = () => {
    console.log('Email application:', application.id)
    // In a real app, this would open email dialog
  }

  const handleSubmit = () => {
    setApplication({
      ...application,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    })
    console.log('Submit application:', application.id)
    // In a real app, this would submit to backend and create tracker entry
    navigate('/tracker')
  }

  return (
    <ApplicationEditor
      application={application}
      selectedVariant={selectedVariant}
      onBack={handleBack}
      onSelectVariant={handleSelectVariant}
      onEdit={handleEdit}
      onSave={handleSave}
      onExport={handleExport}
      onEmail={handleEmail}
      onSubmit={handleSubmit}
    />
  )
}
