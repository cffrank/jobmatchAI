# Quick Migration Guide for Remaining Hooks

This guide provides code templates for migrating the remaining Firebase hooks to Supabase.

## Installation

First, install dependencies:

```bash
npm install
```

## useApplications Hook Migration

**File**: `src/hooks/useApplications.ts`

**Template**:

```typescript
import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { GeneratedApplication } from '@/sections/application-generator/types'
import type { Database } from '@/lib/database.types'

type ApplicationRow = Database['public']['Tables']['applications']['Row']

export function useApplications(pageSize = 20) {
  const { user } = useAuth()
  const userId = user?.id

  const [applications, setApplications] = useState<GeneratedApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchApplications = useCallback(async (currentOffset: number, append: boolean = false) => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: queryError, count } = await supabase
        .from('applications')
        .select(`
          *,
          jobs (
            id,
            title,
            company,
            location
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + pageSize - 1)

      if (queryError) throw queryError

      const fetchedApps: GeneratedApplication[] = (data || []).map((row: ApplicationRow) => ({
        id: row.id,
        userId: row.user_id,
        jobId: row.job_id || undefined,
        jobTitle: row.job_title,
        companyName: row.company_name,
        coverLetter: row.cover_letter || undefined,
        tailoredResume: row.tailored_resume || undefined,
        keyAchievements: row.key_achievements || undefined,
        skillsHighlighted: row.skills_highlighted || undefined,
        formatType: row.format_type || undefined,
        createdAt: row.created_at,
      }))

      if (append) {
        setApplications(prev => [...prev, ...fetchedApps])
      } else {
        setApplications(fetchedApps)
      }

      setHasMore((count ?? 0) > currentOffset + pageSize)
      setLoading(false)
    } catch (err) {
      setError(err as Error)
      setLoading(false)
    }
  }, [userId, pageSize])

  useEffect(() => {
    fetchApplications(0, false)
  }, [fetchApplications])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextOffset = offset + pageSize
      setOffset(nextOffset)
      fetchApplications(nextOffset, true)
    }
  }, [loading, hasMore, offset, pageSize, fetchApplications])

  const addApplication = async (data: Omit<GeneratedApplication, 'id' | 'createdAt'>) => {
    if (!userId) throw new Error('User not authenticated')

    const { data: newApp, error } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        job_id: data.jobId || null,
        job_title: data.jobTitle,
        company_name: data.companyName,
        cover_letter: data.coverLetter || null,
        tailored_resume: data.tailoredResume || null,
        key_achievements: data.keyAchievements || null,
        skills_highlighted: data.skillsHighlighted || null,
        format_type: data.formatType || null,
      })
      .select()
      .single()

    if (error) throw error

    // Refresh list
    fetchApplications(0, false)
  }

  const updateApplication = async (id: string, data: Partial<GeneratedApplication>) => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('applications')
      .update({
        job_title: data.jobTitle,
        company_name: data.companyName,
        cover_letter: data.coverLetter || null,
        tailored_resume: data.tailoredResume || null,
        key_achievements: data.keyAchievements || null,
        skills_highlighted: data.skillsHighlighted || null,
        format_type: data.formatType || null,
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    // Update local state
    setApplications(prev => prev.map(app =>
      app.id === id ? { ...app, ...data } : app
    ))
  }

  const deleteApplication = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    // Remove from local state
    setApplications(prev => prev.filter(app => app.id !== id))
  }

  return {
    applications,
    loading,
    error,
    loadMore,
    hasMore,
    addApplication,
    updateApplication,
    deleteApplication,
  }
}
```

## useProfile Hook Migration

**File**: `src/hooks/useProfile.ts`

**Template**:

```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type UserRow = Database['public']['Tables']['users']['Row']
type UserUpdate = Database['public']['Tables']['users']['Update']

export function useProfile() {
  const { user } = useAuth()
  const userId = user?.id

  const [profile, setProfile] = useState<UserRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (queryError) throw queryError

        setProfile(data)
        setLoading(false)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const updateProfile = async (updates: UserUpdate) => {
    if (!userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    setProfile(data)
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
  }
}
```

## useSkills Hook Migration

**File**: `src/hooks/useSkills.ts`

**Template**:

```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type SkillRow = Database['public']['Tables']['skills']['Row']
type SkillInsert = Database['public']['Tables']['skills']['Insert']

export function useSkills() {
  const { user } = useAuth()
  const userId = user?.id

  const [skills, setSkills] = useState<SkillRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setSkills([])
      setLoading(false)
      return
    }

    const fetchSkills = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('skills')
          .select('*')
          .eq('user_id', userId)
          .order('skill_name', { ascending: true })

        if (queryError) throw queryError

        setSkills(data || [])
        setLoading(false)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchSkills()
  }, [userId])

  const addSkill = async (skillData: Omit<SkillInsert, 'user_id' | 'id'>) => {
    if (!userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('skills')
      .insert({
        user_id: userId,
        ...skillData,
      })
      .select()
      .single()

    if (error) throw error

    setSkills(prev => [...prev, data])
  }

  const updateSkill = async (id: string, updates: Partial<SkillInsert>) => {
    if (!userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('skills')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    setSkills(prev => prev.map(skill => skill.id === id ? data : skill))
  }

  const deleteSkill = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    setSkills(prev => prev.filter(skill => skill.id !== id))
  }

  return {
    skills,
    loading,
    error,
    addSkill,
    updateSkill,
    deleteSkill,
  }
}
```

## Common Pattern: Collection Hook

For `useWorkExperience` and `useEducation`, use this pattern:

```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type TableRow = Database['public']['Tables']['TABLE_NAME']['Row']
type TableInsert = Database['public']['Tables']['TABLE_NAME']['Insert']
type TableUpdate = Database['public']['Tables']['TABLE_NAME']['Update']

export function useTableName() {
  const { user } = useAuth()
  const userId = user?.id

  const [items, setItems] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }

    const fetchItems = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('TABLE_NAME')
          .select('*')
          .eq('user_id', userId)
          .order('SORT_FIELD', { ascending: false })

        if (queryError) throw queryError

        setItems(data || [])
        setLoading(false)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    fetchItems()
  }, [userId])

  const addItem = async (itemData: Omit<TableInsert, 'user_id' | 'id'>) => {
    if (!userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('TABLE_NAME')
      .insert({
        user_id: userId,
        ...itemData,
      })
      .select()
      .single()

    if (error) throw error

    setItems(prev => [data, ...prev])
  }

  const updateItem = async (id: string, updates: TableUpdate) => {
    if (!userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('TABLE_NAME')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    setItems(prev => prev.map(item => item.id === id ? data : item))
  }

  const deleteItem = async (id: string) => {
    if (!userId) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('TABLE_NAME')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    setItems(prev => prev.filter(item => item.id !== id))
  }

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
  }
}
```

Replace:
- `TABLE_NAME` with `work_experience` or `education`
- `SORT_FIELD` with `start_date` or appropriate field
- `items` with `workExperience` or `education`

## Export Application Migration

**File**: `src/lib/exportApplication.ts`

Replace Firebase Functions call with backend API:

```typescript
export async function exportApplication(
  applicationId: string,
  format: ExportFormat
): Promise<void> {
  if (!applicationId) {
    throw new ExportError('Application ID is required', 'invalid-argument')
  }

  if (!format || !['pdf', 'docx'].includes(format)) {
    throw new ExportError('Format must be "pdf" or "docx"', 'invalid-argument')
  }

  try {
    // Get Supabase session token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new ExportError('Please log in to export applications', 'unauthenticated')
    }

    // Call backend API
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    const response = await fetch(`${backendUrl}/api/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        applicationId,
        format,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ExportError(
        errorData.message || `Export failed: ${response.statusText}`,
        'export-failed'
      )
    }

    const result = await response.json()

    if (!result.downloadUrl) {
      throw new ExportError(
        'Export function did not return a download URL',
        'internal'
      )
    }

    // Trigger download
    await downloadFile(result.downloadUrl, result.fileName)

  } catch (error) {
    // Error handling remains the same
    if (error instanceof ExportError) throw error
    throw new ExportError('An unexpected error occurred during export', 'unknown', error)
  }
}
```

## Testing Each Hook

After migrating each hook, test with:

```typescript
// In a React component
const { items, loading, error, addItem, updateItem, deleteItem } = useYourHook()

console.log('Loading:', loading)
console.log('Error:', error)
console.log('Items:', items)

// Test create
await addItem({ field: 'value' })

// Test update
await updateItem('id', { field: 'new value' })

// Test delete
await deleteItem('id')
```

## Quick Commands

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Troubleshooting

### Type Errors
If you see TypeScript errors about missing types, ensure:
1. `src/lib/database.types.ts` exists
2. Import types: `import type { Database } from '@/lib/database.types'`

### Auth Errors
If you see "User not authenticated":
1. Check `.env.local` has correct Supabase credentials
2. Verify user is logged in: `const { user } = useAuth()`

### Query Errors
If Supabase queries fail:
1. Check RLS policies are enabled
2. Verify table/column names match schema
3. Check browser console for detailed error

### CORS Errors
If backend API calls fail:
1. Ensure backend has CORS configured
2. Check `VITE_BACKEND_URL` in `.env.local`

## Next Steps

1. Migrate hooks one by one in this order:
   - useApplications
   - useProfile
   - useSkills
   - useWorkExperience
   - useEducation
   - useTrackedApplications

2. Update exportApplication.ts

3. Test each feature thoroughly

4. Delete `src/lib/firebase.ts`

5. Remove all Firebase imports from codebase

6. Deploy to production
