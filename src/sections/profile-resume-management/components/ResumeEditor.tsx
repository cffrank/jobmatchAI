import { useState } from 'react'
import { Save, X, Eye, Plus, Trash2, GripVertical } from 'lucide-react'
import { OptimizationSidebar } from './OptimizationSidebar'
import type { ResumeEditorProps } from '../types'

export function ResumeEditor({
  resume,
  workExperience,
  education,
  skills,
  optimizationSuggestions,
  onSave,
  onCancel,
  onPreview,
  onAcceptSuggestion,
  onDismissSuggestion,
}: ResumeEditorProps) {
  const [editedResume, setEditedResume] = useState(resume)
  const [activeSection, setActiveSection] = useState<string>('header')

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

  const sections = [
    { id: 'header', label: 'Header', icon: '👤' },
    { id: 'summary', label: 'Summary', icon: '📝' },
    { id: 'experience', label: 'Experience', icon: '💼' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'skills', label: 'Skills', icon: '⚡' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Resume Editor
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {editedResume.title}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {onPreview && (
                <button
                  onClick={onPreview}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md"
                >
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">Preview</span>
                </button>
              )}

              {onCancel && (
                <button
                  onClick={onCancel}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium">Cancel</span>
                </button>
              )}

              {onSave && (
                <button
                  onClick={() => onSave(editedResume)}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium transition-colors shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 p-6">
          {/* Section Navigator */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Resume Sections
              </h3>
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    activeSection === section.id
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="text-sm">{section.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Editor Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              {/* Header Section */}
              {activeSection === 'header' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                      Header Information
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editedResume.sections.header.name}
                        onChange={(e) =>
                          setEditedResume({
                            ...editedResume,
                            sections: {
                              ...editedResume.sections,
                              header: {
                                ...editedResume.sections.header,
                                name: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Professional Title
                      </label>
                      <input
                        type="text"
                        value={editedResume.sections.header.title}
                        onChange={(e) =>
                          setEditedResume({
                            ...editedResume,
                            sections: {
                              ...editedResume.sections,
                              header: {
                                ...editedResume.sections.header,
                                title: e.target.value,
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editedResume.sections.header.contact.email}
                        onChange={(e) =>
                          setEditedResume({
                            ...editedResume,
                            sections: {
                              ...editedResume.sections,
                              header: {
                                ...editedResume.sections.header,
                                contact: {
                                  ...editedResume.sections.header.contact,
                                  email: e.target.value,
                                },
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={editedResume.sections.header.contact.phone}
                        onChange={(e) =>
                          setEditedResume({
                            ...editedResume,
                            sections: {
                              ...editedResume.sections,
                              header: {
                                ...editedResume.sections.header,
                                contact: {
                                  ...editedResume.sections.header.contact,
                                  phone: e.target.value,
                                },
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={editedResume.sections.header.contact.location}
                        onChange={(e) =>
                          setEditedResume({
                            ...editedResume,
                            sections: {
                              ...editedResume.sections,
                              header: {
                                ...editedResume.sections.header,
                                contact: {
                                  ...editedResume.sections.header.contact,
                                  location: e.target.value,
                                },
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        value={editedResume.sections.header.contact.linkedIn}
                        onChange={(e) =>
                          setEditedResume({
                            ...editedResume,
                            sections: {
                              ...editedResume.sections,
                              header: {
                                ...editedResume.sections.header,
                                contact: {
                                  ...editedResume.sections.header.contact,
                                  linkedIn: e.target.value,
                                },
                              },
                            },
                          })
                        }
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Section */}
              {activeSection === 'summary' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Professional Summary
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      A brief overview of your professional background and key strengths
                    </p>
                  </div>

                  <div>
                    <textarea
                      value={editedResume.sections.summary}
                      onChange={(e) =>
                        setEditedResume({
                          ...editedResume,
                          sections: {
                            ...editedResume.sections,
                            summary: e.target.value,
                          },
                        })
                      }
                      rows={8}
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Write a compelling professional summary..."
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {editedResume.sections.summary.length} characters
                    </p>
                  </div>
                </div>
              )}

              {/* Experience Section */}
              {activeSection === 'experience' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Work Experience
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {editedResume.sections.experience.length} positions included
                    </p>
                  </div>

                  <div className="space-y-4">
                    {editedResume.sections.experience.map((expId) => {
                      const exp = getExperienceById(expId)
                      if (!exp) return null

                      return (
                        <div
                          key={expId}
                          className="p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className="flex items-start gap-3">
                            <button className="mt-1 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-move">
                              <GripVertical className="w-5 h-5" />
                            </button>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {exp.position}
                              </h3>
                              <p className="text-blue-600 dark:text-blue-400 font-semibold">
                                {exp.company}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {formatDate(exp.startDate)} - {formatDate(exp.endDate)} •{' '}
                                {exp.location}
                              </p>
                            </div>

                            <button className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add Position</span>
                  </button>
                </div>
              )}

              {/* Education Section */}
              {activeSection === 'education' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Education
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {editedResume.sections.education.length} entries included
                    </p>
                  </div>

                  <div className="space-y-4">
                    {editedResume.sections.education.map((eduId) => {
                      const edu = getEducationById(eduId)
                      if (!edu) return null

                      return (
                        <div
                          key={eduId}
                          className="p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                        >
                          <div className="flex items-start gap-3">
                            <button className="mt-1 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-move">
                              <GripVertical className="w-5 h-5" />
                            </button>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {edu.degree}
                              </h3>
                              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {edu.school}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {edu.field} • {formatDate(edu.startDate)} -{' '}
                                {formatDate(edu.endDate)}
                              </p>
                            </div>

                            <button className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add Education</span>
                  </button>
                </div>
              )}

              {/* Skills Section */}
              {activeSection === 'skills' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Skills
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {editedResume.sections.skills.length} skills included
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {editedResume.sections.skills.map((skillId) => {
                      const skill = skills.find((s) => s.id === skillId)
                      if (!skill) return null

                      return (
                        <div
                          key={skillId}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 group"
                        >
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {skill.name}
                          </span>
                          <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add Skill</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* AI Optimization Sidebar */}
          {optimizationSuggestions && optimizationSuggestions.length > 0 && (
            <div className="lg:col-span-2">
              <div className="sticky top-24">
                <OptimizationSidebar
                  suggestions={optimizationSuggestions}
                  onAcceptSuggestion={onAcceptSuggestion}
                  onDismissSuggestion={onDismissSuggestion}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
