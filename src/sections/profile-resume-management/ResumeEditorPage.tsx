import { useNavigate } from 'react-router-dom'
import { ResumeEditor } from './components/ResumeEditor'
import data from './data.json'
import type { Resume } from './types'

export default function ResumeEditorPage() {
  const navigate = useNavigate()

  const handleSave = (resume: Resume) => {
    console.log('Save resume:', resume)
    // In a real app, this would save to backend
    // For now, navigate to preview
    navigate('/profile/preview')
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  const handlePreview = () => {
    navigate('/profile/preview')
  }

  return (
    <ResumeEditor
      resume={data.resume}
      workExperience={data.workExperience}
      education={data.education}
      skills={data.skills}
      onSave={handleSave}
      onCancel={handleCancel}
      onPreview={handlePreview}
    />
  )
}
