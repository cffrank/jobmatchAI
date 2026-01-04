import { Plus, FileText, Mail, Download, Send, Check, Clock, Edit3, Trash2, Sparkles, Calendar } from 'lucide-react'
import type { ApplicationGeneratorProps, GeneratedApplication } from '../types'

export function ApplicationList({
  applications,
  onViewApplication,
  onGenerateNew,
  onExport,
  onEmail,
  onSubmit,
  onDelete
}: ApplicationGeneratorProps) {
  const getStatusColor = (status: GeneratedApplication['status']) => {
    switch (status) {
      case 'submitted':
        return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
      case 'draft':
        return 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700'
      default:
        return 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700'
    }
  }

  const getStatusIcon = (status: GeneratedApplication['status']) => {
    switch (status) {
      case 'submitted':
        return <Check className="w-4 h-4" />
      case 'in_progress':
        return <Edit3 className="w-4 h-4" />
      case 'draft':
        return <FileText className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getStatusLabel = (status: GeneratedApplication['status']) => {
    switch (status) {
      case 'submitted':
        return 'Submitted'
      case 'in_progress':
        return 'In Progress'
      case 'draft':
        return 'Draft'
      default:
        return 'Unknown'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const submittedApplications = applications.filter(app => app.status === 'submitted')
  const inProgressApplications = applications.filter(app => app.status === 'in_progress')
  const draftApplications = applications.filter(app => app.status === 'draft')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
                Application Generator
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                AI-powered resumes and cover letters tailored for each job
              </p>
            </div>
            <button
              onClick={() => onGenerateNew?.('new-job-id')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Generate New</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Applications</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{applications.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Submitted</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{submittedApplications.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgressApplications.length + draftApplications.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-950/30 mb-6">
              <Sparkles className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-3">No applications yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Generate your first AI-powered resume and cover letter tailored to a specific job posting
            </p>
            <button
              onClick={() => onGenerateNew?.('new-job-id')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Generate Application
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onView={() => onViewApplication?.(application.id)}
                onExport={(format) => onExport?.(application.id, format)}
                onEmail={() => onEmail?.(application.id)}
                onSubmit={() => onSubmit?.(application.id)}
                onDelete={() => onDelete?.(application.id)}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                getStatusLabel={getStatusLabel}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ApplicationCardProps {
  application: GeneratedApplication
  onView?: () => void
  onExport?: (format: 'pdf' | 'docx') => void
  onEmail?: () => void
  onSubmit?: () => void
  onDelete?: () => void
  getStatusColor: (status: GeneratedApplication['status']) => string
  getStatusIcon: (status: GeneratedApplication['status']) => React.ReactElement
  getStatusLabel: (status: GeneratedApplication['status']) => string
  formatDate: (dateStr: string) => string
}

function ApplicationCard({
  application,
  onView,
  onExport,
  onEmail,
  onSubmit,
  onDelete,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  formatDate
}: ApplicationCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 truncate">
              {application.jobTitle}
            </h3>
            <div className={`px-3 py-1 rounded-lg border text-sm font-medium flex items-center gap-1.5 ${getStatusColor(application.status)}`}>
              {getStatusIcon(application.status)}
              <span>{getStatusLabel(application.status)}</span>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">{application.company}</p>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Created {formatDate(application.createdAt)}</span>
            </div>
            {application.submittedAt && (
              <div className="flex items-center gap-1.5">
                <Send className="w-4 h-4" />
                <span>Submitted {formatDate(application.submittedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variants & AI Info */}
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
              {(application.variants?.length || 0)} AI-Generated Variant{(application.variants?.length || 0) > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {application.variants?.map(v => v.name).join(', ') || 'No variants'}
            </p>
            {(application.editHistory?.length || 0) > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                {application.editHistory?.length || 0} edit{(application.editHistory?.length || 0) > 1 ? 's' : ''} made
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onView}
          className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          {application.status === 'draft' ? 'Continue Editing' : 'View & Edit'}
        </button>

        {application.status !== 'submitted' && (
          <>
            <button
              onClick={onEmail}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </button>

            <div className="relative group">
              <button className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => onExport?.('pdf')}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-t-lg transition-colors"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => onExport?.('docx')}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-b-lg transition-colors"
                >
                  Export DOCX
                </button>
              </div>
            </div>

            <button
              onClick={onSubmit}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Submit</span>
            </button>
          </>
        )}

        {application.status === 'draft' && (
          <button
            onClick={onDelete}
            className="px-4 py-2.5 bg-red-100 dark:bg-red-950/30 hover:bg-red-200 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        )}
      </div>
    </div>
  )
}
