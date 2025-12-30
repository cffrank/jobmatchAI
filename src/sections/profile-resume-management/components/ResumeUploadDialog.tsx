import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useResumeParser, type ParsedResume } from '@/hooks/useResumeParser'
import { ResumeGapAnalysisReview } from './ResumeGapAnalysisReview'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface GapAnalysisQuestion {
  question_id: number
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  gap_addressed: string
  question: string
  context: string
  expected_outcome: string
  answer?: string
}

interface GapAnalysis {
  resume_analysis: {
    overall_assessment: string
    gap_count: number
    red_flag_count: number
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  }
  identified_gaps_and_flags: Array<{
    id: number
    type: 'GAP' | 'RED_FLAG'
    category: string
    description: string
    impact: string
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  }>
  clarification_questions: GapAnalysisQuestion[]
  next_steps: {
    immediate_action: string
    long_term_recommendations: string[]
  }
}

interface WorkExperienceNarrative {
  position_index: number
  narrative: string
}

interface ResumeUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ResumeUploadDialog({ isOpen, onClose, onSuccess }: ResumeUploadDialogProps) {
  const { user } = useAuth()
  const { uploadAndParseResume, applyParsedData, parsing, uploading, progress, error } = useResumeParser()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null)
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null)
  const [analyzingGaps, setAnalyzingGaps] = useState(false)
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({})
  const [workNarratives, setWorkNarratives] = useState<WorkExperienceNarrative[]>([])
  const [step, setStep] = useState<'select' | 'parsing' | 'preview' | 'analyzing' | 'gapReview' | 'applying' | 'done'>('select')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setStep('select')
      setParsedData(null)
      setGapAnalysis(null)
    }
  }

  const analyzeResumeGaps = async (data: ParsedResume): Promise<GapAnalysis> => {
    if (!user) throw new Error('User not authenticated')

    // Get auth session for API call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No active session')

    // Call Workers backend API for gap analysis
    const backendUrl = import.meta.env.VITE_BACKEND_URL
    if (!backendUrl) throw new Error('Backend URL not configured')

    const response = await fetch(`${backendUrl}/api/resume/analyze-gaps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        profile: data.profile,
        workExperience: data.workExperience,
        education: data.education,
        skills: data.skills,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to analyze resume' }))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  const handleUploadAndParse = async () => {
    if (!selectedFile) return

    try {
      // Step 1: Parse resume
      setStep('parsing')
      const data = await uploadAndParseResume(selectedFile)
      setParsedData(data)
      toast.success('Resume parsed successfully!')

      // Step 2: Analyze for gaps
      setStep('analyzing')
      setAnalyzingGaps(true)
      const analysis = await analyzeResumeGaps(data)
      setGapAnalysis(analysis)
      setAnalyzingGaps(false)

      // Step 3: Show gap review
      setStep('gapReview')
      toast.success('Gap analysis complete!')
    } catch (err) {
      console.error('Error processing resume:', err)
      toast.error('Failed to process resume. Please try again.')
      setStep('select')
      setAnalyzingGaps(false)
    }
  }

  const handleGapReviewContinue = (
    answers: Record<number, string>,
    narratives: WorkExperienceNarrative[]
  ) => {
    setQuestionAnswers(answers)
    setWorkNarratives(narratives)
    handleApplyData()
  }

  const handleBackToPreview = () => {
    setStep('preview')
  }

  const saveGapAnalysisData = async () => {
    if (!user || !gapAnalysis) return null

    try {
      // Save gap analysis
      const { data: gapAnalysisRecord, error: gapError } = await supabase
        .from('gap_analyses')
        .insert({
          user_id: user.id,
          overall_assessment: gapAnalysis.resume_analysis.overall_assessment,
          gap_count: gapAnalysis.resume_analysis.gap_count,
          red_flag_count: gapAnalysis.resume_analysis.red_flag_count,
          urgency: gapAnalysis.resume_analysis.urgency,
          identified_gaps_and_flags: gapAnalysis.identified_gaps_and_flags as any,
          next_steps: gapAnalysis.next_steps as any,
        })
        .select()
        .single()

      if (gapError) {
        console.error('Error saving gap analysis:', gapError)
        return null
      }

      // Save answers if any
      if (Object.keys(questionAnswers).length > 0) {
        const answersToInsert = gapAnalysis.clarification_questions
          .filter((q) => questionAnswers[q.question_id])
          .map((q) => ({
            gap_analysis_id: gapAnalysisRecord.id,
            user_id: user.id,
            question_id: q.question_id,
            priority: q.priority,
            gap_addressed: q.gap_addressed,
            question: q.question,
            context: q.context,
            expected_outcome: q.expected_outcome,
            answer: questionAnswers[q.question_id],
          }))

        if (answersToInsert.length > 0) {
          const { error: answersError } = await supabase
            .from('gap_analysis_answers')
            .insert(answersToInsert)

          if (answersError) {
            console.error('Error saving gap analysis answers:', answersError)
          }
        }
      }

      return gapAnalysisRecord.id
    } catch (err) {
      console.error('Error saving gap analysis data:', err)
      return null
    }
  }

  const handleApplyData = async () => {
    if (!parsedData) return

    try {
      setStep('applying')

      // Step 1: Save gap analysis and answers
      await saveGapAnalysisData()

      // Step 2: Apply parsed data (this deletes and re-adds profile data)
      await applyParsedData(parsedData)

      // Step 3: Save work experience narratives (after work experiences are created)
      // We need to wait a bit for the work experiences to be created
      if (workNarratives.length > 0) {
        setTimeout(async () => {
          await saveWorkNarratives()
        }, 1000)
      }

      setStep('done')
      toast.success('Profile updated successfully!')
      setTimeout(() => {
        onSuccess?.()
        handleClose()
      }, 2000)
    } catch (err) {
      console.error('Error applying parsed data:', err)
      toast.error('Failed to update profile. Please try again.')
      setStep('gapReview')
    }
  }

  const saveWorkNarratives = async () => {
    if (!user || workNarratives.length === 0) return

    try {
      // Get the user's work experiences to match position_index
      const { data: workExperiences } = await supabase
        .from('work_experience')
        .select('id')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })

      if (!workExperiences) return

      // Map narratives to work experience IDs
      const narrativesToInsert = workNarratives
        .filter((n) => n.position_index < workExperiences.length && n.narrative.trim())
        .map((n) => ({
          work_experience_id: workExperiences[n.position_index].id,
          user_id: user.id,
          narrative: n.narrative,
        }))

      if (narrativesToInsert.length > 0) {
        const { error } = await supabase
          .from('work_experience_narratives')
          .insert(narrativesToInsert)

        if (error) {
          console.error('Error saving work experience narratives:', error)
        } else {
          console.log(`Saved ${narrativesToInsert.length} work experience narratives`)
        }
      }
    } catch (err) {
      console.error('Error saving work narratives:', err)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setParsedData(null)
    setGapAnalysis(null)
    setQuestionAnswers({})
    setWorkNarratives([])
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
            disabled={step === 'parsing' || step === 'analyzing' || step === 'applying'}
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

                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      ⚠️ Important: This will replace all existing profile data
                    </p>
                    <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                      <li>All current work experience will be deleted</li>
                      <li>All current education will be deleted</li>
                      <li>All current skills will be deleted</li>
                      <li>Profile will be updated with resume data</li>
                    </ul>
                    <p className="text-sm text-amber-900 dark:text-amber-100 mt-2">
                      You'll be able to review the data before importing.
                    </p>
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

          {/* Step 3: Analyzing for Gaps */}
          {step === 'analyzing' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-amber-600 animate-spin" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Analyzing your resume for gaps...
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Our AI is identifying areas that need clarification
              </p>
              <div className="max-w-md mx-auto bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  We're checking for:
                </p>
                <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1 text-left list-disc list-inside">
                  <li>Employment timeline gaps</li>
                  <li>Short job tenures</li>
                  <li>Career transitions</li>
                  <li>Missing information</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 4: Gap Analysis Review */}
          {step === 'gapReview' && parsedData && gapAnalysis && (
            <ResumeGapAnalysisReview
              parsedData={parsedData}
              gapAnalysis={gapAnalysis}
              onContinue={handleGapReviewContinue}
              onBack={handleBackToPreview}
            />
          )}

          {/* Step 5: Preview Parsed Data (Optional - only shown when going back) */}
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

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  ⚠️ This will replace all existing profile data
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  All current work experience, education, and skills will be deleted and replaced with the data shown below.
                </p>
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

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  This is a preview of the parsed data. Click "Continue" to proceed with the gap analysis.
                </p>
              </div>

              <button
                onClick={() => setStep('gapReview')}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Continue to Gap Analysis
              </button>
            </div>
          )}

          {/* Step 6: Applying */}
          {step === 'applying' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-600 animate-spin" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Replacing your profile data...
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Clearing existing data and importing from resume
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
            disabled={step === 'parsing' || step === 'analyzing' || step === 'applying'}
            className="px-6 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
