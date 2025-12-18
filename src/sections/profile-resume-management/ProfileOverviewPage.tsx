import { useNavigate } from 'react-router-dom'
import { ProfileOverview } from './components/ProfileOverview'
import data from './data.json'

export default function ProfileOverviewPage() {
  const navigate = useNavigate()

  const handleEditProfile = () => {
    console.log('Edit profile clicked')
  }

  const handleEditExperience = (id: string) => {
    console.log('Edit experience:', id)
  }

  const handleDeleteExperience = (id: string) => {
    console.log('Delete experience:', id)
  }

  const handleAddExperience = () => {
    console.log('Add experience clicked')
  }

  const handleEditEducation = (id: string) => {
    console.log('Edit education:', id)
  }

  const handleDeleteEducation = (id: string) => {
    console.log('Delete education:', id)
  }

  const handleAddEducation = () => {
    console.log('Add education clicked')
  }

  const handleEditSkills = () => {
    console.log('Edit skills clicked')
  }

  const handleViewResume = () => {
    navigate('/profile/preview')
  }

  const handleEditResume = () => {
    navigate('/profile/edit')
  }

  const handleDownloadResume = (format: 'pdf' | 'docx' | 'txt') => {
    console.log('Download resume:', format)
  }

  const handleAcceptSuggestion = (id: string) => {
    console.log('Accept suggestion:', id)
  }

  const handleDismissSuggestion = (id: string) => {
    console.log('Dismiss suggestion:', id)
  }

  return (
    <ProfileOverview
      user={data.user}
      workExperience={data.workExperience}
      education={data.education}
      skills={data.skills}
      resume={data.resume}
      optimizationSuggestions={data.optimizationSuggestions}
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
      onAcceptSuggestion={handleAcceptSuggestion}
      onDismissSuggestion={handleDismissSuggestion}
    />
  )
}
