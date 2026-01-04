import { useRef, useState } from 'react'
import { Upload, FileText, Check, AlertCircle } from 'lucide-react'
import { useResumeExport } from '@/hooks/useResumeExport'

interface ResumeUploadProps {
  resumeId: string
  onUploadComplete?: (downloadURL: string) => void
}

/**
 * Component for uploading resume files (PDF, DOCX, TXT) to Supabase Storage
 * Example usage in profile pages for importing existing resumes
 */
export function ResumeUpload({ resumeId, onUploadComplete }: ResumeUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const { uploadResume, uploading, progress, error } = useResumeExport()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploadSuccess(false)
      const downloadURL = await uploadResume(file, resumeId)
      setUploadSuccess(true)
      onUploadComplete?.(downloadURL)

      // Reset success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err) {
      console.error('Upload failed:', err)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      {/* Upload Button */}
      <button
        onClick={handleButtonClick}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
      >
        <Upload className="w-4 h-4" />
        {uploading ? 'Uploading...' : 'Upload Resume File'}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Progress */}
      {uploading && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Uploading...</span>
            <span>{progress.progress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">
            Resume uploaded successfully!
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              Upload failed
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error.message}
            </p>
          </div>
        </div>
      )}

      {/* Format Info */}
      <div className="flex items-start gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <p className="font-medium mb-1">Supported formats:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>PDF (max 5MB)</li>
            <li>DOCX (max 5MB)</li>
            <li>TXT (max 5MB)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
