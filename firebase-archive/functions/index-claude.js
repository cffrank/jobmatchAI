const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');

admin.initializeApp();

// Initialize Anthropic client for Claude
const anthropic = new Anthropic({
  apiKey: functions.config().anthropic?.api_key || process.env.ANTHROPIC_API_KEY
});

/**
 * Cloud Function to generate tailored resume and cover letter variants using Claude
 * RECOMMENDED: Use Claude 3.5 Haiku for best cost-to-quality ratio
 */
exports.generateApplication = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    // [Authentication and data fetching code same as before]
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = data;
    const userId = context.auth.uid;

    if (!jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      console.log(`Generating application for user ${userId}, job ${jobId}`);

      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
      }
      const job = jobDoc.data();

      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User profile not found');
      }
      const profile = userDoc.data();

      const [workExpSnapshot, educationSnapshot, skillsSnapshot] = await Promise.all([
        admin.firestore().collection('users').doc(userId).collection('workExperience').orderBy('startDate', 'desc').get(),
        admin.firestore().collection('users').doc(userId).collection('education').orderBy('endDate', 'desc').get(),
        admin.firestore().collection('users').doc(userId).collection('skills').orderBy('endorsements', 'desc').get()
      ]);

      const workExperience = workExpSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const education = educationSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const skills = skillsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (workExperience.length === 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Please add work experience to your profile');
      }

      console.log('Calling Claude to generate variants...');
      const variants = await generateVariantsWithClaude(job, profile, workExperience, education, skills);

      const applicationRef = await admin.firestore()
        .collection('users').doc(userId)
        .collection('applications')
        .add({
          jobId,
          jobTitle: job.title,
          company: job.company,
          status: 'draft',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          submittedAt: null,
          variants,
          selectedVariantId: variants[0].id,
          editHistory: []
        });

      console.log(`Application generated successfully: ${applicationRef.id}`);

      return {
        id: applicationRef.id,
        jobId,
        jobTitle: job.title,
        company: job.company,
        status: 'draft',
        createdAt: new Date().toISOString(),
        submittedAt: null,
        variants,
        selectedVariantId: variants[0].id,
        editHistory: []
      };

    } catch (error) {
      console.error('Error generating application:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', 'Failed to generate application', error.message);
    }
  });

/**
 * Generate 3 variants using Claude
 */
async function generateVariantsWithClaude(job, profile, workExperience, education, skills) {
  const strategies = [
    {
      id: 'variant-impact',
      name: 'Impact-Focused',
      prompt: 'Focus on quantifiable achievements, metrics, and business impact. Emphasize leadership and results.'
    },
    {
      id: 'variant-keyword',
      name: 'Keyword-Optimized',
      prompt: 'Maximize keyword matches from the job description for ATS optimization. Include all required skills naturally.'
    },
    {
      id: 'variant-concise',
      name: 'Concise',
      prompt: 'Create a streamlined one-page version focusing on most recent and relevant experience only.'
    }
  ];

  const variants = await Promise.all(
    strategies.map(strategy => generateSingleVariantClaude(job, profile, workExperience, education, skills, strategy))
  );

  return variants;
}

/**
 * Generate a single variant using Claude 3.5 Haiku
 */
async function generateSingleVariantClaude(job, profile, workExperience, education, skills, strategy) {
  const systemPrompt = `You are an expert resume writer and career coach. Generate a tailored resume and cover letter optimized for applicant tracking systems (ATS) and human recruiters.

Strategy: ${strategy.prompt}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanations):
{
  "resume": {
    "summary": "2-3 sentence professional summary",
    "experience": [
      {
        "title": "Job Title",
        "company": "Company Name",
        "location": "City, State",
        "startDate": "Mon YYYY",
        "endDate": "Mon YYYY or Present",
        "bullets": ["• Achievement 1", "• Achievement 2", "• Achievement 3"]
      }
    ],
    "skills": ["Skill 1", "Skill 2", "Skill 3"],
    "education": [
      {
        "degree": "Degree in Field",
        "school": "School Name",
        "location": "City, State",
        "graduation": "Mon YYYY",
        "focus": "Relevant coursework or achievement"
      }
    ]
  },
  "coverLetter": "Full cover letter text with proper paragraphs",
  "aiRationale": [
    "Explanation of strategy point 1",
    "Explanation of strategy point 2",
    "Explanation of strategy point 3"
  ]
}`;

  const userPrompt = `Generate a tailored resume and cover letter for this job application:

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description || 'Not provided'}
Required Skills: ${job.requiredSkills.join(', ')}
Experience Level: ${job.experienceLevel || 'Not specified'}
Location: ${job.location || 'Not specified'}

CANDIDATE PROFILE:
Name: ${profile.firstName} ${profile.lastName}
Current Title: ${profile.title || 'Not specified'}

WORK EXPERIENCE:
${workExperience.map((exp, i) => `${i + 1}. ${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})
   Location: ${exp.location}
   Accomplishments: ${exp.accomplishments.join('; ')}`).join('\n')}

EDUCATION:
${education.map(edu => `- ${edu.degree} in ${edu.field}, ${edu.school} (${edu.endDate})`).join('\n')}

SKILLS:
${skills.map(s => `- ${s.name} (${s.level})`).join('\n')}

Generate the resume and cover letter following the ${strategy.name} strategy.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Cheapest, excellent quality
      // Alternative models:
      // model: 'claude-3-5-sonnet-20241022', // Better quality, slightly more expensive
      // model: 'claude-3-opus-20240229', // Best quality, most expensive
      max_tokens: 4096,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: systemPrompt + '\n\n' + userPrompt
        }
      ]
    });

    // Claude returns text, need to parse JSON
    const responseText = message.content[0].text;
    const result = JSON.parse(responseText);

    return {
      id: strategy.id,
      name: strategy.name,
      resume: result.resume,
      coverLetter: result.coverLetter,
      aiRationale: result.aiRationale
    };

  } catch (error) {
    console.error(`Error generating ${strategy.name} variant with Claude:`, error);
    return generateFallbackVariant(job, profile, workExperience, education, skills, strategy);
  }
}

/**
 * Fallback variant generation if AI fails
 */
function generateFallbackVariant(job, profile, workExperience, education, skills, strategy) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Present';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const relevantSkills = skills
    .filter(s => job.requiredSkills.some(req =>
      req.toLowerCase().includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(req.toLowerCase())
    ))
    .slice(0, 10)
    .map(s => s.name);

  const allSkills = [...relevantSkills, ...job.requiredSkills.slice(0, 3)]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 12);

  return {
    id: strategy.id,
    name: strategy.name,
    resume: {
      summary: `${job.experienceLevel || 'Experienced'} ${job.title} with proven expertise in ${job.requiredSkills.slice(0, 3).join(', ')}.`,
      experience: workExperience.slice(0, 3).map(exp => ({
        title: exp.position,
        company: exp.company,
        location: exp.location,
        startDate: formatDate(exp.startDate),
        endDate: exp.current ? 'Present' : formatDate(exp.endDate),
        bullets: exp.accomplishments.slice(0, 4).map(a => `• ${a}`)
      })),
      skills: allSkills,
      education: education.map(edu => ({
        degree: `${edu.degree} in ${edu.field}`,
        school: edu.school,
        location: edu.location,
        graduation: formatDate(edu.endDate),
        focus: edu.highlights[0]
      }))
    },
    coverLetter: `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}. With my background in ${workExperience[0]?.position} and expertise in ${job.requiredSkills.slice(0, 2).join(' and ')}, I am excited about this opportunity.

Thank you for your consideration.

Best regards,
${profile.firstName} ${profile.lastName}`,
    aiRationale: [
      `Generated using ${strategy.name} strategy`,
      'Tailored to match job requirements',
      'Fallback generation used'
    ]
  };
}
