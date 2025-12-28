import { useState } from 'react'
import { ArrowLeft, Save, Download, Mail, Send, Sparkles, FileText, Eye, Edit3, Clock, Check } from 'lucide-react'
import type { ApplicationEditorProps } from '../types'

export function ApplicationEditor({
  application,
  selectedVariant,
  onBack,
  onSelectVariant,
  onEdit,
  onSave,
  onExport,
  onEmail,
  onSubmit
}: ApplicationEditorProps) {
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter'>('resume')
  const [previewMode, setPreviewMode] = useState(false)

  const getStatusColor = (status: typeof application.status) => {
    switch (status) {
      case 'submitted':
        return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
      case 'draft':
        return 'bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Applications
            </button>

            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${getStatusColor(application.status)}`}>
                {application.status === 'submitted' && <Check className="w-4 h-4 inline mr-1.5" />}
                {application.status === 'in_progress' && <Edit3 className="w-4 h-4 inline mr-1.5" />}
                {application.status === 'draft' && <FileText className="w-4 h-4 inline mr-1.5" />}
                {application.status.replace('_', ' ').charAt(0).toUpperCase() + application.status.replace('_', ' ').slice(1)}
              </div>

              {application.status !== 'submitted' && (
                <>
                  <button
                    onClick={onSave}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">Save Draft</span>
                  </button>

                  <div className="relative group">
                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-all flex items-center gap-2">
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
                    onClick={onEmail}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">Email</span>
                  </button>

                  <button
                    onClick={onSubmit}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Submit
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">
              {application.jobTitle}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              {application.company}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Variants & AI Rationale */}
          <div className="lg:col-span-3 space-y-6">
            {/* Variant Selector */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                AI Variants
              </h3>
              <div className="space-y-2">
                {application.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => onSelectVariant?.(variant.id)}
                    className={`w-full px-3 py-2.5 rounded-lg border-2 text-left text-sm font-medium transition-all ${
                      selectedVariant.id === variant.id
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-600 dark:border-blue-500 text-blue-900 dark:text-blue-300'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>

              {/* Edit History */}
              {(application.editHistory?.length || 0) > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{application.editHistory?.length || 0} edit{(application.editHistory?.length || 0) > 1 ? 's' : ''} made</span>
                  </div>
                </div>
              )}
            </div>

            {/* AI Rationale */}
            {selectedVariant.aiRationale && selectedVariant.aiRationale.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 rounded-xl border border-blue-200 dark:border-blue-800 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-3">
                  Why This Variant?
                </h3>
                <div className="space-y-2">
                  {selectedVariant.aiRationale.map((rationale, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0" />
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Editor Area */}
          <div className="lg:col-span-9">
            {/* Tab Navigation */}
            <div className="bg-white dark:bg-slate-900 rounded-t-xl border border-b-0 border-slate-200 dark:border-slate-800 px-6 pt-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('resume')}
                    className={`px-4 py-3 font-semibold transition-all border-b-2 ${
                      activeTab === 'resume'
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                        : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-300'
                    }`}
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => setActiveTab('coverLetter')}
                    className={`px-4 py-3 font-semibold transition-all border-b-2 ${
                      activeTab === 'coverLetter'
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                        : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-300'
                    }`}
                  >
                    Cover Letter
                  </button>
                </div>

                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    previewMode
                      ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {previewMode ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  {previewMode ? 'Preview' : 'Edit'}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm min-h-[600px]">
              {activeTab === 'resume' ? (
                <ResumeEditor
                  resume={selectedVariant.resume}
                  previewMode={previewMode}
                  onEdit={onEdit}
                />
              ) : (
                <CoverLetterEditor
                  coverLetter={selectedVariant.coverLetter}
                  previewMode={previewMode}
                  onEdit={onEdit}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ResumeEditorProps {
  resume: ApplicationEditorProps['selectedVariant']['resume']
  previewMode: boolean
  onEdit?: (field: string, value: string) => void
}

function ResumeEditor({ resume, previewMode, onEdit }: ResumeEditorProps) {
  if (previewMode) {
    return (
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3">Summary</h2>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{resume.summary}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3">Experience</h2>
          <div className="space-y-4">
            {resume.experience.map((exp, idx) => (
              <div key={idx}>
                <div className="mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-slate-50">{exp.title}</h3>
                  <p className="text-slate-700 dark:text-slate-300">{exp.company} • {exp.location}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{exp.startDate} - {exp.endDate}</p>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  {exp.bullets.map((bullet, bidx) => (
                    <li key={bidx}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-3">Education</h2>
          {resume.education.map((edu, idx) => (
            <div key={idx}>
              <h3 className="font-bold text-slate-900 dark:text-slate-50">{edu.degree}</h3>
              <p className="text-slate-700 dark:text-slate-300">{edu.school} • {edu.location}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{edu.graduation}</p>
              {edu.focus && <p className="text-sm text-slate-600 dark:text-slate-400 italic">{edu.focus}</p>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Field */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Professional Summary
        </label>
        <textarea
          value={resume.summary}
          onChange={(e) => onEdit?.('resume.summary', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Experience Fields */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Work Experience</h3>
        <div className="space-y-4">
          {resume.experience.map((exp, idx) => (
            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={exp.title}
                  onChange={(e) => onEdit?.(`resume.experience[${idx}].title`, e.target.value)}
                  placeholder="Job Title"
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => onEdit?.(`resume.experience[${idx}].company`, e.target.value)}
                  placeholder="Company"
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                {exp.bullets.map((bullet, bidx) => (
                  <input
                    key={bidx}
                    type="text"
                    value={bullet}
                    onChange={(e) => onEdit?.(`resume.experience[${idx}].bullets[${bidx}]`, e.target.value)}
                    placeholder="Achievement bullet point"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface CoverLetterEditorProps {
  coverLetter: string
  previewMode: boolean
  onEdit?: (field: string, value: string) => void
}

function CoverLetterEditor({ coverLetter, previewMode, onEdit }: CoverLetterEditorProps) {
  if (previewMode) {
    return (
      <div className="prose prose-slate dark:prose-invert max-w-none">
        {coverLetter.split('\n\n').map((paragraph, idx) => (
          <p key={idx} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
            {paragraph}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
        Cover Letter Content
      </label>
      <textarea
        value={coverLetter}
        onChange={(e) => onEdit?.('coverLetter', e.target.value)}
        rows={20}
        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-['Georgia',serif] leading-relaxed"
      />
    </div>
  )
}
