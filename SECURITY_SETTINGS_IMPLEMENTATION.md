# Security Settings Implementation

This document describes the implementation of real Firebase Authentication session tracking for the Security Settings page.

## Overview

The Security Settings page now displays real authentication session data from Firebase Firestore instead of mock data. The implementation includes:

- Real-time session tracking across devices
- Security event logging (login, logout, password changes, etc.)
- IP address and geolocation tracking
- User agent parsing for device/browser information
- Session management with automatic expiration
- Session revocation capability

## Architecture

### Data Flow

```
User Login
    ↓
AuthContext → initializeSession()
    ↓
sessionManagement.ts → createOrUpdateSession()
    ↓
Firestore: users/{userId}/sessions/{sessionId}
```

```
Security Page Load
    ↓
useSecuritySettings hook
    ↓
securityService.ts → getActiveSessions() + getRecentSecurityEvents()
    ↓
Firestore queries
    ↓
Display real data in SecurityTab component
```

### File Structure

```
src/
├── lib/
│   ├── securityService.ts          # Firestore operations for sessions and events
│   └── sessionManagement.ts        # Session lifecycle management (enhanced)
├── hooks/
│   └── useSecuritySettings.ts      # React hook for security data
└── sections/account-billing/
    ├── SettingsPage.tsx            # Main settings page (updated to use hook)
    └── components/
        └── SecurityTab.tsx         # Security UI component (unchanged)
```

## Components

### 1. Security Service (`src/lib/securityService.ts`)

Core service that handles all Firestore operations for security features.

**Key Functions:**

- `parseUserAgent(userAgent: string)` - Extracts device, browser, OS info from user agent
- `getLocationInfo()` - Fetches IP address and geolocation using ipapi.co API
- `createOrUpdateSession(userId, sessionId)` - Creates/updates session in Firestore
- `updateSessionActivity(userId, sessionId)` - Updates last active timestamp
- `getActiveSessions(userId, currentSessionId)` - Retrieves active sessions
- `revokeSession(userId, sessionId)` - Deletes a session (revokes access)
- `cleanupExpiredSessions(userId)` - Removes expired sessions
- `logSecurityEvent(userId, action, status)` - Logs security events
- `getRecentSecurityEvents(userId)` - Retrieves recent security events
- `get2FASettings(userId)` - Gets 2FA settings (placeholder for future implementation)

**Firestore Schema:**

```typescript
users/{userId}/sessions/{sessionId}
{
  sessionId: string
  userId: string
  device: string              // e.g., "MacBook Pro", "iPhone 15"
  browser: string             // e.g., "Chrome 120", "Safari Mobile"
  os: string                  // e.g., "macOS 14.1", "iOS 17.2"
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  ipAddress: string
  location: string            // e.g., "San Francisco, CA"
  userAgent: string
  createdAt: Timestamp
  lastActive: Timestamp
  expiresAt: Timestamp        // 30 days from creation
}

users/{userId}/securityEvents/{eventId}
{
  userId: string
  action: string              // e.g., "Login", "Logout", "Password Changed"
  device: string
  browser: string
  os: string
  location: string
  ipAddress: string
  userAgent: string
  status: 'success' | 'failed'
  timestamp: Timestamp
  metadata?: Record<string, any>
}
```

### 2. Security Settings Hook (`src/hooks/useSecuritySettings.ts`)

React hook that manages security settings state and provides methods to interact with security data.

**Returns:**

```typescript
{
  security: SecuritySettings          // Current security data
  loading: boolean                    // Loading state
  error: Error | null                 // Error state
  revokeSession: (sessionId) => Promise<void>
  enable2FA: () => Promise<void>      // Placeholder
  disable2FA: () => Promise<void>     // Placeholder
  generateBackupCodes: () => Promise<void>  // Placeholder
  refresh: () => Promise<void>        // Manual refresh
}
```

**Features:**

- Automatically fetches security data on mount and when user changes
- Cleans up expired sessions on load
- Updates session activity every 5 minutes
- Optimistic UI updates for better UX
- Error handling with proper error propagation

### 3. Session Management (`src/lib/sessionManagement.ts`)

Enhanced to integrate with Firestore session tracking.

**Changes:**

- `initializeSession()` now calls `createOrUpdateSession()` and `logSecurityEvent()`
- `clearSession()` now logs logout events
- All session operations create corresponding Firestore records

### 4. Settings Page (`src/sections/account-billing/SettingsPage.tsx`)

Updated to use the new `useSecuritySettings` hook instead of mock data.

**Changes:**

- Imports `useSecuritySettings` hook
- Uses real `security` data from hook
- Handler functions now async and call hook methods
- Loading state considers both profile and security data
- Removed mock security data from `data.json` usage

## Security Features

### Session Tracking

- **Automatic Creation**: Sessions created automatically on login
- **Device Detection**: Parses user agent to identify device, browser, and OS
- **Geolocation**: Uses ipapi.co API to determine location from IP address
- **Expiration**: Sessions expire after 30 days of inactivity
- **Current Session**: Marks the current session for user awareness

### Security Events

- **Login Events**: Logged on successful authentication
- **Logout Events**: Logged when user signs out
- **Session Revocation**: Logged when user revokes a session
- **Failed Attempts**: Can log failed login attempts (future enhancement)
- **Password Changes**: Can log password changes (future enhancement)

### Session Revocation

Users can revoke sessions from other devices:

1. User clicks revoke button on non-current session
2. Session deleted from Firestore
3. Security event logged
4. UI updated optimistically
5. Data refreshed to confirm

## Firestore Security Rules

```javascript
match /users/{userId} {
  // Active sessions subcollection
  match /sessions/{sessionId} {
    allow read: if isAuthenticated() && isOwner(userId);
    allow create: if isAuthenticated() && isOwner(userId);
    allow update: if isAuthenticated() && isOwner(userId);
    allow delete: if isAuthenticated() && isOwner(userId);
  }

  // Security events subcollection
  match /securityEvents/{eventId} {
    allow read: if isAuthenticated() && isOwner(userId);
    allow create: if isAuthenticated() && isOwner(userId);
    allow update, delete: if false;  // Maintain audit trail
  }
}
```

**Security Considerations:**

- Users can only access their own sessions and events
- Security events cannot be modified or deleted (audit trail)
- All operations require authentication
- Session IDs use cryptographically secure random generation

## Firestore Indexes

Required composite indexes for efficient queries:

```json
{
  "collectionGroup": "sessions",
  "fields": [
    { "fieldPath": "expiresAt", "order": "DESCENDING" },
    { "fieldPath": "lastActive", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "securityEvents",
  "fields": [
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
}
```

## API Usage

### ipapi.co Geolocation API

- **Free Tier**: 1,000 requests/day
- **Rate Limiting**: Built-in timeout (5 seconds)
- **Fallback**: CloudFlare trace API (IP only)
- **Ultimate Fallback**: "Unknown IP" / "Unknown Location"

**Implementation:**

```typescript
async function getLocationInfo() {
  try {
    // Try ipapi.co first (detailed location)
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000)
    })
    // ... extract IP and location
  } catch (error) {
    // Fallback to CloudFlare trace (IP only)
    const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace')
    // ... extract IP
  }
}
```

## Future Enhancements

### 2FA Implementation

Currently, 2FA functions are placeholders. To implement:

1. Add Firebase Auth 2FA using TOTP or SMS
2. Store 2FA settings in Firestore user document
3. Implement `enable2FA()`, `disable2FA()`, `generateBackupCodes()`
4. Update security rules for 2FA settings

### Enhanced Security Events

Additional events to track:

- **Failed Login Attempts**: Track and alert on suspicious activity
- **Password Changes**: Log password modifications
- **Email Changes**: Log email address updates
- **2FA Changes**: Log 2FA enable/disable events
- **Profile Updates**: Log significant profile changes

### Session Analytics

- Session duration tracking
- Login frequency analysis
- Device usage statistics
- Geolocation anomaly detection
- Suspicious activity alerts

### Cloud Functions Integration

Create Cloud Functions for:

- **Session Cleanup**: Scheduled function to delete expired sessions
- **Anomaly Detection**: Detect unusual login patterns
- **Email Alerts**: Notify users of new device logins
- **Rate Limiting**: Prevent brute force attacks

Example Cloud Function:

```typescript
// functions/src/cleanupExpiredSessions.ts
export const cleanupExpiredSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now()
    const sessionsQuery = await admin.firestore()
      .collectionGroup('sessions')
      .where('expiresAt', '<=', now)
      .get()

    const batch = admin.firestore().batch()
    sessionsQuery.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    console.log(`Deleted ${sessionsQuery.size} expired sessions`)
  })
```

## Testing

### Manual Testing Steps

1. **Login**: Verify session created in Firestore
2. **Multiple Devices**: Login from different browsers/devices
3. **Session List**: Verify all sessions appear in Security tab
4. **Current Session**: Verify current session is marked
5. **Revoke Session**: Revoke a non-current session, verify deletion
6. **Security Events**: Verify login/logout events are logged
7. **Session Activity**: Verify lastActive updates during app usage
8. **Session Expiration**: Verify expired sessions are cleaned up

### Unit Testing

```typescript
// Example test for parseUserAgent
describe('parseUserAgent', () => {
  it('should parse Chrome on macOS correctly', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    const result = parseUserAgent(ua)
    expect(result.os).toContain('macOS')
    expect(result.browser).toContain('Chrome')
    expect(result.deviceType).toBe('desktop')
  })
})
```

## Deployment Checklist

Before deploying to production:

- [ ] Deploy Firestore security rules: `firebase deploy --only firestore:rules`
- [ ] Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
- [ ] Test all security features in staging environment
- [ ] Monitor ipapi.co API usage to stay within free tier
- [ ] Set up alerting for failed security operations
- [ ] Document user-facing features in help documentation
- [ ] Consider GDPR compliance for IP address storage
- [ ] Add privacy policy updates for session tracking

## Privacy Considerations

### Data Collection

The implementation collects:

- IP addresses
- Geolocation (city/region level)
- User agent strings
- Device information
- Login timestamps

### GDPR Compliance

To ensure compliance:

1. **User Consent**: Inform users about session tracking in privacy policy
2. **Data Minimization**: Only collect necessary information
3. **Right to Erasure**: Allow users to delete security events
4. **Data Export**: Include security data in user data exports
5. **Retention Policy**: Automatically delete old security events (e.g., after 90 days)

### Recommended Privacy Policy Addition

```
Session Tracking: We collect and store information about your login sessions,
including IP addresses, device information, and approximate location, to provide
security features and protect your account. This data is used solely for security
purposes and is retained for 90 days.
```

## Troubleshooting

### Sessions not appearing

**Cause**: Firestore rules not deployed or authentication issue

**Solution**:
```bash
firebase deploy --only firestore:rules
```

### Geolocation shows "Unknown Location"

**Cause**: ipapi.co rate limit exceeded or API unavailable

**Solution**: Falls back gracefully. Consider upgrading ipapi.co plan or using alternative API.

### Sessions not expiring

**Cause**: No cleanup function running

**Solution**: Implement Cloud Function for automatic cleanup or run manual cleanup periodically.

### Performance issues

**Cause**: Missing Firestore indexes

**Solution**:
```bash
firebase deploy --only firestore:indexes
```

## Monitoring

### Key Metrics to Monitor

- Session creation rate
- Security event creation rate
- Failed session fetches
- ipapi.co API errors
- Average session duration
- Number of active sessions per user

### Logging

All security operations include console logging:

```typescript
console.log('[Security] Session created/updated:', { sessionId, device, location })
console.log('[Security] Event logged:', action, status)
console.error('[Security] Failed to fetch security events:', error)
```

Use these logs for debugging and monitoring in production.

## Conclusion

This implementation provides a robust, production-ready security settings feature with real-time session tracking and comprehensive security event logging. The architecture is scalable, secure, and follows Firebase best practices.

For questions or issues, refer to the inline code documentation or Firebase documentation:
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)
