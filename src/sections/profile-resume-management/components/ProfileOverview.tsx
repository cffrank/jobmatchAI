import type { ProfileOverviewProps } from '../types'
import { ProfileHeader } from './ProfileHeader'
import { ExperienceTimeline } from './ExperienceTimeline'
import { SkillsGrid } from './SkillsGrid'
import { EducationList } from './EducationList'
import { OptimizationSidebar } from './OptimizationSidebar'
import { ResumeActions } from './ResumeActions'
import { FileManager } from '@/components/FileManager'

export function ProfileOverview({
  user,
  workExperience,
  education,
  skills,
  resume,
  optimizationSuggestions,
  resumeFiles,
  onEditProfile,
  onEditExperience,
  onDeleteExperience,
  onAddExperience,
  onEditEducation,
  onDeleteEducation,
  onAddEducation,
  onEditSkills,
  onViewResume,
  onEditResume,
  onDownloadResume,
  onUploadResumeFile,
  onDeleteResumeFile,
  onAcceptSuggestion,
  onDismissSuggestion,
}: ProfileOverviewProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Profile & Resume
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your professional profile, work experience, and resume
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Header */}
            <ProfileHeader user={user} onEditProfile={onEditProfile} />

            {/* Resume Actions - only show if resume exists */}
            {resume && (
              <ResumeActions
                resume={resume}
                onViewResume={onViewResume}
                onEditResume={onEditResume}
                onDownloadResume={onDownloadResume}
              />
            )}

            {/* Resume Files */}
            {resume && resumeFiles && resumeFiles.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <FileManager
                  resumeId={resume.id}
                  files={resumeFiles}
                  onUpload={onUploadResumeFile}
                  onDelete={onDeleteResumeFile}
                />
              </div>
            )}

            {/* Work Experience */}
            <ExperienceTimeline
              experiences={workExperience}
              onEditExperience={onEditExperience}
              onDeleteExperience={onDeleteExperience}
              onAddExperience={onAddExperience}
            />

            {/* Skills */}
            <SkillsGrid skills={skills} onEditSkills={onEditSkills} />

            {/* Education */}
            <EducationList
              education={education}
              onEditEducation={onEditEducation}
              onDeleteEducation={onDeleteEducation}
              onAddEducation={onAddEducation}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <OptimizationSidebar
              suggestions={optimizationSuggestions}
              onAcceptSuggestion={onAcceptSuggestion}
              onDismissSuggestion={onDismissSuggestion}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
