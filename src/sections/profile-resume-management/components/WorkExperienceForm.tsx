import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Save, Briefcase, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useWorkExperience } from '@/hooks/useWorkExperience'
import type { WorkExperience } from '../types'

export function WorkExperienceForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const experienceId = searchParams.get('id')
  const { workExperience, addWorkExperience, updateWorkExperience } = useWorkExperience()

  const existingExperience = experienceId
    ? workExperience.find((exp) => exp.id === experienceId)
    : null

  const [formData, setFormData] = useState({
    company: existingExperience?.company || '',
    position: existingExperience?.position || '',
    location: existingExperience?.location || '',
    startDate: existingExperience?.startDate || '',
    endDate: existingExperience?.endDate || '',
    current: existingExperience?.current || false,
    description: existingExperience?.description || '',
    accomplishments: existingExperience?.accomplishments || [''],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (existingExperience) {
      setFormData({
        company: existingExperience.company,
        position: existingExperience.position,
        location: existingExperience.location,
        startDate: existingExperience.startDate,
        endDate: existingExperience.endDate || '',
        current: existingExperience.current,
        description: existingExperience.description,
        accomplishments: existingExperience.accomplishments.length > 0
          ? existingExperience.accomplishments
          : [''],
      })
    }
  }, [existingExperience])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required'
    }
    if (!formData.position.trim()) {
      newErrors.position = 'Position title is required'
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }
    if (!formData.current && !formData.endDate) {
      newErrors.endDate = 'End date is required unless this is your current position'
    }
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date'
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the validation errors')
      return
    }

    setIsSubmitting(true)

    try {
      const data = {
        ...formData,
        endDate: formData.current ? null : formData.endDate,
        accomplishments: formData.accomplishments.filter((acc) => acc.trim() !== ''),
      }

      if (experienceId) {
        await updateWorkExperience(experienceId, data)
        toast.success('Work experience updated successfully!')
      } else {
        await addWorkExperience(data)
        toast.success('Work experience added successfully!')
      }

      navigate('/profile')
    } catch (error) {
      console.error('Error saving work experience:', error)
      toast.error('Failed to save work experience. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  const handleAddAccomplishment = () => {
    setFormData({
      ...formData,
      accomplishments: [...formData.accomplishments, ''],
    })
  }

  const handleRemoveAccomplishment = (index: number) => {
    const newAccomplishments = formData.accomplishments.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      accomplishments: newAccomplishments.length > 0 ? newAccomplishments : [''],
    })
  }

  const handleAccomplishmentChange = (index: number, value: string) => {
    const newAccomplishments = [...formData.accomplishments]
    newAccomplishments[index] = value
    setFormData({
      ...formData,
      accomplishments: newAccomplishments,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-lg">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {experienceId ? 'Edit Work Experience' : 'Add Work Experience'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {experienceId
                  ? 'Update your work experience details'
                  : 'Add a new work experience entry'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            {/* Company & Position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company */}
              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.company
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Acme Corporation"
                />
                {errors.company && (
                  <p className="mt-1 text-sm text-red-500">{errors.company}</p>
                )}
              </div>

              {/* Position */}
              <div>
                <label
                  htmlFor="position"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Position Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.position
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Senior Software Engineer"
                />
                {errors.position && (
                  <p className="mt-1 text-sm text-red-500">{errors.position}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.location
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="San Francisco, CA"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-500">{errors.location}</p>
              )}
            </div>

            {/* Dates */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Start Date */}
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.startDate
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    End Date {!formData.current && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    disabled={formData.current}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.endDate
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Current Position Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.current}
                  onChange={(e) =>
                    setFormData({ ...formData, current: e.target.checked, endDate: '' })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  I currently work here
                </span>
              </label>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.description
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
                placeholder="Describe your role and responsibilities..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            {/* Accomplishments */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Key Accomplishments
                </label>
                <button
                  type="button"
                  onClick={handleAddAccomplishment}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Accomplishment
                </button>
              </div>
              <div className="space-y-3">
                {formData.accomplishments.map((accomplishment, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={accomplishment}
                      onChange={(e) => handleAccomplishmentChange(index, e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe a key achievement or accomplishment..."
                    />
                    {formData.accomplishments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAccomplishment(index)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span className="font-medium">
                {isSubmitting ? 'Saving...' : experienceId ? 'Update Experience' : 'Add Experience'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
