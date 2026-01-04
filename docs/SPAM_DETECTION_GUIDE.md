# Job Spam Detection Guide

## Overview

JobMatch AI includes an AI-powered spam detection system that automatically analyzes job postings to identify fraudulent, misleading, and low-quality opportunities. The system uses GPT-4 to detect various types of spam and scams, protecting users from:

- MLM/Pyramid schemes
- Commission-only positions disguised as salaried roles
- Fake job postings (phishing, data harvesting)
- Excessive or unrealistic requirements
- Salary misrepresentation
- Mass recruitment spam
- Unpaid work disguised as "opportunities"

## Architecture

### Components

1. **Spam Detection Service** (`backend/src/services/spamDetection.service.ts`)
   - Core AI analysis using GPT-4
   - Batch processing with rate limiting
   - In-memory caching (72-hour TTL)
   - Database integration

2. **API Endpoints** (`backend/src/routes/spamDetection.ts`)
   - Manual job analysis
   - Batch analysis
   - Statistics dashboard
   - Admin cache management

3. **Database Schema** (Migration: `20251230000001_add_spam_detection_fields.sql`)
   - `spam_detected` - Boolean flag (probability >= 0.7)
   - `spam_probability` - Numeric score (0.0 to 1.0)
   - `spam_categories` - Array of detected categories
   - `spam_flags` - JSONB with detailed flags
   - `spam_analyzed_at` - Timestamp of analysis

4. **Automatic Integration**
   - Runs asynchronously after job scraping
   - Non-blocking background processing
   - Error-tolerant (doesn't fail scraping on analysis errors)

## Spam Categories

The system detects the following spam types:

### 1. MLM/Pyramid Schemes
- Emphasis on recruiting others
- "Build your own team" language
- Selling products to friends/family
- Multi-level commission structures
- Business opportunity disguised as employment

**Example Red Flags:**
- "Be your own boss"
- "Unlimited income potential"
- "Build a team of business partners"
- Required startup investment

### 2. Commission-Only/Unpaid Work
- No base salary mentioned
- Payment only on sales/recruitment
- 1099 independent contractor misclassified
- "Internship" with no compensation

**Example Red Flags:**
- "Commission-based only"
- "Must provide own equipment"
- "Unlimited earning potential" without base pay
- Investment required to start

### 3. Fake Postings
- Phishing for personal information
- Data harvesting schemes
- Generic company names with no web presence
- Suspicious URLs or contact methods

**Example Red Flags:**
- Requests SSN/bank info upfront
- No legitimate company website
- Gmail/Yahoo email addresses for "corporate" hiring
- Excessive spelling/grammar errors

### 4. Excessive Requirements
- Entry-level requiring 10+ years experience
- Unrealistic skill combinations
- Overqualification for listed salary
- Contradictory experience levels

**Example Red Flags:**
- "Entry level - 10 years experience required"
- "Expert in 15+ programming languages"
- PhD required for $40k position
- 5 years experience in 2-year-old technology

### 5. Salary Misrepresentation
- Extremely wide salary ranges ($30k-$300k)
- No salary mentioned for professional role
- "Competitive" with no range or context
- Commission disguised as salary

**Example Red Flags:**
- "$50,000 - $500,000 depending on performance"
- Base salary not disclosed
- "OTE" (On-Target Earnings) without base

### 6. Mass Recruitment Spam
- Vague job descriptions
- No specific responsibilities
- Generic "exciting opportunity" language
- Multiple unrelated roles in one posting

**Example Red Flags:**
- "Various positions available"
- "Immediate openings in all departments"
- Copy-pasted generic descriptions
- No actual job duties listed

### 7. Unrealistic Promises
- "Get rich quick" schemes
- Guaranteed high income with no experience
- "Work from home" scams
- Too good to be true offers

**Example Red Flags:**
- "Earn $10,000/month working 2 hours/day"
- "No experience needed, $200k salary"
- "Guaranteed success"
- Work from home with zero qualifications

## API Usage

### 1. Analyze Single Job

Manually analyze a specific job for spam indicators.

```bash
POST /api/spam-detection/analyze/:jobId
Authorization: Bearer <jwt-token>
```

**Rate Limit:** 30 requests per hour per user

**Response:**
```json
{
  "success": true,
  "jobId": "uuid",
  "result": {
    "isSpam": false,
    "spamProbability": 0.15,
    "confidence": "high",
    "categories": [],
    "reasons": [
      "Legitimate company with clear job description",
      "Realistic requirements and salary range"
    ],
    "flags": [],
    "recommendation": "safe",
    "analyzedAt": "2025-12-30T12:00:00.000Z"
  }
}
```

### 2. Batch Analysis

Analyze multiple jobs at once (max 50 per request).

```bash
POST /api/spam-detection/batch
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "jobIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Rate Limit:** 10 requests per hour per user

**Response:**
```json
{
  "success": true,
  "total": 3,
  "analyzed": 2,
  "cached": 1,
  "spamDetected": 1,
  "errors": 0,
  "results": [
    {
      "jobId": "uuid1",
      "isSpam": true,
      "spamProbability": 0.85,
      "confidence": "high",
      "categories": ["mlm-scheme", "unrealistic-promises"],
      "recommendation": "block",
      "analyzedAt": "2025-12-30T12:00:00.000Z"
    }
  ]
}
```

### 3. Get Statistics

View spam detection statistics for your account.

```bash
GET /api/spam-detection/stats
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalJobs": 150,
    "analyzedJobs": 145,
    "spamDetected": 12,
    "reviewRecommended": 8,
    "safe": 125,
    "analysisRate": 96.67,
    "spamRate": 8.28
  }
}
```

### 4. Cache Management (Admin Only)

```bash
# Get cache statistics
GET /api/spam-detection/cache/stats
Authorization: Bearer <admin-jwt-token>

# Clear cache
POST /api/spam-detection/cache/clear
Authorization: Bearer <admin-jwt-token>
```

## Spam Probability Scoring

The system returns a spam probability score from 0.0 to 1.0:

| Score Range | Recommendation | Meaning |
|-------------|---------------|---------|
| 0.0 - 0.2 | `safe` | Legitimate job posting, no red flags |
| 0.2 - 0.4 | `safe` | Minor concerns, likely legitimate |
| 0.4 - 0.7 | `review` | Moderate red flags, manual review recommended |
| 0.7 - 0.9 | `block` | Strong spam indicators, likely fraudulent |
| 0.9 - 1.0 | `block` | Definite spam/scam, block immediately |

**Confidence Levels:**
- `low` - Limited information or unclear indicators
- `medium` - Standard analysis with typical data
- `high` - Strong evidence for the conclusion

## Integration Points

### Automatic Scraping Integration

Spam detection runs automatically after job scraping:

```typescript
// In jobs.ts route after scraping
if (result.jobCount > 0 && result.searchId) {
  analyzeNewJobs(userId, result.searchId).catch((error) => {
    console.error('[Job Scraping] Spam detection failed:', error);
    // Don't fail scraping request if spam detection fails
  });
}
```

- **Asynchronous:** Doesn't block scraping response
- **Error-tolerant:** Scraping succeeds even if spam detection fails
- **Automatic:** No user action required

### Manual Analysis

Users can manually trigger analysis via:
1. Single job analysis endpoint
2. Batch analysis for multiple jobs
3. Re-analysis of previously scanned jobs (uses cache)

## Caching Strategy

### In-Memory Cache (Production: Redis recommended)

**Cache Key Generation:**
- Based on job title, company, and description (first 500 chars)
- Hashed for consistent key generation
- Format: `spam:job:<hash>`

**Cache TTL:** 72 hours

**Cache Behavior:**
- First analysis: OpenAI API call, result cached
- Subsequent analyses: Return cached result (instant)
- Cache miss: Re-analyze with AI
- Cache hit rate visible in stats

**Why Caching:**
- Reduces OpenAI API costs
- Faster responses for duplicate jobs
- Handles re-scraping same job from multiple sources

## Rate Limiting

API endpoints have different rate limits based on cost:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Single Analysis | 30 requests | 1 hour |
| Batch Analysis | 10 requests | 1 hour |
| Statistics | No limit | - |
| Cache Management | Admin only | - |

## Performance Considerations

### Batch Processing
- Processes 10 jobs at a time
- 1-second delay between batches
- Respects OpenAI rate limits
- Handles errors gracefully

### Cost Optimization
- Uses `gpt-4o-mini` for cost efficiency (not full GPT-4)
- Caching reduces redundant API calls
- Batching amortizes request overhead
- Conservative analysis to minimize false positives

### Typical Analysis Times
- Single job: 2-5 seconds
- Batch of 10 jobs: 15-25 seconds
- Cached result: < 100ms

## Database Queries

### Filter out spam jobs
```sql
SELECT * FROM jobs
WHERE user_id = $1
  AND (spam_detected = FALSE OR spam_detected IS NULL)
  AND archived = FALSE;
```

### Find jobs needing review
```sql
SELECT * FROM jobs
WHERE user_id = $1
  AND spam_probability >= 0.4
  AND spam_probability < 0.7
  AND archived = FALSE;
```

### Get spam statistics
```sql
SELECT
  COUNT(*) as total_jobs,
  COUNT(spam_probability) as analyzed_jobs,
  COUNT(*) FILTER (WHERE spam_detected = TRUE) as spam_count
FROM jobs
WHERE user_id = $1;
```

## Testing

### Unit Tests
Located in `backend/tests/unit/spamDetection.test.ts`

Run tests:
```bash
cd backend
npm run test -- spamDetection.test.ts
```

**Test Coverage:**
- Legitimate job detection (low spam probability)
- MLM scheme detection (high spam probability)
- Commission-only detection
- Excessive requirements detection
- Cache hit behavior
- Batch processing
- Error handling

### Integration Tests
Located in `backend/tests/integration/spamDetectionApi.test.ts`

Run tests:
```bash
cd backend
npm run test:integration -- spamDetectionApi.test.ts
```

**Test Coverage:**
- API endpoint authentication
- Request validation
- Database integration
- Rate limiting
- Error responses

## Monitoring & Observability

### Logs to Monitor

```typescript
// Analysis started
[Spam Detection] Analyzing job job-123: Senior Engineer at Tech Corp

// AI analysis complete
[Spam Detection] Job job-123 analyzed: 0.15 spam probability, recommendation: safe

// Batch processing
[Spam Detection] Starting batch analysis for 25 jobs
[Spam Detection] Batch complete: 20 analyzed, 5 cached, 3 spam detected, 0 errors

// Cache operations
[Spam Detection] Cache hit for job job-456
[Spam Detection] Cache cleared
```

### Metrics to Track

1. **Analysis Volume**
   - Total jobs analyzed per day
   - Cache hit rate
   - API calls to OpenAI

2. **Spam Detection**
   - Spam rate (% of jobs flagged)
   - Category distribution
   - False positive rate (requires manual validation)

3. **Performance**
   - Average analysis time
   - Batch processing time
   - Cache response time

4. **Costs**
   - OpenAI API usage
   - Requests per user
   - Total tokens consumed

## Best Practices

### For Developers

1. **Always check cache first** - Avoid redundant API calls
2. **Use batch processing** - More efficient than individual calls
3. **Handle errors gracefully** - Don't block job scraping on spam detection failure
4. **Monitor rate limits** - Track API usage to avoid hitting limits
5. **Conservative flagging** - Err on the side of false negatives over false positives

### For Product Teams

1. **Surface spam info in UI** - Show probability and recommendation to users
2. **Allow manual override** - Users should be able to mark false positives
3. **Provide explanations** - Show `reasons` and `flags` to explain decisions
4. **Track accuracy** - Collect user feedback on spam detection accuracy
5. **Adjust thresholds** - Fine-tune probability thresholds based on user feedback

### For Users

1. **Review flagged jobs** - "Review" recommendation means manual check needed
2. **Report false positives** - Help improve the system
3. **Trust blocking** - Jobs with "block" recommendation are highly likely spam
4. **Check spam stats** - Monitor how many jobs are being filtered

## Future Enhancements

### Short-term
- [ ] Redis cache for production (replace in-memory cache)
- [ ] User feedback mechanism (mark false positives)
- [ ] Spam trends dashboard (admin)
- [ ] Company reputation tracking

### Long-term
- [ ] Fine-tuned model on job spam dataset
- [ ] Real-time spam detection (during scraping)
- [ ] Collaborative filtering (learn from all users)
- [ ] Integration with job board APIs to report spam
- [ ] Natural language explanations (more user-friendly)

## Troubleshooting

### High spam rate (>20%)
- Check data sources (Indeed vs LinkedIn)
- Verify scraping filters are working
- Review threshold settings
- Check for specific spam campaigns

### Low detection rate (spam getting through)
- Lower threshold from 0.7 to 0.6
- Review missed spam examples
- Update prompt with new red flag patterns
- Consider manual blacklist for known bad companies

### High API costs
- Increase cache TTL
- Reduce batch sizes
- Limit automatic analysis
- Switch to user-triggered analysis only

### False positives
- Review reasons and flags for false alarms
- Adjust prompt to be more conservative
- Add industry-specific context
- Collect user feedback

### Cache issues
- Check cache statistics endpoint
- Clear cache if stale
- Verify cache key generation
- Consider Redis for persistence

## Related Documentation

- [OpenAI Service Integration](../backend/src/services/openai.service.ts)
- [Job Scraping Service](../backend/src/services/jobScraper.service.ts)
- [API Rate Limiting](../backend/src/middleware/rateLimiter.ts)
- [Database Schema](../supabase/migrations/)
- [Testing Strategy](./TESTING_STRATEGY.md)

## Support

For issues or questions:
1. Check logs for error messages
2. Review this documentation
3. Check test coverage
4. Contact backend team
