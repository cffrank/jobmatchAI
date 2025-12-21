import { Briefcase, MapPin, Calendar, Edit2, Trash2, Plus } from 'lucide-react'
import type { WorkExperience } from '../types'

interface ExperienceTimelineProps {
  experiences: WorkExperience[]
  onEditExperience?: (id: string) => void
  onDeleteExperience?: (id: string) => void
  onAddExperience?: () => void
}

export function ExperienceTimeline({
  experiences,
  onEditExperience,
  onDeleteExperience,
  onAddExperience,
}: ExperienceTimelineProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Present'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Work Experience
        </h2>
        {onAddExperience && (
          <button
            onClick={onAddExperience}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Experience</span>
          </button>
        )}
      </div>

      <div className="relative space-y-8">
        {/* Timeline line */}
        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-blue-500 via-blue-400 to-emerald-400 dark:from-blue-600 dark:via-blue-500 dark:to-emerald-500" />

        {experiences.map((exp) => (
          <div key={exp.id} className="relative pl-16 group">
            {/* Timeline dot */}
            <div className="absolute left-0 top-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-900">
              <Briefcase className="w-6 h-6 text-white" />
            </div>

            {/* Experience card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {exp.position}
                  </h3>
                  <p className="text-lg text-blue-600 dark:text-blue-400 font-semibold mb-2">
                    {exp.company}
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {formatDate(exp.startDate)} - {formatDate(exp.endDate)}
                      {exp.current && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                          Current
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {exp.location}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEditExperience && (
                    <button
                      onClick={() => onEditExperience(exp.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {onDeleteExperience && (
                    <button
                      onClick={() => onDeleteExperience(exp.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                {exp.description}
              </p>

              {/* Accomplishments */}
              {exp.accomplishments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Key Accomplishments
                  </h4>
                  <ul className="space-y-2">
                    {exp.accomplishments.map((accomplishment, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm text-slate-600 dark:text-slate-400"
                      >
                        <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                        <span className="flex-1">{accomplishment}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
