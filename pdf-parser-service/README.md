# PDF Parser Service

Simple Express service that extracts text from PDF files for JobMatch AI.

## Purpose

Cloudflare Workers has limitations with PDF parsing libraries (pdf.js doesn't work in Workers runtime). This service runs on Railway (Node.js environment) where pdf-parse works reliably.

## API

### `POST /parse-pdf`

Extracts text from a PDF file.

**Request:**
```json
{
  "pdfUrl": "https://storage.example.com/resume.pdf"
}
```

OR

```json
{
  "pdfBase64": "base64-encoded-pdf-content"
}
```

**Response:**
```json
{
  "text": "Extracted text content from PDF...",
  "pages": 3,
  "info": {
    "Title": "Resume",
    "Author": "John Doe"
  }
}
```

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "pdf-parser",
  "timestamp": "2025-12-30T17:00:00.000Z"
}
```

## Deployment

### Railway

1. Connect to GitHub repository
2. Select `pdf-parser-service` as root directory
3. Railway will auto-detect Node.js and deploy
4. Service will be available at: `https://your-service.railway.app`

### Environment Variables

- `PORT` - Auto-set by Railway (default: 3001)

## Local Development

```bash
cd pdf-parser-service
npm install
npm run dev
```

Service runs on http://localhost:3001

## Testing

```bash
# Health check
curl http://localhost:3001/health

# Parse PDF from URL
curl -X POST http://localhost:3001/parse-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "pdfUrl": "https://example.com/sample.pdf"
  }'
```
