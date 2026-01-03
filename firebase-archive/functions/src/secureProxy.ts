/**
 * Secure proxy functions for external API calls
 *
 * SECURITY CONTROLS:
 * - API key protection (never exposed to client)
 * - Input validation and sanitization
 * - Output sanitization
 * - Request/response logging
 * - Error handling without information disclosure
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { z } from 'zod';

// Input validation schemas
const OpenAIRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  model: z.enum(['gpt-4', 'gpt-3.5-turbo']),
  maxTokens: z.number().min(1).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

const JobSearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  location: z.string().max(200).optional(),
  maxResults: z.number().min(1).max(50).optional(),
});

/**
 * Secure proxy for OpenAI API calls
 * Validates input, protects API keys, sanitizes output
 */
export const proxyOpenAI = functions.https.onCall(async (data, context) => {
  // Authentication required
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  try {
    // Validate input
    const validatedData = OpenAIRequestSchema.parse(data);

    // Check rate limit
    // TODO: Integrate with rate limiting function

    // Get API key from environment (never exposed to client)
    const apiKey = functions.config().openai?.key;
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'Service configuration error');
    }

    // Make API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: validatedData.model,
        messages: [{ role: 'user', content: validatedData.prompt }],
        max_tokens: validatedData.maxTokens || 1000,
        temperature: validatedData.temperature || 0.7,
      }),
    });

    if (!response.ok) {
      // Log error without exposing details
      console.error('OpenAI API error:', response.status, await response.text());
      throw new functions.https.HttpsError('internal', 'AI service unavailable');
    }

    const result = await response.json();

    // Sanitize output (remove any sensitive information)
    const sanitizedResult = {
      content: result.choices?.[0]?.message?.content || '',
      model: result.model,
      usage: {
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        totalTokens: result.usage?.total_tokens,
      },
    };

    // Log usage for audit
    await admin.firestore()
      .collection('api_usage')
      .add({
        userId: context.auth.uid,
        service: 'openai',
        model: validatedData.model,
        tokensUsed: sanitizedResult.usage.totalTokens,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    return sanitizedResult;

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid request parameters');
    }
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('OpenAI proxy error:', error);
    throw new functions.https.HttpsError('internal', 'Request failed');
  }
});

/**
 * Secure proxy for Apify job scraping
 */
export const proxyJobSearch = functions.https.onCall(async (data, context) => {
  // Authentication required
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  try {
    // Validate input
    const validatedData = JobSearchRequestSchema.parse(data);

    // Sanitize query to prevent injection attacks
    const sanitizedQuery = validatedData.query
      .replace(/[<>"']/g, '') // Remove HTML/script characters
      .replace(/\\/g, '') // Remove backslashes
      .trim();

    if (!sanitizedQuery) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid search query');
    }

    // Get API key from environment
    const apiKey = functions.config().apify?.key;
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'Service configuration error');
    }

    // Make API call to Apify
    const response = await fetch('https://api.apify.com/v2/acts/YOUR_ACTOR_ID/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sanitizedQuery,
        location: validatedData.location,
        maxResults: validatedData.maxResults || 10,
      }),
    });

    if (!response.ok) {
      console.error('Apify API error:', response.status);
      throw new functions.https.HttpsError('internal', 'Job search service unavailable');
    }

    const result = await response.json();

    // Sanitize job listings (remove any potentially malicious content)
    const sanitizedJobs = result.items?.map((job: { title: string; company: string; location: string; description: string; url: string; salary: string; postedDate: string }) => ({
      title: sanitizeHtml(job.title),
      company: sanitizeHtml(job.company),
      location: sanitizeHtml(job.location),
      description: sanitizeHtml(job.description),
      url: sanitizeUrl(job.url),
      salary: sanitizeHtml(job.salary),
      postedDate: job.postedDate,
    })) || [];

    // Log usage
    await admin.firestore()
      .collection('api_usage')
      .add({
        userId: context.auth.uid,
        service: 'apify',
        resultsReturned: sanitizedJobs.length,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

    return { jobs: sanitizedJobs };

  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid request parameters');
    }
    if (err instanceof functions.https.HttpsError) {
      throw err;
    }
    console.error('Job search proxy error:', err);
    throw new functions.https.HttpsError('internal', 'Request failed');
  }
});

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHtml(input: string): string {
  if (!input) return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitize URL to prevent open redirects
 */
function sanitizeUrl(url: string): string {
  if (!url) return '';

  try {
    const parsed = new URL(url);

    // Only allow HTTPS URLs
    if (parsed.protocol !== 'https:') {
      return '';
    }

    // Whitelist allowed domains for job listings
    const allowedDomains = [
      'linkedin.com',
      'indeed.com',
      'glassdoor.com',
      'monster.com',
      'ziprecruiter.com',
    ];

    const isAllowed = allowedDomains.some(domain =>
      parsed.hostname.endsWith(domain)
    );

    return isAllowed ? url : '';

  } catch {
    console.error('Invalid URL:', url);
    return '';
  }
}
