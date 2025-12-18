import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LinkedInImportWizard } from './components/LinkedInImportWizard'

export default function LinkedInImportWizardPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const totalSteps = 3

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    console.log('LinkedIn import completed')
    navigate('/profile')
  }

  const handleCancel = () => {
    navigate('/profile')
  }

  const handleAuthorizeLinkedIn = () => {
    console.log('Authorize LinkedIn clicked')
    // In a real app, this would trigger OAuth flow
    // For now, just move to next step
    setTimeout(() => {
      handleNext()
    }, 1000)
  }

  return (
    <LinkedInImportWizard
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onBack={handleBack}
      onComplete={handleComplete}
      onCancel={handleCancel}
      onAuthorizeLinkedIn={handleAuthorizeLinkedIn}
    />
  )
}
