# Firebase Archive

This directory contains all Firebase-related code and configurations that have been deprecated and migrated to other services.

## Migration Status
- **Authentication**: Moved to Supabase Auth (see src/contexts/AuthContext.tsx)
- **Database**: Moved to Supabase PostgreSQL
- **Storage**: Moved to Supabase Storage
- **Cloud Functions**: Moved to Railway backend API

## Contents
- `src/lib/firebase.ts` - Deprecated Firebase client configuration stub
- `scripts/lib/firebase-config.ts` - Firebase configuration utility (no longer used)
- `functions/` - Firebase Cloud Functions implementation (replaced by Railway backend)

## Note
These files are kept for historical reference and to understand the previous architecture. They should not be imported or used in the current codebase.

## Archived Date
December 26, 2025
