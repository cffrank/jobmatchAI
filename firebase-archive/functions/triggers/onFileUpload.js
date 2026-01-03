const { onObjectFinalized } = require('firebase-functions/v2/storage');
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const crypto = require('crypto');

const storage = new Storage();

/**
 * Cloud Function triggered on file upload to Firebase Storage
 * Validates file type, size, and performs security checks
 */
exports.onFileUpload = onObjectFinalized(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;
    const size = parseInt(event.data.size, 10);
    const bucket = event.data.bucket;

    console.log(`File uploaded: ${filePath}, type: ${contentType}, size: ${size}`);

    // Extract user ID from path (format: users/{userId}/...)
    const pathParts = filePath.split('/');
    if (pathParts[0] !== 'users' || pathParts.length < 3) {
      console.log('Skipping: Not a user file');
      return null;
    }

    const userId = pathParts[1];
    const fileCategory = pathParts[2]; // profile, resumes, cover-letters, etc.

    try {
      // Validate based on file category
      const validation = validateFile(fileCategory, contentType, size);

      if (!validation.valid) {
        console.error(`Validation failed: ${validation.reason}`);

        // Delete invalid file
        await storage.bucket(bucket).file(filePath).delete();

        // Log security event
        await admin.firestore().collection('security_events').add({
          type: 'invalid_file_upload',
          userId,
          filePath,
          reason: validation.reason,
          contentType,
          size,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify user
        await admin.firestore().collection('users').doc(userId).update({
          'notifications.uploadError': {
            message: `File upload rejected: ${validation.reason}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          }
        });

        throw new Error(`File validation failed: ${validation.reason}`);
      }

      // Calculate file hash for deduplication and integrity
      const fileHash = await calculateFileHash(bucket, filePath);

      // Perform basic malware checks
      const securityCheck = await performSecurityChecks(bucket, filePath, contentType);

      if (!securityCheck.safe) {
        console.error(`Security check failed: ${securityCheck.reason}`);

        // Delete suspicious file
        await storage.bucket(bucket).file(filePath).delete();

        // Log security incident
        await admin.firestore().collection('security_incidents').add({
          type: 'malware_detected',
          userId,
          filePath,
          reason: securityCheck.reason,
          contentType,
          size,
          fileHash,
          severity: 'HIGH',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Alert admin
        console.error(`SECURITY ALERT: Potential malware upload by user ${userId}`);

        throw new Error(`Security check failed: ${securityCheck.reason}`);
      }

      // Store file metadata
      await admin.firestore()
        .collection('users').doc(userId)
        .collection('file_metadata').add({
          path: filePath,
          category: fileCategory,
          contentType,
          size,
          hash: fileHash,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
          validated: true,
          securityCheck: 'passed',
        });

      console.log(`File validated successfully: ${filePath}`);
      return null;

    } catch (error) {
      console.error('Error processing file upload:', error);
      throw error;
    }
  }
);

/**
 * Validate file based on category, content type, and size
 */
function validateFile(category, contentType, size) {
  const rules = {
    profile: {
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxSize: 2 * 1024 * 1024, // 2MB
      description: 'Profile photos',
    },
    resumes: {
      allowedTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
      maxSize: 5 * 1024 * 1024, // 5MB
      description: 'Resume documents',
    },
    'cover-letters': {
      allowedTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      maxSize: 5 * 1024 * 1024, // 5MB
      description: 'Cover letter documents',
    },
    exports: {
      allowedTypes: ['application/zip', 'application/x-zip-compressed'],
      maxSize: 10 * 1024 * 1024, // 10MB
      description: 'Export archives',
    },
  };

  const rule = rules[category];
  if (!rule) {
    return { valid: true }; // Unknown category, allow (storage rules will handle)
  }

  // Check content type
  if (!rule.allowedTypes.includes(contentType)) {
    return {
      valid: false,
      reason: `Invalid file type for ${rule.description}. Allowed: ${rule.allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  if (size > rule.maxSize) {
    return {
      valid: false,
      reason: `File size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds limit (${rule.maxSize / 1024 / 1024}MB) for ${rule.description}`,
    };
  }

  return { valid: true };
}

/**
 * Calculate SHA-256 hash of file for integrity verification
 */
async function calculateFileHash(bucket, filePath) {
  const file = storage.bucket(bucket).file(filePath);

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');

    file.createReadStream()
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

/**
 * Perform basic security checks on uploaded file
 * Note: For production, integrate with a proper malware scanning service
 * like Google Cloud Security Command Center, VirusTotal API, or ClamAV
 */
async function performSecurityChecks(bucket, filePath, contentType) {
  const file = storage.bucket(bucket).file(filePath);

  try {
    // Download first 10KB for signature analysis
    const [buffer] = await file.download({ start: 0, end: 10240 });

    // Check for common malware signatures
    const suspiciousPatterns = [
      // Executable signatures
      Buffer.from([0x4D, 0x5A]), // MZ (DOS/Windows executable)
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF (Linux executable)
      Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Mach-O (macOS executable)
      Buffer.from([0xFE, 0xED, 0xFA]), // Mach-O (64-bit)

      // Script indicators in documents
      Buffer.from('<?xml version'), // Check for XML in non-XML files
      Buffer.from('<script'), // Embedded scripts
      Buffer.from('javascript:'), // JavaScript protocol
    ];

    // Check for executable signatures in document files
    if (contentType.includes('pdf') || contentType.includes('wordprocessingml')) {
      for (const pattern of suspiciousPatterns.slice(0, 4)) {
        if (buffer.indexOf(pattern) !== -1) {
          return {
            safe: false,
            reason: 'File contains executable code signature',
          };
        }
      }
    }

    // Check for script content in images
    if (contentType.startsWith('image/')) {
      const fileContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));
      if (fileContent.includes('<script') || fileContent.includes('javascript:')) {
        return {
          safe: false,
          reason: 'Image file contains suspicious script content',
        };
      }
    }

    // Verify file signature matches declared content type
    const signatureCheck = verifyFileSignature(buffer, contentType);
    if (!signatureCheck.valid) {
      return {
        safe: false,
        reason: signatureCheck.reason,
      };
    }

    return { safe: true };

  } catch (error) {
    console.error('Error performing security checks:', error);
    // On error, reject the file for safety
    return {
      safe: false,
      reason: 'Unable to verify file security',
    };
  }
}

/**
 * Verify file signature matches declared content type
 */
function verifyFileSignature(buffer, contentType) {
  const signatures = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
    'application/zip': [
      [0x50, 0x4B, 0x03, 0x04], // PK
      [0x50, 0x4B, 0x05, 0x06], // Empty archive
      [0x50, 0x4B, 0x07, 0x08], // Spanned archive
    ],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
      [0x50, 0x4B, 0x03, 0x04], // DOCX is ZIP-based
    ],
    'application/x-zip-compressed': [
      [0x50, 0x4B, 0x03, 0x04],
    ],
  };

  const expectedSignatures = signatures[contentType];
  if (!expectedSignatures) {
    return { valid: true }; // Unknown type, skip verification
  }

  // Check if buffer starts with any of the expected signatures
  for (const signature of expectedSignatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    reason: `File signature does not match declared type (${contentType})`,
  };
}
