/**
 * DOCX Generation Utility
 *
 * Generates professionally formatted DOCX resumes and cover letters using the docx library.
 * Creates ATS-friendly documents with clear structure and professional styling.
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  UnderlineType,
  BorderStyle,
  convertInchesToTwip
} = require('docx');

/**
 * Generate DOCX document from application data
 *
 * @param {Object} application - The application data
 * @param {Object} variant - The selected variant
 * @param {Object} profile - User profile data
 * @returns {Promise<Buffer>} DOCX buffer
 */
async function generateDOCX(application, variant, profile) {
  const { resume, coverLetter } = variant;

  // Document sections
  const sections = [];

  // Helper functions for creating document elements
  const createHeader = (name, contact) => {
    const elements = [];

    // Name
    elements.push(
      new Paragraph({
        text: name,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 100
        }
      })
    );

    // Contact info
    const contactInfo = [
      contact.email,
      contact.phone,
      contact.location,
      contact.linkedin
    ].filter(Boolean).join(' • ');

    elements.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 300
        },
        children: [
          new TextRun({
            text: contactInfo,
            size: 20,
            color: '64748b' // slate-500
          })
        ]
      })
    );

    return elements;
  };

  const createSectionHeader = (title) => {
    return new Paragraph({
      spacing: {
        before: 200,
        after: 100
      },
      border: {
        bottom: {
          color: '84cc16', // lime-500
          space: 1,
          style: BorderStyle.SINGLE,
          size: 12
        }
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 24,
          color: '1e293b' // slate-900
        })
      ]
    });
  };

  const createExperience = (exp) => {
    const elements = [];

    // Job title
    elements.push(
      new Paragraph({
        spacing: {
          before: 150,
          after: 50
        },
        children: [
          new TextRun({
            text: exp.title,
            bold: true,
            size: 22,
            color: '1e293b'
          })
        ]
      })
    );

    // Company and location
    elements.push(
      new Paragraph({
        spacing: {
          after: 50
        },
        children: [
          new TextRun({
            text: `${exp.company} • ${exp.location}`,
            size: 20,
            color: '64748b'
          })
        ]
      })
    );

    // Dates
    elements.push(
      new Paragraph({
        spacing: {
          after: 100
        },
        children: [
          new TextRun({
            text: `${exp.startDate} - ${exp.endDate}`,
            size: 18,
            color: '64748b',
            italics: true
          })
        ]
      })
    );

    // Bullets
    exp.bullets.forEach(bullet => {
      const bulletText = bullet.startsWith('•') ? bullet.substring(1).trim() : bullet;
      elements.push(
        new Paragraph({
          bullet: {
            level: 0
          },
          spacing: {
            after: 80
          },
          children: [
            new TextRun({
              text: bulletText,
              size: 20,
              color: '1e293b'
            })
          ]
        })
      );
    });

    return elements;
  };

  const createEducation = (edu) => {
    const elements = [];

    // Degree
    elements.push(
      new Paragraph({
        spacing: {
          before: 150,
          after: 50
        },
        children: [
          new TextRun({
            text: edu.degree,
            bold: true,
            size: 22,
            color: '1e293b'
          })
        ]
      })
    );

    // School and location
    elements.push(
      new Paragraph({
        spacing: {
          after: 50
        },
        children: [
          new TextRun({
            text: `${edu.school} • ${edu.location}`,
            size: 20,
            color: '64748b'
          })
        ]
      })
    );

    // Graduation
    elements.push(
      new Paragraph({
        spacing: {
          after: 100
        },
        children: [
          new TextRun({
            text: `Graduated: ${edu.graduation}`,
            size: 18,
            color: '64748b',
            italics: true
          })
        ]
      })
    );

    return elements;
  };

  // Build resume section
  const resumeChildren = [];
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Applicant';

  // Header
  resumeChildren.push(
    ...createHeader(fullName, {
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedin: profile.linkedinUrl
    })
  );

  // Professional Summary
  if (resume.summary) {
    resumeChildren.push(createSectionHeader('Professional Summary'));
    resumeChildren.push(
      new Paragraph({
        spacing: {
          after: 200
        },
        alignment: AlignmentType.JUSTIFIED,
        children: [
          new TextRun({
            text: resume.summary,
            size: 20,
            color: '1e293b'
          })
        ]
      })
    );
  }

  // Work Experience
  if (resume.experience && resume.experience.length > 0) {
    resumeChildren.push(createSectionHeader('Professional Experience'));
    resume.experience.forEach(exp => {
      resumeChildren.push(...createExperience(exp));
    });
  }

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    resumeChildren.push(createSectionHeader('Skills'));
    resumeChildren.push(
      new Paragraph({
        spacing: {
          after: 200
        },
        children: [
          new TextRun({
            text: resume.skills.join(' • '),
            size: 20,
            color: '1e293b'
          })
        ]
      })
    );
  }

  // Education
  if (resume.education && resume.education.length > 0) {
    resumeChildren.push(createSectionHeader('Education'));
    resume.education.forEach(edu => {
      resumeChildren.push(...createEducation(edu));
    });
  }

  // Add resume section
  sections.push({
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(0.75),
          bottom: convertInchesToTwip(0.75),
          left: convertInchesToTwip(0.75),
          right: convertInchesToTwip(0.75)
        }
      }
    },
    children: resumeChildren
  });

  // Build cover letter section
  if (coverLetter) {
    const coverLetterChildren = [];

    // Header
    coverLetterChildren.push(
      ...createHeader(fullName, {
        email: profile.email,
        phone: profile.phone,
        location: profile.location
      })
    );

    // Date
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    coverLetterChildren.push(
      new Paragraph({
        spacing: {
          after: 200
        },
        children: [
          new TextRun({
            text: today,
            size: 20,
            color: '1e293b'
          })
        ]
      })
    );

    // Employer address
    coverLetterChildren.push(
      new Paragraph({
        spacing: {
          after: 50
        },
        children: [
          new TextRun({
            text: 'Hiring Manager',
            size: 20,
            color: '1e293b'
          })
        ]
      })
    );

    coverLetterChildren.push(
      new Paragraph({
        spacing: {
          after: 200
        },
        children: [
          new TextRun({
            text: application.company,
            size: 20,
            color: '1e293b'
          })
        ]
      })
    );

    // Cover letter content
    const paragraphs = coverLetter.split('\n\n');
    paragraphs.forEach(para => {
      coverLetterChildren.push(
        new Paragraph({
          spacing: {
            after: 150
          },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: para.trim(),
              size: 20,
              color: '1e293b'
            })
          ]
        })
      );
    });

    // Signature
    coverLetterChildren.push(
      new Paragraph({
        spacing: {
          before: 200,
          after: 100
        },
        children: [
          new TextRun({
            text: 'Sincerely,',
            size: 20,
            color: '1e293b'
          })
        ]
      })
    );

    coverLetterChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: fullName,
            bold: true,
            size: 20,
            color: '1e293b'
          })
        ]
      })
    );

    // Add cover letter section
    sections.push({
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1)
          }
        }
      },
      children: coverLetterChildren
    });
  }

  // Create document
  const doc = new Document({
    sections,
    creator: 'JobMatch AI',
    description: `Application for ${application.jobTitle} at ${application.company}`,
    title: `${fullName} - Application`
  });

  // Generate buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

module.exports = { generateDOCX };
