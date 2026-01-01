/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Example Usage for Similarity Service
 *
 * This file demonstrates how to use the similarity service functions
 * for job matching and ranking.
 */

import {
  cosineSimilarity,
  rankJobsBySimilarity,
  hybridScore,
  type JobWithEmbedding,
  type RankedJob,
} from './similarity';

// ============================================================================
// Example 1: Calculate cosine similarity between two vectors
// ============================================================================

async function example1_CosineSimilarity() {
  // User profile embedding (768 dimensions)
  const userEmbedding = new Array(768).fill(0).map(() => Math.random());

  // Job description embedding (768 dimensions)
  const jobEmbedding = new Array(768).fill(0).map(() => Math.random());

  // Calculate similarity
  const similarity = cosineSimilarity(userEmbedding, jobEmbedding);

  console.log(`Cosine similarity: ${similarity}`); // Value between -1 and 1
  console.log(`As percentage: ${((similarity + 1) / 2 * 100).toFixed(1)}%`);
}

// ============================================================================
// Example 2: Rank multiple jobs by semantic similarity
// ============================================================================

async function example2_RankJobs() {
  // User's profile embedding (would come from embeddings service)
  const userEmbedding = new Array(768).fill(0).map(() => Math.random());

  // Jobs with their embeddings (would come from database)
  const jobsWithEmbeddings: JobWithEmbedding[] = [
    {
      job: {
        id: '1',
        title: 'Senior TypeScript Developer',
        company: 'Tech Corp',
        // ... other job fields
      } as any, // In real code, use proper Job type
      embedding: new Array(768).fill(0).map(() => Math.random()),
    },
    {
      job: {
        id: '2',
        title: 'React Frontend Engineer',
        company: 'Startup Inc',
        // ... other job fields
      } as any,
      embedding: new Array(768).fill(0).map(() => Math.random()),
    },
    {
      job: {
        id: '3',
        title: 'Full Stack Developer',
        company: 'Enterprise Ltd',
        // ... other job fields
      } as any,
      embedding: new Array(768).fill(0).map(() => Math.random()),
    },
  ];

  // Rank jobs by similarity
  const rankedJobs: RankedJob[] = rankJobsBySimilarity(
    userEmbedding,
    jobsWithEmbeddings
  );

  // Display results
  console.log('Top Job Matches:');
  rankedJobs.forEach((rankedJob, index) => {
    console.log(`${index + 1}. ${rankedJob.job.title}`);
    console.log(`   Company: ${rankedJob.job.company}`);
    console.log(`   Semantic Score: ${rankedJob.semanticScore.toFixed(3)}`);
    console.log(`   Match Percentage: ${rankedJob.normalizedScore.toFixed(1)}%`);
    console.log();
  });
}

// ============================================================================
// Example 3: Calculate hybrid score (semantic + keyword)
// ============================================================================

async function example3_HybridScore() {
  // Semantic similarity from vector comparison (0-1 range)
  const semanticScore = 0.85; // 85% semantic match

  // Keyword matching score from traditional search (0-100 range)
  const keywordScore = 70; // 70% keyword match

  // Calculate hybrid score (70% semantic, 30% keyword)
  const hybrid = hybridScore(semanticScore, keywordScore);

  console.log('Scoring Breakdown:');
  console.log(`Semantic Score: ${semanticScore} (weight: 70%)`);
  console.log(`Keyword Score: ${keywordScore} (weight: 30%)`);
  console.log(`Hybrid Score: ${hybrid}`);

  // Breakdown:
  // Semantic contribution: 0.85 * 100 * 0.7 = 59.5
  // Keyword contribution: 70 * 0.3 = 21.0
  // Total: 59.5 + 21.0 = 80.5
}

// ============================================================================
// Example 4: Complete job matching workflow
// ============================================================================

async function example4_CompleteWorkflow() {
  // Step 1: Get user embedding (from embeddings service)
  const userEmbedding = new Array(768).fill(0).map(() => Math.random());

  // Step 2: Get jobs with embeddings (from database)
  const jobsWithEmbeddings: JobWithEmbedding[] = [
    /* ... jobs from database ... */
  ];

  // Step 3: Rank by semantic similarity
  const semanticRanking = rankJobsBySimilarity(
    userEmbedding,
    jobsWithEmbeddings
  );

  // Step 4: Combine with keyword scores (if available)
  const finalRanking = semanticRanking.map((rankedJob) => {
    // Get keyword score (from keyword matching service)
    const keywordScore = 75; // Example value

    // Calculate hybrid score
    const finalScore = hybridScore(rankedJob.semanticScore, keywordScore);

    return {
      ...rankedJob,
      keywordScore,
      finalScore,
    };
  });

  // Step 5: Sort by final score
  finalRanking.sort((a, b) => b.finalScore - a.finalScore);

  // Step 6: Display top matches
  console.log('Top 5 Job Matches (Hybrid Scoring):');
  finalRanking.slice(0, 5).forEach((job, index) => {
    console.log(`${index + 1}. ${job.job.title} at ${job.job.company}`);
    console.log(`   Semantic: ${job.semanticScore.toFixed(3)}`);
    console.log(`   Keyword: ${job.keywordScore}`);
    console.log(`   Final Score: ${job.finalScore.toFixed(1)}`);
    console.log();
  });
}

// ============================================================================
// Example 5: Error handling
// ============================================================================

async function example5_ErrorHandling() {
  try {
    // Invalid: vectors with different dimensions
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2]; // Wrong dimension
    const similarity = cosineSimilarity(vec1, vec2);
    console.log('This should not be reached:', similarity);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    // Output: "Vector dimensions must match. Got 3 and 2"
  }

  try {
    // Invalid: semantic score out of range
    const score = hybridScore(1.5, 50); // Semantic score must be 0-1
    console.log('This should not be reached:', score);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    // Output: "Semantic score must be between 0 and 1"
  }

  try {
    // Invalid: null embedding in job list
    const userEmbedding = [1, 2, 3];
    const jobs: JobWithEmbedding[] = [
      {
        job: { title: 'Job 1' } as any,
        embedding: null as any, // Invalid
      },
    ];
    const ranked = rankJobsBySimilarity(userEmbedding, jobs);
    console.log('This should not be reached:', ranked);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    // Output: "Job 'Job 1' (index 0) has invalid embedding"
  }
}

// ============================================================================
// Run examples
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== Example 1: Cosine Similarity ===\n');
  example1_CosineSimilarity();

  console.log('\n=== Example 2: Rank Jobs ===\n');
  example2_RankJobs();

  console.log('\n=== Example 3: Hybrid Score ===\n');
  example3_HybridScore();

  console.log('\n=== Example 4: Complete Workflow ===\n');
  example4_CompleteWorkflow();

  console.log('\n=== Example 5: Error Handling ===\n');
  example5_ErrorHandling();
}
