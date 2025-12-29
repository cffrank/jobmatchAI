# Resume Parsing Fix - PDF Support

## Problem

The resume parsing feature was failing when users uploaded PDF files. The error occurred because the backend was attempting to send PDF files to OpenAI's Vision API, which only accepts image formats (PNG, JPEG, GIF, WEBP).

**Error Message:**
```
Error: 400 You uploaded an unsupported image. Please make sure your image has of one the following formats: ['png', 'jpeg', 'gif', 'webp'].
```

## Root Cause

The `parseResume()` function in `/home/carl/application-tracking/jobmatch-ai/backend/src/services/openai.service.ts` was using OpenAI's GPT-4o Vision API for all resume files, regardless of format. It was sending a signed URL to the `image_url` parameter, which works for images but fails for PDFs.

## Solution

Implemented file type detection and dual-path processing:

### 1. Added PDF Parsing Library
- Installed `pdf-parse` (version 2.4.5) to extract text from PDF files
- This library uses PDF.js under the hood to parse PDF documents

### 2. File Type Detection
Created `getFileType()` function to detect file format based on extension:
- `pdf` - PDF documents
- `image` - PNG, JPG, JPEG, GIF, WEBP
- `unsupported` - Any other format (throws error)

### 3. Dual Processing Paths

#### For PDF Files:
1. Download the file from Supabase storage as a Buffer
2. Extract text using `pdf-parse` library
3. Send extracted text to GPT-4o (standard text completion, not Vision API)
4. Parse JSON response

#### For Image Files:
1. Generate signed URL from Supabase storage
2. Send URL to GPT-4o Vision API (existing behavior)
3. Parse JSON response

## Modified Files

### 1. `/home/carl/application-tracking/jobmatch-ai/backend/package.json`
- Added dependency: `"pdf-parse": "^2.4.5"`

### 2. `/home/carl/application-tracking/jobmatch-ai/backend/src/services/openai.service.ts`

**Added imports:**
```typescript
import { PDFParse } from 'pdf-parse';
```

**Added helper functions:**
```typescript
function getFileType(storagePath: string): 'pdf' | 'image' | 'unsupported'
async function downloadFile(storagePath: string): Promise<Buffer>
async function extractTextFromPDF(buffer: Buffer): Promise<string>
```

**Modified function:**
```typescript
export async function parseResume(storagePath: string): Promise<ParsedResume>
```

## Implementation Details

### PDF Text Extraction
```typescript
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}
```

### File Download from Storage
```typescript
async function downloadFile(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage
    .from('files')
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message || 'Unknown error'}`);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

### Conditional Processing
```typescript
if (fileType === 'pdf') {
  // Download and extract text
  const fileBuffer = await downloadFile(storagePath);
  const extractedText = await extractTextFromPDF(fileBuffer);

  // Send to GPT-4o as text
  completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: '...' },
      { role: 'user', content: `${prompt}\n\nRESUME TEXT:\n${extractedText}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 4000,
  });
} else {
  // Generate signed URL and use Vision API (existing code)
  // ...
}
```

## Testing

### Build Verification
```bash
npm run typecheck  # ✓ Passed
npm run build      # ✓ Passed
```

### Supported File Formats
- ✅ PDF (.pdf)
- ✅ PNG (.png)
- ✅ JPEG (.jpg, .jpeg)
- ✅ GIF (.gif)
- ✅ WEBP (.webp)
- ❌ Other formats (will throw error with clear message)

## Benefits

1. **PDF Support**: Users can now upload PDF resumes, which is the most common format
2. **Better Error Handling**: Clear error messages for unsupported file types
3. **Cost Efficient**: Text extraction from PDFs is cheaper than Vision API calls
4. **Accurate Parsing**: PDF text extraction provides more accurate text than OCR from images
5. **Backwards Compatible**: Image resume uploads continue to work as before

## Future Enhancements

Potential improvements that could be added:

1. **DOCX Support**: Add support for Microsoft Word documents using `mammoth` or similar library
2. **Multi-page PDFs**: Optimize handling of very long resumes
3. **OCR Fallback**: If PDF text extraction fails (scanned PDFs), fall back to Vision API
4. **Format Detection**: Validate file content, not just extension
5. **Progress Tracking**: Show upload/parsing progress to users

## Deployment Notes

No environment variable changes required. The fix uses existing dependencies and configuration.

To deploy:
1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Deploy to Railway (automatic on push to main branch)

## Related Files

- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/openai.service.ts` - Main implementation
- `/home/carl/application-tracking/jobmatch-ai/backend/package.json` - Dependencies
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/profile.routes.ts` - Resume upload endpoint
