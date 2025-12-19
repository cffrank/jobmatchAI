import { useAuth } from '@/contexts/AuthContext'
import { useFileUpload } from './useFileUpload'
import { storage } from '@/lib/firebase'
import { ref, getDownloadURL } from 'firebase/storage'

export type ResumeFormat = 'pdf' | 'docx' | 'txt'

/**
 * Hook to manage resume file uploads and exports to Firebase Storage
 */
export function useResumeExport() {
  const { user } = useAuth()

  const {
    uploadFile,
    deleteFile,
    uploading,
    progress,
    error,
  } = useFileUpload({
    maxSizeMB: 5, // 5MB limit for resume files
    allowedTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain',
    ],
  })

  /**
   * Upload resume file to storage
   * @param file - Resume file to upload (PDF, DOCX, or TXT)
   * @param resumeId - ID of the resume in Firestore
   * @returns Download URL of uploaded file
   */
  const uploadResume = async (file: File, resumeId: string): Promise<string> => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    // Determine file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !['pdf', 'docx', 'txt'].includes(fileExtension)) {
      throw new Error('Invalid file format. Use PDF, DOCX, or TXT')
    }

    // Generate storage path
    const storagePath = `users/${user.uid}/resumes/${resumeId}/resume.${fileExtension}`

    // Upload file
    const result = await uploadFile(file, storagePath)

    return result.downloadURL
  }

  /**
   * Upload cover letter file to storage
   * @param file - Cover letter file to upload (PDF, DOCX, or TXT)
   * @param applicationId - ID of the application in Firestore
   * @returns Download URL of uploaded file
   */
  const uploadCoverLetter = async (file: File, applicationId: string): Promise<string> => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    // Determine file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !['pdf', 'docx', 'txt'].includes(fileExtension)) {
      throw new Error('Invalid file format. Use PDF, DOCX, or TXT')
    }

    // Generate storage path
    const storagePath = `users/${user.uid}/cover-letters/${applicationId}/cover-letter.${fileExtension}`

    // Upload file
    const result = await uploadFile(file, storagePath)

    return result.downloadURL
  }

  /**
   * Get download URL for an existing resume file
   * @param resumeId - ID of the resume
   * @param format - File format (pdf, docx, txt)
   * @returns Download URL
   */
  const getResumeDownloadURL = async (resumeId: string, format: ResumeFormat): Promise<string> => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    const storagePath = `users/${user.uid}/resumes/${resumeId}/resume.${format}`
    const storageRef = ref(storage, storagePath)

    try {
      return await getDownloadURL(storageRef)
    } catch (error) {
      throw new Error(`Resume file not found: ${format.toUpperCase()}`)
    }
  }

  /**
   * Get download URL for an existing cover letter file
   * @param applicationId - ID of the application
   * @param format - File format (pdf, docx, txt)
   * @returns Download URL
   */
  const getCoverLetterDownloadURL = async (
    applicationId: string,
    format: ResumeFormat
  ): Promise<string> => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    const storagePath = `users/${user.uid}/cover-letters/${applicationId}/cover-letter.${format}`
    const storageRef = ref(storage, storagePath)

    try {
      return await getDownloadURL(storageRef)
    } catch (error) {
      throw new Error(`Cover letter file not found: ${format.toUpperCase()}`)
    }
  }

  /**
   * Delete resume file from storage
   * @param resumeId - ID of the resume
   * @param format - File format to delete
   */
  const deleteResume = async (resumeId: string, format: ResumeFormat): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    const storagePath = `users/${user.uid}/resumes/${resumeId}/resume.${format}`
    await deleteFile(storagePath)
  }

  /**
   * Delete cover letter file from storage
   * @param applicationId - ID of the application
   * @param format - File format to delete
   */
  const deleteCoverLetter = async (applicationId: string, format: ResumeFormat): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User not authenticated')
    }

    const storagePath = `users/${user.uid}/cover-letters/${applicationId}/cover-letter.${format}`
    await deleteFile(storagePath)
  }

  /**
   * Download resume file
   * Triggers browser download
   */
  const downloadResume = async (resumeId: string, format: ResumeFormat, filename?: string) => {
    const downloadURL = await getResumeDownloadURL(resumeId, format)

    // Create temporary link and trigger download
    const link = document.createElement('a')
    link.href = downloadURL
    link.download = filename || `resume.${format}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Download cover letter file
   * Triggers browser download
   */
  const downloadCoverLetter = async (
    applicationId: string,
    format: ResumeFormat,
    filename?: string
  ) => {
    const downloadURL = await getCoverLetterDownloadURL(applicationId, format)

    // Create temporary link and trigger download
    const link = document.createElement('a')
    link.href = downloadURL
    link.download = filename || `cover-letter.${format}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return {
    uploadResume,
    uploadCoverLetter,
    getResumeDownloadURL,
    getCoverLetterDownloadURL,
    deleteResume,
    deleteCoverLetter,
    downloadResume,
    downloadCoverLetter,
    uploading,
    progress,
    error,
  }
}
