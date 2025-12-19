import { useState } from 'react'
import { FileText, Download, Trash2, Eye, Upload, Check, AlertCircle } from 'lucide-react'
import { useResumeExport, type ResumeFormat } from '@/hooks/useResumeExport'

interface FileItem {
  id: string
  name: string
  format: ResumeFormat
  uploadedAt: string
  size?: string
}

interface FileManagerProps {
  resumeId: string
  files?: FileItem[]
  onUpload?: (file: File) => Promise<void>
  onDelete?: (format: ResumeFormat) => Promise<void>
}

/**
 * File manager component for viewing, downloading, and deleting resume files
 * Shows all uploaded files with actions
 */
export function FileManager({ resumeId, files = [], onUpload, onDelete }: FileManagerProps) {
  const { downloadResume, deleteResume, uploading, progress, error } = useResumeExport()
  const [deletingFormat, setDeletingFormat] = useState<ResumeFormat | null>(null)

  const handleDownload = async (format: ResumeFormat) => {
    try {
      await downloadResume(resumeId, format, `resume.${format}`)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const handleDelete = async (format: ResumeFormat) => {
    if (!confirm(`Are you sure you want to delete the ${format.toUpperCase()} file?`)) {
      return
    }

    try {
      setDeletingFormat(format)
      if (onDelete) {
        await onDelete(format)
      } else {
        await deleteResume(resumeId, format)
      }
    } catch (err) {
      console.error('Delete failed:', err)
      alert(`Failed to delete file: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeletingFormat(null)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Resume Files
        </h3>
        {onUpload && (
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Upload New
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUpload(file)
              }}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* File List */}
      {files.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 mb-2">No files uploaded yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Upload PDF, DOCX, or TXT files
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
            >
              {/* File Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {file.name}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {file.format.toUpperCase()} • {file.size || 'Unknown size'} • {formatDate(file.uploadedAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(file.format)}
                  disabled={uploading}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors disabled:opacity-50"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>

                {onDelete && (
                  <button
                    onClick={() => handleDelete(file.format)}
                    disabled={deletingFormat === file.format}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingFormat === file.format ? (
                      <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && progress && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between text-sm text-blue-700 dark:text-blue-300 mb-2">
            <span>Uploading...</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Operation failed
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error.message}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
