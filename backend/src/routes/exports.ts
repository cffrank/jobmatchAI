/**
 * Export Routes
 *
 * Handles application export to PDF and DOCX formats.
 *
 * Endpoints:
 * - POST /api/exports/pdf - Export application as PDF
 * - POST /api/exports/docx - Export application as DOCX
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  convertInchesToTwip,
} from 'docx';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin, TABLES, BUCKETS } from '../config/supabase';
import { authenticateUser, getUserId } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { asyncHandler, createNotFoundError, createValidationError } from '../middleware/errorHandler';
import type { ExportResponse, ApplicationVariant, UserProfile } from '../types';

// =============================================================================
// Router Setup
// =============================================================================

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const exportSchema = z.object({
  applicationId: z
    .string()
    .min(1, 'Application ID is required')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid application ID format'),
});

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/exports/pdf
 * Export application as PDF
 */
router.post(
  '/pdf',
  authenticateUser,
  rateLimiter({ maxRequests: 30, windowMs: 60 * 60 * 1000 }), // 30 per hour
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = exportSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { applicationId } = parseResult.data;

    console.log(`Exporting PDF for user ${userId}, application ${applicationId}`);

    // Fetch application data
    const { application, variant, profile } = await fetchApplicationData(userId, applicationId);

    // Generate PDF
    const pdfBuffer = await generatePDF(application, variant, profile);

    // Upload to storage
    const fileName = sanitizeFilename(`${application.job_title}_${new Date().toISOString().split('T')[0]}.pdf`);
    const filePath = `exports/${userId}/${applicationId}/${uuidv4()}_${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKETS.EXPORTS)
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Failed to upload PDF:', uploadError);
      throw new Error('Failed to upload PDF');
    }

    // Generate signed URL (valid for 24 hours)
    const { data: signedData } = await supabaseAdmin.storage
      .from(BUCKETS.EXPORTS)
      .createSignedUrl(filePath, 24 * 60 * 60); // 24 hours

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log(`PDF export successful: ${fileName}`);

    const response: ExportResponse = {
      downloadUrl: signedData?.signedUrl || '',
      fileName,
      expiresAt: expiresAt.toISOString(),
      format: 'pdf',
      fileSize: pdfBuffer.length,
    };

    res.json(response);
  })
);

/**
 * POST /api/exports/docx
 * Export application as DOCX
 */
router.post(
  '/docx',
  authenticateUser,
  rateLimiter({ maxRequests: 30, windowMs: 60 * 60 * 1000 }), // 30 per hour
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const parseResult = exportSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createValidationError(
        'Invalid request body',
        Object.fromEntries(
          parseResult.error.errors.map((e) => [e.path.join('.'), e.message])
        )
      );
    }

    const { applicationId } = parseResult.data;

    console.log(`Exporting DOCX for user ${userId}, application ${applicationId}`);

    // Fetch application data
    const { application, variant, profile } = await fetchApplicationData(userId, applicationId);

    // Generate DOCX
    const docxBuffer = await generateDOCX(application, variant, profile);

    // Upload to storage
    const fileName = sanitizeFilename(`${application.job_title}_${new Date().toISOString().split('T')[0]}.docx`);
    const filePath = `exports/${userId}/${applicationId}/${uuidv4()}_${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKETS.EXPORTS)
      .upload(filePath, docxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Failed to upload DOCX:', uploadError);
      throw new Error('Failed to upload DOCX');
    }

    // Generate signed URL (valid for 24 hours)
    const { data: signedData } = await supabaseAdmin.storage
      .from(BUCKETS.EXPORTS)
      .createSignedUrl(filePath, 24 * 60 * 60); // 24 hours

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log(`DOCX export successful: ${fileName}`);

    const response: ExportResponse = {
      downloadUrl: signedData?.signedUrl || '',
      fileName,
      expiresAt: expiresAt.toISOString(),
      format: 'docx',
      fileSize: docxBuffer.length,
    };

    res.json(response);
  })
);

// =============================================================================
// Helper Functions
// =============================================================================

interface ApplicationData {
  application: { id: string; job_title: string; company: string };
  variant: ApplicationVariant;
  profile: UserProfile;
}

async function fetchApplicationData(userId: string, applicationId: string): Promise<ApplicationData> {
  // Fetch application
  const { data: application, error: appError } = await supabaseAdmin
    .from(TABLES.APPLICATIONS)
    .select('*')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .single();

  if (appError || !application) {
    throw createNotFoundError('Application', applicationId);
  }

  // Fetch variants
  const { data: variants, error: variantError } = await supabaseAdmin
    .from(TABLES.APPLICATION_VARIANTS)
    .select('*')
    .eq('application_id', applicationId);

  if (variantError || !variants || variants.length === 0) {
    throw createNotFoundError('Application variants');
  }

  // Find selected variant
  const selectedVariant =
    variants.find((v) => v.variant_id === application.selected_variant_id) || variants[0];

  if (!selectedVariant) {
    throw createNotFoundError('Selected variant');
  }

  // Fetch user profile
  const { data: profileRecord, error: profileError } = await supabaseAdmin
    .from(TABLES.USERS)
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profileRecord) {
    throw createNotFoundError('User profile');
  }

  const variant: ApplicationVariant = {
    id: selectedVariant.variant_id,
    name: selectedVariant.name,
    resume: selectedVariant.resume,
    coverLetter: selectedVariant.cover_letter,
    aiRationale: selectedVariant.ai_rationale || [],
  };

  const profile: UserProfile = {
    id: profileRecord.id,
    email: profileRecord.email,
    firstName: profileRecord.first_name,
    lastName: profileRecord.last_name,
    phone: profileRecord.phone,
    location: profileRecord.location,
    summary: profileRecord.summary,
    headline: profileRecord.headline,
    profileImageUrl: profileRecord.profile_image_url,
    linkedInUrl: profileRecord.linkedin_url,
    linkedInImported: profileRecord.linkedin_imported,
    linkedInImportedAt: profileRecord.linkedin_imported_at,
    createdAt: profileRecord.created_at,
    updatedAt: profileRecord.updated_at,
  };

  return { application, variant, profile };
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

// =============================================================================
// PDF Generation
// =============================================================================

interface ApplicationRecord {
  id: string;
  job_title: string;
  company: string;
}

async function generatePDF(
  application: ApplicationRecord,
  variant: ApplicationVariant,
  profile: UserProfile
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const primaryColor = '#1e293b';
      const accentColor = '#84cc16';
      const grayColor = '#64748b';

      const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Applicant';
      const { resume, coverLetter } = variant;

      // Header
      doc.fontSize(24).fillColor(primaryColor).font('Helvetica-Bold').text(fullName, { align: 'center' });
      doc.moveDown(0.3);

      const contactInfo = [profile.email, profile.phone, profile.location, profile.linkedInUrl]
        .filter(Boolean)
        .join(' | ');
      doc.fontSize(10).fillColor(grayColor).font('Helvetica').text(contactInfo, { align: 'center' });
      doc.moveDown(1);

      // Professional Summary
      if (resume.summary) {
        doc.fontSize(14).fillColor(accentColor).font('Helvetica-Bold').text('PROFESSIONAL SUMMARY');
        doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .strokeColor(accentColor).lineWidth(2).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor(primaryColor).text(resume.summary, { align: 'justify' });
        doc.moveDown(1);
      }

      // Work Experience
      if (resume.experience && resume.experience.length > 0) {
        doc.fontSize(14).fillColor(accentColor).font('Helvetica-Bold').text('PROFESSIONAL EXPERIENCE');
        doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .strokeColor(accentColor).lineWidth(2).stroke();
        doc.moveDown(0.5);

        resume.experience.forEach((exp) => {
          doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor).text(exp.title);
          doc.fontSize(10).font('Helvetica').fillColor(grayColor).text(`${exp.company} | ${exp.location}`);
          doc.fontSize(9).fillColor(grayColor).text(`${exp.startDate} - ${exp.endDate}`);
          doc.moveDown(0.3);

          exp.bullets.forEach((bullet) => {
            const bulletText = bullet.startsWith('\u2022') ? bullet : `\u2022 ${bullet}`;
            doc.fontSize(10).fillColor(primaryColor).font('Helvetica').text(bulletText, { indent: 10 });
          });
          doc.moveDown(0.7);
        });
      }

      // Skills
      if (resume.skills && resume.skills.length > 0) {
        doc.fontSize(14).fillColor(accentColor).font('Helvetica-Bold').text('SKILLS');
        doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .strokeColor(accentColor).lineWidth(2).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor(primaryColor).text(resume.skills.join(' | '));
        doc.moveDown(1);
      }

      // Education
      if (resume.education && resume.education.length > 0) {
        doc.fontSize(14).fillColor(accentColor).font('Helvetica-Bold').text('EDUCATION');
        doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .strokeColor(accentColor).lineWidth(2).stroke();
        doc.moveDown(0.5);

        resume.education.forEach((edu) => {
          doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor).text(edu.degree);
          doc.fontSize(10).font('Helvetica').fillColor(grayColor).text(`${edu.school} | ${edu.location}`);
          doc.fontSize(9).fillColor(grayColor).text(`Graduated: ${edu.graduation}`);
          doc.moveDown(0.7);
        });
      }

      // Cover Letter (new page)
      if (coverLetter) {
        doc.addPage();

        doc.fontSize(24).fillColor(primaryColor).font('Helvetica-Bold').text(fullName, { align: 'center' });
        doc.moveDown(0.3);
        const contactInfoCL = [profile.email, profile.phone, profile.location]
          .filter(Boolean)
          .join(' | ');
        doc.fontSize(10).fillColor(grayColor).font('Helvetica').text(contactInfoCL, { align: 'center' });
        doc.moveDown(1);

        const today = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        doc.fontSize(10).font('Helvetica').fillColor(primaryColor).text(today);
        doc.moveDown(1);
        doc.text('Hiring Manager');
        doc.text(application.company);
        doc.moveDown(1);

        const paragraphs = coverLetter.split('\n\n');
        paragraphs.forEach((para) => {
          doc.fontSize(10).font('Helvetica').fillColor(primaryColor).text(para.trim(), { align: 'justify' });
          doc.moveDown(0.7);
        });

        doc.moveDown(1);
        doc.text('Sincerely,');
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(fullName);
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor(grayColor).font('Helvetica')
          .text(
            `Generated by JobMatch AI | ${new Date().toLocaleDateString()}`,
            doc.page.margins.left,
            doc.page.height - doc.page.margins.bottom + 20,
            { align: 'center' }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// =============================================================================
// DOCX Generation
// =============================================================================

async function generateDOCX(
  application: ApplicationRecord,
  variant: ApplicationVariant,
  profile: UserProfile
): Promise<Buffer> {
  const { resume, coverLetter } = variant;
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Applicant';

  const sections = [];

  // Build resume section
  const resumeChildren: Paragraph[] = [];

  // Header
  resumeChildren.push(
    new Paragraph({
      text: fullName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  const contactInfo = [profile.email, profile.phone, profile.location, profile.linkedInUrl]
    .filter(Boolean)
    .join(' | ');

  resumeChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: contactInfo, size: 20, color: '64748b' })],
    })
  );

  // Professional Summary
  if (resume.summary) {
    resumeChildren.push(createSectionHeader('Professional Summary'));
    resumeChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: resume.summary, size: 20, color: '1e293b' })],
      })
    );
  }

  // Work Experience
  if (resume.experience && resume.experience.length > 0) {
    resumeChildren.push(createSectionHeader('Professional Experience'));
    resume.experience.forEach((exp) => {
      resumeChildren.push(
        new Paragraph({
          spacing: { before: 150, after: 50 },
          children: [new TextRun({ text: exp.title, bold: true, size: 22, color: '1e293b' })],
        })
      );
      resumeChildren.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [new TextRun({ text: `${exp.company} | ${exp.location}`, size: 20, color: '64748b' })],
        })
      );
      resumeChildren.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: `${exp.startDate} - ${exp.endDate}`, size: 18, color: '64748b', italics: true })],
        })
      );
      exp.bullets.forEach((bullet) => {
        const bulletText = bullet.startsWith('\u2022') ? bullet.substring(1).trim() : bullet;
        resumeChildren.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [new TextRun({ text: bulletText, size: 20, color: '1e293b' })],
          })
        );
      });
    });
  }

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    resumeChildren.push(createSectionHeader('Skills'));
    resumeChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: resume.skills.join(' | '), size: 20, color: '1e293b' })],
      })
    );
  }

  // Education
  if (resume.education && resume.education.length > 0) {
    resumeChildren.push(createSectionHeader('Education'));
    resume.education.forEach((edu) => {
      resumeChildren.push(
        new Paragraph({
          spacing: { before: 150, after: 50 },
          children: [new TextRun({ text: edu.degree, bold: true, size: 22, color: '1e293b' })],
        })
      );
      resumeChildren.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [new TextRun({ text: `${edu.school} | ${edu.location}`, size: 20, color: '64748b' })],
        })
      );
      resumeChildren.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: `Graduated: ${edu.graduation}`, size: 18, color: '64748b', italics: true })],
        })
      );
    });
  }

  sections.push({
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(0.75),
          bottom: convertInchesToTwip(0.75),
          left: convertInchesToTwip(0.75),
          right: convertInchesToTwip(0.75),
        },
      },
    },
    children: resumeChildren,
  });

  // Cover Letter section
  if (coverLetter) {
    const coverLetterChildren: Paragraph[] = [];

    coverLetterChildren.push(
      new Paragraph({
        text: fullName,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    const contactInfoCL = [profile.email, profile.phone, profile.location]
      .filter(Boolean)
      .join(' | ');

    coverLetterChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({ text: contactInfoCL, size: 20, color: '64748b' })],
      })
    );

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    coverLetterChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: today, size: 20, color: '1e293b' })],
      })
    );

    coverLetterChildren.push(
      new Paragraph({
        spacing: { after: 50 },
        children: [new TextRun({ text: 'Hiring Manager', size: 20, color: '1e293b' })],
      })
    );

    coverLetterChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: application.company, size: 20, color: '1e293b' })],
      })
    );

    const paragraphs = coverLetter.split('\n\n');
    paragraphs.forEach((para) => {
      coverLetterChildren.push(
        new Paragraph({
          spacing: { after: 150 },
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun({ text: para.trim(), size: 20, color: '1e293b' })],
        })
      );
    });

    coverLetterChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: 'Sincerely,', size: 20, color: '1e293b' })],
      })
    );

    coverLetterChildren.push(
      new Paragraph({
        children: [new TextRun({ text: fullName, bold: true, size: 20, color: '1e293b' })],
      })
    );

    sections.push({
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: coverLetterChildren,
    });
  }

  const doc = new Document({
    sections,
    creator: 'JobMatch AI',
    description: `Application for ${application.job_title} at ${application.company}`,
    title: `${fullName} - Application`,
  });

  return Packer.toBuffer(doc);
}

function createSectionHeader(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    border: {
      bottom: {
        color: '84cc16',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 12,
      },
    },
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 24, color: '1e293b' })],
  });
}

export default router;
