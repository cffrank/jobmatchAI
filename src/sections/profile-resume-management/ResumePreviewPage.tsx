import { useNavigate } from 'react-router-dom'
import { ResumePreview } from './components/ResumePreview'
import data from './data.json'

export default function ResumePreviewPage() {
  const navigate = useNavigate()

  const handleDownload = (format: 'pdf' | 'docx' | 'txt') => {
    console.log('Download resume as:', format)
    // In a real app, this would trigger a download
  }

  const handleEdit = () => {
    navigate('/profile/edit')
  }

  const handleClose = () => {
    navigate('/profile')
  }

  return (
    <ResumePreview
      resume={data.resume}
      workExperience={data.workExperience}
      education={data.education}
      skills={data.skills}
      onDownload={handleDownload}
      onEdit={handleEdit}
      onClose={handleClose}
    />
  )
}
