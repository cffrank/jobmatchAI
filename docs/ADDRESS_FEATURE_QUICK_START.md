# Address Feature - Quick Start Guide

## For Users

### How to Add Your Address

1. Navigate to **Settings** → **Account** → **Profile**
2. Click **Edit Profile**
3. Scroll to the address section
4. Fill in your address details:
   - **Street Address:** Your full street address (e.g., "123 Main St, Apt 4B")
   - **City:** Your city name
   - **State/Province:** Your state or province
   - **Postal Code:** Your ZIP or postal code
   - **Country:** Your country
5. Click **Save Changes**

### Where Your Address Appears

- **Resumes:** Your address appears on AI-generated resumes
- **Job Searches:** Used to match jobs in your area
- **Profile:** Displays on your profile page

### Privacy Note

Your address is private and only visible to:
- You in your profile
- Employers when you submit an application with a resume

## For Developers

### Adding Address to User Profile (API)

**Update User Profile:**
```typescript
// PATCH /api/users/me
{
  "streetAddress": "123 Main Street, Apt 4B",
  "city": "San Francisco",
  "state": "CA",
  "postalCode": "94102",
  "country": "United States"
}
```

**Response:**
```typescript
{
  "id": "user-uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "streetAddress": "123 Main Street, Apt 4B",
  "city": "San Francisco",
  "state": "CA",
  "postalCode": "94102",
  "country": "United States",
  // ... other fields
}
```

### Accessing Address in Code

**Frontend:**
```typescript
import type { UserProfile } from '@/sections/account-billing/types';

function displayUserAddress(profile: UserProfile) {
  const parts = [
    profile.streetAddress,
    profile.city,
    profile.state,
    profile.postalCode,
    profile.country
  ].filter(Boolean);

  return parts.join(', ');
}
```

**Backend:**
```typescript
import type { UserProfile } from '@/types';

function formatAddressForResume(profile: UserProfile): string {
  const parts: string[] = [];

  if (profile.streetAddress) parts.push(profile.streetAddress);
  if (profile.city) parts.push(profile.city);
  if (profile.state) parts.push(profile.state);
  if (profile.postalCode) parts.push(profile.postalCode);
  if (profile.country) parts.push(profile.country);

  return parts.join(', ');
}
```

**Database Query:**
```sql
-- Get formatted address
SELECT get_formatted_address(user_id) FROM users WHERE id = 'user-uuid';

-- Query users by city
SELECT * FROM users WHERE city = 'San Francisco';

-- Query users by state
SELECT * FROM users WHERE state = 'CA';
```

### Resume Generation

Address is automatically included in AI-generated resumes. The OpenAI service formats the address and includes it in the candidate profile.

**Example Resume Header:**
```
John Doe
123 Main Street, Apt 4B, San Francisco, CA 94102, United States
(555) 123-4567 | john.doe@example.com | linkedin.com/in/johndoe
```

### Job Matching

Use address fields for location-based job matching:

```typescript
function calculateLocationMatch(userProfile: UserProfile, job: Job): number {
  // Match by city
  if (userProfile.city && job.location.includes(userProfile.city)) {
    return 100;
  }

  // Match by state
  if (userProfile.state && job.location.includes(userProfile.state)) {
    return 75;
  }

  // Remote jobs
  if (job.workArrangement === 'Remote') {
    return 50;
  }

  return 0;
}
```

## Common Use Cases

### 1. Complete Resume Profile

```typescript
const userProfile: UserProfile = {
  id: 'uuid',
  email: 'john@example.com',
  fullName: 'John Doe',
  phone: '(555) 123-4567',

  // Address fields
  streetAddress: '123 Main St, Apt 4B',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94102',
  country: 'United States',

  // ... other fields
};
```

### 2. Partial Address (City/State Only)

```typescript
const userProfile: UserProfile = {
  id: 'uuid',
  email: 'jane@example.com',
  fullName: 'Jane Smith',

  // Only city and state
  city: 'New York',
  state: 'NY',

  // Other address fields are optional
  streetAddress: undefined,
  postalCode: undefined,
  country: undefined,

  // ... other fields
};
```

### 3. Remote Worker (Country Only)

```typescript
const userProfile: UserProfile = {
  id: 'uuid',
  email: 'alex@example.com',
  fullName: 'Alex Johnson',

  // Remote worker - just country
  country: 'United States',

  // ... other fields
};
```

## Validation

### Frontend Validation

```typescript
function validateAddress(data: Partial<UserProfile>): string[] {
  const errors: string[] = [];

  // Postal code format (US ZIP)
  if (data.postalCode && !/^\d{5}(-\d{4})?$/.test(data.postalCode)) {
    errors.push('Invalid postal code format');
  }

  // State code (US states)
  if (data.state && data.state.length > 2) {
    // Could be full state name or 2-letter code
  }

  return errors;
}
```

### Backend Validation

```typescript
import { z } from 'zod';

const userProfileSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  streetAddress: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  // ... other fields
});
```

## Best Practices

1. **Make All Fields Optional:** Not everyone has or wants to share complete address
2. **Format Consistently:** Use the helper functions for consistent formatting
3. **Privacy First:** Only show address where necessary (resumes, applications)
4. **Validate Gracefully:** Accept various formats, normalize on save
5. **International Support:** Don't assume US address format

## Troubleshooting

### Address Not Appearing on Resume

1. Check that address fields are populated in user profile
2. Verify AI service is using latest code with address support
3. Check resume generation logs for errors

### Database Query Issues

```sql
-- Verify columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('street_address', 'city', 'state', 'postal_code', 'country');

-- Check if user has address data
SELECT street_address, city, state, postal_code, country
FROM users
WHERE id = 'user-uuid';
```

### Type Errors

Make sure you're using the updated type definitions:
```typescript
// Import from correct location
import type { UserProfile } from '@/sections/account-billing/types';
// or
import type { UserProfile } from '@/types';
```

## Support

For questions or issues:
1. Check the full documentation: `docs/ADDRESS_FEATURE_IMPLEMENTATION.md`
2. Run the test script: `npx tsx scripts/test-address-feature.ts`
3. Review migration file: `supabase/migrations/015_add_address_fields_to_users.sql`
