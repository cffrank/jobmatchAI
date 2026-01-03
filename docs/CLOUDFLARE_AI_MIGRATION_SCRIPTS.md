# Cloudflare AI Migration Scripts

**Purpose:** Ready-to-use scripts for migrating to Cloudflare AI services

---

## Script 1: Batch Generate Job Embeddings

**Purpose:** Generate embeddings for all existing jobs and store in Vectorize

```typescript
// workers/scripts/generate-job-embeddings.ts

import { createClient } from '@supabase/supabase-js';

interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  experience_level?: string;
  required_skills?: string[];
}

/**
 * Batch generate embeddings for all jobs
 */
async function generateJobEmbeddings(env: any) {
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('Fetching all jobs...');
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('is_archived', false);

  if (error) {
    throw new Error(`Failed to fetch jobs: ${error.message}`);
  }

  console.log(`Found ${jobs.length} jobs to process`);

  // Process in batches of 10 (to avoid rate limits)
  const batchSize = 10;
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(jobs.length / batchSize)}`);

    await Promise.all(
      batch.map(async (job: Job) => {
        try {
          // Generate embedding
          const text = [
            job.title,
            job.company,
            job.description,
            ...(job.required_skills || []),
          ].join(' ');

          const response = await env.AI.run('@cf/google/embeddinggemma-300m', {
            text,
          });

          const embedding = response.data[0];

          // Store in Vectorize
          await env.VECTORIZE_INDEX.insert([
            {
              id: job.id,
              values: embedding,
              metadata: {
                title: job.title,
                company: job.company,
                location: job.location || '',
                salaryMin: job.salary_min || 0,
                salaryMax: job.salary_max || 0,
                experienceLevel: job.experience_level || '',
              },
            },
          ]);

          processed++;
          console.log(`✓ Processed job: ${job.title} at ${job.company}`);
        } catch (error) {
          failed++;
          console.error(`✗ Failed to process job ${job.id}:`, error);
        }
      })
    );

    // Wait 1 second between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\nCompleted!`);
  console.log(`- Processed: ${processed}`);
  console.log(`- Failed: ${failed}`);
  console.log(`- Total: ${jobs.length}`);
}

// Export for use in Worker
export default {
  async fetch(request: Request, env: any) {
    if (request.method === 'POST') {
      await generateJobEmbeddings(env);
      return new Response('Job embeddings generated', { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  },
};
```

**Usage:**

```bash
# Deploy script
wrangler deploy workers/scripts/generate-job-embeddings.ts --name generate-job-embeddings

# Run script
curl -X POST https://generate-job-embeddings.your-account.workers.dev

# Monitor logs
wrangler tail generate-job-embeddings
```

---

## Script 2: Migrate Resume Embeddings

**Purpose:** Generate embeddings for all user resumes

```typescript
// workers/scripts/generate-resume-embeddings.ts

/**
 * Generate resume embeddings for all users
 */
async function generateResumeEmbeddings(env: any) {
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Fetch all users with complete profiles
  const { data: users, error } = await supabase
    .from('users')
    .select('id, headline, summary')
    .not('summary', 'is', null);

  if (error) throw new Error(`Failed to fetch users: ${error.message}`);

  console.log(`Found ${users.length} users with profiles`);

  for (const user of users) {
    try {
      // Fetch user's work experience
      const { data: workExp } = await supabase
        .from('work_experience')
        .select('position, company, description, accomplishments')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
        .limit(3);

      // Fetch user's skills
      const { data: skills } = await supabase
        .from('skills')
        .select('name')
        .eq('user_id', user.id)
        .order('endorsements', { ascending: false })
        .limit(20);

      // Combine into searchable text
      const text = [
        user.headline || '',
        user.summary || '',
        ...(workExp || []).map((exp: any) =>
          `${exp.position} ${exp.company} ${exp.description} ${exp.accomplishments.join(' ')}`
        ),
        ...(skills || []).map((skill: any) => skill.name),
      ].join(' ');

      // Generate embedding
      const response = await env.AI.run('@cf/google/embeddinggemma-300m', {
        text,
      });

      const embedding = response.data[0];

      // Store in Vectorize
      await env.VECTORIZE_INDEX.insert([
        {
          id: `resume-${user.id}`,
          values: embedding,
          metadata: {
            userId: user.id,
            headline: user.headline || '',
            type: 'resume',
          },
        },
      ]);

      console.log(`✓ Processed resume for user ${user.id}`);
    } catch (error) {
      console.error(`✗ Failed to process user ${user.id}:`, error);
    }

    // Rate limit: 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Completed processing ${users.length} resumes`);
}
```

---

## Script 3: Test Semantic Search Quality

**Purpose:** Compare semantic search vs keyword search quality

```typescript
// workers/scripts/test-semantic-search.ts

interface TestCase {
  query: string;
  expectedJobTitles: string[];
}

const testCases: TestCase[] = [
  {
    query: 'React developer with TypeScript experience',
    expectedJobTitles: [
      'Senior React Developer',
      'Frontend Engineer',
      'Full Stack Developer',
    ],
  },
  {
    query: 'DevOps engineer with Kubernetes expertise',
    expectedJobTitles: [
      'Senior DevOps Engineer',
      'Cloud Infrastructure Engineer',
      'Site Reliability Engineer',
    ],
  },
  {
    query: 'Data scientist with machine learning background',
    expectedJobTitles: [
      'Senior Data Scientist',
      'ML Engineer',
      'AI Research Scientist',
    ],
  },
];

async function testSemanticSearch(env: any) {
  console.log('Testing Semantic Search Quality\n');

  for (const testCase of testCases) {
    console.log(`Query: "${testCase.query}"`);

    // Generate query embedding
    const response = await env.AI.run('@cf/google/embeddinggemma-300m', {
      text: testCase.query,
    });

    const queryEmbedding = response.data[0];

    // Search Vectorize
    const results = await env.VECTORIZE_INDEX.query(queryEmbedding, {
      topK: 10,
      returnMetadata: true,
    });

    console.log('\nTop Results:');
    results.matches.forEach((match: any, i: number) => {
      const isExpected = testCase.expectedJobTitles.includes(match.metadata.title);
      const marker = isExpected ? '✓' : ' ';
      console.log(`${marker} ${i + 1}. ${match.metadata.title} (score: ${match.score.toFixed(3)})`);
    });

    // Calculate precision
    const foundExpected = results.matches.filter((m: any) =>
      testCase.expectedJobTitles.includes(m.metadata.title)
    ).length;

    const precision = foundExpected / testCase.expectedJobTitles.length;
    console.log(`\nPrecision: ${(precision * 100).toFixed(1)}%\n`);
    console.log('─'.repeat(60) + '\n');
  }
}
```

---

## Script 4: Cache Performance Analysis

**Purpose:** Analyze AI Gateway cache performance

```typescript
// workers/scripts/analyze-cache-performance.ts

/**
 * Analyze AI Gateway cache statistics
 */
async function analyzeCachePerformance(env: any) {
  // This script queries AI Gateway logs (requires API access)
  // For now, we'll create a monitoring endpoint

  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Create analytics table if not exists
  await supabase.rpc('create_ai_analytics_table');

  // Log cache hit/miss for each request
  // (This should be added to actual API routes)

  console.log('Cache Performance Report');
  console.log('========================\n');

  // Query analytics
  const { data: stats } = await supabase.rpc('get_cache_stats', {
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
  });

  if (stats) {
    console.log(`Total Requests: ${stats.total_requests}`);
    console.log(`Cache Hits: ${stats.cache_hits}`);
    console.log(`Cache Misses: ${stats.cache_misses}`);
    console.log(`Hit Rate: ${(stats.hit_rate * 100).toFixed(1)}%`);
    console.log(`Avg Hit Latency: ${stats.avg_hit_latency}ms`);
    console.log(`Avg Miss Latency: ${stats.avg_miss_latency}ms`);
    console.log(`Latency Reduction: ${((1 - stats.avg_hit_latency / stats.avg_miss_latency) * 100).toFixed(1)}%`);
  }
}

// SQL for analytics table
const SQL_CREATE_ANALYTICS = `
CREATE TABLE IF NOT EXISTS ai_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  cache_status TEXT, -- 'HIT' or 'MISS'
  latency_ms INTEGER,
  model TEXT,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6)
);

CREATE INDEX IF NOT EXISTS idx_ai_analytics_timestamp ON ai_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_cache_status ON ai_analytics(cache_status);
`;

const SQL_GET_CACHE_STATS = `
CREATE OR REPLACE FUNCTION get_cache_stats(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_requests', COUNT(*),
    'cache_hits', COUNT(*) FILTER (WHERE cache_status = 'HIT'),
    'cache_misses', COUNT(*) FILTER (WHERE cache_status = 'MISS'),
    'hit_rate', COALESCE(COUNT(*) FILTER (WHERE cache_status = 'HIT')::DECIMAL / NULLIF(COUNT(*), 0), 0),
    'avg_hit_latency', COALESCE(AVG(latency_ms) FILTER (WHERE cache_status = 'HIT'), 0),
    'avg_miss_latency', COALESCE(AVG(latency_ms) FILTER (WHERE cache_status = 'MISS'), 0)
  ) INTO result
  FROM ai_analytics
  WHERE timestamp BETWEEN start_date AND end_date;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
`;
```

---

## Script 5: Cost Optimization Monitor

**Purpose:** Track AI costs and identify optimization opportunities

```typescript
// workers/scripts/monitor-ai-costs.ts

interface CostMetrics {
  openai: {
    requests: number;
    totalTokens: number;
    cost: number;
  };
  workersAI: {
    requests: number;
    neurons: number;
    cost: number;
  };
  vectorize: {
    queries: number;
    cost: number;
  };
  total: number;
}

async function monitorAICosts(env: any): Promise<CostMetrics> {
  // This data comes from AI Gateway analytics + custom logging

  // Example: Query D1 for cost tracking
  const stmt = env.D1.prepare(`
    SELECT
      DATE(timestamp) as date,
      endpoint,
      provider,
      SUM(tokens_used) as total_tokens,
      SUM(cost_usd) as total_cost,
      COUNT(*) as request_count
    FROM ai_analytics
    WHERE timestamp >= datetime('now', '-30 days')
    GROUP BY DATE(timestamp), endpoint, provider
    ORDER BY date DESC
  `);

  const { results } = await stmt.all();

  // Calculate costs
  const openaiCost = results
    .filter((r: any) => r.provider === 'openai')
    .reduce((sum: number, r: any) => sum + r.total_cost, 0);

  const workersAICost = results
    .filter((r: any) => r.provider === 'workers-ai')
    .reduce((sum: number, r: any) => sum + r.total_cost, 0);

  console.log('AI Cost Report (Last 30 Days)');
  console.log('==============================\n');
  console.log(`OpenAI: $${openaiCost.toFixed(2)}`);
  console.log(`Workers AI: $${workersAICost.toFixed(2)}`);
  console.log(`Total: $${(openaiCost + workersAICost).toFixed(2)}`);

  // Identify most expensive endpoints
  console.log('\nMost Expensive Endpoints:');
  const sortedByCoat = [...results].sort((a: any, b: any) => b.total_cost - a.total_cost);
  sortedByCoat.slice(0, 5).forEach((r: any) => {
    console.log(`- ${r.endpoint}: $${r.total_cost.toFixed(2)} (${r.request_count} requests)`);
  });

  // Optimization suggestions
  console.log('\nOptimization Opportunities:');

  const highVolumeEndpoints = results.filter((r: any) => r.request_count > 100);
  highVolumeEndpoints.forEach((r: any) => {
    if (r.provider === 'openai' && r.endpoint.includes('embed')) {
      console.log(`⚠ Consider migrating ${r.endpoint} to Workers AI (save ~95%)`);
    }
  });

  return {
    openai: {
      requests: 0,
      totalTokens: 0,
      cost: openaiCost,
    },
    workersAI: {
      requests: 0,
      neurons: 0,
      cost: workersAICost,
    },
    vectorize: {
      queries: 0,
      cost: 0.31,
    },
    total: openaiCost + workersAICost,
  };
}
```

---

## Script 6: A/B Test Workers AI vs OpenAI

**Purpose:** Compare quality of Workers AI vs OpenAI for application generation

```typescript
// workers/scripts/ab-test-quality.ts

interface TestResult {
  jobId: string;
  workersAIOutput: string;
  openAIOutput: string;
  qualityScore: {
    workersAI: number;
    openAI: number;
  };
}

async function abTestQuality(env: any) {
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Fetch sample jobs
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .limit(10);

  const results: TestResult[] = [];

  for (const job of jobs || []) {
    console.log(`Testing job: ${job.title}`);

    // Generate with Workers AI
    const workersAIStart = Date.now();
    const workersAIResponse = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        {
          role: 'system',
          content: 'You are a resume writer. Generate a professional summary for this job application.',
        },
        {
          role: 'user',
          content: `Generate a professional summary for: ${job.title} at ${job.company}`,
        },
      ],
    });
    const workersAILatency = Date.now() - workersAIStart;

    // Generate with OpenAI
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const openAIStart = Date.now();
    const openAIResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a resume writer. Generate a professional summary for this job application.',
        },
        {
          role: 'user',
          content: `Generate a professional summary for: ${job.title} at ${job.company}`,
        },
      ],
    });
    const openAILatency = Date.now() - openAIStart;

    // Compare outputs
    console.log('\nWorkers AI Output:');
    console.log(workersAIResponse.response);
    console.log(`Latency: ${workersAILatency}ms\n`);

    console.log('OpenAI Output:');
    console.log(openAIResponse.choices[0]?.message.content);
    console.log(`Latency: ${openAILatency}ms\n`);

    // Manual quality scoring (in production, use LLM-as-judge)
    console.log('Rate quality (1-10):');
    // In production, automate this with another LLM call

    results.push({
      jobId: job.id,
      workersAIOutput: workersAIResponse.response,
      openAIOutput: openAIResponse.choices[0]?.message.content || '',
      qualityScore: {
        workersAI: 0, // To be scored
        openAI: 0,
      },
    });
  }

  // Save results
  await env.D1.prepare(`
    INSERT INTO ab_test_results (job_id, workers_ai_output, openai_output, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(
    results[0].jobId,
    results[0].workersAIOutput,
    results[0].openAIOutput,
    new Date().toISOString()
  ).run();

  console.log('\nA/B Test Results saved to D1');
}
```

---

## Script 7: Vectorize Index Management

**Purpose:** Manage Vectorize index lifecycle

```bash
#!/bin/bash
# workers/scripts/manage-vectorize.sh

# Create index
create_index() {
  wrangler vectorize create jobmatch-embeddings \
    --dimensions=768 \
    --metric=cosine
}

# List indexes
list_indexes() {
  wrangler vectorize list
}

# Get index info
get_index_info() {
  wrangler vectorize get jobmatch-embeddings
}

# Delete index (careful!)
delete_index() {
  read -p "Are you sure you want to delete the index? (yes/no): " confirm
  if [ "$confirm" = "yes" ]; then
    wrangler vectorize delete jobmatch-embeddings
  fi
}

# Clear all vectors from index
clear_index() {
  read -p "Clear all vectors from index? (yes/no): " confirm
  if [ "$confirm" = "yes" ]; then
    # Run cleanup worker
    curl -X POST https://clear-vectorize.your-account.workers.dev
  fi
}

# Show menu
echo "Vectorize Index Management"
echo "=========================="
echo "1. Create index"
echo "2. List indexes"
echo "3. Get index info"
echo "4. Delete index"
echo "5. Clear index"
echo ""
read -p "Select option: " option

case $option in
  1) create_index ;;
  2) list_indexes ;;
  3) get_index_info ;;
  4) delete_index ;;
  5) clear_index ;;
  *) echo "Invalid option" ;;
esac
```

---

## Usage Instructions

### 1. Setup D1 Analytics Tables

```bash
# Create D1 database
wrangler d1 create jobmatch

# Run migrations
wrangler d1 execute jobmatch --file=workers/scripts/sql/create-analytics.sql
```

### 2. Generate Initial Embeddings

```bash
# Deploy embedding generator
wrangler deploy workers/scripts/generate-job-embeddings.ts --name generate-job-embeddings

# Run migration
curl -X POST https://generate-job-embeddings.your-account.workers.dev

# Monitor progress
wrangler tail generate-job-embeddings
```

### 3. Test Semantic Search

```bash
# Deploy test script
wrangler dev workers/scripts/test-semantic-search.ts

# Run tests
curl http://localhost:8787/test
```

### 4. Monitor Costs

```bash
# Run weekly
curl https://your-worker.workers.dev/monitor-costs
```

---

## SQL Migration Scripts

### Create Analytics Tables

```sql
-- workers/scripts/sql/create-analytics.sql

CREATE TABLE IF NOT EXISTS ai_analytics (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'openai' or 'workers-ai'
  cache_status TEXT, -- 'HIT' or 'MISS'
  latency_ms INTEGER,
  model TEXT,
  tokens_used INTEGER,
  neurons_used INTEGER,
  cost_usd REAL
);

CREATE INDEX idx_analytics_timestamp ON ai_analytics(timestamp);
CREATE INDEX idx_analytics_provider ON ai_analytics(provider);
CREATE INDEX idx_analytics_cache ON ai_analytics(cache_status);

-- A/B Test Results
CREATE TABLE IF NOT EXISTS ab_test_results (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  workers_ai_output TEXT,
  openai_output TEXT,
  workers_ai_score INTEGER,
  openai_score INTEGER,
  created_at INTEGER NOT NULL
);
```

---

## Monitoring Dashboard Query

```sql
-- Get last 7 days of AI usage
SELECT
  DATE(timestamp, 'unixepoch') as date,
  provider,
  COUNT(*) as requests,
  SUM(CASE WHEN cache_status = 'HIT' THEN 1 ELSE 0 END) as cache_hits,
  ROUND(AVG(latency_ms), 2) as avg_latency_ms,
  SUM(cost_usd) as total_cost
FROM ai_analytics
WHERE timestamp >= unixepoch('now', '-7 days')
GROUP BY DATE(timestamp, 'unixepoch'), provider
ORDER BY date DESC, provider;
```

---

**Next Steps:**

1. Run Script 1 to generate job embeddings
2. Run Script 2 to generate resume embeddings
3. Run Script 3 to test search quality
4. Deploy Script 4 to monitor cache performance
5. Use Script 5 to track costs weekly
6. Run Script 6 for A/B testing new models

See `/docs/CLOUDFLARE_AI_ARCHITECTURE.md` for full context.
