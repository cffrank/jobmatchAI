# Frontend Architecture Review - Task List

**Review Date**: December 21, 2025
**Reviewer**: Frontend Architecture Specialist Agent
**Scope**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router 7

---

## Summary

The frontend is well-structured with clear separation of concerns into sections (profile, jobs, applications, tracker, settings). However, there are opportunities for improvement in state management, type safety, performance optimization, and code organization.

**Key Findings**:
- ✅ Good: Clear section-based organization, proper auth context
- ⚠️  Concerns: Multiple hooks fetching overlapping data, no centralized state management, potential prop drilling
- ❌ Issues: Inconsistent error handling, no loading skeleton patterns, missing accessibility features

---

## Phase 1: Critical Architecture Issues

### FA-001: Implement Centralized State Management
**Priority**: High
**Category**: Architecture
**Estimated Effort**: Large

**Description**:
Currently, multiple hooks (`useProfile`, `useSkills`, `useWorkExperience`) fetch overlapping user data independently. This leads to:
- Multiple database queries for the same data
- State synchronization issues
- Difficult cache invalidation

**Recommended Solution**:
Implement a centralized state management solution (Zustand recommended for React 19 compatibility).

**Files Affected**:
- `/src/hooks/useProfile.ts`
- `/src/hooks/useSkills.ts`
- `/src/hooks/useWorkExperience.ts`
- `/src/hooks/useEducation.ts`
- All pages consuming these hooks

**Dependencies**: None

---

### FA-002: Fix Data Fetching Race Conditions in useJobs
**Priority**: Critical
**Category**: Performance / Reliability
**Estimated Effort**: Medium

**Description**:
In `/src/hooks/useJobs.ts` lines 120-135, the `rankedJobs` useMemo depends on `profile`, `skills`, and `workExperience` which may load at different times, causing multiple re-rankings and flickering UI.

**Current Issue**:
```typescript
const rankedJobs = useMemo(() => {
  if (jobs.length === 0) return []
  return rankJobs(jobs, { user: profile, skills, workExperience })
}, [jobs, profile, skills, workExperience, savedJobIds])
```

**Recommended Solution**:
- Add loading states coordination
- Implement skeleton UI while data loads
- Consider React Query for better cache management

**Files Affected**:
- `/src/hooks/useJobs.ts`
- `/src/sections/job-discovery-matching/JobListPage.tsx`

**Dependencies**: None

---

### FA-003: Resolve Circular Dependency Risk in Hooks
**Priority**: High
**Category**: Code Quality
**Estimated Effort**: Medium

**Description**:
`useJobs` depends on `useProfile`, `useSkills`, and `useWorkExperience`. If any of these hooks start depending on jobs data, we'll have circular dependencies.

**Recommended Solution**:
- Extract shared data fetching into a context provider
- Use composition pattern for data dependencies
- Document hook dependency chains

**Files Affected**:
- All hooks in `/src/hooks/`
- Create new `/src/contexts/UserDataContext.tsx`

**Dependencies**: FA-001 (state management)

---

## Phase 2: Type Safety and Data Modeling

### FA-004: Strengthen TypeScript Type Guards
**Priority**: Medium
**Category**: Type Safety
**Estimated Effort**: Medium

**Description**:
Many hooks return data as potentially `null` or `undefined`, but components don't always check. This can lead to runtime errors.

**Examples**:
- `useJob` returns `job: Job | null` but components may not check
- `useApplication` returns `application: GeneratedApplication | null`

**Recommended Solution**:
- Add runtime type guards for all database responses
- Create utility functions for safe data access
- Use TypeScript strict null checks

**Files Affected**:
- All hooks in `/src/hooks/`
- All page components

**Dependencies**: None

---

### FA-005: Create Consistent Error Boundary Pattern
**Priority**: High
**Category**: UX / Reliability
**Estimated Effort**: Medium

**Description**:
Currently, error handling is inconsistent:
- Some components show toast notifications
- Some components render error states
- No error boundaries for component crashes

**Recommended Solution**:
- Implement React Error Boundaries for each route
- Create consistent error UI components
- Add error logging/reporting service integration

**Files Affected**:
- Create `/src/components/ErrorBoundary.tsx`
- Update `/src/lib/router.tsx`
- All page components

**Dependencies**: None

---

### FA-006: Fix Database Type Mapping Inconsistencies
**Priority**: Medium
**Category**: Type Safety
**Estimated Effort**: Small

**Description**:
In `/src/hooks/useApplications.ts` lines 318-343, status mapping is inconsistent:
- Database has enum: `draft | ready | submitted | interviewing | offered | accepted | rejected | withdrawn`
- App uses: `draft | in_progress | submitted`
- Mapping logic loses information

**Recommended Solution**:
- Align database enum with frontend requirements
- Create bidirectional type-safe mapping utilities
- Document status flow

**Files Affected**:
- `/src/hooks/useApplications.ts`
- `/src/sections/application-generator/types.ts`
- Database migration needed

**Dependencies**: Database migration

---

## Phase 3: Performance Optimization

### FA-007: Implement Virtual Scrolling for Large Lists
**Priority**: Medium
**Category**: Performance
**Estimated Effort**: Medium

**Description**:
Job list and application list can grow large, causing performance issues with many DOM nodes.

**Recommended Solution**:
- Implement virtual scrolling library (e.g., `@tanstack/react-virtual`)
- Add infinite scroll with proper loading states
- Implement list item memoization

**Files Affected**:
- `/src/sections/job-discovery-matching/components/JobList.tsx`
- `/src/sections/application-generator/components/ApplicationList.tsx`
- `/src/sections/application-tracker/components/ApplicationList.tsx`

**Dependencies**: None

---

### FA-008: Optimize Re-renders with React.memo and useCallback
**Priority**: Medium
**Category**: Performance
**Estimated Effort**: Medium

**Description**:
Many components re-render unnecessarily. Key areas:
- List item components in JobList, ApplicationList
- Form components re-rendering on every keystroke
- AuthContext provides new object on every render (fixed with useMemo but verify all callbacks)

**Recommended Solution**:
- Wrap expensive list items with React.memo
- Use useCallback for all event handlers passed as props
- Profile with React DevTools Profiler

**Files Affected**:
- All list item components
- All form components
- `/src/contexts/AuthContext.tsx` (verify callbacks)

**Dependencies**: None

---

### FA-009: Implement Code Splitting per Section
**Priority**: Low
**Category**: Performance
**Estimated Effort**: Small

**Description**:
All sections are imported synchronously in `/src/lib/router.tsx`. This increases initial bundle size.

**Recommended Solution**:
- Use React.lazy() and Suspense for route-based code splitting
- Add loading fallback components
- Measure bundle size improvements

**Files Affected**:
- `/src/lib/router.tsx`
- Create `/src/components/RouteLoading.tsx`

**Dependencies**: None

---

## Phase 4: UX and Accessibility

### FA-010: Add Loading Skeleton Components
**Priority**: Medium
**Category**: UX
**Estimated Effort**: Medium

**Description**:
Currently, loading states show spinners or nothing. Better UX would be content-aware skeletons.

**Recommended Solution**:
- Create skeleton components matching actual content layout
- Implement progressive loading (show partial data while rest loads)
- Add shimmer animations

**Files Affected**:
- Create `/src/components/skeletons/` directory
- Update all pages with loading states

**Dependencies**: None

---

### FA-011: Implement Accessibility (A11y) Audit Fixes
**Priority**: High
**Category**: Accessibility
**Estimated Effort**: Large

**Description**:
Accessibility issues observed:
- Missing ARIA labels on interactive elements
- No keyboard navigation for modals/dialogs
- Color contrast may not meet WCAG AA standards
- No focus management for route changes
- Missing skip navigation links

**Recommended Solution**:
- Run automated a11y audit (axe-core)
- Add ARIA labels and roles
- Implement keyboard navigation
- Add focus management
- Test with screen readers

**Files Affected**:
- All interactive components
- All modal/dialog components
- `/src/components/AppShell.tsx`

**Dependencies**: None

---

### FA-012: Implement Optimistic UI Updates
**Priority**: Low
**Category**: UX
**Estimated Effort**: Medium

**Description**:
Currently, all actions wait for server response before updating UI. This feels slow.

**Recommended Solution**:
- Implement optimistic updates for:
  - Saving/unsaving jobs
  - Updating application status
  - Adding/editing work experience
- Add rollback on failure with toast notification

**Files Affected**:
- `/src/hooks/useJobs.ts` (saveJob/unsaveJob)
- `/src/hooks/useApplications.ts`
- `/src/hooks/useWorkExperience.ts`

**Dependencies**: None

---

## Phase 5: Code Organization and Maintainability

### FA-013: Extract Shared Hook Logic to Composable Utilities
**Priority**: Medium
**Category**: Code Quality
**Estimated Effort**: Medium

**Description**:
Many hooks share similar patterns:
- Pagination logic (offset-based)
- Real-time subscription setup
- Error handling
- Loading state management

**Recommended Solution**:
- Create `/src/hooks/base/usePaginatedQuery.ts`
- Create `/src/hooks/base/useRealtimeSubscription.ts`
- Create `/src/hooks/base/useMutation.ts`
- Refactor existing hooks to use these

**Files Affected**:
- Create `/src/hooks/base/` directory
- Refactor all data-fetching hooks

**Dependencies**: None

---

### FA-014: Consolidate Form Validation Logic
**Priority**: Medium
**Category**: Code Quality
**Estimated Effort**: Medium

**Description**:
Form validation is scattered across components. No consistent pattern.

**Recommended Solution**:
- Implement form library (React Hook Form recommended)
- Create validation schemas with Zod (already in dependencies)
- Share validation logic between frontend and backend

**Files Affected**:
- All form components
- Create `/src/lib/validations/` directory

**Dependencies**: None

---

### FA-015: Create Consistent Button/Link Component API
**Priority**: Low
**Category**: Code Quality
**Estimated Effort**: Small

**Description**:
Buttons and links have inconsistent props and styling patterns across the app.

**Recommended Solution**:
- Standardize on shadcn/ui Button component
- Create LinkButton component for navigation
- Document usage in component library

**Files Affected**:
- `/src/components/ui/button.tsx`
- All components using buttons

**Dependencies**: None

---

## Phase 6: Testing Infrastructure

### FA-016: Add Unit Tests for Critical Hooks
**Priority**: High
**Category**: Testing
**Estimated Effort**: Large

**Description**:
No unit tests exist. Critical hooks should be tested:
- useAuth (session management, OAuth flow)
- useJobs (pagination, ranking logic)
- useApplications (CRUD operations)

**Recommended Solution**:
- Set up Vitest (Vite-native testing)
- Add React Testing Library
- Write tests for all hooks
- Achieve >80% coverage for hooks

**Files Affected**:
- Create `/src/tests/` directory
- Add tests for all hooks
- Update `package.json` with test scripts

**Dependencies**: None

---

### FA-017: Add Component Integration Tests
**Priority**: Medium
**Category**: Testing
**Estimated Effort**: Large

**Description**:
Complex components should have integration tests:
- Profile creation/edit flow
- Application generation flow
- Job search and save flow

**Recommended Solution**:
- Use React Testing Library
- Test user workflows, not implementation details
- Mock Supabase calls

**Files Affected**:
- Create component tests in `/src/tests/components/`

**Dependencies**: FA-016 (test infrastructure)

---

### FA-018: Add Visual Regression Tests
**Priority**: Low
**Category**: Testing
**Estimated Effort**: Medium

**Description**:
No visual regression testing exists. UI changes could break unexpectedly.

**Recommended Solution**:
- Integrate Playwright for E2E tests (already in package.json)
- Add visual snapshot testing
- Run on CI for PR checks

**Files Affected**:
- Create `/tests/` directory for E2E tests
- Update `playwright.config.ts`

**Dependencies**: FA-016, FA-017

---

## Phase 7: Developer Experience

### FA-019: Add Comprehensive JSDoc Comments
**Priority**: Low
**Category**: Documentation
**Estimated Effort**: Medium

**Description**:
Many hooks and utility functions lack documentation.

**Recommended Solution**:
- Add JSDoc comments to all exported functions
- Document hook return values and side effects
- Generate API documentation site

**Files Affected**:
- All hooks
- All utility functions

**Dependencies**: None

---

### FA-020: Implement Storybook for Component Library
**Priority**: Low
**Category**: Developer Experience
**Estimated Effort**: Large

**Description**:
No component documentation or isolated development environment.

**Recommended Solution**:
- Set up Storybook
- Create stories for all UI components
- Add component usage examples

**Files Affected**:
- Create `.storybook/` directory
- Add stories for `/src/components/ui/`

**Dependencies**: None

---

## Summary Statistics

**Total Tasks**: 20
**Critical Priority**: 1 task
**High Priority**: 5 tasks
**Medium Priority**: 11 tasks
**Low Priority**: 3 tasks

**Total Estimated Effort**:
- Large: 5 tasks
- Medium: 13 tasks
- Small: 2 tasks

**Recommended Execution Order**:
1. Phase 1 (Critical Architecture) - FA-001, FA-002, FA-003
2. Phase 2 (Type Safety) - FA-004, FA-005, FA-006
3. Phase 4 (Accessibility) - FA-011 (high priority)
4. Phase 6 (Testing) - FA-016 (foundation for other work)
5. Phase 3 (Performance) - FA-007, FA-008, FA-009
6. Phase 4 (UX) - FA-010, FA-012
7. Phase 5 (Code Quality) - FA-013, FA-014, FA-015
8. Phase 6 (Testing) - FA-017, FA-018
9. Phase 7 (Developer Experience) - FA-019, FA-020

