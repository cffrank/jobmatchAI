/**
 * Export Application Utility
 *
 * Client-side utility for exporting applications to PDF or DOCX format.
 * Calls the Firebase Cloud Function and handles file download.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Export format types
 */
export type ExportFormat = 'pdf' | 'docx';

/**
 * Export result from Cloud Function
 */
interface ExportResult {
  downloadUrl: string;
  fileName: string;
  expiresAt: string;
  format: ExportFormat;
  fileSize: number;
}

/**
 * Request parameters for export
 */
interface ExportRequest {
  applicationId: string;
  format: ExportFormat;
}

/**
 * Error class for export failures
 */
export class ExportError extends Error {
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ExportError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Export an application to PDF or DOCX format
 *
 * This function:
 * 1. Validates the input parameters
 * 2. Calls the Firebase Cloud Function to generate the document
 * 3. Receives a signed download URL
 * 4. Triggers automatic download in the browser
 *
 * @param applicationId - The ID of the application to export
 * @param format - The export format ('pdf' or 'docx')
 * @returns Promise<void> - Resolves when export is complete and download initiated
 * @throws {ExportError} - If export fails
 */
export async function exportApplication(
  applicationId: string,
  format: ExportFormat
): Promise<void> {
  // Validate input
  if (!applicationId) {
    throw new ExportError('Application ID is required', 'invalid-argument');
  }

  if (!format || !['pdf', 'docx'].includes(format)) {
    throw new ExportError('Format must be "pdf" or "docx"', 'invalid-argument');
  }

  try {
    // Call Cloud Function
    const exportFn = httpsCallable<ExportRequest, ExportResult>(
      functions,
      'exportApplication'
    );

    const result = await exportFn({
      applicationId,
      format,
    });

    if (!result.data?.downloadUrl) {
      throw new ExportError(
        'Export function did not return a download URL',
        'internal'
      );
    }

    // Trigger download in browser
    await downloadFile(result.data.downloadUrl, result.data.fileName);

  } catch (error: unknown) {
    // Handle Firebase Functions errors
    if (error && typeof error === 'object' && 'code' in error) {
      const fbError = error as { code: string; message: string };

      // Map Firebase error codes to user-friendly messages
      switch (fbError.code) {
        case 'unauthenticated':
          throw new ExportError(
            'Please log in to export applications',
            fbError.code,
            error
          );
        case 'permission-denied':
          throw new ExportError(
            'You do not have permission to export this application',
            fbError.code,
            error
          );
        case 'not-found':
          throw new ExportError(
            'Application not found',
            fbError.code,
            error
          );
        case 'resource-exhausted':
          throw new ExportError(
            'Document is too large to export. Please try a shorter version.',
            fbError.code,
            error
          );
        case 'deadline-exceeded':
          throw new ExportError(
            'Export timed out. Please try again.',
            fbError.code,
            error
          );
        default:
          throw new ExportError(
            fbError.message || 'Failed to export application',
            fbError.code,
            error
          );
      }
    }

    // Handle generic errors
    if (error instanceof Error) {
      throw new ExportError(
        error.message || 'An unexpected error occurred during export',
        'unknown',
        error
      );
    }

    // Fallback for unknown error types
    throw new ExportError(
      'An unexpected error occurred during export',
      'unknown',
      error
    );
  }
}

/**
 * Download a file from a URL using an invisible anchor element
 *
 * This approach works for signed URLs and triggers the browser's
 * native download behavior instead of navigation.
 *
 * @param url - The download URL (typically a signed Firebase Storage URL)
 * @param fileName - The suggested filename for the download
 */
async function downloadFile(url: string, fileName: string): Promise<void> {
  try {
    // Fetch the file to get the blob
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Create object URL
    const objectUrl = window.URL.createObjectURL(blob);

    // Create temporary anchor element
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = 'none';

    // Append to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up object URL after a brief delay
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 100);

  } catch (error) {
    console.error('Download error:', error);

    // Fallback: try direct navigation (works for some browsers)
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (fallbackError) {
      throw new ExportError(
        'Failed to download exported file. Please try again.',
        'download-failed',
        error
      );
    }
  }
}

/**
 * Get the file extension for a given format
 */
export function getFileExtension(format: ExportFormat): string {
  return format === 'pdf' ? '.pdf' : '.docx';
}

/**
 * Get the MIME type for a given format
 */
export function getMimeType(format: ExportFormat): string {
  return format === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}
