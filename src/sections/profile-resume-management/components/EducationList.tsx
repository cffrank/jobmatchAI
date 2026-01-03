import { GraduationCap, Calendar, MapPin, Edit2, Trash2, Plus } from 'lucide-react'
import type { Education } from '../types'

interface EducationListProps {
  education: Education[]
  onEditEducation?: (id: string) => void
  onDeleteEducation?: (id: string) => void
  onAddEducation?: () => void
}

export function EducationList({
  education,
  onEditEducation,
  onDeleteEducation,
  onAddEducation,
}: EducationListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Education
        </h2>
        {onAddEducation && (
          <button
            onClick={onAddEducation}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Education</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {education.map((edu) => (
          <div
            key={edu.id}
            className="group bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all hover:shadow-lg"
          >
            <div className="flex gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 flex items-center justify-center shadow-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {edu.degree}
                    </h3>
                    <p className="text-lg text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
                      {edu.school}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span>{edu.field}</span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {formatDate(edu.startDate)} - {formatDate(edu.endDate)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {edu.location}
                      </span>
                      {edu.gpa && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                          GPA: {edu.gpa}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEditEducation && (
                      <button
                        onClick={() => onEditEducation(edu.id)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDeleteEducation && (
                      <button
                        onClick={() => onDeleteEducation(edu.id)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Highlights */}
                {(edu.highlights?.length ?? 0) > 0 && (
                  <ul className="space-y-1.5 mt-4">
                    {edu.highlights.map((highlight, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm text-slate-600 dark:text-slate-400"
                      >
                        <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                        <span className="flex-1">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
