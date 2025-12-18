import { ArrowLeft, Bookmark, BookmarkCheck, Sparkles, MapPin, Briefcase, DollarSign, Calendar, AlertTriangle, CheckCircle2, TrendingUp, Award, Lightbulb } from 'lucide-react'
import type { JobDetailProps } from '../types'

export function JobDetail({
  job,
  onBack,
  onSaveJob,
  onUnsaveJob,
  onApply
}: JobDetailProps) {
  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'from-emerald-500 to-emerald-600'
    if (score >= 70) return 'from-blue-500 to-blue-600'
    return 'from-slate-500 to-slate-600'
  }

  const getMatchScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent Match'
    if (score >= 70) return 'Good Match'
    return 'Potential Match'
  }

  const formatSalary = (min: number, max: number) => {
    const format = (num: number) => `$${(num / 1000).toFixed(0)}k`
    return `${format(min)} - ${format(max)}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getBreakdownColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500 dark:bg-emerald-600'
    if (score >= 70) return 'bg-blue-500 dark:bg-blue-600'
    if (score >= 50) return 'bg-amber-500 dark:bg-amber-600'
    return 'bg-slate-400 dark:bg-slate-600'
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero Section */}
      <div className={`relative bg-gradient-to-br ${getMatchScoreColor(job.matchScore)} text-white overflow-hidden`}>
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white font-medium transition-all mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Jobs
          </button>

          {/* Header Content */}
          <div className="flex items-start gap-6 mb-8">
            <img
              src={job.companyLogo}
              alt={`${job.company} logo`}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white/20 bg-white flex-shrink-0 shadow-xl"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 leading-tight">
                {job.title}
              </h1>
              <p className="text-xl sm:text-2xl text-white/90 font-medium mb-4">
                {job.company}
              </p>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 text-sm sm:text-base">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  <span>{job.workArrangement}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  <span>{formatSalary(job.salaryMin, job.salaryMax)}</span>
                </div>
              </div>
            </div>

            {/* Match Score Badge */}
            <div className="hidden sm:flex flex-col items-center gap-2">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{job.matchScore}%</div>
                    <Sparkles className="w-5 h-5 mx-auto mt-1" />
                  </div>
                </div>
              </div>
              <span className="text-sm font-semibold text-white/90">
                {getMatchScoreLabel(job.matchScore)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onApply}
              className="flex-1 sm:flex-none px-8 py-3.5 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
            >
              Apply Now
            </button>
            <button
              onClick={job.isSaved ? onUnsaveJob : onSaveJob}
              className="px-6 py-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-medium transition-all flex items-center gap-2"
            >
              {job.isSaved ? (
                <>
                  <BookmarkCheck className="w-5 h-5" />
                  <span className="hidden sm:inline">Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-5 h-5" />
                  <span className="hidden sm:inline">Save Job</span>
                </>
              )}
            </button>
          </div>

          {/* Posted Date */}
          <div className="mt-6 flex items-center gap-2 text-sm text-white/80">
            <Calendar className="w-4 h-4" />
            <span>Posted {formatDate(job.postedDate)} • Apply by {formatDate(job.applicationDeadline)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Job Description */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-3">
                <div className="w-2 h-8 bg-blue-600 rounded-full" />
                Job Description
              </h2>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {job.description.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Required Skills */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6 flex items-center gap-3">
                <div className="w-2 h-8 bg-emerald-600 rounded-full" />
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-3">
                {job.requiredSkills.map((skill) => {
                  const isMissing = job.missingSkills.includes(skill)
                  return (
                    <div
                      key={skill}
                      className={`px-4 py-2.5 rounded-xl border-2 font-medium transition-all ${
                        isMissing
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isMissing ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span>{skill}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {job.missingSkills.length > 0 && (
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900 dark:text-amber-300 mb-1">
                        {job.missingSkills.length} Skill Gap{job.missingSkills.length > 1 ? 's' : ''} Identified
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Don't let this discourage you! Highlight your transferable skills and willingness to learn in your application.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Compatibility Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm sticky top-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Compatibility Analysis
              </h3>

              <div className="space-y-4">
                <CompatibilityBar
                  label="Skill Match"
                  score={job.compatibilityBreakdown.skillMatch}
                  getColor={getBreakdownColor}
                />
                <CompatibilityBar
                  label="Experience Match"
                  score={job.compatibilityBreakdown.experienceMatch}
                  getColor={getBreakdownColor}
                />
                <CompatibilityBar
                  label="Industry Match"
                  score={job.compatibilityBreakdown.industryMatch}
                  getColor={getBreakdownColor}
                />
                <CompatibilityBar
                  label="Location Match"
                  score={job.compatibilityBreakdown.locationMatch}
                  getColor={getBreakdownColor}
                />
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Overall Match</span>
                  <span className={`text-2xl font-bold bg-gradient-to-r ${getMatchScoreColor(job.matchScore)} bg-clip-text text-transparent`}>
                    {job.matchScore}%
                  </span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getMatchScoreColor(job.matchScore)} rounded-full transition-all duration-1000`}
                    style={{ width: `${job.matchScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                AI Recommendations
              </h3>

              <div className="space-y-3">
                {job.recommendations.map((recommendation, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-lg border border-blue-200/50 dark:border-blue-800/50"
                  >
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Apply CTA */}
            <button
              onClick={onApply}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              Apply to This Position
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CompatibilityBarProps {
  label: string
  score: number
  getColor: (score: number) => string
}

function CompatibilityBar({ label, score, getColor }: CompatibilityBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{score}%</span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(score)} rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
