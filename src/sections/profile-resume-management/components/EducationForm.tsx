import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Save, GraduationCap, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useEducation } from '@/hooks/useEducation'
import type { Education } from '../types'

export function EducationForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const educationId = searchParams.get('id')
  const { education, addEducation, updateEducation } = useEducation()

  const existingEducation = educationId
    ? education.find((edu) => edu.id === educationId)
    : null

  const [formData, setFormData] = useState({
    school: existingEducation?.school || '',
    degree: existingEducation?.degree || '',
    field: existingEducation?.field || '',
    location: existingEducation?.location || '',
    startDate: existingEducation?.startDate || '',
    endDate: existingEducation?.endDate || '',
    gpa: existingEducation?.gpa || '',
    highlights: existingEducation?.highlights || [''],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (existingEducation) {
      setFormData({
        school: existingEducation.school,
        degree: existingEducation.degree,
        field: existingEducation.field,
        location: existingEducation.location,
        startDate: existingEducation.startDate,
        endDate: existingEducation.endDate,
        gpa: existingEducation.gpa || '',
        highlights: existingEducation.highlights.length > 0
          ? existingEducation.highlights
          : [''],
      })
    }
  }, [existingEducation])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.school.trim()) {
      newErrors.school = 'School name is required'
    }
    if (!formData.degree.trim()) {
      newErrors.degree = 'Degree is required'
    }
    if (!formData.field.trim()) {
      newErrors.field = 'Field of study is required'
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date'
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
        highlights: formData.highlights.filter((highlight) => highlight.trim() !== ''),
      }

      if (educationId) {
        await updateEducation(educationId, data)
        toast.success('Education updated successfully!')
      } else {
        await addEducation(data)
        toast.success('Education added successfully!')
      }

      navigate('/profile')
    } catch (error) {
      console.error('Error saving education:', error)
      toast.error('Failed to save education. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  const handleAddHighlight = () => {
    setFormData({
      ...formData,
      highlights: [...formData.highlights, ''],
    })
  }

  const handleRemoveHighlight = (index: number) => {
    const newHighlights = formData.highlights.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      highlights: newHighlights.length > 0 ? newHighlights : [''],
    })
  }

  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...formData.highlights]
    newHighlights[index] = value
    setFormData({
      ...formData,
      highlights: newHighlights,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {educationId ? 'Edit Education' : 'Add Education'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {educationId
                  ? 'Update your education details'
                  : 'Add a new education entry'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            {/* School & Degree */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* School */}
              <div>
                <label
                  htmlFor="school"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  School Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="school"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.school
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="Stanford University"
                />
                {errors.school && (
                  <p className="mt-1 text-sm text-red-500">{errors.school}</p>
                )}
              </div>

              {/* Degree */}
              <div>
                <label
                  htmlFor="degree"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Degree <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="degree"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.degree
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="Bachelor of Science"
                />
                {errors.degree && (
                  <p className="mt-1 text-sm text-red-500">{errors.degree}</p>
                )}
              </div>
            </div>

            {/* Field & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field of Study */}
              <div>
                <label
                  htmlFor="field"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Field of Study <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="field"
                  value={formData.field}
                  onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.field
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="Computer Science"
                />
                {errors.field && (
                  <p className="mt-1 text-sm text-red-500">{errors.field}</p>
                )}
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
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  placeholder="Stanford, CA"
                />
                {errors.location && (
                  <p className="mt-1 text-sm text-red-500">{errors.location}</p>
                )}
              </div>
            </div>

            {/* Dates & GPA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
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
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.endDate
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>
                )}
              </div>

              {/* GPA */}
              <div>
                <label
                  htmlFor="gpa"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  GPA (Optional)
                </label>
                <input
                  type="text"
                  id="gpa"
                  value={formData.gpa}
                  onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="3.8"
                />
              </div>
            </div>

            {/* Highlights */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Highlights & Achievements
                </label>
                <button
                  type="button"
                  onClick={handleAddHighlight}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Highlight
                </button>
              </div>
              <div className="space-y-3">
                {formData.highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={highlight}
                      onChange={(e) => handleHighlightChange(index, e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Dean's List, Honor Society, Research Assistant, etc."
                    />
                    {formData.highlights.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(index)}
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
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span className="font-medium">
                {isSubmitting ? 'Saving...' : educationId ? 'Update Education' : 'Add Education'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
