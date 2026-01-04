/**
 * PDF Parser Service for JobMatch AI
 *
 * Simple Express service that extracts text from PDF files
 * Deployed on Railway, called by Cloudflare Workers
 */

import express from 'express';
import cors from 'cors';
import pdfParse from 'pdf-parse';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow requests from Cloudflare Workers
app.use(cors({
  origin: [
    'https://jobmatch-ai-dev.carl-f-frank.workers.dev',
    'https://jobmatch-ai.carl-f-frank.workers.dev',
    'http://localhost:8787', // Local Wrangler development
  ],
  methods: ['POST', 'GET'],
  credentials: true,
}));

// Parse JSON bodies (for base64 PDFs)
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'pdf-parser',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /parse-pdf
 *
 * Accepts PDF as base64-encoded string
 * Returns extracted text
 *
 * Request body:
 * {
 *   "pdfBase64": "base64-encoded PDF content"
 * }
 *
 * Response:
 * {
 *   "text": "extracted text content",
 *   "pages": 3,
 *   "info": { ... pdf metadata ... }
 * }
 */
app.post('/parse-pdf', async (req, res) => {
  try {
    const { pdfBase64, pdfUrl } = req.body;

    if (!pdfBase64 && !pdfUrl) {
      return res.status(400).json({
        error: 'Missing required field: pdfBase64 or pdfUrl',
      });
    }

    let pdfBuffer;

    // Support both base64 and URL input
    if (pdfUrl) {
      console.log(`[parse-pdf] Fetching PDF from URL: ${pdfUrl.substring(0, 50)}...`);
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
    } else {
      // Decode base64 to Buffer
      pdfBuffer = Buffer.from(pdfBase64, 'base64');
    }

    console.log(`[parse-pdf] Processing PDF (${Math.round(pdfBuffer.length / 1024)}KB)`);

    // Extract text using pdf-parse
    const data = await pdfParse(pdfBuffer);

    console.log(`[parse-pdf] Extracted ${data.text.length} characters from ${data.numpages} pages`);

    if (!data.text || data.text.trim().length === 0) {
      return res.status(400).json({
        error: 'No text could be extracted from PDF. The PDF may be image-based or corrupted.',
      });
    }

    // Return extracted text
    res.json({
      text: data.text.trim(),
      pages: data.numpages,
      info: data.info,
    });

  } catch (error) {
    console.error('[parse-pdf] Error:', error);
    res.status(500).json({
      error: 'Failed to parse PDF',
      message: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PDF Parser Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Parse endpoint: POST http://localhost:${PORT}/parse-pdf`);
});
