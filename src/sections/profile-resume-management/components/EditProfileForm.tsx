import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Save, User } from 'lucide-react'
import { toast } from 'sonner'
import { useProfile } from '@/hooks/useProfile'
import type { User as UserType } from '../types'

export function EditProfileForm() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useProfile()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedInUrl: '',
    headline: '',
    summary: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update form data when profile loads from Firestore
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        linkedInUrl: profile.linkedInUrl || '',
        headline: profile.headline || '',
        summary: profile.summary || '',
      })
    }
  }, [profile])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }
    if (!formData.headline.trim()) {
      newErrors.headline = 'Professional headline is required'
    }
    if (!formData.summary.trim()) {
      newErrors.summary = 'Professional summary is required'
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
      await updateProfile(formData)
      toast.success('Profile updated successfully!')
      navigate('/profile')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Edit Profile
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Update your professional information
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.firstName
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.lastName
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Contact Information
              </h2>
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.email
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.phone
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
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
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
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

                {/* LinkedIn URL */}
                <div>
                  <label
                    htmlFor="linkedInUrl"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    id="linkedInUrl"
                    value={formData.linkedInUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedInUrl: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://linkedin.com/in/johndoe"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Professional Information
              </h2>
              <div className="space-y-4">
                {/* Headline */}
                <div>
                  <label
                    htmlFor="headline"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Professional Headline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="headline"
                    value={formData.headline}
                    onChange={(e) =>
                      setFormData({ ...formData, headline: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.headline
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Senior Software Engineer"
                  />
                  {errors.headline && (
                    <p className="mt-1 text-sm text-red-500">{errors.headline}</p>
                  )}
                </div>

                {/* Summary */}
                <div>
                  <label
                    htmlFor="summary"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Professional Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) =>
                      setFormData({ ...formData, summary: e.target.value })
                    }
                    rows={6}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.summary
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
                    placeholder="A brief summary of your professional background and expertise..."
                  />
                  {errors.summary && (
                    <p className="mt-1 text-sm text-red-500">{errors.summary}</p>
                  )}
                </div>
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
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
