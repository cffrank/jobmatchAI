# Email Sending Setup Guide

This guide explains how to configure SendGrid for email sending in JobMatch AI.

## Prerequisites

1. **SendGrid Account**: Sign up at [sendgrid.com](https://sendgrid.com)
2. **Firebase Project**: You must have a Firebase project configured
3. **Firebase CLI**: Install with `npm install -g firebase-tools`

## Setup Steps

### 1. Create SendGrid API Key

1. Log in to your SendGrid account
2. Go to Settings > API Keys
3. Click "Create API Key"
4. Name it "JobMatch AI Email Sending"
5. Select "Full Access" or at minimum "Mail Send" permissions
6. Copy the API key (you won't be able to see it again)

### 2. Configure Firebase Secret

Store the SendGrid API key as a Firebase secret:

```bash
# Set the secret
firebase functions:secrets:set SENDGRID_API_KEY

# When prompted, paste your SendGrid API key
```

Verify the secret was set:

```bash
firebase functions:secrets:access SENDGRID_API_KEY
```

### 3. Verify Domain (Optional but Recommended)

For production use, verify your sending domain in SendGrid:

1. Go to Settings > Sender Authentication
2. Choose "Domain Authentication"
3. Follow the wizard to add DNS records
4. Wait for verification (usually takes a few minutes)

This improves deliverability and prevents emails from going to spam.

### 4. Deploy the Function

```bash
cd functions
npm run build
firebase deploy --only functions:sendApplicationEmail
```

### 5. Test the Function

You can test the function using the Firebase Console or directly from your app:

```javascript
const functions = getFunctions();
const sendEmail = httpsCallable(functions, 'sendApplicationEmail');

await sendEmail({
  applicationId: 'test-app-id',
  recipientEmail: 'test@example.com',
  subject: 'Test Application',
  body: 'This is a test email.',
  includeResume: false,
  includeCoverLetter: false
});
```

## Rate Limiting

The email function includes built-in rate limiting:

- **Limit**: 10 emails per hour per user
- **Reset**: Rolling 1-hour window
- **Storage**: Firestore `users/{userId}/emails` collection

## Email History

All sent emails are tracked in Firestore:

```
users/{userId}/applications/{applicationId}/emails/{emailId}
{
  recipientEmail: string
  subject: string
  body: string
  includeResume: boolean
  includeCoverLetter: boolean
  sentAt: timestamp
  status: 'sent' | 'failed'
  fromEmail: string
  fromName: string
}
```

## Security Features

1. **Authentication Required**: Only authenticated users can send emails
2. **User Isolation**: Users can only send emails for their own applications
3. **Email Validation**: Recipient email addresses are validated
4. **Rate Limiting**: Prevents spam and abuse
5. **Audit Trail**: All emails are logged and cannot be deleted
6. **Input Sanitization**: HTML content is sanitized to prevent XSS

## Troubleshooting

### "SendGrid API key is not configured"

Make sure you've set the secret:

```bash
firebase functions:secrets:set SENDGRID_API_KEY
```

### "Rate limit exceeded"

Users can send maximum 10 emails per hour. Wait or increase the limit in `sendApplicationEmail.ts`:

```typescript
const RATE_LIMIT_MAX_EMAILS = 20; // Increase this value
```

### Emails going to spam

1. Verify your domain in SendGrid
2. Set up SPF, DKIM, and DMARC records
3. Use a professional "from" email address
4. Ask recipients to whitelist your domain

### SendGrid errors

Check the function logs:

```bash
firebase functions:log --only sendApplicationEmail
```

Common SendGrid error codes:
- `401`: Invalid API key
- `403`: Permission denied (check API key permissions)
- `400`: Invalid email format or content

## Cost Considerations

### SendGrid Pricing

- **Free Tier**: 100 emails/day
- **Essentials**: $19.95/month for 50,000 emails/month
- **Pro**: $89.95/month for 100,000 emails/month

### Firebase Functions Pricing

- **Free Tier**: 2M invocations/month
- **Paid**: $0.40 per million invocations

For most applications, the free tiers are sufficient for development and small-scale production use.

## Alternative: Firebase Email Trigger Extension

Instead of SendGrid, you can use the Firebase Email Trigger extension:

```bash
firebase ext:install firebase/firestore-send-email
```

This uses SMTP instead of SendGrid but has similar functionality. Follow the extension setup wizard to configure your SMTP provider (Gmail, AWS SES, etc.).

## Production Checklist

- [ ] SendGrid API key configured as Firebase secret
- [ ] Domain verified in SendGrid
- [ ] SPF/DKIM/DMARC records configured
- [ ] Function deployed to production
- [ ] Rate limits configured appropriately
- [ ] Email templates tested
- [ ] Firestore security rules deployed
- [ ] Monitoring and alerts set up
- [ ] Privacy policy updated with email usage

## Support

For issues with:
- **SendGrid**: [SendGrid Support](https://support.sendgrid.com/)
- **Firebase Functions**: [Firebase Documentation](https://firebase.google.com/docs/functions)
- **This implementation**: Open an issue in the repository
