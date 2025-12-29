"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyJobSearch = exports.proxyOpenAI = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const zod_1 = require("zod");
// Input validation schemas
const OpenAIRequestSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1).max(10000),
    model: zod_1.z.enum(['gpt-4', 'gpt-3.5-turbo']),
    maxTokens: zod_1.z.number().min(1).max(4000).optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
});
const JobSearchRequestSchema = zod_1.z.object({
    query: zod_1.z.string().min(1).max(500),
    location: zod_1.z.string().max(200).optional(),
    maxResults: zod_1.z.number().min(1).max(50).optional(),
});
/**
 * Secure proxy for OpenAI API calls
 * Validates input, protects API keys, sanitizes output
 */
exports.proxyOpenAI = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.proxyJobSearch = functions.https.onCall(async (data, context) => {
    // Authentication required
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
    try {
        // Validate input
        const validatedData = JobSearchRequestSchema.parse(data);
        // Sanitize query to prevent injection attacks
        const sanitizedQuery = validatedData.query
            .replace(/[<>\"']/g, '') // Remove HTML/script characters
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
        const sanitizedJobs = result.items?.map((job) => ({
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid request parameters');
        }
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error('Job search proxy error:', error);
        throw new functions.https.HttpsError('internal', 'Request failed');
    }
});
/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHtml(input) {
    if (!input)
        return '';
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
function sanitizeUrl(url) {
    if (!url)
        return '';
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
        const isAllowed = allowedDomains.some(domain => parsed.hostname.endsWith(domain));
        return isAllowed ? url : '';
    }
    catch (error) {
        console.error('Invalid URL:', url);
        return '';
    }
}
//# sourceMappingURL=secureProxy.js.map