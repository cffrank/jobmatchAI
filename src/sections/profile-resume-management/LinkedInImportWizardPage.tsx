import { useNavigate } from 'react-router-dom'
import { useLinkedInAuth } from '@/hooks/useLinkedInAuth'
import { LinkedInImportWizard } from './components/LinkedInImportWizard'

export default function LinkedInImportWizardPage() {
  const navigate = useNavigate()
  const { initiateLinkedInAuth, isLoading } = useLinkedInAuth()

  const handleComplete = () => {
    navigate('/profile')
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  const handleAuthorizeLinkedIn = async () => {
    // Trigger the real LinkedIn OAuth flow via Cloud Function
    await initiateLinkedInAuth()
    // After successful authorization, user will be redirected back to /profile
    // The useLinkedInAuth hook will handle the success/error toast notifications
  }

  return (
    <LinkedInImportWizard
      currentStep={0}
      totalSteps={1}
      onComplete={handleComplete}
      onCancel={handleCancel}
      onAuthorizeLinkedIn={handleAuthorizeLinkedIn}
      isAuthorizing={isLoading}
    />
  )
}
