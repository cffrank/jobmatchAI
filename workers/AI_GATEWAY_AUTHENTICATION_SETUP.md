# AI Gateway Authentication Setup

## Overview

Enabling Authenticated Gateway adds security by requiring a valid authorization token for each request. This is especially important when storing logs to prevent unauthorized access and protect against invalid requests.

**Key Benefit for Workers**: When an AI Gateway is accessed from a Cloudflare Worker in the same account, requests are **automatically pre-authenticated** - no `cf-aig-authorization` header needed!

## Setup Steps

### 1. Create Authentication Token

1. Go to AI Gateway Settings:
   - Navigate to: https://dash.cloudflare.com/?to=/:account/ai/ai-gateway/jobmatch-ai-gateway
   - Click **Settings** tab

2. Create Token:
   - Click **"Create authentication token"**
   - Token will have required `Run` permissions
   - **IMPORTANT**: Copy and save this token securely (won't be shown again)
   - Store it in your password manager or secrets vault

3. Token Storage (Optional):
   - The token is only needed if accessing the gateway from **outside Cloudflare Workers**
   - For our Worker, automatic pre-authentication handles this
   - If you need to test from local machine or external service, store as: `CF_AIG_TOKEN`

### 2. Enable Authenticated Gateway

1. In the same Settings page:
   - Toggle **"Authenticated Gateway"** to ON
   - Confirm the change

2. Verify Status:
   - Setting should show as enabled
   - Gateway now requires authentication for all requests

### 3. Verify Worker Requests (No Code Changes Needed!)

Our Worker requests are automatically authenticated because:
- Worker runs in the same Cloudflare account as AI Gateway
- Cloudflare automatically pre-authenticates Worker-to-Gateway requests
- No `cf-aig-authorization` header required in code

**Current implementation** (already working):
```typescript
// api/services/openai.ts
export function createOpenAI(env: Env): OpenAI {
  const gatewayBaseURL = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_SLUG}/openai`;

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: gatewayBaseURL,
    // No cf-aig-authorization header needed! ✅
  });
}
```

## Expected Behavior After Enabling

| Request Source | Authentication Method | Header Required? |
|----------------|----------------------|------------------|
| Cloudflare Worker (same account) | Automatic pre-authentication | ❌ No |
| External API call | Manual token | ✅ Yes (`cf-aig-authorization`) |
| Local development (direct to gateway) | Manual token | ✅ Yes |
| Frontend (direct to gateway) | Manual token | ✅ Yes |

## Testing After Enabling Authentication

### 1. Verify Worker Requests Still Work

Run the AI Gateway test script:
```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
./scripts/test-ai-gateway.sh
```

Expected: All tests pass (no changes needed)

### 2. Test AI Features in Frontend

1. Resume Parsing: https://jobmatch-ai-dev.pages.dev/profile
2. Application Generation: https://jobmatch-ai-dev.pages.dev/jobs
3. Job Compatibility: https://jobmatch-ai-dev.pages.dev/jobs

Expected: All features work normally

### 3. Monitor AI Gateway Dashboard

Check that requests are being logged:
- Go to: https://dash.cloudflare.com/?to=/:account/ai/ai-gateway/jobmatch-ai-gateway
- View **Analytics** tab
- Verify requests appear with authenticated status

## If You Need to Call Gateway from External Source

If testing from local machine or external service, you'll need to add the authentication header:

```bash
# Example: Direct curl to gateway (not typical - usually goes through Worker)
curl https://gateway.ai.cloudflare.com/v1/{account_id}/jobmatch-ai-gateway/openai/chat/completions \
  --header 'cf-aig-authorization: Bearer {CF_AIG_TOKEN}' \
  --header 'Authorization: Bearer {OPENAI_API_KEY}' \
  --header 'Content-Type: application/json' \
  --data '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Test"}]}'
```

JavaScript/TypeScript example:
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://gateway.ai.cloudflare.com/v1/{account_id}/jobmatch-ai-gateway/openai",
  defaultHeaders: {
    "cf-aig-authorization": `Bearer ${process.env.CF_AIG_TOKEN}`,
  },
});
```

## Security Benefits

✅ **Prevents unauthorized access** - Only authenticated requests processed
✅ **Protects log storage** - Blocks spam/invalid requests from inflating logs
✅ **Easier debugging** - Logs only contain legitimate requests
✅ **Account security** - Token can be rotated if compromised
✅ **Audit trail** - All authenticated requests are tracked

## Troubleshooting

### Worker Requests Failing After Enabling

**Symptom**: AI features return 401/403 errors
**Cause**: Rare issue with automatic pre-authentication
**Fix**:
1. Verify gateway name matches: `jobmatch-ai-gateway`
2. Check Worker is deployed to same account as gateway
3. Try toggling Authenticated Gateway off/on in dashboard

### External Requests Failing

**Symptom**: Direct API calls return 401/403
**Cause**: Missing `cf-aig-authorization` header
**Fix**: Add the header with your token (see examples above)

### Token Lost/Compromised

**Action**: Rotate the token
1. Go to gateway Settings
2. Delete old token
3. Create new token
4. Update any external services using the old token
5. Worker requests continue working (no token needed)

## Monitoring

After enabling authentication, monitor:

1. **Request Success Rate**:
   - Should remain 100% for Worker requests
   - Failed requests indicate authentication issues

2. **Log Quality**:
   - Logs should only contain authenticated requests
   - No spam or invalid requests

3. **Security Events**:
   - Monitor for unauthorized access attempts
   - Review patterns in failed authentication attempts

## Credential Rotation Schedule

Following the project's credential rotation policy:

- **AI Gateway Token**: Rotate every **180 days** (standard secret)
- **Rotation Process**:
  1. Create new token in dashboard
  2. Update external services (if any)
  3. Delete old token
  4. Worker requests unaffected (automatic auth)

See `/docs/CREDENTIAL_ROTATION_POLICY.md` for full schedule.

## References

- [Cloudflare AI Gateway Authentication Docs](https://developers.cloudflare.com/ai-gateway/configuration/authentication/)
- [Cloudflare Workers Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
- [OpenAI SDK Configuration](https://github.com/openai/openai-node)
