import { FileText, Edit2, Download, Eye } from 'lucide-react'
import type { Resume } from '@/../product/sections/profile-resume-management/types'

interface ResumeActionsProps {
  resume: Resume
  onViewResume?: () => void
  onEditResume?: () => void
  onDownloadResume?: (format: 'pdf' | 'docx' | 'txt') => void
}

export function ResumeActions({
  resume,
  onViewResume,
  onEditResume,
  onDownloadResume,
}: ResumeActionsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950/30 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-lg">
          <FileText className="w-7 h-7 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            {resume.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            Last updated {formatDate(resume.updatedAt)}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {onViewResume && (
              <button
                onClick={onViewResume}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>View Resume</span>
              </button>
            )}

            {onEditResume && (
              <button
                onClick={onEditResume}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-medium transition-all hover:shadow-md"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Resume</span>
              </button>
            )}

            {onDownloadResume && (
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-sm font-medium transition-all hover:shadow-md">
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>

                {/* Dropdown menu */}
                <div className="absolute top-full left-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {resume.formats.map((format) => (
                    <button
                      key={format}
                      onClick={() => onDownloadResume(format)}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 first:rounded-t-lg last:rounded-b-lg transition-colors"
                    >
                      Download as {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
