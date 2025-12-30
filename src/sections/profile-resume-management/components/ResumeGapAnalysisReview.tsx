import { useState } from 'react'
import { AlertTriangle, CheckCircle2, MessageSquare, Briefcase, ChevronDown, ChevronUp } from 'lucide-react'
import type { ParsedResume } from '@/hooks/useResumeParser'

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

interface ResumeGapAnalysisReviewProps {
  parsedData: ParsedResume
  gapAnalysis: GapAnalysis
  onContinue: (answers: Record<number, string>, narratives: WorkExperienceNarrative[]) => void
  onBack: () => void
}

export function ResumeGapAnalysisReview({
  parsedData,
  gapAnalysis,
  onContinue,
  onBack,
}: ResumeGapAnalysisReviewProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [narratives, setNarratives] = useState<Record<number, string>>({})
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set())
  const [expandedExperiences, setExpandedExperiences] = useState<Set<number>>(new Set())

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleNarrativeChange = (positionIndex: number, narrative: string) => {
    setNarratives((prev) => ({ ...prev, [positionIndex]: narrative }))
  }

  const toggleQuestion = (questionId: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) {
        next.delete(questionId)
      } else {
        next.add(questionId)
      }
      return next
    })
  }

  const toggleExperience = (index: number) => {
    setExpandedExperiences((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleContinue = () => {
    const narrativeArray: WorkExperienceNarrative[] = Object.entries(narratives).map(
      ([index, narrative]) => ({
        position_index: parseInt(index),
        narrative,
      })
    )
    onContinue(answers, narrativeArray)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
      case 'HIGH':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      default:
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Assessment */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              Resume Analysis Complete
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              {gapAnalysis.resume_analysis.overall_assessment}
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {gapAnalysis.resume_analysis.gap_count}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">Gaps</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {gapAnalysis.resume_analysis.red_flag_count}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400">Red Flags</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(
                    gapAnalysis.resume_analysis.urgency
                  )}`}
                >
                  {gapAnalysis.resume_analysis.urgency}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Clarification Questions ({gapAnalysis.clarification_questions.length})
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Answer these questions to strengthen your resume and address potential concerns.
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {gapAnalysis.clarification_questions.map((q) => (
            <div key={q.question_id} className="p-6">
              <button
                onClick={() => toggleQuestion(q.question_id)}
                className="w-full text-left flex items-start gap-3 group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(
                        q.priority
                      )}`}
                    >
                      {q.priority}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {q.gap_addressed}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {q.question}
                  </p>
                </div>
                {expandedQuestions.has(q.question_id) ? (
                  <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {expandedQuestions.has(q.question_id) && (
                <div className="mt-4 pl-0 space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      <strong>Why this matters:</strong> {q.context}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      <strong>Expected outcome:</strong> {q.expected_outcome}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Your Answer
                    </label>
                    <textarea
                      value={answers[q.question_id] || ''}
                      onChange={(e) => handleAnswerChange(q.question_id, e.target.value)}
                      placeholder="Type your answer here..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Work Experience Narratives */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Work Experience Context ({parsedData.workExperience.length})
            </h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            Add context to your positions to explain transitions, overlaps, or short tenures.
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {parsedData.workExperience.map((exp, index) => (
            <div key={index} className="p-6">
              <button
                onClick={() => toggleExperience(index)}
                className="w-full text-left flex items-start gap-3 group"
              >
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {exp.position} at {exp.company}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                  </p>
                </div>
                {expandedExperiences.has(index) ? (
                  <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                )}
              </button>

              {expandedExperiences.has(index) && (
                <div className="mt-4 pl-0 space-y-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                      Add context about this position:
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                      <li>Why did you leave this position?</li>
                      <li>If there are overlaps with other positions, explain why</li>
                      <li>If you were only there briefly, what were the circumstances?</li>
                      <li>Any career transitions or notable changes?</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Position Narrative (Optional)
                    </label>
                    <textarea
                      value={narratives[index] || ''}
                      onChange={(e) => handleNarrativeChange(index, e.target.value)}
                      placeholder="Explain the context around this position..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Back to Preview
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          Continue to Import
        </button>
      </div>
    </div>
  )
}
