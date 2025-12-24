import { ThumbsUp, Edit2 } from 'lucide-react'
import type { Skill } from '../types'

interface SkillsGridProps {
  skills: Skill[]
  onEditSkills?: () => void
}

export function SkillsGrid({ skills, onEditSkills }: SkillsGridProps) {
  // Sort skills by endorsements (highest first)
  const sortedSkills = [...skills].sort((a, b) => b.endorsements - a.endorsements)
  const maxEndorsements = sortedSkills[0]?.endorsements || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Skills & Endorsements
        </h2>
        {onEditSkills && (
          <button
            onClick={onEditSkills}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md"
          >
            <Edit2 className="w-4 h-4" />
            <span className="text-sm font-medium">Edit Skills</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedSkills.map((skill) => {
          const endorsementPercentage = (skill.endorsements / maxEndorsements) * 100

          return (
            <div
              key={skill.id}
              className="group relative bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg"
            >
              {/* Skill name */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {skill.name}
                </h3>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{skill.endorsements}</span>
                </div>
              </div>

              {/* Endorsement bar */}
              <div className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-emerald-500 dark:from-blue-600 dark:to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${endorsementPercentage}%` }}
                />
              </div>

              {/* Endorsement label */}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {skill.endorsements} {skill.endorsements === 1 ? 'endorsement' : 'endorsements'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
