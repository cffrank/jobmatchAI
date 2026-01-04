import { Award, TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { JobCompatibilityAnalysis } from '../types'

interface CompatibilityDetailsProps {
  analysis: JobCompatibilityAnalysis
}

export function CompatibilityDetails({ analysis }: CompatibilityDetailsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 6) return 'text-blue-600 dark:text-blue-400'
    if (score >= 4) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-500 dark:bg-emerald-600'
    if (score >= 6) return 'bg-blue-500 dark:bg-blue-600'
    if (score >= 4) return 'bg-amber-500 dark:bg-amber-600'
    return 'bg-red-500 dark:bg-red-600'
  }

  const getRecommendationColor = (recommendation: string) => {
    if (recommendation === 'Strong Match') return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
    if (recommendation === 'Good Match') return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
    if (recommendation === 'Moderate Match') return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
    return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
  }

  const dimensionLabels: Record<string, { name: string; weight: string }> = {
    skillMatch: { name: 'Skill Match', weight: '30%' },
    industryMatch: { name: 'Industry Match', weight: '15%' },
    experienceLevel: { name: 'Experience Level', weight: '20%' },
    locationMatch: { name: 'Location Match', weight: '10%' },
    seniorityLevel: { name: 'Seniority Level', weight: '5%' },
    educationCertification: { name: 'Education & Certification', weight: '5%' },
    softSkillsLeadership: { name: 'Soft Skills & Leadership', weight: '5%' },
    employmentStability: { name: 'Employment Stability', weight: '5%' },
    growthPotential: { name: 'Growth Potential', weight: '3%' },
    companyScaleAlignment: { name: 'Company Scale Alignment', weight: '2%' },
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                Overall Compatibility
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Based on 10-dimension analysis
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {analysis.overallScore}%
            </div>
            <div className={`inline-block mt-2 px-3 py-1 rounded-full border text-sm font-semibold ${getRecommendationColor(analysis.recommendation)}`}>
              {analysis.recommendation}
            </div>
          </div>
        </div>

        {/* Overall Score Progress Bar */}
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full transition-all duration-1000"
            style={{ width: `${analysis.overallScore}%` }}
          />
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Detailed Dimension Scores
        </h3>

        <div className="space-y-5">
          {Object.entries(analysis.dimensions).map(([key, dimension]) => {
            const label = dimensionLabels[key]
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {label.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {label.weight}
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(dimension.score)}`}>
                    {dimension.score}/10
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getScoreBgColor(dimension.score)} rounded-full transition-all duration-700`}
                    style={{ width: `${(dimension.score / 10) * 100}%` }}
                  />
                </div>

                {/* Justification */}
                <p className="text-sm text-slate-600 dark:text-slate-400 pl-1 leading-relaxed">
                  {dimension.justification}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Strengths */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6">
          <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Your Strengths
          </h3>
          <ul className="space-y-3">
            {analysis.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed flex-1">
                  {strength}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Gaps */}
      {analysis.gaps && analysis.gaps.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Areas for Improvement
          </h3>
          <ul className="space-y-3">
            {analysis.gaps.map((gap, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-600 dark:bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Info className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed flex-1">
                  {gap}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Red Flags */}
      {analysis.redFlags && analysis.redFlags.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl border-2 border-red-300 dark:border-red-700 p-6">
          <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            Critical Concerns
          </h3>
          <ul className="space-y-3">
            {analysis.redFlags.map((flag, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-600 dark:bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm text-red-800 dark:text-red-200 leading-relaxed flex-1 font-medium">
                  {flag}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
