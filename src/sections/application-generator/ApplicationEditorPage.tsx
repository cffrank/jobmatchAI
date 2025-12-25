import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApplicationEditor } from './components/ApplicationEditor'
import { useApplication, useApplications } from '@/hooks/useApplications'
import { useJob } from '@/hooks/useJobs'
import { generateApplicationVariants } from '@/lib/aiGenerator'
import { exportApplication, ExportError } from '@/lib/exportApplication'
import { EmailDialog } from './components/EmailDialog'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import type { GeneratedApplication } from './types'

export default function ApplicationEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('jobId')

  // Check if this is a new application request
  const isNewApplication = id === 'new'

  // State for generation
  const [generating, setGenerating] = useState(false)
  const [generatedApp, setGeneratedApp] = useState<GeneratedApplication | null>(null)

  // State for email dialog (reserved for future implementation)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentApplicationId, setCurrentApplicationId] = useState<string | null>(null)

  // Use Firestore hook to fetch application (skip if creating new)
  const { application, loading, error } = useApplication(isNewApplication ? undefined : id)
  const { updateApplication } = useApplications()

  // Fetch job details if generating new application
  const { job, loading: jobLoading } = useJob(jobId || undefined)

  // Generate application when data is ready
  useEffect(() => {
    async function generateApp() {
      if (!isNewApplication || !jobId || !job || generating || generatedApp) {
        return
      }

      setGenerating(true)
      try {
        // Call Cloud Function - it handles all data fetching and AI generation
        const newApp = await generateApplicationVariants(jobId)

        setGeneratedApp(newApp)
        toast.success('Application generated! Review and edit as needed.')
      } catch (error: unknown) {
        console.error('Generation error:', error)
        const err = error as { message?: string }
        toast.error(err.message || 'Failed to generate application. Please try again.')
        navigate('/jobs')
      } finally {
        setGenerating(false)
      }
    }

    generateApp()
  }, [isNewApplication, jobId, job, generating, generatedApp, navigate])

  // Handle new application generation FIRST (before loading/error checks)
  if (isNewApplication) {
    if (!jobId) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Missing Job Information
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              To generate a new application, please select a job from the Jobs page.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        </div>
      )
    }

    // Show generating state
    if (generating || jobLoading) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="text-center max-w-2xl mx-auto px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-lime-400 to-lime-500 mb-6 relative">
                <Sparkles className="w-10 h-10 text-white animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-lime-400 animate-ping opacity-75"></div>
              </div>

              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                Generating Your Application
              </h1>

              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                AI is analyzing the job requirements and tailoring your resume and cover letter...
              </p>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 text-left p-4 bg-lime-50 dark:bg-lime-950/20 rounded-lg border border-lime-200 dark:border-lime-800">
                  <div className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">Creating 3 tailored resume variants</span>
                </div>
                <div className="flex items-center gap-3 text-left p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">Generating custom cover letters</span>
                </div>
                <div className="flex items-center gap-3 text-left p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">Optimizing keywords for ATS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // If we have generated app, use that instead of fetching from Firestore
    if (generatedApp) {
      const selectedVariant = generatedApp.variants.find(
        v => v.id === generatedApp.selectedVariantId
      ) || generatedApp.variants[0]

      return (
        <>
          <ApplicationEditor
            application={generatedApp}
            selectedVariant={selectedVariant}
            onBack={() => navigate('/applications')}
            onSelectVariant={async (variantId: string) => {
              try {
                await updateApplication(generatedApp.id, { selectedVariantId: variantId })
                setGeneratedApp({ ...generatedApp, selectedVariantId: variantId })
                toast.success('Variant selected')
              } catch {
                toast.error('Failed to select variant')
              }
            }}
            onEdit={() => {/* handled by ApplicationEditor */}}
            onSave={async () => {
              toast.success('Application saved')
              navigate('/applications')
            }}
            onExport={async (format) => {
              const toastId = toast.loading(`Generating ${format.toUpperCase()}...`)
              try {
                await exportApplication(generatedApp.id, format)
                toast.success(`${format.toUpperCase()} downloaded successfully!`, { id: toastId })
              } catch (error) {
                console.error('Export error:', error)
                const message = error instanceof ExportError
                  ? error.message
                  : `Failed to export ${format.toUpperCase()}. Please try again.`
                toast.error(message, { id: toastId })
              }
            }}
            onEmail={() => {
              setCurrentApplicationId(generatedApp.id)
              setEmailDialogOpen(true)
            }}
            onSubmit={async () => {
              try {
                await updateApplication(generatedApp.id, {
                  status: 'submitted',
                  submittedAt: new Date().toISOString()
                })
                toast.success('Application submitted!')
                navigate('/tracker')
              } catch {
                toast.error('Failed to submit application')
              }
            }}
          />
          <EmailDialog
            application={generatedApp}
            selectedVariant={selectedVariant}
            open={emailDialogOpen}
            onClose={() => setEmailDialogOpen(false)}
          />
        </>
      )
    }

    // If job loading finished but job is null, show error
    if (!jobLoading && !job) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Job Not Found
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              The job you're trying to apply to doesn't exist or you don't have access to it.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        </div>
      )
    }

    // Catch-all: waiting for generation to start (prevents falling through to "Not Found")
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Preparing application...</p>
        </div>
      </div>
    )
  }

  // Loading state for existing applications
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

  // Error state for existing applications
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

  // Not found state for existing applications
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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

  const handleExport = async (format: 'pdf' | 'docx') => {
    const toastId = toast.loading(`Generating ${format.toUpperCase()}...`)
    try {
      await exportApplication(application.id, format)
      toast.success(`${format.toUpperCase()} downloaded successfully!`, { id: toastId })
    } catch (error) {
      console.error('Export error:', error)
      const message = error instanceof ExportError
        ? error.message
        : `Failed to export ${format.toUpperCase()}. Please try again.`
      toast.error(message, { id: toastId })
    }
  }

  const handleEmail = () => {
    setCurrentApplicationId(application.id)
    setEmailDialogOpen(true)
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
    <>
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
      <EmailDialog
        application={application}
        selectedVariant={selectedVariant}
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
      />
    </>
  )
}
