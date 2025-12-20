# LinkedIn OAuth Integration Setup Guide

## Overview

This guide will help you set up LinkedIn OAuth integration to allow users to import their profile data from LinkedIn.

**Important Note**: LinkedIn has restricted API access. With standard OAuth scopes (`openid`, `profile`, `email`), you can only import basic profile information:
- First name, last name
- Email address
- Profile picture
- Basic headline (if available)

**Work experience, education, and skills require LinkedIn Partner API access**, which is only available to approved partners. For now, users will need to manually enter this information or upload a resume.

---

## Step 1: Create a LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **"Create app"**
3. Fill in the required fields:
   - **App name**: JobMatch AI (or your preferred name)
   - **LinkedIn Page**: Associate with your company page (or create one)
   - **App logo**: Upload your app logo (recommended 300x300px)
   - **Privacy policy URL**: Your privacy policy URL
   - **Legal agreement**: Accept the terms
4. Click **"Create app"**

---

## Step 2: Configure OAuth Settings

1. In your app dashboard, go to the **"Auth"** tab
2. Under **"OAuth 2.0 settings"**, add redirect URLs:
   ```
   https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/linkedInCallback
   ```
   Replace `YOUR_PROJECT_ID` with your Firebase project ID

   For local testing, also add:
   ```
   http://localhost:5001/YOUR_PROJECT_ID/us-central1/linkedInCallback
   ```

3. Under **"OAuth 2.0 scopes"**, request access to:
   - `openid` (required for authentication)
   - `profile` (basic profile info)
   - `email` (email address)

4. Copy your credentials:
   - **Client ID**
   - **Client Secret**

---

## Step 3: Configure Firebase Secrets

Store your LinkedIn credentials securely using Firebase Secret Manager:

```bash
# Navigate to your functions directory
cd jobmatch-ai/functions

# Set LinkedIn Client ID
firebase functions:secrets:set LINKEDIN_CLIENT_ID
# Paste your Client ID when prompted

# Set LinkedIn Client Secret
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
# Paste your Client Secret when prompted
```

Verify secrets are set:
```bash
firebase functions:secrets:access LINKEDIN_CLIENT_ID
firebase functions:secrets:access LINKEDIN_CLIENT_SECRET
```

---

## Step 4: Update Environment Variables (Optional)

If you want to customize the redirect URL or app URL, set these environment variables:

```bash
# Set the app URL where users will be redirected after OAuth
firebase functions:config:set app.url="https://your-app.web.app"

# For local development
firebase functions:config:set app.url="http://localhost:5173"
```

---

## Step 5: Deploy Cloud Functions

Deploy the LinkedIn OAuth functions:

```bash
# From the project root
cd jobmatch-ai
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback
```

Expected output:
```
✔  functions[linkedInAuth(us-central1)] Successful create operation.
✔  functions[linkedInCallback(us-central1)] Successful create operation.
```

---

## Step 6: Test the Integration

1. Start your React app:
   ```bash
   cd jobmatch-ai
   npm run dev
   ```

2. Navigate to the profile creation/edit page
3. Click **"Import from LinkedIn"**
4. You should be redirected to LinkedIn's OAuth consent screen
5. Authorize the app
6. You'll be redirected back with basic profile data imported

---

## Step 7: Verify Data Import

After successful OAuth, check Firestore to verify the imported data:

1. Go to Firebase Console → Firestore Database
2. Navigate to `users/{userId}`
3. Check for these fields:
   - `firstName`
   - `lastName`
   - `email`
   - `profileImageUrl`
   - `linkedInUrl`
   - `linkedInImported: true`
   - `linkedInLimitedAccess: true`

---

## Troubleshooting

### Error: "LinkedIn credentials not configured"
**Solution**: Make sure you've set the Firebase secrets correctly:
```bash
firebase functions:secrets:access LINKEDIN_CLIENT_ID
firebase functions:secrets:access LINKEDIN_CLIENT_SECRET
```

### Error: "redirect_uri_mismatch"
**Solution**: Ensure the redirect URI in your LinkedIn app matches exactly:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/linkedInCallback
```
Note: No trailing slash!

### Error: "Invalid state token"
**Solution**:
- The OAuth state token expires in 10 minutes. Try the flow again.
- Check if cookies are enabled in your browser
- Clear browser cache and try again

### Error: "Profile fetch failed"
**Solution**:
- Verify you have the correct OAuth scopes enabled in LinkedIn app
- Check Cloud Functions logs: `firebase functions:log`
- Ensure your LinkedIn app is not in "Development" mode with restricted access

### Users can't see work experience/education/skills
**Expected behavior**: LinkedIn restricts these endpoints. Users will see a notification:
> "Basic profile information imported. To add work experience, education, and skills, please use the manual import feature or upload your resume."

---

## API Limitations & Alternative Solutions

### What Data Can We Import?
With standard LinkedIn OAuth (no partner access):
- ✅ First name, last name
- ✅ Email address
- ✅ Profile picture URL
- ✅ Basic headline (sometimes)
- ❌ Work experience (requires partner access)
- ❌ Education history (requires partner access)
- ❌ Skills & endorsements (requires partner access)

### Alternative Solutions for Full Data Import:

#### Option 1: Manual Resume Upload
Implement a resume parser to extract work experience, education, and skills from uploaded PDFs or Word documents.

**Recommended libraries**:
- `pdf-parse` for PDF parsing
- `mammoth` for DOCX parsing
- OpenAI API for extracting structured data from resume text

#### Option 2: Apply for LinkedIn Partner Program
If you expect high user volume and need full LinkedIn integration:
1. Go to [LinkedIn Partner Program](https://www.linkedin.com/developers/partnerships)
2. Apply for partner status
3. Request access to additional API scopes:
   - `r_member_social` (full profile data)
   - `r_organization_social` (company data)

**Note**: Approval is not guaranteed and typically requires a business use case.

#### Option 3: Guided Manual Entry
Provide a streamlined UI for users to manually enter their work experience, education, and skills with:
- Auto-save functionality
- Templates and suggestions
- Import from clipboard (users can copy from LinkedIn and paste)

---

## Security Best Practices

1. **Never commit secrets to git**:
   - Secrets are stored in Firebase Secret Manager
   - Never hardcode Client ID or Client Secret

2. **State token validation**:
   - Prevents CSRF attacks
   - Tokens expire in 10 minutes
   - One-time use only

3. **User authentication required**:
   - Only authenticated users can initiate OAuth
   - User ID is validated throughout the flow

4. **HTTPS only**:
   - All OAuth redirects use HTTPS in production
   - Local development uses localhost exception

---

## Monitoring & Logs

View Cloud Functions logs to monitor OAuth flows:

```bash
# View all function logs
firebase functions:log

# View only LinkedIn function logs
firebase functions:log --only linkedInAuth,linkedInCallback

# Stream logs in real-time
firebase functions:log --only linkedInAuth,linkedInCallback --follow
```

Key log messages to look for:
- `LinkedIn auth initiated for user {userId}`
- `Processing LinkedIn callback for user {userId}`
- `Successfully imported LinkedIn data for user {userId}`
- Errors will be logged with full stack traces

---

## Cost Considerations

### Firebase Secret Manager
- Free tier: 6 secret versions
- We use 2 secrets (Client ID + Client Secret)
- Each secret update creates a new version
- [Pricing details](https://cloud.google.com/secret-manager/pricing)

### Cloud Functions Invocations
- Free tier: 2M invocations/month
- LinkedIn OAuth uses 2 invocations per user (auth + callback)
- Expect minimal cost unless you have 1M+ users/month

### LinkedIn API Rate Limits
- Standard tier: 500 requests/day per app
- Throttling: 100 requests per user per day
- [LinkedIn rate limits](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits)

---

## Next Steps

After setting up LinkedIn OAuth:

1. **Test with real users**: Have a few users test the flow end-to-end
2. **Monitor error rates**: Check Cloud Functions logs for issues
3. **Implement resume upload**: Provide alternative data import method
4. **Add user notifications**: Inform users about LinkedIn API limitations
5. **Consider partner application**: If you need full profile data access

---

## Support

For issues or questions:
1. Check Firebase Functions logs
2. Review LinkedIn API documentation
3. Contact your development team

**LinkedIn API Documentation**:
- [OAuth 2.0 Guide](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [Profile API](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Developer Portal](https://www.linkedin.com/developers)
