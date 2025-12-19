import { useNavigate, useParams } from 'react-router-dom'
import { ApplicationEditor } from './components/ApplicationEditor'
import { useApplication, useApplications } from '@/hooks/useApplications'
import { toast } from 'sonner'
import type { GeneratedApplication, ApplicationVariant } from './types'

export default function ApplicationEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  // Use Firestore hook to fetch application
  const { application, loading, error } = useApplication(id)
  const { updateApplication } = useApplications()

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading application...</p>
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
            Error Loading Application
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {error.message}
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

  // Not found state
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

  const handleSelectVariant = async (variantId: string) => {
    try {
      await updateApplication(application.id, {
        selectedVariantId: variantId
      })
      toast.success('Variant selected')
    } catch (error) {
      toast.error('Failed to select variant')
      console.error(error)
    }
  }

  const handleEdit = async (field: string, value: string) => {
    try {
      // Create edit history entry
      const editEntry = {
        timestamp: new Date().toISOString(),
        field,
        originalValue: '', // TODO: Get original value
        editedValue: value,
        reason: 'User edit'
      }

      await updateApplication(application.id, {
        editHistory: [...application.editHistory, editEntry]
      })

      toast.success('Application updated')
    } catch (error) {
      toast.error('Failed to update application')
      console.error(error)
    }
  }

  const handleSave = async () => {
    try {
      await updateApplication(application.id, {
        status: 'draft'
      })
      toast.success('Application saved')
      navigate('/applications')
    } catch (error) {
      toast.error('Failed to save application')
      console.error(error)
    }
  }

  const handleExport = (format: 'pdf' | 'docx') => {
    toast.info(`Export as ${format.toUpperCase()} - coming soon!`)
    // TODO: Implement export functionality via Cloud Function
  }

  const handleEmail = () => {
    toast.info('Email sending - coming soon!')
    // TODO: Implement email dialog
  }

  const handleSubmit = async () => {
    try {
      await updateApplication(application.id, {
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
