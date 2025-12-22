import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useFileUpload } from './useFileUpload'
import { useProfile } from './useProfile'
import { useWorkExperience } from './useWorkExperience'
import { useEducation } from './useEducation'
import { useSkills } from './useSkills'

interface ParsedProfile {
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  headline: string
  summary: string
  linkedInUrl?: string
}

interface ParsedWorkExperience {
  company: string
  position: string
  location: string
  startDate: string
  endDate: string | null
  current: boolean
  description: string
  accomplishments: string[]
}

interface ParsedEducation {
  institution: string
  degree: string
  fieldOfStudy: string
  startDate: string
  endDate: string | null
  current: boolean
  grade?: string
}

interface ParsedSkill {
  name: string
  endorsements: number
}

export interface ParsedResume {
  profile: ParsedProfile
  workExperience: ParsedWorkExperience[]
  education: ParsedEducation[]
  skills: ParsedSkill[]
}

export function useResumeParser() {
  const { user } = useAuth()
  const { uploadFile } = useFileUpload({
    maxSizeMB: 10,
    allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  })
  const { updateProfile } = useProfile()
  const { addWorkExperience } = useWorkExperience()
  const { addEducation } = useEducation()
  const { addSkill } = useSkills()

  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const [parsedData, setParsedData] = useState<ParsedResume | null>(null)

  /**
   * Upload resume file and parse it with AI
   */
  const uploadAndParseResume = async (file: File): Promise<ParsedResume> => {
    if (!user) throw new Error('User not authenticated')

    try {
      setUploading(true)
      setProgress(10)
      setError(null)
      setParsedData(null)

      // Upload file to Supabase Storage
      const storagePath = `resumes/${user.id}/${Date.now()}_${file.name}`
      const { downloadURL } = await uploadFile(file, storagePath, 'files')

      setUploading(false)
      setParsing(true)
      setProgress(40)

      // Call Edge Function to parse resume
      const { data, error: parseError } = await supabase.functions.invoke<ParsedResume>('parse-resume', {
        body: { fileUrl: downloadURL },
      })

      if (parseError) {
        console.error('Parse error:', parseError)
        throw parseError
      }

      if (!data) {
        throw new Error('No data returned from resume parser')
      }

      setProgress(100)
      setParsing(false)
      setParsedData(data)
      return data
    } catch (err) {
      const error = err as Error
      setUploading(false)
      setParsing(false)
      setError(error)
      throw error
    }
  }

  /**
   * Apply parsed resume data to user profile
   */
  const applyParsedData = async (data: ParsedResume): Promise<void> => {
    if (!user) throw new Error('User not authenticated')

    try {
      setProgress(0)

      // Update profile
      await updateProfile({
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        email: data.profile.email,
        phone: data.profile.phone,
        location: data.profile.location,
        headline: data.profile.headline,
        summary: data.profile.summary,
        linkedInUrl: data.profile.linkedInUrl || '',
      })
      setProgress(25)

      // Add work experience entries
      for (const exp of data.workExperience) {
        await addWorkExperience({
          company: exp.company,
          position: exp.position,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate || '',
          current: exp.current,
          description: exp.description,
          accomplishments: exp.accomplishments,
        })
      }
      setProgress(50)

      // Add education entries
      for (const edu of data.education) {
        await addEducation({
          institution: edu.institution,
          degree: edu.degree,
          fieldOfStudy: edu.fieldOfStudy,
          startDate: edu.startDate,
          endDate: edu.endDate || '',
          current: edu.current,
          grade: edu.grade || '',
        })
      }
      setProgress(75)

      // Add skills
      for (const skill of data.skills) {
        await addSkill({
          name: skill.name,
          endorsements: skill.endorsements,
        })
      }
      setProgress(100)
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }

  /**
   * Full workflow: upload, parse, and apply
   */
  const importResume = async (file: File): Promise<void> => {
    const data = await uploadAndParseResume(file)
    await applyParsedData(data)
  }

  return {
    uploadAndParseResume,
    applyParsedData,
    importResume,
    parsing,
    uploading,
    progress,
    error,
    parsedData,
  }
}
