import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useResumeParser, type ParsedResume } from '@/hooks/useResumeParser'

interface ResumeUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ResumeUploadDialog({ isOpen, onClose, onSuccess }: ResumeUploadDialogProps) {
  const { uploadAndParseResume, applyParsedData, parsing, uploading, progress, error } = useResumeParser()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null)
  const [step, setStep] = useState<'select' | 'parsing' | 'preview' | 'applying' | 'done'>('select')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setStep('select')
      setParsedData(null)
    }
  }

  const handleUploadAndParse = async () => {
    if (!selectedFile) return

    try {
      setStep('parsing')
      const data = await uploadAndParseResume(selectedFile)
      setParsedData(data)
      setStep('preview')
      toast.success('Resume parsed successfully!')
    } catch (err) {
      console.error('Error parsing resume:', err)
      toast.error('Failed to parse resume. Please try again.')
      setStep('select')
    }
  }

  const handleApplyData = async () => {
    if (!parsedData) return

    try {
      setStep('applying')
      await applyParsedData(parsedData)
      setStep('done')
      toast.success('Profile updated successfully!')
      setTimeout(() => {
        onSuccess?.()
        handleClose()
      }, 2000)
    } catch (err) {
      console.error('Error applying parsed data:', err)
      toast.error('Failed to update profile. Please try again.')
      setStep('preview')
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setParsedData(null)
    setStep('select')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Import Resume
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Upload your resume to auto-fill your profile
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            disabled={step === 'parsing' || step === 'applying'}
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: File Selection */}
          {step === 'select' && (
            <div className="space-y-6">
              <div
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {selectedFile ? selectedFile.name : 'Choose a file or drag it here'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  PDF or DOCX format, max 10MB
                </p>
                <button
                  type="button"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Browse Files
                </button>
              </div>

              {selectedFile && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>What happens next:</strong>
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-disc list-inside">
                      <li>We'll extract information from your resume using AI</li>
                      <li>You'll be able to review the extracted data</li>
                      <li>Choose which information to import to your profile</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleUploadAndParse}
                    disabled={uploading || parsing}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg transition-colors font-medium"
                  >
                    Parse Resume
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Parsing */}
          {step === 'parsing' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Parsing your resume...
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Our AI is extracting information from your resume
              </p>
              <div className="max-w-md mx-auto">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {progress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Preview Parsed Data */}
          {step === 'preview' && parsedData && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Resume parsed successfully!
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    Review the information below before importing to your profile.
                  </p>
                </div>
              </div>

              {/* Profile Info */}
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Profile Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Name</p>
                    <p className="text-slate-900 dark:text-slate-100">
                      {parsedData.profile.firstName} {parsedData.profile.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Email</p>
                    <p className="text-slate-900 dark:text-slate-100">{parsedData.profile.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Phone</p>
                    <p className="text-slate-900 dark:text-slate-100">{parsedData.profile.phone}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Location</p>
                    <p className="text-slate-900 dark:text-slate-100">{parsedData.profile.location}</p>
                  </div>
                </div>
              </div>

              {/* Work Experience */}
              {parsedData.workExperience.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Work Experience ({parsedData.workExperience.length})
                  </h3>
                  <div className="space-y-3">
                    {parsedData.workExperience.slice(0, 3).map((exp, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {exp.position} at {exp.company}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                        </p>
                      </div>
                    ))}
                    {parsedData.workExperience.length > 3 && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        +{parsedData.workExperience.length - 3} more...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Education */}
              {parsedData.education.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Education ({parsedData.education.length})
                  </h3>
                  <div className="space-y-3">
                    {parsedData.education.map((edu, idx) => (
                      <div key={idx} className="text-sm">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {edu.degree} in {edu.fieldOfStudy}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">{edu.institution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {parsedData.skills.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Skills ({parsedData.skills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {parsedData.skills.slice(0, 10).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                      >
                        {skill.name}
                      </span>
                    ))}
                    {parsedData.skills.length > 10 && (
                      <span className="px-3 py-1 text-slate-600 dark:text-slate-400 text-sm">
                        +{parsedData.skills.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleApplyData}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Import to Profile
              </button>
            </div>
          )}

          {/* Step 4: Applying */}
          {step === 'applying' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Importing to your profile...
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Adding work experience, education, and skills to your profile
              </p>
              <div className="max-w-md mx-auto">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {progress}% complete
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Profile Updated Successfully!
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Your profile has been updated with information from your resume
              </p>
            </div>
          )}

          {/* Error */}
          {error && step !== 'done' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Error</p>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  {error.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleClose}
            disabled={step === 'parsing' || step === 'applying'}
            className="px-6 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
