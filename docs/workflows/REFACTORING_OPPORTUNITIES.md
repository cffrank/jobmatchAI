# Refactoring Opportunities Review - Task List

**Review Date**: December 21, 2025
**Reviewer**: Refactoring Specialist Agent
**Scope**: Code organization, complexity reduction, pattern improvements

---

## Summary

**Refactoring Priority**: High
**Technical Debt**: Moderate
**Code Complexity**: Low-to-Moderate

**Key Opportunities**:
- Extract shared hook patterns
- Reduce component complexity
- Improve service layer abstraction
- Consolidate utility functions

---

## Phase 1: Hook Refactoring (High Impact)

### REF-001: Extract Base Pagination Hook
**Priority**: High
**Category**: DRY Principle
**Estimated Effort**: Medium
**Impact**: Reduces 200+ lines of duplicate code

**Description**:
Pagination logic duplicated across hooks:
- `useJobs.ts` (lines 40-152)
- `useApplications.ts` (lines 16-135)
- `useTrackedApplications.ts` (similar pattern)

**Current Duplication**:
```typescript
// Pattern repeated in 3+ hooks
const [offset, setOffset] = useState(0)
const [hasMore, setHasMore] = useState(true)
const [loading, setLoading] = useState(true)
const [totalCount, setTotalCount] = useState(0)

const fetchData = useCallback(async (currentOffset, append) => {
  const { data, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .range(currentOffset, currentOffset + pageSize - 1)
  // ... state updates
}, [dependencies])

const loadMore = useCallback(() => {
  if (!loading && hasMore) {
    setOffset(prev => prev + pageSize)
    fetchData(offset + pageSize, true)
  }
}, [loading, hasMore, offset])
```

**Recommended Refactoring**:
```typescript
// /src/hooks/base/usePaginatedQuery.ts
export function usePaginatedQuery<T>(
  query: (offset: number, limit: number) => Promise<{ data: T[], count: number }>,
  pageSize = 20
) {
  const [offset, setOffset] = useState(0)
  const [items, setItems] = useState<T[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const fetchPage = useCallback(async (offset: number, append: boolean) => {
    setLoading(true)
    const { data, count } = await query(offset, pageSize)
    setItems(prev => append ? [...prev, ...data] : data)
    setTotalCount(count)
    setHasMore(count > offset + pageSize)
    setLoading(false)
  }, [query, pageSize])

  useEffect(() => { fetchPage(0, false) }, [fetchPage])

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextOffset = offset + pageSize
      setOffset(nextOffset)
      fetchPage(nextOffset, true)
    }
  }, [loading, hasMore, offset, pageSize, fetchPage])

  return { items, loading, hasMore, loadMore, totalCount, reset: () => fetchPage(0, false) }
}

// Usage in useJobs.ts
export function useJobs(pageSize = 20) {
  const { user } = useAuth()

  const query = useCallback(async (offset, limit) => {
    return await supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .range(offset, offset + limit - 1)
  }, [user.id])

  return usePaginatedQuery(query, pageSize)
}
```

**Files Affected**:
- Create `/src/hooks/base/usePaginatedQuery.ts`
- Refactor `/src/hooks/useJobs.ts`
- Refactor `/src/hooks/useApplications.ts`
- Refactor `/src/hooks/useTrackedApplications.ts`

**Dependencies**: None

**Benefits**:
- Eliminates ~200 lines of duplicate code
- Consistent pagination behavior
- Easier to add features (cursor pagination, infinite scroll)

---

### REF-002: Extract Realtime Subscription Hook
**Priority**: High
**Category**: DRY Principle
**Estimated Effort**: Small
**Impact**: Reduces 100+ lines of duplicate code

**Description**:
Realtime subscription setup duplicated in multiple hooks.

**Current Pattern** (from useApplications.ts lines 85-119):
```typescript
useEffect(() => {
  if (!userId) return

  const channel = supabase
    .channel(`applications:${userId}`)
    .on('postgres_changes', { /* config */ }, (payload) => {
      if (payload.eventType === 'INSERT') { /* handle */ }
      else if (payload.eventType === 'UPDATE') { /* handle */ }
      else if (payload.eventType === 'DELETE') { /* handle */ }
    })
    .subscribe()

  return () => { channel.unsubscribe() }
}, [userId])
```

**Recommended Refactoring**:
```typescript
// /src/hooks/base/useRealtimeSubscription.ts
export function useRealtimeSubscription<T>(
  table: string,
  filter: string,
  handlers: {
    onInsert?: (record: T) => void
    onUpdate?: (record: T) => void
    onDelete?: (id: string) => void
  }
) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}:${filter}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter
      }, (payload) => {
        if (payload.eventType === 'INSERT' && handlers.onInsert) {
          handlers.onInsert(payload.new as T)
        } else if (payload.eventType === 'UPDATE' && handlers.onUpdate) {
          handlers.onUpdate(payload.new as T)
        } else if (payload.eventType === 'DELETE' && handlers.onDelete) {
          handlers.onDelete(payload.old.id)
        }
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [table, filter, handlers])
}
```

**Files Affected**:
- Create `/src/hooks/base/useRealtimeSubscription.ts`
- Refactor all hooks with realtime subscriptions

**Dependencies**: None

---

### REF-003: Create Unified Data Fetching Hook
**Priority**: Medium
**Category**: Architecture
**Estimated Effort**: Large
**Impact**: Major simplification

**Description**:
Consider replacing custom hooks with React Query or SWR for:
- Automatic caching
- Request deduplication
- Optimistic updates
- Better TypeScript support
- Devtools integration

**Comparison**:
```typescript
// Current: Custom hook with lots of boilerplate
export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // ... 100+ lines of state management
}

// With React Query: Much simpler
import { useQuery } from '@tanstack/react-query'

export function useJobs() {
  return useQuery({
    queryKey: ['jobs', userId],
    queryFn: () => fetchJobs(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

**Files Affected**:
- All data-fetching hooks
- Add `@tanstack/react-query` dependency

**Dependencies**: Large refactoring effort

**Recommendation**: Consider for future if custom hooks become unmaintainable

---

## Phase 2: Component Complexity Reduction

### REF-004: Split Large Page Components
**Priority**: Medium
**Category**: Complexity
**Estimated Effort**: Medium
**Impact**: Improved maintainability

**Description**:
Some page components exceed 300 lines. Split into smaller components.

**Candidates for Splitting**:
- `JobListPage.tsx` - Split into JobListContainer + JobFilters + JobListView
- `ApplicationEditorPage.tsx` - Split into ApplicationEditorContainer + VariantSelector + DocumentEditor
- `SettingsPage.tsx` - Already uses tabs, but could further split

**Refactoring Pattern**:
```typescript
// Before: 400-line JobListPage.tsx
export default function JobListPage() {
  // State management
  // Data fetching
  // Event handlers
  // JSX with search, filters, list, pagination
}

// After: Container + Presentational components
// JobListPage.tsx (container)
export default function JobListPage() {
  const { jobs, loading, filters, setFilters } = useJobList()
  return <JobListView jobs={jobs} loading={loading} filters={filters} onFilterChange={setFilters} />
}

// JobListView.tsx (presentational)
export function JobListView({ jobs, loading, filters, onFilterChange }) {
  return (
    <>
      <JobFilters filters={filters} onChange={onFilterChange} />
      <JobGrid jobs={jobs} />
      {loading && <LoadingSpinner />}
    </>
  )
}
```

**Files Affected**:
- Multiple page components
- Create new presentational component files

**Dependencies**: None

**Benefits**:
- Easier testing (presentational components are pure functions)
- Better code reusability
- Clearer separation of concerns

---

### REF-005: Extract Form Validation Logic
**Priority**: Medium
**Category**: DRY Principle
**Estimated Effort**: Medium
**Impact**: Consistency and reusability

**Description**:
Form validation scattered across components. Centralize with Zod schemas.

**Current State**:
```typescript
// Validation in component
if (!email) return setError('Email required')
if (!email.includes('@')) return setError('Invalid email')
if (password.length < 8) return setError('Password too short')
```

**Recommended Refactoring**:
```typescript
// /src/lib/validations/auth.ts
import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').optional(),
})

export type SignUpData = z.infer<typeof signUpSchema>

// Usage in component with React Hook Form
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const { register, handleSubmit, formState: { errors } } = useForm<SignUpData>({
  resolver: zodResolver(signUpSchema)
})
```

**Files Affected**:
- Create `/src/lib/validations/` directory
- Refactor all form components
- Add `react-hook-form` and `@hookform/resolvers`

**Dependencies**: None

**Benefits**:
- Consistent validation across frontend and backend
- Type safety
- Better error messages
- Less boilerplate

---

## Phase 3: Service Layer Improvements

### REF-006: Extract API Client Layer
**Priority**: High
**Category**: Architecture
**Estimated Effort**: Medium
**Impact**: Better error handling and typing

**Description**:
Direct Supabase client calls scattered throughout codebase. Create abstraction layer.

**Current Pattern**:
```typescript
// Scattered in hooks
const { data, error } = await supabase.from('jobs').select('*')
if (error) throw error
```

**Recommended Refactoring**:
```typescript
// /src/lib/api/client.ts
class ApiClient {
  async get<T>(table: string, filters?: object): Promise<T[]> {
    const { data, error } = await supabase.from(table).select('*')
    if (error) throw this.handleError(error)
    return data
  }

  private handleError(error: SupabaseError): Error {
    // Centralized error mapping and logging
    logger.error('API Error:', error)
    return new ApiError(error.message, error.code)
  }
}

// /src/lib/api/jobs.ts
export const jobsApi = {
  list: (userId: string) => apiClient.get('jobs', { user_id: userId }),
  getById: (id: string) => apiClient.getOne('jobs', id),
  create: (job: JobData) => apiClient.create('jobs', job),
}

// Usage in hooks
const jobs = await jobsApi.list(userId)
```

**Files Affected**:
- Create `/src/lib/api/` directory
- Refactor all hooks to use API client

**Dependencies**: None

**Benefits**:
- Centralized error handling
- Request/response interceptors
- Easier to add caching, retries
- Better testability (mock API layer)

---

### REF-007: Consolidate Backend Service Utilities
**Priority**: Medium
**Category**: Code Organization
**Estimated Effort**: Small
**Impact**: Better maintainability

**Description**:
Backend services have duplicated utility functions.

**Current Duplication**:
```typescript
// In multiple services
function handleApiError(error: unknown): never {
  if (error instanceof ApiError) throw error
  throw new Error('Unknown error')
}

function retryWithBackoff(fn: Function, retries = 3) {
  // ... retry logic
}
```

**Recommended Refactoring**:
```typescript
// /backend/src/lib/utils.ts
export class ServiceUtils {
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    options = { retries: 3, baseDelay: 1000 }
  ): Promise<T> {
    // Centralized retry logic
  }

  static handleApiError(error: unknown): never {
    // Centralized error handling
  }

  static validateRequired<T>(value: T | null | undefined, name: string): T {
    if (value === null || value === undefined) {
      throw new ValidationError(`${name} is required`)
    }
    return value
  }
}
```

**Files Affected**:
- Create `/backend/src/lib/utils.ts`
- Refactor all service files

**Dependencies**: None

---

## Phase 4: Configuration Management

### REF-008: Centralize Configuration with Type Safety
**Priority**: Medium
**Category**: Configuration
**Estimated Effort**: Small
**Impact**: Better configuration management

**Description**:
Environment variables accessed directly throughout code. Create typed config.

**Current Pattern**:
```typescript
// Scattered throughout codebase
const apiKey = process.env.VITE_OPENAI_API_KEY
if (!apiKey) throw new Error('Missing API key')
```

**Recommended Refactoring**:
```typescript
// /src/lib/config.ts
import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_APP_URL: z.string().url(),
  VITE_BACKEND_URL: z.string().url(),
  VITE_SENTRY_DSN: z.string().optional(),
  MODE: z.enum(['development', 'production', 'test']),
})

function loadConfig() {
  const parsed = envSchema.safeParse(import.meta.env)
  if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error)
    throw new Error('Invalid environment configuration')
  }
  return parsed.data
}

export const config = loadConfig()

// Usage
import { config } from '@/lib/config'
const url = config.VITE_SUPABASE_URL // Fully typed!
```

**Files Affected**:
- Create `/src/lib/config.ts`
- Create `/backend/src/lib/config.ts`
- Update all files using process.env

**Dependencies**: None

**Benefits**:
- Type safety for environment variables
- Validation at startup
- Single source of truth
- Better error messages

---

## Phase 5: Type System Improvements

### REF-009: Consolidate Type Definitions
**Priority**: Medium
**Category**: Type Safety
**Estimated Effort**: Medium
**Impact**: Reduced duplication

**Description**:
Type definitions duplicated between frontend and backend.

**Current Issue**:
- `/src/sections/*/types.ts` (frontend types)
- `/backend/src/types/index.ts` (backend types)
- `/src/lib/database.types.ts` (Supabase generated types)
- Overlap and inconsistency

**Recommended Structure**:
```
/types/
  shared/          # Types shared between frontend and backend
    domain.ts      # Job, Application, User types
    api.ts         # Request/response types
    database.ts    # Supabase types (generated)
  frontend/
    ui.ts          # UI-specific types
    components.ts
  backend/
    services.ts    # Service layer types
    config.ts      # Config types
```

**Approach**:
1. Extract shared types to `/types/shared/`
2. Make package with `package.json` for imports
3. Import in both frontend and backend
4. Generate Supabase types to shared location

**Files Affected**:
- Reorganize all type files
- Update import paths

**Dependencies**: Build configuration

---

### REF-010: Add Discriminated Union Types for States
**Priority**: Low
**Category**: Type Safety
**Estimated Effort**: Medium
**Impact**: Better type safety

**Description**:
State objects with nullable fields can be better typed with discriminated unions.

**Current Pattern**:
```typescript
type State = {
  loading: boolean
  error: Error | null
  data: Data | null
}

// Problem: data could be null even when not loading
```

**Better Pattern**:
```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: Data }

// Usage with type narrowing
if (state.status === 'success') {
  // TypeScript knows data is available
  console.log(state.data)
}
```

**Files Affected**:
- All hooks with loading/error/data states

**Dependencies**: None

---

## Phase 6: Utility Functions

### REF-011: Create Utility Library for Common Operations
**Priority**: Low
**Category**: Code Organization
**Estimated Effort**: Small
**Impact**: Reduces scattered helper functions

**Description**:
Common operations (date formatting, string manipulation) scattered across files.

**Recommended Library Structure**:
```typescript
// /src/lib/utils/index.ts
export * from './date'
export * from './string'
export * from './array'
export * from './validation'

// /src/lib/utils/date.ts
export function formatRelativeDate(date: Date): string {
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

// /src/lib/utils/string.ts
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
```

**Files Affected**:
- Create `/src/lib/utils/` directory
- Replace inline helpers throughout codebase

**Dependencies**: None

---

## Phase 7: Performance Patterns

### REF-012: Implement Lazy Loading for Heavy Components
**Priority**: Low
**Category**: Performance
**Estimated Effort**: Small
**Impact**: Faster initial load

**Description**:
Heavy components loaded eagerly. Implement code splitting.

**Current State**:
```typescript
import ApplicationEditor from '@/sections/application-generator/components/ApplicationEditor'
```

**Recommended Pattern**:
```typescript
import { lazy, Suspense } from 'react'

const ApplicationEditor = lazy(() =>
  import('@/sections/application-generator/components/ApplicationEditor')
)

// Usage
<Suspense fallback={<LoadingSkeleton />}>
  <ApplicationEditor />
</Suspense>
```

**Candidates for Lazy Loading**:
- ApplicationEditor (large rich text component)
- ResumePreview (heavy rendering)
- Analytics charts
- Settings page (rarely accessed)

**Files Affected**:
- Router configuration
- Page components

**Dependencies**: Loading skeleton components

---

## Summary Statistics

**Total Tasks**: 12
**High Priority**: 3 tasks
**Medium Priority**: 7 tasks
**Low Priority**: 2 tasks

**Impact by Category**:
- **High Impact (Reduces 300+ lines duplicate code)**:
  - REF-001 (Base pagination hook)
  - REF-002 (Realtime subscription hook)
  - REF-006 (API client layer)

- **Medium Impact (Improves architecture)**:
  - REF-004 (Component splitting)
  - REF-005 (Form validation)
  - REF-008 (Configuration management)

- **Low Impact (Nice to have)**:
  - REF-011 (Utility library)
  - REF-012 (Lazy loading)

**Recommended Execution Order**:
1. REF-001 (Base pagination hook) - HIGH IMPACT
2. REF-002 (Realtime subscription hook) - HIGH IMPACT
3. REF-006 (API client layer) - HIGH IMPACT
4. REF-008 (Configuration management)
5. REF-005 (Form validation)
6. REF-009 (Type consolidation)
7. REF-004 (Component splitting)
8. REF-007 (Service utilities)
9. REF-011 (Utility library)
10. REF-010 (Discriminated unions)
11. REF-012 (Lazy loading)
12. REF-003 (React Query) - WAIT until custom hooks become unmaintainable

**Estimated Total Effort**: 4-6 weeks
**Code Reduction**: Estimated 500+ lines eliminated
**Maintainability Improvement**: High

