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

  const handleAcceptSuggestion = (id: string) => {
    console.log('Accept suggestion:', id)
  }

  const handleDismissSuggestion = (id: string) => {
    console.log('Dismiss suggestion:', id)
  }

  return (
    <ResumeEditor
      resume={{
        ...data.resume,
        type: data.resume.type as 'master' | 'tailored',
        formats: data.resume.formats as ('pdf' | 'docx' | 'txt')[]
      }}
      workExperience={data.workExperience}
      education={data.education}
      skills={data.skills}
      optimizationSuggestions={data.optimizationSuggestions.map(s => ({
        ...s,
        section: s.section as 'summary' | 'experience' | 'education' | 'skills',
        priority: s.priority as 'high' | 'medium' | 'low',
        type: s.type as 'impact' | 'keywords' | 'formatting' | 'organization'
      }))}
      onSave={handleSave}
      onCancel={handleCancel}
      onPreview={handlePreview}
      onAcceptSuggestion={handleAcceptSuggestion}
      onDismissSuggestion={handleDismissSuggestion}
    />
  )
}
