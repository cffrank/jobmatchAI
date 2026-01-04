import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, MapPin, DollarSign, Briefcase, Building2, X, Plus } from 'lucide-react'

interface JobPreferences {
  desiredRoles: string[]
  locations: string[]
  salaryMin?: number
  salaryMax?: number
  remotePreference: 'remote' | 'hybrid' | 'on-site' | 'any'
  employmentTypes: ('full-time' | 'part-time' | 'contract' | 'internship')[]
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive'
  industries?: string[]
  companySize?: ('startup' | 'small' | 'medium' | 'large' | 'enterprise')[]
}

interface SearchSettings {
  searchFrequency: 'daily' | 'weekly' | 'manual'
  autoSearchEnabled: boolean
  autoApplyEnabled: boolean
  autoApplyFilters?: {
    minMatchScore: number
    maxApplicationsPerDay: number
  }
  notificationPreferences: {
    email: boolean
    inApp: boolean
    matchScoreThreshold: number
  }
}

interface JobPreferencesTabProps {
  jobPreferences?: JobPreferences
  searchSettings?: SearchSettings
  onSave?: (preferences: JobPreferences, settings: SearchSettings) => Promise<void>
  loading?: boolean
}

export function JobPreferencesTab({
  jobPreferences: initialPreferences,
  searchSettings: initialSettings,
  onSave,
  loading = false
}: JobPreferencesTabProps) {
  const [preferences, setPreferences] = useState<JobPreferences>(
    initialPreferences || {
      desiredRoles: [],
      locations: [],
      remotePreference: 'any',
      employmentTypes: ['full-time'],
      industries: [],
      companySize: []
    }
  )

  const [settings, setSettings] = useState<SearchSettings>(
    initialSettings || {
      searchFrequency: 'daily',
      autoSearchEnabled: true,
      autoApplyEnabled: false,
      notificationPreferences: {
        email: true,
        inApp: true,
        matchScoreThreshold: 80
      }
    }
  )

  const [newRole, setNewRole] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newIndustry, setNewIndustry] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setHasChanges(true)
  }, [preferences, settings])

  // Add desired role
  const addRole = () => {
    if (newRole.trim() && !preferences.desiredRoles.includes(newRole.trim())) {
      setPreferences({
        ...preferences,
        desiredRoles: [...preferences.desiredRoles, newRole.trim()]
      })
      setNewRole('')
    }
  }

  // Remove desired role
  const removeRole = (role: string) => {
    setPreferences({
      ...preferences,
      desiredRoles: preferences.desiredRoles.filter(r => r !== role)
    })
  }

  // Add location
  const addLocation = () => {
    if (newLocation.trim() && !preferences.locations.includes(newLocation.trim())) {
      setPreferences({
        ...preferences,
        locations: [...preferences.locations, newLocation.trim()]
      })
      setNewLocation('')
    }
  }

  // Remove location
  const removeLocation = (location: string) => {
    setPreferences({
      ...preferences,
      locations: preferences.locations.filter(l => l !== location)
    })
  }

  // Add industry
  const addIndustry = () => {
    if (newIndustry.trim() && !(preferences.industries || []).includes(newIndustry.trim())) {
      setPreferences({
        ...preferences,
        industries: [...(preferences.industries || []), newIndustry.trim()]
      })
      setNewIndustry('')
    }
  }

  // Remove industry
  const removeIndustry = (industry: string) => {
    setPreferences({
      ...preferences,
      industries: (preferences.industries || []).filter(i => i !== industry)
    })
  }

  // Toggle employment type
  const toggleEmploymentType = (type: 'full-time' | 'part-time' | 'contract' | 'internship') => {
    const current = preferences.employmentTypes
    if (current.includes(type)) {
      setPreferences({
        ...preferences,
        employmentTypes: current.filter(t => t !== type)
      })
    } else {
      setPreferences({
        ...preferences,
        employmentTypes: [...current, type]
      })
    }
  }

  // Toggle company size
  const toggleCompanySize = (size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise') => {
    const current = preferences.companySize || []
    if (current.includes(size)) {
      setPreferences({
        ...preferences,
        companySize: current.filter(s => s !== size)
      })
    } else {
      setPreferences({
        ...preferences,
        companySize: [...current, size]
      })
    }
  }

  // Save preferences
  const handleSave = async () => {
    if (!onSave) return

    setSaving(true)
    try {
      await onSave(preferences, settings)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Job Search Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Job Search Preferences
          </CardTitle>
          <CardDescription>
            Tell us what you're looking for so we can find the best matches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Desired Roles */}
          <div className="space-y-2">
            <Label>Desired Job Titles</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Software Engineer, Product Manager"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addRole()}
              />
              <Button onClick={addRole} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {preferences.desiredRoles.map((role) => (
                <Badge key={role} variant="secondary" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  {role}
                  <button
                    onClick={() => removeRole(role)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-2">
            <Label>Preferred Locations</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., San Francisco, CA or Remote"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLocation()}
              />
              <Button onClick={addLocation} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {preferences.locations.map((location) => (
                <Badge key={location} variant="secondary" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {location}
                  <button
                    onClick={() => removeLocation(location)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Remote Preference */}
          <div className="space-y-2">
            <Label>Work Arrangement</Label>
            <Select
              value={preferences.remotePreference}
              onValueChange={(value: string) =>
                setPreferences({ ...preferences, remotePreference: value as 'remote' | 'hybrid' | 'on-site' | 'any' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote Only</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="on-site">On-site</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Salary Range */}
          <div className="space-y-2">
            <Label>Salary Range (USD)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Minimum</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="50,000"
                    value={preferences.salaryMin || ''}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        salaryMin: e.target.value ? parseInt(e.target.value) : undefined
                      })
                    }
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Maximum</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="150,000"
                    value={preferences.salaryMax || ''}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        salaryMax: e.target.value ? parseInt(e.target.value) : undefined
                      })
                    }
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Employment Types */}
          <div className="space-y-2">
            <Label>Employment Type</Label>
            <div className="flex flex-wrap gap-2">
              {(['full-time', 'part-time', 'contract', 'internship'] as const).map((type) => (
                <Button
                  key={type}
                  variant={preferences.employmentTypes.includes(type) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleEmploymentType(type)}
                >
                  {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div className="space-y-2">
            <Label>Experience Level</Label>
            <Select
              value={preferences.experienceLevel || 'mid'}
              onValueChange={(value: string) =>
                setPreferences({ ...preferences, experienceLevel: value as 'entry' | 'mid' | 'senior' | 'executive' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                <SelectItem value="senior">Senior Level (5-10 years)</SelectItem>
                <SelectItem value="executive">Executive (10+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Industries */}
          <div className="space-y-2">
            <Label>Preferred Industries (Optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Technology, Healthcare, Finance"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addIndustry()}
              />
              <Button onClick={addIndustry} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(preferences.industries || []).map((industry) => (
                <Badge key={industry} variant="secondary" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {industry}
                  <button
                    onClick={() => removeIndustry(industry)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Company Size */}
          <div className="space-y-2">
            <Label>Company Size (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {(['startup', 'small', 'medium', 'large', 'enterprise'] as const).map((size) => (
                <Button
                  key={size}
                  variant={(preferences.companySize || []).includes(size) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleCompanySize(size)}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automated Search Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Job Search</CardTitle>
          <CardDescription>
            Configure how often we search for new jobs on your behalf
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Search Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Automated Search</Label>
              <p className="text-sm text-muted-foreground">
                Automatically search for jobs based on your preferences
              </p>
            </div>
            <Switch
              checked={settings.autoSearchEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoSearchEnabled: checked })
              }
            />
          </div>

          {/* Search Frequency */}
          {settings.autoSearchEnabled && (
            <div className="space-y-2">
              <Label>Search Frequency</Label>
              <Select
                value={settings.searchFrequency}
                onValueChange={(value: string) =>
                  setSettings({ ...settings, searchFrequency: value as 'daily' | 'weekly' | 'manual' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (Recommended)</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose how you want to be notified about new job matches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email alerts for high-quality matches
              </p>
            </div>
            <Switch
              checked={settings.notificationPreferences.email}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notificationPreferences: {
                    ...settings.notificationPreferences,
                    email: checked
                  }
                })
              }
            />
          </div>

          {/* In-App Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications within the app
              </p>
            </div>
            <Switch
              checked={settings.notificationPreferences.inApp}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  notificationPreferences: {
                    ...settings.notificationPreferences,
                    inApp: checked
                  }
                })
              }
            />
          </div>

          {/* Match Score Threshold */}
          <div className="space-y-2">
            <Label>
              Notification Threshold: {settings.notificationPreferences.matchScoreThreshold}%
            </Label>
            <p className="text-sm text-muted-foreground">
              Only notify me about jobs with a match score above this threshold
            </p>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={settings.notificationPreferences.matchScoreThreshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  notificationPreferences: {
                    ...settings.notificationPreferences,
                    matchScoreThreshold: parseInt(e.target.value)
                  }
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50% (All matches)</span>
              <span>100% (Perfect matches only)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving || loading}
          size="lg"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
