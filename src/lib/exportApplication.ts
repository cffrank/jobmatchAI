/**
 * Export Application Utility
 *
 * Client-side utility for exporting applications to PDF or DOCX format.
 * Calls the Railway backend API and handles file download.
 */

import { supabase } from './supabase';

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
 * 2. Calls the Railway backend API to generate the document
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
    // Get auth session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new ExportError('Please log in to export applications', 'unauthenticated');
    }

    // Call Railway backend API
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const response = await fetch(`${backendUrl}/api/exports/${format}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        applicationId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ExportError(
        errorData.message || `Export failed with status ${response.status}`,
        errorData.code || 'internal'
      );
    }

    const result = await response.json() as ExportResult;

    if (!result?.downloadUrl) {
      throw new ExportError(
        'Export function did not return a download URL',
        'internal'
      );
    }

    // Trigger download in browser
    await downloadFile(result.downloadUrl, result.fileName);

  } catch (error: unknown) {
    // Handle export errors
    if (error instanceof ExportError) {
      throw error;
    }

    // Handle fetch/network errors
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
    } catch {
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
