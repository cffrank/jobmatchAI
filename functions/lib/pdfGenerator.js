/**
 * PDF Generation Utility
 *
 * Generates professionally formatted PDF resumes and cover letters using PDFKit.
 * Follows standard resume layout conventions with clear sections and hierarchy.
 */

const PDFDocument = require('pdfkit');

/**
 * Generate PDF document from application data
 *
 * @param {Object} application - The application data
 * @param {Object} variant - The selected variant
 * @param {Object} profile - User profile data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePDF(application, variant, profile) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      const buffers = [];

      // Collect PDF data into buffers
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Colors and styling
      const primaryColor = '#1e293b'; // slate-900
      const accentColor = '#84cc16'; // lime-500
      const grayColor = '#64748b'; // slate-500

      // Helper functions for consistent styling
      const addHeader = (name, contact) => {
        doc.fontSize(24)
           .fillColor(primaryColor)
           .font('Helvetica-Bold')
           .text(name, { align: 'center' });

        doc.moveDown(0.3);

        const contactInfo = [
          contact.email,
          contact.phone,
          contact.location,
          contact.linkedin
        ].filter(Boolean).join(' • ');

        doc.fontSize(10)
           .fillColor(grayColor)
           .font('Helvetica')
           .text(contactInfo, { align: 'center' });

        doc.moveDown(1);
      };

      const addSectionHeader = (title) => {
        doc.fontSize(14)
           .fillColor(accentColor)
           .font('Helvetica-Bold')
           .text(title.toUpperCase());

        doc.moveTo(doc.x, doc.y)
           .lineTo(doc.page.width - doc.page.margins.right, doc.y)
           .strokeColor(accentColor)
           .lineWidth(2)
           .stroke();

        doc.moveDown(0.5);
        doc.fillColor(primaryColor); // Reset color
      };

      const addExperience = (exp) => {
        const startY = doc.y;

        // Job title and company
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(primaryColor)
           .text(exp.title, { continued: false });

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(grayColor)
           .text(`${exp.company} • ${exp.location}`, { continued: false });

        doc.fontSize(9)
           .fillColor(grayColor)
           .text(`${exp.startDate} - ${exp.endDate}`, { continued: false });

        doc.moveDown(0.3);

        // Bullets
        exp.bullets.forEach(bullet => {
          const bulletText = bullet.startsWith('•') ? bullet : `• ${bullet}`;
          doc.fontSize(10)
             .fillColor(primaryColor)
             .font('Helvetica')
             .text(bulletText, {
               indent: 10,
               align: 'left'
             });
        });

        doc.moveDown(0.7);
      };

      const addEducation = (edu) => {
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(primaryColor)
           .text(edu.degree);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(grayColor)
           .text(`${edu.school} • ${edu.location}`);

        doc.fontSize(9)
           .fillColor(grayColor)
           .text(`Graduated: ${edu.graduation}`);

        doc.moveDown(0.7);
      };

      // Build the PDF
      const { resume, coverLetter } = variant;

      // Header with name and contact
      addHeader(
        `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Applicant',
        {
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          linkedin: profile.linkedinUrl
        }
      );

      // Professional Summary
      if (resume.summary) {
        addSectionHeader('Professional Summary');
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(primaryColor)
           .text(resume.summary, { align: 'justify' });
        doc.moveDown(1);
      }

      // Work Experience
      if (resume.experience && resume.experience.length > 0) {
        addSectionHeader('Professional Experience');
        resume.experience.forEach(exp => addExperience(exp));
      }

      // Skills
      if (resume.skills && resume.skills.length > 0) {
        addSectionHeader('Skills');
        const skillsText = resume.skills.join(' • ');
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(primaryColor)
           .text(skillsText);
        doc.moveDown(1);
      }

      // Education
      if (resume.education && resume.education.length > 0) {
        addSectionHeader('Education');
        resume.education.forEach(edu => addEducation(edu));
      }

      // Cover Letter (new page)
      if (coverLetter) {
        doc.addPage();

        // Header on cover letter page
        addHeader(
          `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Applicant',
          {
            email: profile.email,
            phone: profile.phone,
            location: profile.location
          }
        );

        doc.moveDown(1);

        // Date
        const today = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor(primaryColor)
           .text(today);

        doc.moveDown(1);

        // Employer address
        doc.text(`Hiring Manager`);
        doc.text(application.company);
        doc.moveDown(1);

        // Cover letter content
        const paragraphs = coverLetter.split('\n\n');
        paragraphs.forEach(para => {
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor(primaryColor)
             .text(para.trim(), { align: 'justify' });
          doc.moveDown(0.7);
        });

        // Signature
        doc.moveDown(1);
        doc.text('Sincerely,');
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold')
           .text(`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Applicant');
      }

      // Footer with metadata
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        doc.fontSize(8)
           .fillColor(grayColor)
           .font('Helvetica')
           .text(
             `Generated by JobMatch AI • ${new Date().toLocaleDateString()}`,
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

module.exports = { generatePDF };
