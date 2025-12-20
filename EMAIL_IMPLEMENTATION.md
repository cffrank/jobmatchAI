# Email Functionality Implementation

This document describes the email functionality implementation for sending job applications via email in the JobMatch AI application.

## Overview

The email functionality allows users to send their job applications (resume + cover letter) via email directly from the application editor. Emails are sent using SendGrid and include professional HTML formatting.

## Architecture

### Backend (Firebase Cloud Function)

**File:** `/functions/index.js`

The `sendApplicationEmail` Cloud Function handles email sending with the following features:

- **Authentication**: Requires authenticated user
- **Rate Limiting**: 10 emails per hour per user
- **Input Validation**: Email address format validation
- **Security**: HTML sanitization to prevent XSS attacks
- **Email History**: Tracks all sent emails in Firestore
- **Professional Formatting**: HTML email with cover letter and resume sections

**Function Signature:**
```javascript
exports.sendApplicationEmail = onCall({ secrets: ['SENDGRID_API_KEY'] }, async (request) => {
  // data: { applicationId, recipientEmail }
  // returns: { success, emailId, message }
})
```

### Frontend (React Component)

**Files:**
- `/src/components/EmailDialog.tsx` - Dialog component for email input
- `/src/sections/application-generator/ApplicationEditorPage.tsx` - Email button handler

**Features:**
- Email address input with validation
- Default recipient: carl.f.frank@gmail.com
- Preview of what will be sent
- Loading states during email send
- Error handling with user-friendly messages

## Setup Instructions

### 1. SendGrid Configuration

1. **Create SendGrid Account:**
   - Go to [SendGrid](https://sendgrid.com/)
   - Create a free account (100 emails/day)

2. **Generate API Key:**
   - Navigate to Settings > API Keys
   - Create a new API key with "Full Access"
   - Copy the API key (you won't see it again)

3. **Verify Sender Email:**
   - Go to Settings > Sender Authentication
   - Verify your sender email (carl.f.frank@gmail.com)
   - Click the verification link sent to your email

### 2. Configure Firebase Secrets

```bash
# Navigate to functions directory
cd /home/carl/application-tracking/jobmatch-ai/functions

# Set the SendGrid API key as a Firebase secret
firebase functions:secrets:set SENDGRID_API_KEY

# When prompted, paste your SendGrid API key
```

### 3. Deploy Cloud Function

```bash
# Deploy the sendApplicationEmail function
cd /home/carl/application-tracking/jobmatch-ai
firebase deploy --only functions:sendApplicationEmail
```

### 4. Test Locally (Optional)

To test with Firebase emulators:

```bash
# Start Firebase emulators
firebase emulators:start

# In your app's .env.local, uncomment the emulator lines in firebase.ts
# connectFunctionsEmulator(functions, 'localhost', 5001)
```

## Email Format

The email sent includes:

### Subject
```
Application for [Job Title] at [Company]
```

### Body Structure
1. **Cover Letter Section**
   - Full cover letter text from selected variant
   - HTML formatted with paragraphs

2. **Resume Section**
   - Professional Summary
   - Work Experience (with bullets)
   - Skills (bullet-separated list)
   - Education

3. **Signature**
   - Applicant name
   - Email address
   - Phone (if available)
   - LinkedIn (if available)

4. **Footer**
   - "Sent via JobMatch AI - Application Tracking System"

### Email Metadata
- **From:** carl.f.frank@gmail.com (verified sender)
- **Reply-To:** User's email address
- **Tracking:** Open and click tracking enabled
- **Custom Args:** applicationId, userId (for analytics)

## Security Features

### Rate Limiting
- Maximum 10 emails per hour per user
- Tracked in Firestore `users/{userId}/emails` collection
- Returns error when limit exceeded

### Input Validation
- Email regex validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Application ID required
- User must be authenticated

### XSS Prevention
- All user-generated content is sanitized
- HTML entities escaped in email templates
- No raw HTML injection possible

### Data Privacy
- Email history stored in user's private Firestore path
- Only authenticated users can send emails
- Each email linked to specific application

## Firestore Data Structure

### Email History (per application)
```
users/{userId}/applications/{applicationId}/emails/{emailId}
{
  id: string
  recipientEmail: string
  subject: string
  body: string (cover letter text)
  includeResume: boolean
  includeCoverLetter: boolean
  sentAt: Timestamp
  status: 'sent' | 'failed'
  fromEmail: string
  fromName: string
}
```

### Rate Limiting Collection
```
users/{userId}/emails/{emailId}
{
  applicationId: string
  recipientEmail: string
  sentAt: Timestamp
}
```

### Application Timestamp Update
```
users/{userId}/applications/{applicationId}
{
  ...
  lastEmailSentAt: Timestamp
  updatedAt: Timestamp
}
```

## Testing

### Manual Testing Steps

1. **Generate or Open Application:**
   - Navigate to `/applications`
   - Create new application or open existing one

2. **Click Email Button:**
   - Click "Email" button in the editor
   - Email dialog should appear

3. **Enter Recipient:**
   - Default is carl.f.frank@gmail.com
   - Or enter custom email address
   - Validate format

4. **Send Email:**
   - Click "Send Application"
   - Should see loading state
   - Success toast appears
   - Check recipient's inbox

5. **Verify Rate Limiting:**
   - Try sending 11 emails within an hour
   - 11th should fail with rate limit error

### Expected Behaviors

**Success Case:**
- Toast: "Email sent successfully!"
- Email appears in recipient inbox within 1-2 minutes
- Email includes formatted cover letter and resume
- Reply-to is set to user's email

**Error Cases:**
- Invalid email: "Invalid recipient email address format"
- Rate limit: "Rate limit exceeded. You can send 10 emails per hour..."
- Missing application: "Application not found"
- SendGrid error: "SendGrid error: [error message]"

## Troubleshooting

### Common Issues

**1. "SendGrid API key is not configured"**
- Solution: Set Firebase secret with `firebase functions:secrets:set SENDGRID_API_KEY`
- Redeploy function after setting secret

**2. "SendGrid error: The from address does not match a verified Sender Identity"**
- Solution: Verify carl.f.frank@gmail.com in SendGrid console
- Check Sender Authentication settings

**3. Email not received**
- Check spam/junk folder
- Verify recipient email is correct
- Check SendGrid Activity dashboard for delivery status
- Ensure SendGrid account is not suspended

**4. "Rate limit exceeded"**
- Wait 1 hour from first email sent
- Or increase rate limit in `index.js` (RATE_LIMIT_MAX_EMAILS)

**5. Function timeout**
- Increase timeout in function config
- Check SendGrid API is responding
- Review Cloud Functions logs

## Monitoring

### Firebase Console
- Functions > sendApplicationEmail > Logs
- View execution logs, errors, and performance

### SendGrid Dashboard
- Activity > Monitor email delivery status
- Statistics > Track open rates, click rates

### Firestore Console
- Check `users/{userId}/emails` for rate limiting data
- Check `users/{userId}/applications/{applicationId}/emails` for history

## Cost Considerations

### SendGrid Free Tier
- 100 emails/day
- Sufficient for most development/personal use
- Upgrade to paid plan for production

### Firebase Cloud Functions
- 2M invocations/month free
- Each email = 1 invocation
- Typically stays within free tier

### Firestore Writes
- Email history: 3 writes per email
- Rate limiting: 1 write per email
- Total: 4 writes per email sent

## Future Enhancements

Potential improvements:

1. **PDF Attachments**
   - Generate PDF resume and attach to email
   - Requires PDF generation service integration

2. **Email Templates**
   - Allow users to customize email templates
   - Store templates in Firestore

3. **Bulk Email**
   - Send same application to multiple recipients
   - Respecting rate limits

4. **Email Scheduling**
   - Schedule emails for future delivery
   - Use Cloud Tasks for scheduling

5. **Email Tracking**
   - Track when emails are opened
   - Track link clicks in email
   - Display analytics in UI

6. **Custom Domains**
   - Allow users to send from custom domains
   - Requires SendGrid domain authentication

## Related Files

- `/functions/index.js` - Cloud Function implementation
- `/src/components/EmailDialog.tsx` - Email dialog component
- `/src/sections/application-generator/ApplicationEditorPage.tsx` - Email button integration
- `/src/sections/application-generator/types.ts` - TypeScript types
- `/functions/package.json` - SendGrid dependency

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Check SendGrid Activity dashboard
3. Review error messages in browser console
4. Verify all setup steps completed
