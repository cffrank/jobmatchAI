# Version 2: Quality Job Listings Strategy

## Overview

Implement a multi-source, AI-powered job listing aggregation and matching system to surface only the highest-quality, most relevant job opportunities to users.

---

## 1. Multi-Source Approach (Not Single API)

### Primary Source: JSearch API
- Pulls from Google for Jobs + 20+ major job boards
- Includes: Indeed, LinkedIn, Glassdoor, ZipRecruiter, etc.
- **Coverage**: Breadth across all industries and locations

### Secondary Source: RemoteOK API
- Specialized remote job listings
- Higher quality remote-first opportunities
- Curated community-driven postings

### Tertiary Source: Direct Company Career Sites
- Tier-1 companies (FAANG, unicorns, Fortune 500)
- Via web scraping or official RSS/API feeds
- Ensures access to jobs that may not appear on aggregators

**Result**: Comprehensive coverage + quality filtering options

---

## 2. Quality Filtering Layer

Implement automated filters to surface only legitimate, high-quality postings:

### ✅ Verified Companies
- Cross-check against verified employer database
- Filter out fly-by-night or suspicious companies
- Validate company website exists and is legitimate

### ✅ Salary Transparency
- **Prioritize** jobs with salary ranges
- Strong indicator of legitimate posting
- Helps users make informed decisions

### ✅ Complete Job Descriptions
- Minimum word count: **200+ characters**
- Filter spam/low-effort postings
- Ensure description includes responsibilities, requirements, benefits

### ✅ Active Postings
- Posted within last **7-14 days**
- Fresh opportunities only
- Avoid dead/filled positions

### ✅ Reasonable Application Flow
- Flag jobs requiring:
  - Immediate payments
  - Excessive personal data upfront
  - Credit card information
  - Social security number before interview

---

## 3. Relevance Matching (JobMatch AI Advantage)

**This is where JobMatch differentiates from competitors:**

### Skill Extraction & Matching
- **NLP Analysis**: Extract required skills from job description
- **Resume Parsing**: Extract user's skills from profile/resume
- **Skill Overlap Scoring**: Calculate match percentage

### Relevance Scoring: 0-100
```
Score Components:
- Skill match: 40%
- Experience level match: 25%
- Location preference: 15%
- Salary expectations: 10%
- Industry/domain match: 10%
```

### Smart Surfacing
- **High-relevance jobs (70+)**: Show first
- **Medium-relevance (50-69)**: Secondary section
- **Low-relevance (<50)**: Optional "Explore More" section

### ML Prediction Model
- Train on user application history
- Predict which jobs user will apply to
- Improve recommendations over time
- Track: apply rate, save rate, skip rate

---

## 4. Deduplication Strategy

**Problem**: Same job posted on multiple boards (Indeed, LinkedIn, company site)

### Deduplication Logic
```
Canonical Job ID = hash(
  company_name +
  job_title +
  location +
  salary_range
)
```

### Merge Strategy
- Keep version with **best description** (longest, most detailed)
- Track all source boards for user reference
- Show "Posted on: Indeed, LinkedIn, Company Site"
- Preserve all apply links (user can choose preferred board)

---

## 5. Implementation Architecture

```
┌─────────────────────────────────────────────────────────┐
│ User Profile (Resume + Preferences)                     │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Job Search Query (Title, Location, Remote, Salary)     │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Multi-Source Aggregation                                │
│ • JSearch API (Google for Jobs + 20+ boards)           │
│ • RemoteOK API (Remote-first jobs)                     │
│ • Direct Scrapes (Company career sites)                │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Quality Filter Pipeline                                 │
│ • Salary transparency check                            │
│ • Spam/scam detection                                  │
│ • Recency filter (7-14 days)                          │
│ • Description completeness (200+ chars)                │
│ • Verified company check                              │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Deduplication & Enrichment                             │
│ • Merge duplicate postings                             │
│ • Enrich with company data (logo, rating, size)       │
│ • Add salary estimates (if missing)                    │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ AI Relevance Scoring (🔥 YOUR DIFFERENTIATOR)         │
│ • NLP skill extraction                                 │
│ • Resume match scoring                                 │
│ • ML prediction model                                  │
│ • Personalized ranking                                 │
└───────────────────────┬─────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Ranked Results                                          │
│ • High-relevance jobs (70+) first                      │
│ • One-click resume/cover letter optimization          │
│ • Track user actions for ML training                   │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Caching Strategy

### Cache Duration
- **Job listings**: 24-48 hours
- **Trending searches**: Refresh every 4-6 hours
- **Company data**: 7 days
- **Salary estimates**: 30 days

### Database Storage (Supabase)
```sql
CREATE TABLE cached_jobs (
  id UUID PRIMARY KEY,
  job_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL, -- 'jsearch', 'remoteok', 'direct'
  company_name TEXT,
  job_title TEXT,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  description TEXT,
  required_skills TEXT[], -- extracted via NLP
  posted_date TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  quality_score INTEGER, -- 0-100
  source_urls JSONB, -- {indeed: 'url', linkedin: 'url'}
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cached_jobs_expires ON cached_jobs(expires_at);
CREATE INDEX idx_cached_jobs_quality ON cached_jobs(quality_score);
CREATE INDEX idx_cached_jobs_posted ON cached_jobs(posted_date);
```

### Benefits
- **Reduce API costs**: Don't fetch same job repeatedly
- **Faster response times**: Serve from database
- **Real-time updates**: Supabase real-time subscriptions
- **Analytics**: Track job posting trends

---

## 7. User Segment Approach

Tailor job sources based on user profile and preferences:

### Entry-Level Candidates
**Sources**:
- General job boards (JSearch)
- RemoteOK (entry-level remote jobs)
- Internship boards

**Filters**:
- Keywords: "junior", "entry-level", "associate", "intern"
- Experience: 0-2 years

### Experienced Professionals
**Sources**:
- LinkedIn aggregation (JSearch)
- Niche job boards (AngelList, Hired, Triplebyte)
- Executive search firms

**Filters**:
- Keywords: "senior", "lead", "principal", "staff"
- Experience: 5+ years
- Salary: $100k+

### Remote-First Seekers
**Sources**:
- RemoteOK (primary)
- FlexJobs integration
- We Work Remotely
- Remote.co

**Filters**:
- Remote: 100% required
- Time zone compatibility

### Contract/Freelance
**Sources**:
- Upwork
- Fiverr
- Gun.io
- Toptal

**Filters**:
- Contract type: W2, 1099, Corp-to-Corp
- Hourly rate or project-based

---

## 8. Verification & Legitimacy

### Red Flags to Auto-Filter

❌ **No Clear Application Process**
- No apply button/link
- Redirects to suspicious sites
- Requires email only (no formal application)

❌ **Poor Grammar/Spelling**
- Indicator of spam/scam
- Use NLP to detect low-quality text
- Filter if description has >5 spelling errors

❌ **Requests for Personal Financial Info**
- Credit card before applying
- Bank account information
- Social security number before interview
- Upfront payment for "training materials"

❌ **Too-Good-To-Be-True Salaries**
- Entry-level job: $200k+ salary
- No experience required: $150k+
- Work from home: $100/hour (with no skills)

❌ **Company Website Issues**
- Website doesn't exist
- Domain registered <30 days ago
- Website looks fake/template
- No company LinkedIn page

### Verification Checklist
```javascript
function verifyJobLegitimacy(job) {
  let score = 100;

  // Check company website
  if (!job.company_website || !isValidDomain(job.company_website)) {
    score -= 30;
  }

  // Check salary reasonableness
  if (job.salary_max > 200000 && job.experience_required === 'entry') {
    score -= 40;
  }

  // Check description quality
  if (job.description.length < 200) {
    score -= 20;
  }

  // Check application process
  if (!job.apply_url || job.apply_url.includes('bit.ly')) {
    score -= 25;
  }

  // Check posting recency
  const daysSincePosted = (Date.now() - job.posted_date) / (1000 * 60 * 60 * 24);
  if (daysSincePosted > 30) {
    score -= 15;
  }

  return score >= 50; // Only show jobs scoring 50+
}
```

---

## 9. Practical Implementation: Phase 1 (MVP)

### Step 1: Integrate JSearch API
**Timeline**: Week 1
- Sign up for JSearch API
- Implement search endpoint
- Store results in Supabase cache
- **Coverage**: 80% of job needs

### Step 2: Basic Quality Filters
**Timeline**: Week 2
- Salary present check
- Description length > 200 chars
- Posted within last 14 days
- Filter obvious spam

### Step 3: AI Relevance Matching
**Timeline**: Week 3-4
- Extract skills from job descriptions (Claude API or custom NLP)
- Compare against user resume
- Calculate match score
- Rank results by relevance

### Step 4: Caching & Database
**Timeline**: Week 2-3 (parallel with filters)
- Create Supabase tables
- Implement 24-hour cache
- Real-time subscriptions for users
- Background job to refresh cache

### Step 5: RemoteOK Integration (Optional)
**Timeline**: Week 5
- Add if remote segment becomes significant
- Merge with JSearch results
- Deduplicate across sources

---

## 10. Cost Perspective

### Monthly Costs (Estimated)

| Service | Cost | Purpose |
|---------|------|---------|
| **JSearch API** | $50-100 | Primary job aggregation (Google + 20+ boards) |
| **RemoteOK API** | $50 | Remote-first job listings |
| **Supabase** | $25-50 | Database, caching, real-time updates |
| **Claude API** | $20-40 | NLP skill extraction, relevance scoring |
| **Total** | **$145-240/month** | Quality data at scale |

### Cost Optimization Strategies
- Cache aggressively (24-48 hours)
- Batch API requests
- Only fetch new jobs, not full re-scrape
- Use free tier for MVP validation
- Scale costs with user growth

---

## 11. Success Metrics (KPIs)

Track these to measure quality improvement:

### Job Quality Metrics
- **Salary transparency rate**: % jobs with salary listed
- **Spam filter rate**: % jobs filtered by quality checks
- **Company verification rate**: % jobs from verified companies
- **Fresh job rate**: % jobs posted within 7 days

### User Engagement Metrics
- **Relevance score**: Average match score for applied jobs
- **Apply rate**: % users who apply vs. view
- **Save rate**: % jobs saved for later
- **Time to apply**: Faster = better relevance

### ML Model Performance
- **Prediction accuracy**: Did user apply to predicted jobs?
- **False positive rate**: Recommended but not applied
- **False negative rate**: Applied but not recommended

---

## 12. Future Enhancements (Version 3+)

### Advanced Features
- **Salary negotiation AI**: Suggest optimal counter-offers
- **Interview prep**: Auto-generate questions based on job description
- **Company culture fit**: Match user values with company reviews
- **Career path prediction**: Suggest jobs that lead to dream role
- **Application tracking**: Auto-detect when job is filled
- **Referral matching**: Connect with employees at target companies

### Premium Features (Monetization)
- **Priority matching**: First access to new high-quality jobs
- **Unlimited AI applications**: Generate unlimited resumes/cover letters
- **Salary insights**: See what others negotiated at same company
- **Interview coaching**: 1-on-1 with career coaches

---

## 13. Technical Stack

### Backend
- **Job Aggregation**: Supabase Edge Functions (Deno)
- **Caching**: Supabase PostgreSQL
- **Job Queue**: pg-boss or Supabase cron jobs
- **NLP/AI**: Claude API or Anthropic SDK

### Frontend
- **Job Search UI**: React + TypeScript
- **Real-time Updates**: Supabase Realtime
- **State Management**: React Query
- **Filtering**: Client-side + server-side hybrid

### Infrastructure
- **Hosting**: Railway (frontend + backend)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage (resume uploads)
- **Monitoring**: Supabase Analytics + Sentry

---

## 14. Migration Plan from V1 to V2

### Phase 1: Backend Setup (No User Impact)
1. Create new Supabase tables for cached jobs
2. Set up JSearch API integration
3. Implement quality filters
4. Build caching layer

### Phase 2: Soft Launch (Beta Users)
1. Enable V2 for 10% of users (feature flag)
2. Collect feedback on job quality
3. Measure apply rates vs. V1
4. Iterate on relevance scoring

### Phase 3: Full Rollout
1. Enable V2 for all users
2. Deprecate V1 job search
3. Monitor performance metrics
4. Optimize based on data

---

## 15. Documentation & Resources

### API Documentation
- [JSearch API Docs](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
- [RemoteOK API Docs](https://remoteok.com/api)

### Implementation Guides
- `docs/API_INTEGRATION_JSEARCH.md` (to be created)
- `docs/RELEVANCE_SCORING_ALGORITHM.md` (to be created)
- `docs/QUALITY_FILTER_CONFIGURATION.md` (to be created)

### Database Migrations
- `supabase/migrations/020_cached_jobs_table.sql` (to be created)
- `supabase/migrations/021_job_quality_indexes.sql` (to be created)

---

## Summary

**Version 2 Quality Job Listings** transforms JobMatch from a basic job board aggregator into an **AI-powered career companion** that:

✅ Aggregates from multiple high-quality sources
✅ Filters out spam, scams, and low-quality postings
✅ Matches jobs to user skills with precision
✅ Learns user preferences over time
✅ Provides personalized, ranked results

**Target Launch**: Q2 2026
**Budget**: ~$200/month
**Impact**: 3-5x increase in user application success rate

---

**Next Steps**:
1. Approve budget for JSearch + RemoteOK APIs
2. Prioritize Phase 1 features for MVP
3. Design database schema for cached jobs
4. Create detailed technical spec for relevance scoring algorithm
