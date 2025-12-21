import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Save, User, Linkedin } from 'lucide-react'
import { toast } from 'sonner'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/lib/supabase'
// UserType import available if needed for type annotations

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

  // Handle LinkedIn OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const linkedInStatus = params.get('linkedin')
    const errorCode = params.get('error')

    if (linkedInStatus === 'success') {
      toast.success('LinkedIn profile imported successfully!', {
        description: 'Your basic profile information has been updated. Please complete any missing details.',
        duration: 6000
      })
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (linkedInStatus === 'error') {
      // Map error codes to user-friendly messages
      const errorMessages: Record<string, string> = {
        user_cancelled: 'LinkedIn import was cancelled.',
        oauth_error: 'LinkedIn authorization failed. Please try again.',
        missing_parameters: 'Invalid OAuth response. Please try again.',
        invalid_state: 'Security validation failed. Please try again.',
        expired_state: 'LinkedIn session expired. Please try again.',
        token_exchange_failed: 'Failed to connect to LinkedIn. Please try again.',
        profile_fetch_failed: 'Failed to retrieve your LinkedIn profile. Please try again.',
        internal_error: 'An unexpected error occurred. Please try again or contact support.'
      }

      const errorMessage = errorMessages[errorCode || 'internal_error'] || 'LinkedIn import failed. Please try again.'

      toast.error('LinkedIn Import Failed', {
        description: errorMessage,
        duration: 6000
      })

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

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

  const handleLinkedInImport = async () => {
    try {
      toast.loading('Connecting to LinkedIn...', { id: 'linkedin-auth' })

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.dismiss('linkedin-auth')
        toast.error('You must be signed in to import from LinkedIn.')
        return
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL
      const response = await fetch(`${backendUrl}/api/auth/linkedin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to start LinkedIn authentication')
      }

      const data = await response.json() as { authUrl: string; state: string }

      toast.dismiss('linkedin-auth')
      toast.success('Redirecting to LinkedIn...')

      // Redirect to LinkedIn OAuth
      window.location.href = data.authUrl
    } catch (error: unknown) {
      console.error('LinkedIn auth error:', error)
      toast.dismiss('linkedin-auth')

      const err = error as { message?: string; status?: number }

      // Show user-friendly error messages based on error type
      if (err.status === 404) {
        toast.error('LinkedIn import is not yet configured. Please contact support or fill out the form manually.', {
          duration: 5000
        })
      } else if (err.status === 401) {
        toast.error('You must be signed in to import from LinkedIn.', {
          duration: 4000
        })
      } else if (err.status === 503) {
        toast.error('LinkedIn integration is not available. Please contact support.', {
          duration: 5000
        })
      } else {
        toast.error(err.message || 'Failed to start LinkedIn import. Please try again.', {
          duration: 4000
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {profile ? 'Edit Profile' : 'Create Profile'}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  {profile ? 'Update your professional information' : 'Start by adding your professional information'}
                </p>
              </div>
            </div>
            {!profile && (
              <button
                type="button"
                onClick={handleLinkedInImport}
                className="px-4 py-2 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Linkedin className="w-5 h-5" />
                Import from LinkedIn
              </button>
            )}
          </div>
          {!profile && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>New here?</strong> Save time by importing your profile from LinkedIn, or fill out the form manually below.
              </p>
            </div>
          )}
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
