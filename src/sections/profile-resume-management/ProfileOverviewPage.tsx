import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ProfileOverview } from './components/ProfileOverview'
import { useProfile } from '@/hooks/useProfile'
import { useWorkExperience } from '@/hooks/useWorkExperience'
import { useEducation } from '@/hooks/useEducation'
import { useSkills } from '@/hooks/useSkills'
import { useResumes } from '@/hooks/useResumes'
import { useResumeExport } from '@/hooks/useResumeExport'
import type { ResumeFile } from './types'
import data from './data.json'

export default function ProfileOverviewPage() {
  const navigate = useNavigate()

  // Fetch data from Firestore
  const { profile, loading: profileLoading } = useProfile()
  const { workExperience, loading: workExpLoading, deleteWorkExperience } = useWorkExperience()
  const { education, loading: educationLoading, deleteEducation } = useEducation()
  const { skills, loading: skillsLoading } = useSkills()
  const { resumes, loading: resumesLoading } = useResumes()
  const { downloadResume, uploadResume, deleteResume } = useResumeExport()

  // Resume files state (would be fetched from Firestore in real implementation)
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([])

  const loading = profileLoading || workExpLoading || educationLoading || skillsLoading || resumesLoading

  const handleEditProfile = () => {
    navigate('/profile/edit-profile')
  }

  const handleEditExperience = (id: string) => {
    navigate(`/profile/work-experience?id=${id}`)
  }

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work experience?')) {
      return
    }
    try {
      await deleteWorkExperience(id)
      alert('Work experience deleted successfully!')
    } catch (error) {
      console.error('Error deleting work experience:', error)
      alert('Failed to delete work experience. Please try again.')
    }
  }

  const handleAddExperience = () => {
    navigate('/profile/work-experience')
  }

  const handleEditEducation = (id: string) => {
    navigate(`/profile/education?id=${id}`)
  }

  const handleDeleteEducation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this education entry?')) {
      return
    }
    try {
      await deleteEducation(id)
      alert('Education deleted successfully!')
    } catch (error) {
      console.error('Error deleting education:', error)
      alert('Failed to delete education. Please try again.')
    }
  }

  const handleAddEducation = () => {
    navigate('/profile/education')
  }

  const handleEditSkills = () => {
    navigate('/profile/skills')
  }

  const handleViewResume = () => {
    navigate('/profile/preview')
  }

  const handleEditResume = () => {
    navigate('/profile/edit')
  }

  const handleDownloadResume = async (format: 'pdf' | 'docx' | 'txt') => {
    try {
      // Use first resume if available
      const resumeId = resumes?.[0]?.id || data.resume.id
      await downloadResume(resumeId, format)
    } catch (error) {
      console.error('Error downloading resume:', error)
    }
  }

  const handleAcceptSuggestion = (id: string) => {
    console.log('Accept suggestion:', id)
  }

  const handleDismissSuggestion = (id: string) => {
    console.log('Dismiss suggestion:', id)
  }

  const handleUploadResumeFile = async (file: File) => {
    try {
      const resumeId = resumes?.[0]?.id || data.resume.id
      const downloadURL = await uploadResume(file, resumeId)
      console.log('Resume file uploaded:', downloadURL)

      // Add to local state (would be fetched from Firestore in real implementation)
      const newFile: ResumeFile = {
        id: Date.now().toString(),
        name: file.name,
        format: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.docx') ? 'docx' : 'txt',
        uploadedAt: new Date().toISOString(),
        size: `${(file.size / 1024).toFixed(1)} KB`,
      }
      setResumeFiles([...resumeFiles, newFile])
      alert('Resume file uploaded successfully!')
    } catch (error) {
      console.error('Error uploading resume file:', error)
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDeleteResumeFile = async (format: 'pdf' | 'docx' | 'txt') => {
    try {
      const resumeId = resumes?.[0]?.id || data.resume.id
      await deleteResume(resumeId, format)
      console.log('Resume file deleted:', format)

      // Remove from local state
      setResumeFiles(resumeFiles.filter(f => f.format !== format))
      alert('Resume file deleted successfully!')
    } catch (error) {
      console.error('Error deleting resume file:', error)
      alert(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <ProfileOverview
      user={profile}
      workExperience={workExperience}
      education={education}
      skills={skills}
      resume={resumes?.[0]}
      optimizationSuggestions={data.optimizationSuggestions}
      resumeFiles={resumeFiles}
      onEditProfile={handleEditProfile}
      onEditExperience={handleEditExperience}
      onDeleteExperience={handleDeleteExperience}
      onAddExperience={handleAddExperience}
      onEditEducation={handleEditEducation}
      onDeleteEducation={handleDeleteEducation}
      onAddEducation={handleAddEducation}
      onEditSkills={handleEditSkills}
      onViewResume={handleViewResume}
      onEditResume={handleEditResume}
      onDownloadResume={handleDownloadResume}
      onUploadResumeFile={handleUploadResumeFile}
      onDeleteResumeFile={handleDeleteResumeFile}
      onAcceptSuggestion={handleAcceptSuggestion}
      onDismissSuggestion={handleDismissSuggestion}
    />
  )
}
