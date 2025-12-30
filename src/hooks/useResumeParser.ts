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
  const { workExperience, addWorkExperience, deleteWorkExperience } = useWorkExperience()
  const { education, addEducation, deleteEducation } = useEducation()
  const { skills, addSkill, deleteSkill } = useSkills()

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
      console.log('[useResumeParser] Uploading file to:', storagePath)

      const uploadResult = await uploadFile(file, storagePath, 'files')

      // Verify upload succeeded and use the confirmed path
      if (!uploadResult.fullPath) {
        throw new Error('File upload failed - no path returned')
      }

      console.log('[useResumeParser] File uploaded successfully to:', uploadResult.fullPath)

      setUploading(false)
      setParsing(true)
      setProgress(40)

      // Get auth session for API call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Call Railway backend API to parse resume
      const backendUrl = import.meta.env.VITE_BACKEND_URL
      if (!backendUrl) {
        throw new Error('Backend URL not configured')
      }

      // Use the confirmed path from upload result
      const confirmedPath = uploadResult.fullPath
      console.log('[useResumeParser] Sending parse request for path:', confirmedPath)

      const response = await fetch(`${backendUrl}/api/resume/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ storagePath: confirmedPath }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse resume' }))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as ParsedResume

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
   * REPLACES all existing work experience, education, and skills
   */
  const applyParsedData = async (data: ParsedResume): Promise<void> => {
    if (!user) throw new Error('User not authenticated')

    const errors: string[] = []

    try {
      setProgress(0)

      // Step 1: Delete all existing data (REPLACE mode)
      console.log('[applyParsedData] Deleting existing profile data...')

      // Delete all work experience
      console.log(`[applyParsedData] Deleting ${workExperience.length} existing work experience entries...`)
      for (const exp of workExperience) {
        try {
          await deleteWorkExperience(exp.id)
          console.log(`[applyParsedData] ✅ Deleted work experience: ${exp.position} at ${exp.company}`)
        } catch (err) {
          console.error(`[applyParsedData] ⚠️ Failed to delete work experience ${exp.id}:`, err)
          // Continue deleting others even if one fails
        }
      }

      // Delete all education
      console.log(`[applyParsedData] Deleting ${education.length} existing education entries...`)
      for (const edu of education) {
        try {
          await deleteEducation(edu.id)
          console.log(`[applyParsedData] ✅ Deleted education: ${edu.degree} from ${edu.school}`)
        } catch (err) {
          console.error(`[applyParsedData] ⚠️ Failed to delete education ${edu.id}:`, err)
          // Continue deleting others even if one fails
        }
      }

      // Delete all skills
      console.log(`[applyParsedData] Deleting ${skills.length} existing skills...`)
      for (const skill of skills) {
        try {
          await deleteSkill(skill.id)
          console.log(`[applyParsedData] ✅ Deleted skill: ${skill.name}`)
        } catch (err) {
          console.error(`[applyParsedData] ⚠️ Failed to delete skill ${skill.id}:`, err)
          // Continue deleting others even if one fails
        }
      }

      console.log('[applyParsedData] ✅ Existing data cleared')
      setProgress(15)

      // Step 2: Update profile
      console.log('[applyParsedData] Updating profile...')
      try {
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
        console.log('[applyParsedData] ✅ Profile updated')
      } catch (err) {
        const msg = `Profile update failed: ${err instanceof Error ? err.message : String(err)}`
        console.error('[applyParsedData] ❌', msg, err)
        errors.push(msg)
      }
      setProgress(30)

      // Step 3: Add work experience entries
      console.log(`[applyParsedData] Adding ${data.workExperience.length} work experience entries...`)
      for (let i = 0; i < data.workExperience.length; i++) {
        const exp = data.workExperience[i]
        try {
          console.log(`[applyParsedData] Adding work experience ${i + 1}/${data.workExperience.length}: ${exp.position} at ${exp.company}`)
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
          console.log(`[applyParsedData] ✅ Work experience ${i + 1} added`)
        } catch (err) {
          const msg = `Work experience ${i + 1} (${exp.position} at ${exp.company}) failed: ${err instanceof Error ? err.message : String(err)}`
          console.error('[applyParsedData] ❌', msg, err)
          errors.push(msg)
        }
      }
      setProgress(55)

      // Step 4: Add education entries
      console.log(`[applyParsedData] Adding ${data.education.length} education entries...`)
      for (let i = 0; i < data.education.length; i++) {
        const edu = data.education[i]
        try {
          console.log(`[applyParsedData] Adding education ${i + 1}/${data.education.length}: ${edu.degree} from ${edu.institution}`)
          await addEducation({
            school: edu.institution,
            degree: edu.degree,
            field: edu.fieldOfStudy,
            location: '',
            startDate: edu.startDate,
            endDate: edu.endDate || '',
            gpa: edu.grade ? (parseFloat(edu.grade) === parseFloat(edu.grade) ? parseFloat(edu.grade).toString() : undefined) : undefined,
            highlights: [],
          })
          console.log(`[applyParsedData] ✅ Education ${i + 1} added`)
        } catch (err) {
          const msg = `Education ${i + 1} (${edu.degree} from ${edu.institution}) failed: ${err instanceof Error ? err.message : String(err)}`
          console.error('[applyParsedData] ❌', msg, err)
          errors.push(msg)
        }
      }
      setProgress(80)

      // Step 5: Add skills
      console.log(`[applyParsedData] Adding ${data.skills.length} skills...`)
      for (const skill of data.skills) {
        try {
          await addSkill({
            name: skill.name,
            endorsements: skill.endorsements,
          })
        } catch (err) {
          const error = err as Error
          const msg = `Skill "${skill.name}" failed: ${error.message}`
          console.error('[applyParsedData] ❌', msg, err)
          errors.push(msg)
        }
      }
      setProgress(100)

      // If there were errors, throw them all
      if (errors.length > 0) {
        const errorMsg = `Resume import completed with ${errors.length} error(s):\n${errors.join('\n')}`
        console.error('[applyParsedData] Final error summary:', errorMsg)
        localStorage.setItem('resume-import-errors', errorMsg)
        throw new Error(errorMsg)
      }

      console.log('[applyParsedData] ✅ All data imported successfully')
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
