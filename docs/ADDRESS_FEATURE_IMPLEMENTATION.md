# Address Feature Implementation

This document describes the implementation of address fields in user profiles for JobMatch AI.

## Overview

Address fields have been added to user profiles to enable:
- **Resume Generation**: Include full contact information on resumes
- **Job Location Searches**: Better match jobs based on user location
- **Application Materials**: Complete contact details for applications

## Database Changes

### Migration: `015_add_address_fields_to_users.sql`

Added the following columns to the `users` table:

| Column | Type | Description |
|--------|------|-------------|
| `street_address` | TEXT | Street address with apartment/unit number |
| `city` | TEXT | City name |
| `state` | TEXT | State/Province/Region |
| `postal_code` | TEXT | ZIP/Postal code |
| `country` | TEXT | Country name |

**Indexes created:**
- `idx_users_city` - For city-based searches
- `idx_users_state` - For state-based searches
- `idx_users_country` - For country-based searches

**Database Function:**
```sql
get_formatted_address(p_user_id UUID) RETURNS TEXT
```
Returns a formatted address string with available components separated by commas.

### Example Usage

```sql
-- Get formatted address for a user
SELECT get_formatted_address('user-uuid-here');
-- Returns: "123 Main St, Apt 4B, San Francisco, CA 94102, United States"

-- Update user address
UPDATE users
SET
  street_address = '123 Main Street, Apt 4B',
  city = 'San Francisco',
  state = 'CA',
  postal_code = '94102',
  country = 'United States'
WHERE id = 'user-uuid';
```

## TypeScript Type Updates

### Updated Interfaces

**Frontend Types** (`src/sections/account-billing/types.ts`):
```typescript
export interface UserProfile {
  id: string
  fullName: string
  email: string
  emailVerified: boolean
  phone?: string
  profilePhotoUrl?: string
  streetAddress?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  createdAt: string
}
```

**Backend Types** (`backend/src/types/index.ts`, `workers/api/types.ts`):
```typescript
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  location?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  // ... other fields
}
```

**Resume Types** (`src/sections/profile-resume-management/types.ts`):
```typescript
export interface ResumeContact {
  email: string
  phone: string
  location: string
  streetAddress?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  linkedIn: string
}
```

## UI Changes

### ProfileSettings Component

Updated `/src/sections/account-billing/components/ProfileSettings.tsx` to include:

1. **Edit Mode Fields:**
   - Street Address input (full width)
   - City and State inputs (2-column grid on desktop)
   - Postal Code and Country inputs (2-column grid on desktop)

2. **View Mode Display:**
   - Address section with MapPin icon
   - Multi-line formatted address display
   - "Not set" message when no address data

**Form Layout:**
```
┌─────────────────────────────────┐
│ Street Address                  │
│ [123 Main St, Apt 4B        ]  │
└─────────────────────────────────┘

┌────────────────┬────────────────┐
│ City           │ State/Province │
│ [San Francisco]│ [CA         ]  │
└────────────────┴────────────────┘

┌────────────────┬────────────────┐
│ Postal Code    │ Country        │
│ [94102      ]  │ [United States]│
└────────────────┴────────────────┘
```

## Resume Generation Integration

### OpenAI Service Updates

Both backend and workers OpenAI services have been updated:

**Files Modified:**
- `/backend/src/services/openai.service.ts`
- `/workers/api/services/openai.ts`

**Helper Function Added:**
```typescript
function formatAddress(profile: UserProfile): string {
  const parts: string[] = [];

  if (profile.streetAddress) parts.push(profile.streetAddress);
  if (profile.city) parts.push(profile.city);
  if (profile.state) parts.push(profile.state);
  if (profile.postalCode) parts.push(profile.postalCode);
  if (profile.country) parts.push(profile.country);

  return parts.length > 0 ? parts.join(', ') : 'Not specified';
}
```

**Prompt Update:**
The user prompt now includes the formatted address:
```
CANDIDATE PROFILE:

Name: John Doe
Location: San Francisco, CA
Address: 123 Main Street, Apt 4B, San Francisco, CA 94102, United States
Phone: (555) 123-4567
Email: john@example.com
```

This ensures that AI-generated resumes include complete contact information.

## Job Search Integration

Address fields enable better location-based job matching:

1. **City/State Matching**: Jobs can be matched based on city and state
2. **Remote Work Preferences**: Users can specify their location while searching for remote jobs
3. **Relocation Consideration**: Address helps determine if jobs require relocation

## Testing

### Manual Testing Checklist

1. **Database Migration:**
   ```bash
   # Run migration
   npx supabase migration up

   # Verify columns
   npx supabase db execute "SELECT street_address, city, state, postal_code, country FROM users LIMIT 1"
   ```

2. **UI Testing:**
   - [ ] Navigate to Account Settings → Profile
   - [ ] Click "Edit Profile"
   - [ ] Enter address information in all fields
   - [ ] Save changes
   - [ ] Verify display in view mode
   - [ ] Verify address displays in multiple lines
   - [ ] Test with partial address (e.g., city and state only)
   - [ ] Test with no address (should show "Not set")

3. **Resume Generation Testing:**
   - [ ] Update user profile with complete address
   - [ ] Generate a resume for a job application
   - [ ] Verify address appears in generated resume
   - [ ] Test with partial address data
   - [ ] Verify formatting is correct

4. **API Testing:**
   ```bash
   # Test address update via API
   curl -X PATCH https://your-api.com/api/users/me \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "streetAddress": "123 Main St, Apt 4B",
       "city": "San Francisco",
       "state": "CA",
       "postalCode": "94102",
       "country": "United States"
     }'
   ```

### Automated Test Script

Run the test script to verify the implementation:

```bash
# Set environment variables
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run tests
npx tsx scripts/test-address-feature.ts
```

Expected output:
```
✅ PASS: Migration columns exist
✅ PASS: Address formatted correctly
✅ PASS: Partial address formatted correctly

3 passed, 0 failed out of 3 tests
```

## Migration Instructions

### For Production Deployment

1. **Backup Database:**
   ```bash
   npx supabase db dump --local > backup-$(date +%Y%m%d).sql
   ```

2. **Run Migration:**
   ```bash
   # For Supabase hosted
   npx supabase db push

   # Or manually run the SQL file
   psql $DATABASE_URL -f supabase/migrations/015_add_address_fields_to_users.sql
   ```

3. **Verify Migration:**
   ```sql
   -- Check columns exist
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'users'
   AND column_name IN ('street_address', 'city', 'state', 'postal_code', 'country');

   -- Check function exists
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name = 'get_formatted_address';
   ```

4. **Deploy Application:**
   ```bash
   # Deploy frontend
   npm run build

   # Deploy backend/workers
   npm run deploy
   ```

## Rollback Plan

If issues occur, rollback with:

```sql
-- Remove helper function
DROP FUNCTION IF EXISTS get_formatted_address(UUID);

-- Remove indexes
DROP INDEX IF EXISTS idx_users_city;
DROP INDEX IF EXISTS idx_users_state;
DROP INDEX IF EXISTS idx_users_country;

-- Remove columns
ALTER TABLE users
DROP COLUMN IF EXISTS street_address,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS postal_code,
DROP COLUMN IF EXISTS country;
```

## Future Enhancements

Potential improvements for the address feature:

1. **Address Validation:**
   - Integrate with address validation API (Google Maps, Loqate, etc.)
   - Validate postal codes for different countries
   - Suggest address corrections

2. **Geocoding:**
   - Store latitude/longitude for precise location
   - Enable radius-based job searches
   - Calculate commute times to job locations

3. **Privacy Controls:**
   - Option to hide address from certain applications
   - Use city/state only for initial applications
   - Reveal full address only when requested

4. **International Support:**
   - Country-specific address formats
   - Postal code validation per country
   - Province/state dropdowns by country
   - Translated field labels

5. **Auto-fill:**
   - Browser autocomplete integration
   - Import from LinkedIn profile
   - Parse from uploaded resume

## Support

For issues or questions about the address feature:

1. Check the test script output
2. Verify database migration completed
3. Check browser console for TypeScript errors
4. Review server logs for API errors

## Related Files

- Database: `/supabase/migrations/015_add_address_fields_to_users.sql`
- Types:
  - `/src/sections/account-billing/types.ts`
  - `/backend/src/types/index.ts`
  - `/workers/api/types.ts`
  - `/src/sections/profile-resume-management/types.ts`
- UI: `/src/sections/account-billing/components/ProfileSettings.tsx`
- Services:
  - `/backend/src/services/openai.service.ts`
  - `/workers/api/services/openai.ts`
- Tests: `/scripts/test-address-feature.ts`
