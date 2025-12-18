import { Download, Edit2, X, FileText, Check } from 'lucide-react'
import type { ResumePreviewProps } from '@/../product/sections/profile-resume-management/types'

export function ResumePreview({
  resume,
  workExperience,
  education,
  skills,
  onDownload,
  onEdit,
  onClose,
}: ResumePreviewProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Present'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const getExperienceById = (id: string) => {
    return workExperience.find((exp) => exp.id === id)
  }

  const getEducationById = (id: string) => {
    return education.find((edu) => edu.id === id)
  }

  const getSkillById = (id: string) => {
    return skills.find((s) => s.id === id)
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">{resume.title}</h1>
              <p className="text-xs text-slate-400">Resume Preview</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Download dropdown */}
            {onDownload && (
              <div className="relative group">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors shadow-md">
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>

                {/* Dropdown menu */}
                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
                  {resume.formats.map((format) => (
                    <button
                      key={format}
                      onClick={() => onDownload(format)}
                      className="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors flex items-center justify-between"
                    >
                      <span>Download as {format.toUpperCase()}</span>
                      <Check className="w-4 h-4 text-emerald-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="font-medium">Edit</span>
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resume Content - A4 paper simulation */}
      <div className="py-8 px-6">
        <div className="max-w-[210mm] mx-auto">
          {/* Paper */}
          <div className="bg-white shadow-2xl" style={{ minHeight: '297mm' }}>
            {/* Content with A4 padding */}
            <div className="px-16 py-12">
              {/* Header */}
              <div className="text-center mb-8 pb-6 border-b-2 border-slate-200">
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  {resume.sections.header.name}
                </h1>
                <h2 className="text-xl text-blue-600 font-semibold mb-4">
                  {resume.sections.header.title}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
                  <span>{resume.sections.header.contact.email}</span>
                  <span>•</span>
                  <span>{resume.sections.header.contact.phone}</span>
                  <span>•</span>
                  <span>{resume.sections.header.contact.location}</span>
                  <span>•</span>
                  <span className="text-blue-600">
                    {resume.sections.header.contact.linkedIn}
                  </span>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b border-slate-300 uppercase tracking-wide">
                  Professional Summary
                </h3>
                <p className="text-slate-700 leading-relaxed">{resume.sections.summary}</p>
              </div>

              {/* Experience */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-300 uppercase tracking-wide">
                  Professional Experience
                </h3>
                <div className="space-y-6">
                  {resume.sections.experience.map((expId) => {
                    const exp = getExperienceById(expId)
                    if (!exp) return null

                    return (
                      <div key={expId}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              {exp.position}
                            </h4>
                            <p className="text-sm font-semibold text-blue-600">
                              {exp.company}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600 font-medium">
                              {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                            </p>
                            <p className="text-sm text-slate-500">{exp.location}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-2 italic">
                          {exp.description}
                        </p>
                        <ul className="space-y-1.5">
                          {exp.accomplishments.map((accomplishment, i) => (
                            <li
                              key={i}
                              className="text-sm text-slate-700 flex gap-2 leading-relaxed"
                            >
                              <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-blue-500" />
                              <span className="flex-1">{accomplishment}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Education */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-300 uppercase tracking-wide">
                  Education
                </h3>
                <div className="space-y-4">
                  {resume.sections.education.map((eduId) => {
                    const edu = getEducationById(eduId)
                    if (!edu) return null

                    return (
                      <div key={eduId}>
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              {edu.degree} in {edu.field}
                            </h4>
                            <p className="text-sm font-semibold text-emerald-600">
                              {edu.school}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600 font-medium">
                              {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                            </p>
                            {edu.gpa && (
                              <p className="text-sm text-slate-600">GPA: {edu.gpa}</p>
                            )}
                          </div>
                        </div>
                        {edu.highlights.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {edu.highlights.map((highlight, i) => (
                              <li
                                key={i}
                                className="text-sm text-slate-700 flex gap-2 leading-relaxed"
                              >
                                <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-emerald-500" />
                                <span className="flex-1">{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b border-slate-300 uppercase tracking-wide">
                  Skills & Expertise
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resume.sections.skills.map((skillId) => {
                    const skill = getSkillById(skillId)
                    if (!skill) return null

                    return (
                      <span
                        key={skillId}
                        className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium border border-slate-200"
                      >
                        {skill.name}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Paper shadow effect */}
          <div className="h-2 bg-gradient-to-b from-slate-800/10 to-transparent" />
        </div>
      </div>
    </div>
  )
}
