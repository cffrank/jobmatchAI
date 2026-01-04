# Application Status Transitions - Quick Reference

## Status Flow Diagram

```
                        Applied
                           |
                           v
                   Response Received
                           |
                           v
                       Screening
                           |
                           v
                  Interview Scheduled
                           |
                           v
                  Interview Completed
                           |
                           v
                          Offer
                         /   \
                        /     \
                       v       v
              Offer Accepted  Offer Declined
                    |              |
                    v              v
                 Accepted     (Terminal)
                    |
                    v
                (Terminal)

        ┌──────────────────────────────────────┐
        │  Can exit at any point via:          │
        │  - Rejected (by company)              │
        │  - Withdrawn (by user)                │
        │  - Abandoned (by user)                │
        └──────────────────────────────────────┘
```

## Valid Transitions by Status

### Active Statuses

#### Applied
Can transition to:
- ✅ Response Received
- ✅ Screening
- ✅ Rejected
- ✅ Withdrawn
- ✅ Abandoned

#### Response Received
Can transition to:
- ✅ Screening
- ✅ Interview Scheduled
- ✅ Rejected
- ✅ Withdrawn
- ✅ Abandoned

#### Screening
Can transition to:
- ✅ Interview Scheduled
- ✅ Rejected
- ✅ Withdrawn
- ✅ Abandoned

#### Interview Scheduled
Can transition to:
- ✅ Interview Completed
- ✅ Rejected
- ✅ Withdrawn
- ✅ Abandoned

#### Interview Completed
Can transition to:
- ✅ Interview Scheduled (for additional rounds)
- ✅ Offer
- ✅ Rejected
- ✅ Withdrawn
- ✅ Abandoned

### Success Statuses

#### Offer
Can transition to:
- ✅ Offer Accepted
- ✅ Offer Declined
- ✅ Withdrawn

#### Offer Accepted
Can transition to:
- ✅ Accepted
- ❌ No other transitions

### Terminal Statuses

#### Accepted
- ❌ No transitions allowed (final success state)

#### Offer Declined
- ❌ No transitions allowed (declined offer)

#### Rejected
- ❌ No transitions allowed (rejected by company)

#### Withdrawn
- ❌ No transitions allowed (withdrew application)

#### Abandoned
- ❌ No transitions allowed (gave up on application)

## Status Categories

### Active (In Progress)
- Applied
- Response Received
- Screening
- Interview Scheduled
- Interview Completed

**Use Case**: Show in "Active Applications" list

### Success (Positive Outcome)
- Offer
- Offer Accepted
- Accepted

**Use Case**: Celebrate wins, track success rate

### Closed (User Decision)
- Offer Declined
- Withdrawn
- Abandoned

**Use Case**: Archive without counting as failure

### Negative (Rejection)
- Rejected

**Use Case**: Track rejection rate, learn from feedback

## Common Scenarios

### Normal Flow (Success)
1. Applied
2. Response Received
3. Screening
4. Interview Scheduled
5. Interview Completed
6. Offer
7. Offer Accepted
8. Accepted ✅

### Multiple Interview Rounds
1. Applied
2. Response Received
3. Screening
4. Interview Scheduled (Phone Screen)
5. Interview Completed
6. Interview Scheduled (Technical)
7. Interview Completed
8. Interview Scheduled (Final Round)
9. Interview Completed
10. Offer

### Fast Track
1. Applied
2. Screening
3. Interview Scheduled
4. Interview Completed
5. Offer

### Rejection After Interview
1. Applied
2. Response Received
3. Screening
4. Interview Scheduled
5. Interview Completed
6. Rejected ❌

### User Withdraws
1. Applied
2. Response Received
3. Screening
4. Withdrawn 🚫

### Offer Declined
1. Applied
2. ... (interview process)
3. Offer
4. Offer Declined 👎

### No Response
1. Applied
2. (wait 2+ weeks)
3. Abandoned 🗑️

## Validation Rules

### Client-Side Validation
```typescript
import { isValidTransition } from './utils/statusHelpers'

// Before updating status
if (!isValidTransition(currentStatus, newStatus)) {
  showError('Invalid status transition')
  return
}

updateStatus(newStatus)
```

### Server-Side Validation
Database enum enforces valid status values. Application logic should validate transitions before database update.

### Automatic Protection
- Terminal states cannot be changed (no valid transitions)
- StatusUpdateDialog only shows valid next steps
- Dropdown hides if no transitions available

## Color Coding

| Status | Color | Visual Indicator |
|--------|-------|------------------|
| Applied | Gray | 🕐 Clock |
| Response Received | Blue | ✉️ Mail |
| Screening | Indigo | 👁️ Eye |
| Interview Scheduled | Purple | 📅 Calendar |
| Interview Completed | Violet | ✅ Check |
| Offer | Emerald | 📈 Trending Up |
| Offer Accepted | Green | ✔️ Check Circle |
| Offer Declined | Amber | ❌ X Circle |
| Accepted | Green | ✔️ Check Circle |
| Rejected | Red | ❌ X Circle |
| Withdrawn | Orange | ➖ Minus Circle |
| Abandoned | Gray | 🗄️ Archive |

## Best Practices

### When to Use Each Status

**Applied**
- Just submitted application
- Waiting for initial response

**Response Received**
- Got automated confirmation email
- Recruiter reached out
- Application acknowledged

**Screening**
- Resume is being reviewed
- Application in review process
- Before interview scheduling

**Interview Scheduled**
- Interview date and time confirmed
- Calendar invite received
- Preparing for interview

**Interview Completed**
- Finished an interview round
- Waiting for next steps
- May loop back to "Interview Scheduled" for more rounds

**Offer**
- Received formal job offer
- Reviewing offer details
- Negotiating terms

**Offer Accepted**
- Verbally or in writing accepted offer
- Waiting for start date
- Transition to "Accepted" when finalized

**Accepted**
- Offer fully accepted
- Start date confirmed
- Background check complete
- FINAL SUCCESS STATE

**Offer Declined**
- Decided not to accept offer
- Negotiation failed
- Chose another opportunity

**Rejected**
- Company rejected application
- Not moving forward with process
- Failed interview/assessment

**Withdrawn**
- You withdrew application
- No longer interested
- Accepted another offer

**Abandoned**
- Gave up pursuing application
- No response for extended period
- Lost interest in role

### Recommended Timing

- **Applied → Response Received**: Within 1-2 weeks
- **Screening → Interview Scheduled**: 1-3 weeks typical
- **Interview Completed → Offer**: 1-2 weeks average
- **Offer → Decision**: Usually 3-7 days window

Mark as **Abandoned** if no response after:
- 4+ weeks from Applied
- 3+ weeks from Interview Completed
- 2+ weeks past promised follow-up date

## Quick Action Menu

Suggested quick actions in UI:

```
Current: Applied
Quick Actions:
  → Mark as Abandoned (no response)
  → Update to Screening (in review)
  → Update to Rejected (rejection received)

Current: Interview Completed
Quick Actions:
  → Schedule Next Round
  → Received Offer
  → Mark as Rejected

Current: Offer
Quick Actions:
  → Accept Offer
  → Decline Offer
  → Request Extension
```

## Analytics Opportunities

Track these metrics using status data:

1. **Time in Status** - How long applications spend in each stage
2. **Conversion Rates** - % moving from one status to next
3. **Success Rate** - % reaching Accepted status
4. **Rejection Point** - Where most rejections occur
5. **Response Time** - Days from Applied to Response Received
6. **Interview to Offer** - Success rate after interviews

## Status Notes Best Practices

When updating status, add notes for:

- **Response Received**: "Recruiter email - Sarah from HR"
- **Interview Scheduled**: "Phone screen Tuesday 2pm with John (Engineering Manager)"
- **Interview Completed**: "Went well, asked about X and Y, seems like good fit"
- **Offer**: "Base: $120k, Stock: 10k shares, Start: March 1"
- **Rejected**: "Feedback: looking for more Python experience"
- **Withdrawn**: "Accepted offer from Company X instead"

## Integration Points

Status changes can trigger:

- [ ] Email notifications
- [ ] Calendar events
- [ ] Reminders/follow-ups
- [ ] Analytics updates
- [ ] Activity feed entries
- [ ] Slack/Discord webhooks
- [ ] Export to spreadsheet

---

**Need Help?**
- See full documentation: `/docs/APPLICATION_STATUS_TRACKING.md`
- Check helpers: `/src/sections/application-tracker/utils/statusHelpers.ts`
- Review types: `/src/sections/application-tracker/types.ts`
