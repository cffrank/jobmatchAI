import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Save, Lightbulb, Plus, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSkills } from '@/hooks/useSkills'
import type { Skill } from '../types'

export function SkillsForm() {
  const navigate = useNavigate()
  const { skills, addSkill, updateSkill, deleteSkill } = useSkills()

  const [localSkills, setLocalSkills] = useState<Array<Skill & { isNew?: boolean }>>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newSkillName, setNewSkillName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setLocalSkills(skills)
  }, [skills])

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) {
      toast.error('Please enter a skill name')
      return
    }

    // Check if skill already exists
    const existingSkill = localSkills.find(
      (s) => s.name.toLowerCase() === newSkillName.trim().toLowerCase()
    )
    if (existingSkill) {
      toast.error('This skill already exists')
      return
    }

    try {
      await addSkill({
        name: newSkillName.trim(),
        endorsements: 0,
      })
      setNewSkillName('')
      toast.success('Skill added successfully!')
    } catch (error) {
      console.error('Error adding skill:', error)
      toast.error('Failed to add skill. Please try again.')
    }
  }

  const handleUpdateSkill = async (id: string, name: string, endorsements: number) => {
    if (!name.trim()) {
      toast.error('Skill name cannot be empty')
      return
    }

    try {
      await updateSkill(id, { name: name.trim(), endorsements })
      setEditingId(null)
      toast.success('Skill updated successfully!')
    } catch (error) {
      console.error('Error updating skill:', error)
      toast.error('Failed to update skill. Please try again.')
    }
  }

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('Are you sure you want to delete this skill?')) {
      return
    }

    try {
      await deleteSkill(id)
      toast.success('Skill deleted successfully!')
    } catch (error) {
      console.error('Error deleting skill:', error)
      toast.error('Failed to delete skill. Please try again.')
    }
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  const handleDone = () => {
    navigate('/profile')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 flex items-center justify-center shadow-lg">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Manage Skills
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Add, edit, or remove your professional skills
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Add New Skill */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Add New Skill
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSkill()
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., JavaScript, Project Management, Data Analysis"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add</span>
              </button>
            </div>
          </div>

          {/* Skills List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Your Skills ({localSkills.length})
            </h2>

            {localSkills.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  No skills added yet
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-500">
                  Add your first skill using the form above
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {localSkills
                  .sort((a, b) => b.endorsements - a.endorsements)
                  .map((skill) => (
                    <div
                      key={skill.id}
                      className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-md"
                    >
                      {editingId === skill.id ? (
                        <>
                          <input
                            type="text"
                            value={skill.name}
                            onChange={(e) => {
                              setLocalSkills(
                                localSkills.map((s) =>
                                  s.id === skill.id ? { ...s, name: e.target.value } : s
                                )
                              )
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600 dark:text-slate-400">
                              Endorsements:
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={skill.endorsements}
                              onChange={(e) => {
                                setLocalSkills(
                                  localSkills.map((s) =>
                                    s.id === skill.id
                                      ? { ...s, endorsements: parseInt(e.target.value) || 0 }
                                      : s
                                  )
                                )
                              }}
                              className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSkill(skill.id, skill.name, skill.endorsements)
                              }
                              className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {skill.name}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {skill.endorsements}{' '}
                              {skill.endorsements === 1 ? 'endorsement' : 'endorsements'}
                            </p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setEditingId(skill.id)}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSkill(skill.id)}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
              <span className="font-medium">Cancel</span>
            </button>
            <button
              type="button"
              onClick={handleDone}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span className="font-medium">Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
