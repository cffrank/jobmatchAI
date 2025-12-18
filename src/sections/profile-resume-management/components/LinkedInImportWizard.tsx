import { useState } from 'react'
import { ChevronLeft, ChevronRight, Linkedin, CheckCircle2, Loader2, X } from 'lucide-react'
import type { LinkedInImportWizardProps } from '@/../product/sections/profile-resume-management/types'

const steps = [
  {
    title: 'Connect LinkedIn',
    description: 'Authorize JobMatch AI to access your LinkedIn profile',
  },
  {
    title: 'Select Data',
    description: 'Choose which information to import from your profile',
  },
  {
    title: 'Review Import',
    description: 'Verify the data before importing to your resume',
  },
  {
    title: 'Complete',
    description: 'Your profile has been successfully imported',
  },
]

export function LinkedInImportWizard({
  currentStep = 0,
  totalSteps = 4,
  onNext,
  onBack,
  onComplete,
  onCancel,
  onAuthorizeLinkedIn,
}: LinkedInImportWizardProps) {
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [selectedSections, setSelectedSections] = useState({
    basicInfo: true,
    experience: true,
    education: true,
    skills: true,
  })

  const handleAuthorize = async () => {
    setIsAuthorizing(true)
    // Simulate authorization delay
    setTimeout(() => {
      setIsAuthorizing(false)
      onAuthorizeLinkedIn?.()
      onNext?.()
    }, 1500)
  }

  const toggleSection = (section: keyof typeof selectedSections) => {
    setSelectedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Close button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="ml-auto mb-4 flex items-center gap-2 px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">Cancel</span>
          </button>
        )}

        {/* Main card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Progress bar */}
          <div className="h-2 bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="p-8 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-lg">
                <Linkedin className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Import from LinkedIn
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Step {currentStep + 1} of {totalSteps}
                </p>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                        index < currentStep
                          ? 'bg-emerald-500 text-white'
                          : index === currentStep
                          ? 'bg-blue-500 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {index < currentStep ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <p
                      className={`mt-2 text-xs font-medium text-center ${
                        index <= currentStep
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 ${
                        index < currentStep
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Step 0: Connect LinkedIn */}
            {currentStep === 0 && (
              <div className="text-center max-w-md mx-auto">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                  {steps[0].title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  {steps[0].description}. We'll use your profile data to automatically
                  generate your resume.
                </p>

                <button
                  onClick={handleAuthorize}
                  disabled={isAuthorizing}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[#0077B5] hover:bg-[#006399] text-white font-semibold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAuthorizing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Linkedin className="w-6 h-6" />
                      <span>Connect with LinkedIn</span>
                    </>
                  )}
                </button>

                <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                  By connecting, you authorize JobMatch AI to access your public profile
                  information. We never post on your behalf.
                </p>
              </div>
            )}

            {/* Step 1: Select Data */}
            {currentStep === 1 && (
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                  {steps[1].title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {steps[1].description}
                </p>

                <div className="space-y-3">
                  {Object.entries(selectedSections).map(([key, value]) => {
                    const labels = {
                      basicInfo: 'Basic Information',
                      experience: 'Work Experience',
                      education: 'Education',
                      skills: 'Skills & Endorsements',
                    }

                    return (
                      <label
                        key={key}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {labels[key as keyof typeof labels]}
                        </span>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => toggleSection(key as keyof typeof selectedSections)}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Review Import */}
            {currentStep === 2 && (
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                  {steps[2].title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {steps[2].description}
                </p>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      What will be imported:
                    </h3>
                    <ul className="space-y-2">
                      {Object.entries(selectedSections)
                        .filter(([, value]) => value)
                        .map(([key]) => {
                          const labels = {
                            basicInfo: 'Name, headline, contact information',
                            experience: '3 work experience entries',
                            education: '2 education entries',
                            skills: '12+ professional skills',
                          }

                          return (
                            <li
                              key={key}
                              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span>{labels[key as keyof typeof labels]}</span>
                            </li>
                          )
                        })}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your imported data will be used to generate your master resume. You can
                      edit it anytime after import.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Complete */}
            {currentStep === 3 && (
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Import Complete!
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  Your LinkedIn profile has been successfully imported. Your master resume is
                  ready to view and edit.
                </p>

                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium">
                    ✨ Pro Tip: Check the AI optimization suggestions to make your resume even
                    stronger!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {currentStep > 0 && currentStep < totalSteps - 1 && onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="font-medium">Back</span>
              </button>
            )}

            {currentStep < totalSteps - 1 ? (
              <button
                onClick={onNext}
                disabled={currentStep === 0}
                className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{currentStep === 0 ? 'Connecting...' : 'Continue'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              onComplete && (
                <button
                  onClick={onComplete}
                  className="ml-auto px-8 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-semibold transition-colors shadow-lg"
                >
                  Go to Profile
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
