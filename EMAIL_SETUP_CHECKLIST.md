# Email Sending Setup Checklist

Follow this checklist to configure email sending in JobMatch AI.

## Prerequisites

- [ ] Firebase project created and configured
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged in to Firebase CLI (`firebase login`)

## SendGrid Setup

- [ ] Create SendGrid account at [sendgrid.com](https://sendgrid.com)
- [ ] Verify email address
- [ ] Create API Key:
  - Go to Settings > API Keys
  - Click "Create API Key"
  - Name: "JobMatch AI Email Sending"
  - Permissions: "Full Access" or "Mail Send"
  - Copy the API key (save it securely)

## Firebase Configuration

- [ ] Set SendGrid API key as Firebase secret:
  ```bash
  firebase functions:secrets:set SENDGRID_API_KEY
  # Paste your SendGrid API key when prompted
  ```

- [ ] Verify secret is set:
  ```bash
  firebase functions:secrets:access SENDGRID_API_KEY
  ```

## Build and Deploy

- [ ] Install function dependencies:
  ```bash
  cd functions
  npm install
  ```

- [ ] Build TypeScript functions:
  ```bash
  npm run build
  ```

- [ ] Deploy Firestore security rules:
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] Deploy email function:
  ```bash
  firebase deploy --only functions:sendApplicationEmail
  ```

## Testing

- [ ] Start development server:
  ```bash
  cd ..  # Back to project root
  npm run dev
  ```

- [ ] Test email sending:
  1. Generate a job application
  2. Click "Email" button in application editor
  3. Enter a test recipient email
  4. Send test email
  5. Verify email received

- [ ] Check function logs:
  ```bash
  firebase functions:log --only sendApplicationEmail
  ```

- [ ] Verify email history in Firestore:
  - Open Firebase Console
  - Go to Firestore Database
  - Check `users/{userId}/applications/{appId}/emails` collection

## Production Optimization (Optional)

- [ ] Verify domain in SendGrid:
  - Go to Settings > Sender Authentication
  - Choose "Domain Authentication"
  - Follow DNS setup wizard
  - Wait for verification

- [ ] Set up SPF record (improves deliverability)
- [ ] Set up DKIM record (improves deliverability)
- [ ] Set up DMARC record (prevents spoofing)

- [ ] Configure from email address:
  - Update user profile with professional email
  - Or modify function to use custom from address

## Monitoring Setup

- [ ] Set up email alerts for function errors:
  ```bash
  # In Firebase Console > Functions > sendApplicationEmail
  # Enable "Error notifications"
  ```

- [ ] Monitor SendGrid dashboard:
  - Check email delivery rate
  - Review bounce/spam rates
  - Monitor click/open rates

- [ ] Set up cost alerts:
  - Firebase Console > Billing
  - Set budget alerts
  - Monitor function invocations

## Rate Limiting Configuration

- [ ] Review rate limits in `/functions/src/sendApplicationEmail.ts`:
  ```typescript
  const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
  const RATE_LIMIT_MAX_EMAILS = 10; // Max emails per hour
  ```

- [ ] Adjust limits based on your needs
- [ ] Redeploy if changed:
  ```bash
  cd functions
  npm run build
  firebase deploy --only functions:sendApplicationEmail
  ```

## Security Checklist

- [ ] Firestore security rules deployed
- [ ] Email history audit trail enabled
- [ ] Rate limiting active
- [ ] Input validation implemented
- [ ] SendGrid API key stored as secret (not in code)
- [ ] User authentication required
- [ ] User isolation verified (users can't send others' emails)

## Documentation

- [ ] Review `/functions/EMAIL_SETUP.md` for detailed setup
- [ ] Review `/EMAIL_IMPLEMENTATION_SUMMARY.md` for architecture
- [ ] Update privacy policy with email sending disclosure
- [ ] Document email templates for users

## Troubleshooting

If you encounter issues:

1. **Function not found**
   ```bash
   firebase deploy --only functions:sendApplicationEmail
   ```

2. **API key not configured**
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   ```

3. **Rate limit errors**
   - Wait 1 hour or adjust limits in code

4. **Emails going to spam**
   - Verify domain in SendGrid
   - Set up SPF/DKIM records

5. **Check logs**
   ```bash
   firebase functions:log --only sendApplicationEmail --follow
   ```

## Success Criteria

- [ ] Can send test email successfully
- [ ] Email appears in recipient inbox (not spam)
- [ ] Email history recorded in Firestore
- [ ] Rate limiting works (get error after 10 emails/hour)
- [ ] No errors in function logs
- [ ] Professional email formatting
- [ ] User signature includes contact info

## Next Steps (Future Enhancements)

- [ ] Implement PDF generation for attachments
- [ ] Add email templates
- [ ] Set up email scheduling
- [ ] Add analytics dashboard
- [ ] Implement A/B testing for subject lines

## Support

If you need help:

- **SendGrid**: https://support.sendgrid.com/
- **Firebase**: https://firebase.google.com/support
- **Documentation**: See `/functions/EMAIL_SETUP.md`

---

## Quick Start (TL;DR)

```bash
# 1. Set SendGrid API key
firebase functions:secrets:set SENDGRID_API_KEY

# 2. Build and deploy
cd functions
npm install
npm run build
cd ..
firebase deploy --only firestore:rules,functions:sendApplicationEmail

# 3. Test
npm run dev
# Click Email button in app > Send test email

# 4. Check logs
firebase functions:log --only sendApplicationEmail
```

Done! Your email sending is now configured.
