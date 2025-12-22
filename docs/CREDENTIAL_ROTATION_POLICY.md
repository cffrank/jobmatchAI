# Credential Rotation Policy

**Document Version**: 1.0
**Last Updated**: December 21, 2025
**Owner**: Security Team
**Review Frequency**: Quarterly

---

## SEC-001: Secrets and Credentials Rotation Policy

This document defines the policy and procedures for rotating API keys, database credentials, and other secrets used in the JobMatch AI platform.

---

## 1. Overview

### 1.1 Purpose
To minimize the impact of compromised credentials by implementing regular rotation of all API keys, database credentials, and authentication secrets.

### 1.2 Scope
This policy applies to all credentials and secrets used by JobMatch AI, including:
- Third-party API keys (OpenAI, SendGrid, Apify)
- Database credentials (Supabase)
- OAuth client secrets (LinkedIn)
- JWT signing keys
- Service role keys
- Encryption keys

---

## 2. Rotation Schedule

### 2.1 Critical Secrets (Rotate Every 90 Days)

| Secret Type | Location | Rotation Frequency | Next Rotation Date |
|-------------|----------|-------------------|-------------------|
| Supabase Service Role Key | Railway Backend, `.env` | 90 days | March 21, 2026 |
| OpenAI API Key | Railway Backend, `.env` | 90 days | March 21, 2026 |
| SendGrid API Key | Railway Backend, `.env` | 90 days | March 21, 2026 |
| Database Password | Supabase Dashboard | 90 days | March 21, 2026 |

### 2.2 Standard Secrets (Rotate Every 180 Days)

| Secret Type | Location | Rotation Frequency | Next Rotation Date |
|-------------|----------|-------------------|-------------------|
| Apify API Token | Railway Backend, `.env` | 180 days | June 19, 2026 |
| LinkedIn Client Secret | Railway Backend, `.env` | 180 days | June 19, 2026 |
| Supabase Anon Key | Frontend, Railway Backend | 180 days | June 19, 2026 |

### 2.3 Long-Lived Secrets (Rotate Annually)

| Secret Type | Location | Rotation Frequency | Next Rotation Date |
|-------------|----------|-------------------|-------------------|
| JWT Signing Secret | Supabase Dashboard | 365 days | December 21, 2026 |
| Storage Encryption Keys | Supabase Vault | 365 days | December 21, 2026 |

---

## 3. Rotation Procedures

### 3.1 OpenAI API Key Rotation

**Estimated Time**: 15 minutes

1. **Generate New Key**
   - Log into OpenAI Platform (https://platform.openai.com)
   - Navigate to API Keys
   - Create new API key with project scope
   - Copy the key (shown only once)

2. **Update Railway Backend**
   - Go to Railway dashboard
   - Navigate to jobmatch-ai-backend service
   - Update `OPENAI_API_KEY` environment variable
   - Save and redeploy

3. **Verify Functionality**
   - Test application generation endpoint
   - Test resume parsing endpoint
   - Monitor error logs for 24 hours

4. **Revoke Old Key**
   - Wait 24 hours to ensure stability
   - Return to OpenAI Platform
   - Delete old API key

5. **Document Rotation**
   - Update rotation tracking spreadsheet
   - Update "Next Rotation Date" in this document

### 3.2 SendGrid API Key Rotation

**Estimated Time**: 15 minutes

1. **Generate New Key**
   - Log into SendGrid (https://app.sendgrid.com)
   - Navigate to Settings → API Keys
   - Create new API key with "Mail Send" permission only
   - Copy the key

2. **Update Railway Backend**
   - Update `SENDGRID_API_KEY` in Railway environment variables
   - Redeploy backend service

3. **Verify Functionality**
   - Send test email via application
   - Check SendGrid activity dashboard
   - Monitor for delivery failures

4. **Revoke Old Key**
   - Wait 24 hours
   - Delete old API key from SendGrid

5. **Document Rotation**
   - Update rotation tracking spreadsheet

### 3.3 Supabase Service Role Key Rotation

**Estimated Time**: 20 minutes
**Risk Level**: HIGH - requires careful coordination

1. **Generate New Key**
   - Log into Supabase Dashboard
   - Navigate to Project Settings → API
   - Generate new service role key
   - Copy the key immediately

2. **Update Railway Backend**
   - Update `SUPABASE_SERVICE_ROLE_KEY` environment variable
   - **DO NOT redeploy yet**

3. **Schedule Maintenance Window**
   - Schedule 5-minute maintenance window
   - Notify users via status page

4. **Execute Rotation**
   - Redeploy backend service with new key
   - Monitor health check endpoint
   - Test backend functionality

5. **Verify All Services**
   - Test user authentication
   - Test database queries
   - Test scheduled jobs
   - Monitor error logs

6. **Revoke Old Key**
   - After 48 hours of stability, revoke old key in Supabase
   - **Note**: Cannot actually revoke service role key, but generate new JWT secret to invalidate

7. **Document Rotation**
   - Update rotation tracking spreadsheet
   - Document any issues encountered

### 3.4 Database Password Rotation

**Estimated Time**: 30 minutes
**Risk Level**: CRITICAL - production downtime risk

1. **Pre-Rotation Checks**
   - Verify backup is recent (< 24 hours old)
   - Notify team of upcoming change
   - Schedule maintenance window (15 minutes)

2. **Generate New Password**
   - Use password manager to generate 32-character password
   - Include uppercase, lowercase, numbers, symbols

3. **Update Database**
   - Log into Supabase Dashboard
   - Navigate to Database Settings
   - Change database password
   - Save new password to password manager

4. **Update All Services**
   - Update `DATABASE_URL` in Railway backend
   - Update local `.env` files for developers
   - Notify team to pull new credentials

5. **Redeploy All Services**
   - Redeploy backend immediately
   - Monitor connection health

6. **Verify Functionality**
   - Test database queries
   - Check connection pool status
   - Monitor for connection errors

7. **Document Rotation**
   - Update rotation tracking spreadsheet
   - Send confirmation to team

---

## 4. Emergency Rotation Procedure

### 4.1 When to Execute Emergency Rotation

Execute emergency rotation immediately if:
- Credentials are accidentally committed to version control
- Credentials are leaked in logs or error messages
- Suspicious API usage detected
- Team member with access leaves the organization
- Security incident or breach detected

### 4.2 Emergency Rotation Steps

1. **Immediate Actions** (within 1 hour)
   - Revoke compromised credential immediately
   - Generate and deploy new credential
   - Monitor for unauthorized usage
   - Document incident

2. **Post-Rotation** (within 24 hours)
   - Review access logs for unauthorized usage
   - Investigate how credential was compromised
   - Implement preventative measures
   - Report to security team

3. **Follow-Up** (within 1 week)
   - Conduct post-mortem review
   - Update procedures to prevent recurrence
   - Train team on secure credential handling

---

## 5. Credential Storage and Access

### 5.1 Approved Storage Locations

**Production Secrets**:
- ✅ Railway environment variables (encrypted at rest)
- ✅ Supabase Vault (for database encryption keys)
- ✅ 1Password/LastPass Teams (for team access)

**Development Secrets**:
- ✅ Local `.env` files (gitignored)
- ✅ Developer password managers

**NEVER Store**:
- ❌ Git repositories (even private repos)
- ❌ Shared documents (Google Docs, Notion, etc.)
- ❌ Slack/Discord messages
- ❌ Email
- ❌ Hardcoded in source code

### 5.2 Access Control

- Limit access to production secrets to 2-3 senior engineers
- Use principle of least privilege
- Review access quarterly
- Revoke access immediately upon team member departure

---

## 6. Monitoring and Alerting

### 6.1 Secret Age Monitoring

**Implementation**: Create calendar reminders
- 30 days before rotation due date: Warning email
- 7 days before rotation due date: Escalation to team lead
- On rotation due date: Block production changes until rotated

### 6.2 Usage Monitoring

Monitor for suspicious credential usage:
- Unusual API call patterns
- API calls from unexpected IP addresses
- High volume of failed authentication attempts
- Usage outside normal business hours (for team API keys)

**Alerting Channels**:
- Critical alerts → PagerDuty
- Warning alerts → Slack #security channel
- Info alerts → Daily security summary email

---

## 7. Compliance and Audit

### 7.1 Audit Trail

Maintain audit log of all credential rotations including:
- Date and time of rotation
- Person who performed rotation
- Reason (scheduled vs. emergency)
- Verification status
- Any issues encountered

### 7.2 Quarterly Review

**Checklist**:
- [ ] Verify all credentials rotated on schedule
- [ ] Review access control list
- [ ] Check for any exposed credentials in git history
- [ ] Update this policy document
- [ ] Train new team members on procedures

---

## 8. Recovery Procedures

### 8.1 Lost Credential Recovery

If credential is lost but not compromised:

1. Generate new credential following standard rotation procedure
2. Update all services
3. Document incident
4. Review backup procedures

### 8.2 Service Account Lockout

If rotation causes service lockout:

1. Immediately rollback to previous credential (if still valid)
2. Fix configuration issue
3. Retry rotation
4. Document root cause
5. Update procedures to prevent recurrence

---

## 9. Training and Awareness

### 9.1 Onboarding

All engineers must complete security training including:
- Secure credential handling
- Approved storage locations
- Rotation procedures
- Incident reporting

### 9.2 Annual Refresher

Conduct annual security training covering:
- Policy updates
- Recent incidents and lessons learned
- Best practices
- Q&A session

---

## 10. Policy Exceptions

### 10.1 Requesting Exception

Exceptions to rotation schedule require:
- Written justification
- Risk assessment
- Approval from CTO
- Compensating controls
- Expiration date

### 10.2 Documented Exceptions

| Secret | Reason | Compensating Controls | Expires |
|--------|--------|----------------------|---------|
| (None currently) | - | - | - |

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-21 | Security Team | Initial policy creation (SEC-001) |

---

## Appendix A: Rotation Checklist Template

```markdown
# Credential Rotation: [Secret Name]
**Date**: YYYY-MM-DD
**Performed By**: [Name]
**Type**: [ ] Scheduled [ ] Emergency

## Pre-Rotation
- [ ] Backup current configuration
- [ ] Verify monitoring is active
- [ ] Notify team (if applicable)

## Rotation Steps
- [ ] Generate new credential
- [ ] Update production environment variables
- [ ] Redeploy affected services
- [ ] Verify functionality
- [ ] Monitor for errors (24 hours)

## Post-Rotation
- [ ] Revoke old credential
- [ ] Update documentation
- [ ] Update rotation tracking
- [ ] Schedule next rotation

## Issues Encountered
[Describe any issues and resolutions]

## Verification Sign-Off
- [ ] Service health confirmed
- [ ] No errors in logs
- [ ] All features functional
```

---

## Appendix B: Quick Reference

**Emergency Contacts**:
- Security Team: security@jobmatch-ai.com
- On-Call Engineer: Use PagerDuty escalation

**Key URLs**:
- Railway Dashboard: https://railway.app
- Supabase Dashboard: https://supabase.com/dashboard
- OpenAI Platform: https://platform.openai.com
- SendGrid Dashboard: https://app.sendgrid.com

**Rotation Frequency Summary**:
- 90 days: Supabase Service Role, OpenAI, SendGrid, Database Password
- 180 days: Apify, LinkedIn Client Secret, Supabase Anon Key
- 365 days: JWT Signing Secret, Encryption Keys
