# Bug Fix: Infinite Loop in EditProfileForm

## Issue Summary

**Error**: "Maximum update depth exceeded. This can happen when a component calls setState inside useEffect..."

**Location**: `/home/carl/application-tracking/jobmatch-ai/src/sections/profile-resume-management/components/EditProfileForm.tsx`

**Trigger**: Clicking "Save Changes" button in the profile edit form

## Root Cause Analysis

### The Problem

The infinite loop was caused by **object reference instability** in the `useProfile` hook.

```
Before Fix - Infinite Loop Cycle:
┌─────────────────────────────────────────────────────┐
│ 1. Component renders, calls useProfile()            │
│                                                      │
│ 2. useProfile creates NEW profile object            │
│    const profile = snapshot?.exists() ?              │
│      { id: snapshot.id, ...snapshot.data() } : null │
│                                                      │
│ 3. useEffect detects profile change (new reference) │
│    useEffect(() => { setFormData(...) }, [profile]) │
│                                                      │
│ 4. setFormData triggers re-render                   │
│                                                      │
│ 5. Go to step 1 → INFINITE LOOP                     │
└─────────────────────────────────────────────────────┘
```

### Why It Happened

In JavaScript/React, object equality is based on **reference**, not **value**:

```typescript
// These are DIFFERENT objects, even though they have the same content
const obj1 = { name: "John" }
const obj2 = { name: "John" }
console.log(obj1 === obj2) // false

// Creating a new object on every render
function useProfile() {
  // Every render creates a NEW object reference
  const profile = { id: snapshot.id, ...snapshot.data() } // ❌ NEW object each time
  return profile
}
```

React's `useEffect` uses shallow comparison for dependencies. When `profile` is a new object reference on every render, React thinks it changed, even if the data inside is identical.

## The Fix

### 1. Memoize Profile Object with useMemo

**File**: `/home/carl/application-tracking/jobmatch-ai/src/hooks/useProfile.ts`

**Before**:
```typescript
const profile = snapshot?.exists() ? { id: snapshot.id, ...snapshot.data() } as User : null
```

**After**:
```typescript
import { useMemo } from 'react'

const profile = useMemo(() => {
  if (!snapshot?.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as User
}, [snapshot])
```

**How it works**:
- `useMemo` caches the profile object
- Only recreates it when `snapshot` actually changes
- Returns the same object reference between renders if snapshot hasn't changed
- Breaks the infinite loop

```
After Fix - Stable References:
┌─────────────────────────────────────────────────────┐
│ 1. Component renders, calls useProfile()            │
│                                                      │
│ 2. useMemo checks if snapshot changed               │
│    - If NO: return cached profile object            │
│    - If YES: create new profile object              │
│                                                      │
│ 3. useEffect compares profile reference             │
│    - Same reference → no effect triggered           │
│                                                      │
│ 4. No re-render, stable state ✓                     │
└─────────────────────────────────────────────────────┘
```

### 2. Add Timestamps to Profile Updates

**Added**:
```typescript
const updateProfile = async (data: Partial<Omit<User, 'id'>>) => {
  if (!userId) throw new Error('User not authenticated')

  const profileRef = doc(db, 'users', userId)
  const profileDoc = await getDoc(profileRef)

  const timestamp = new Date().toISOString()

  if (profileDoc.exists()) {
    // Update existing profile
    await updateDoc(profileRef, {
      ...data,
      updatedAt: timestamp,  // ✓ Track when profile was updated
    })
  } else {
    // Create new profile
    await setDoc(profileRef, {
      ...data,
      id: userId,
      createdAt: timestamp,   // ✓ Track when profile was created
      updatedAt: timestamp,
    })
  }
}
```

## Technical Details

### React Dependency Comparison

React's `useEffect` uses `Object.is()` for comparing dependencies:

```typescript
// In EditProfileForm.tsx
useEffect(() => {
  if (profile) {
    setFormData({ ...profile })
  }
}, [profile])  // React checks: Object.is(oldProfile, newProfile)
```

When `profile` is a new object every render:
- `Object.is(oldProfile, newProfile)` → `false` (different references)
- Effect runs, calls `setFormData`
- Component re-renders
- New `profile` object created
- Infinite loop

With `useMemo`:
- `Object.is(oldProfile, newProfile)` → `true` (same cached reference)
- Effect doesn't run
- No re-render
- Stable state

### useMemo Benefits

1. **Prevents unnecessary recalculations**: Only recomputes when dependencies change
2. **Stabilizes object references**: Returns same object if inputs haven't changed
3. **Optimizes performance**: Reduces re-renders in child components
4. **Breaks dependency cycles**: Prevents infinite loops in useEffect

## Testing

### Steps to Verify Fix

1. Start the dev server: `npm run dev`
2. Navigate to `/profile/edit`
3. Fill in the profile form:
   - First Name
   - Last Name
   - Email
   - Phone
   - Location
   - Professional Headline
   - Professional Summary
4. Click "Save Changes"
5. Verify:
   - ✓ No console errors
   - ✓ No infinite loop
   - ✓ Success toast appears
   - ✓ Redirects to `/profile`
   - ✓ Data persists in Firestore

### Expected Behavior

```
User Flow:
1. User edits profile form
2. User clicks "Save Changes"
3. Form validation passes
4. updateProfile() called
5. Firestore updated
6. Toast: "Profile updated successfully!"
7. Navigate to /profile
8. Profile displays updated data
```

## Prevention Guidelines

To avoid similar issues in the future:

### 1. Memoize Objects in Custom Hooks

```typescript
// ❌ Bad - Creates new object every render
export function useData() {
  const data = { value: someValue }
  return data
}

// ✓ Good - Memoizes object
export function useData() {
  const data = useMemo(() => ({ value: someValue }), [someValue])
  return data
}
```

### 2. Memoize Functions Passed as Props

```typescript
// ❌ Bad - Creates new function every render
function Parent() {
  const handleClick = () => console.log('clicked')
  return <Child onClick={handleClick} />
}

// ✓ Good - Memoizes function
function Parent() {
  const handleClick = useCallback(() => console.log('clicked'), [])
  return <Child onClick={handleClick} />
}
```

### 3. Be Careful with useEffect Dependencies

```typescript
// ❌ Bad - Object dependency will cause infinite loops
useEffect(() => {
  setState({ ...data })
}, [data])  // data is a new object each render

// ✓ Good - Specific primitive dependencies
useEffect(() => {
  setState({ ...data })
}, [data.id, data.name])  // Only re-run when these values change

// ✓ Good - Memoized object
const memoizedData = useMemo(() => data, [data.id, data.name])
useEffect(() => {
  setState({ ...memoizedData })
}, [memoizedData])
```

## Files Modified

1. `/home/carl/application-tracking/jobmatch-ai/src/hooks/useProfile.ts`
   - Added `useMemo` import from 'react'
   - Wrapped profile object in `useMemo` with `[snapshot]` dependency
   - Added `updatedAt` timestamp to profile updates
   - Added `createdAt` and `updatedAt` to new profile creation

## Summary

**Root Cause**: Object reference instability in `useProfile` hook causing infinite re-renders

**Solution**: Memoize profile object with `useMemo` to stabilize references

**Result**: EditProfileForm can now save without infinite loops, successfully updates Firestore, and navigates back to profile page
