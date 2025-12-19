/**
 * Export Application Cloud Function
 *
 * Generates PDF or DOCX files from application data and uploads to Firebase Storage.
 * Returns a signed download URL for the client to download the file.
 *
 * Security:
 * - Validates user authentication
 * - Ensures user owns the application
 * - Generates time-limited signed URLs (24 hours)
 * - Validates input parameters
 *
 * Performance:
 * - Uses streaming where possible
 * - Implements proper error handling
 * - Cleans up temporary resources
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { generatePDF } = require('./lib/pdfGenerator');
const { generateDOCX } = require('./lib/docxGenerator');
const { v4: uuidv4 } = require('uuid');

/**
 * Export application as PDF or DOCX
 *
 * @param {Object} data - Request data
 * @param {string} data.applicationId - The application ID to export
 * @param {('pdf'|'docx')} data.format - Export format
 * @param {Object} context - Auth context
 * @returns {Object} { downloadUrl: string, fileName: string, expiresAt: string }
 */
exports.exportApplication = onCall(
  {
    timeoutSeconds: 120,
    memory: '1GiB', // Need more memory for document generation
  },
  async (request) => {
    const { applicationId, format } = request.data;
    const userId = request.auth?.uid;

    // Validation
    if (!userId) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to export applications');
    }

    if (!applicationId) {
      throw new HttpsError('invalid-argument', 'applicationId is required');
    }

    if (!format || !['pdf', 'docx'].includes(format.toLowerCase())) {
      throw new HttpsError('invalid-argument', 'format must be "pdf" or "docx"');
    }

    const normalizedFormat = format.toLowerCase();

    try {
      console.log(`Export request: user=${userId}, app=${applicationId}, format=${normalizedFormat}`);

      // Fetch application and verify ownership
      const appDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('applications')
        .doc(applicationId)
        .get();

      if (!appDoc.exists) {
        throw new HttpsError('not-found', 'Application not found');
      }

      const application = { id: appDoc.id, ...appDoc.data() };

      // Get selected variant
      const selectedVariant = application.variants.find(
        v => v.id === application.selectedVariantId
      ) || application.variants[0];

      if (!selectedVariant) {
        throw new HttpsError('failed-precondition', 'No variant selected for export');
      }

      // Fetch user profile for contact information
      const profileDoc = await admin.firestore()
        .collection('users')
        .doc(userId)
        .get();

      if (!profileDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found');
      }

      const profile = profileDoc.data();

      // Generate document based on format
      let documentBuffer;
      let mimeType;
      let fileExtension;

      if (normalizedFormat === 'pdf') {
        console.log('Generating PDF...');
        documentBuffer = await generatePDF(application, selectedVariant, profile);
        mimeType = 'application/pdf';
        fileExtension = 'pdf';
      } else {
        console.log('Generating DOCX...');
        documentBuffer = await generateDOCX(application, selectedVariant, profile);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        fileExtension = 'docx';
      }

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sanitizedJobTitle = application.jobTitle
        .replace(/[^a-z0-9]/gi, '_')
        .substring(0, 50);
      const fileName = `${sanitizedJobTitle}_${timestamp}.${fileExtension}`;

      // Upload to Firebase Storage
      const bucket = admin.storage().bucket();
      const filePath = `exports/${userId}/${applicationId}/${uuidv4()}_${fileName}`;
      const file = bucket.file(filePath);

      console.log(`Uploading to Storage: ${filePath}`);

      await file.save(documentBuffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            userId,
            applicationId,
            format: normalizedFormat,
            generatedAt: new Date().toISOString(),
            jobTitle: application.jobTitle,
            company: application.company
          }
        }
      });

      // Generate signed URL (valid for 24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: expiresAt
      });

      console.log(`Export successful: ${fileName}`);

      return {
        downloadUrl: signedUrl,
        fileName,
        expiresAt: new Date(expiresAt).toISOString(),
        format: normalizedFormat,
        fileSize: documentBuffer.length
      };

    } catch (error) {
      console.error('Export error:', error);

      // Re-throw HttpsErrors
      if (error instanceof HttpsError) {
        throw error;
      }

      // Handle specific error types
      if (error.code === 'ENOENT') {
        throw new HttpsError('internal', 'Document generation failed: template not found');
      }

      if (error.message?.includes('memory')) {
        throw new HttpsError('resource-exhausted', 'Document too large to generate');
      }

      // Generic error
      throw new HttpsError(
        'internal',
        `Failed to export application: ${error.message || 'Unknown error'}`
      );
    }
  }
);
