import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle2, FileText, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useJobParser } from '@/hooks/useJobParser'
import { createJob } from '@/hooks/useJobs'
import { useAuth } from '@/contexts/AuthContext'
import type { ParsedJobData } from '@/types/job-parser'

interface PasteJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobCreated: (jobId: string) => void
}

type WizardStep = 'paste' | 'preview' | 'success'

const MAX_TEXT_LENGTH = 10000

export function PasteJobDialog({ open, onOpenChange, onJobCreated }: PasteJobDialogProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { parseJobText, loading: parsing } = useJobParser()

  // Wizard state
  const [step, setStep] = useState<WizardStep>('paste')
  const [rawText, setRawText] = useState('')
  const [confidence, setConfidence] = useState<number>(0)
  const [warnings, setWarnings] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable form state (initialized from parsed data)
  const [formData, setFormData] = useState<Partial<ParsedJobData>>({
    title: '',
    company: '',
    location: '',
    description: '',
    url: '',
    workArrangement: 'Unknown',
    requiredSkills: [],
    preferredSkills: [],
  })

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError('Please paste some job posting text')
      return
    }

    setError(null)
    const result = await parseJobText(rawText)

    if (result) {
      setFormData(result.job)
      setConfidence(result.metadata.confidence)
      setWarnings(result.metadata.warnings || [])
      setStep('preview')
    } else {
      setError('Failed to parse job posting. Please try again or enter details manually.')
    }
  }

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to save jobs')
      return
    }

    if (!formData.title || !formData.company) {
      setError('Job title and company are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const jobId = await createJob({
        title: formData.title,
        company: formData.company,
        location: formData.location,
        description: formData.description,
        url: formData.url,
        salaryMin: formData.salaryMin,
        salaryMax: formData.salaryMax,
        userId: user.id,
      })

      setStep('success')

      // Notify parent and navigate after short delay
      setTimeout(() => {
        onJobCreated(jobId)
        navigate(`/jobs/${jobId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save job')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setStep('paste')
    setRawText('')
    setFormData({
      title: '',
      company: '',
      location: '',
      description: '',
      url: '',
      workArrangement: 'Unknown',
      requiredSkills: [],
      preferredSkills: [],
    })
    setConfidence(0)
    setWarnings([])
    setError(null)
  }

  const handleClose = () => {
    handleReset()
    onOpenChange(false)
  }

  const getConfidenceBadge = () => {
    let variant: 'default' | 'secondary' | 'destructive' = 'secondary'
    let className = ''
    let label = 'Medium'

    if (confidence >= 80) {
      variant = 'default'
      className = 'bg-green-500 hover:bg-green-600'
      label = 'High'
    } else if (confidence >= 50) {
      variant = 'secondary'
      className = 'bg-yellow-500 hover:bg-yellow-600 text-white'
      label = 'Medium'
    } else {
      variant = 'destructive'
      label = 'Low'
    }

    return (
      <Badge variant={variant} className={className}>
        {label} Confidence ({confidence}%)
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Job from Text
          </DialogTitle>
          <DialogDescription>
            Paste a job posting and AI will extract the details for you
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Paste Text */}
        {step === 'paste' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobText">
                Job Posting Text
                <span className="text-muted-foreground ml-2 text-xs">
                  ({rawText.length}/{MAX_TEXT_LENGTH} characters)
                </span>
              </Label>
              <Textarea
                id="jobText"
                placeholder="Paste the full job posting here (from LinkedIn, Indeed, company website, etc.)..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                rows={12}
                className="resize-y font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Include job title, company name, location, description, requirements, and any other details
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={!rawText.trim() || parsing}
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Parse Job
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Edit */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Confidence & Warnings */}
            <div className="flex items-center gap-3">
              {getConfidenceBadge()}
              {warnings.length > 0 && (
                <div className="flex-1">
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                          Warnings:
                        </p>
                        <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                          {warnings.map((warning, i) => (
                            <li key={i}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Review and edit the extracted details before saving
            </p>

            {/* Editable Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="required">
                  Job Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="required">
                  Company *
                </Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Google"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA or Remote"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Job Posting URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url || ''}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workArrangement">Work Arrangement</Label>
                <Select
                  value={formData.workArrangement || 'Unknown'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      workArrangement: value as 'Remote' | 'Hybrid' | 'On-site' | 'Unknown',
                    })
                  }
                >
                  <SelectTrigger id="workArrangement">
                    <SelectValue placeholder="Select work arrangement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="On-site">On-site</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experienceLevel">Experience Level</Label>
                <Input
                  id="experienceLevel"
                  value={formData.experienceLevel || ''}
                  onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                  placeholder="e.g. Entry Level, Mid Level, Senior"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Minimum Salary (annual)</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  value={formData.salaryMin || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryMin: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 80000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salaryMax">Maximum Salary (annual)</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  value={formData.salaryMax || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salaryMax: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 120000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                className="resize-y"
                placeholder="Job description..."
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleReset}>
                Start Over
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!formData.title || !formData.company || saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Job'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-950/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Job Saved Successfully!</h3>
              <p className="text-sm text-muted-foreground">
                Redirecting to job details...
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
