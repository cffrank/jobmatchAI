const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const OpenAI = require('openai');

admin.initializeApp();

// OpenAI client - initialized lazily
let openaiClient = null;

function getOpenAI() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

exports.generateApplication = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY']
  },
  async (request) => {
    const { jobId } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    if (!jobId) {
      throw new HttpsError('invalid-argument', 'jobId is required');
    }

    try {
      console.log(`Generating application for user ${userId}, job ${jobId}`);

      // Fetch data from Firestore
      const [jobDoc, userDoc, workExpSnap, eduSnap, skillsSnap] = await Promise.all([
        admin.firestore().collection('jobs').doc(jobId).get(),
        admin.firestore().collection('users').doc(userId).get(),
        admin.firestore().collection('users').doc(userId).collection('workExperience').orderBy('startDate', 'desc').get(),
        admin.firestore().collection('users').doc(userId).collection('education').orderBy('endDate', 'desc').get(),
        admin.firestore().collection('users').doc(userId).collection('skills').orderBy('endorsements', 'desc').get()
      ]);

      if (!jobDoc.exists) throw new HttpsError('not-found', 'Job not found');
      if (!userDoc.exists) throw new HttpsError('not-found', 'Profile not found');

      const job = jobDoc.data();
      const profile = userDoc.data();
      const workExperience = workExpSnap.docs.map(d => ({id: d.id, ...d.data()}));
      const education = eduSnap.docs.map(d => ({id: d.id, ...d.data()}));
      const skills = skillsSnap.docs.map(d => ({id: d.id, ...d.data()}));

      if (workExperience.length === 0) {
        throw new HttpsError('failed-precondition', 'Add work experience first');
      }

      // Generate variants
      const variants = await generateVariants(job, profile, workExperience, education, skills);

      // Save to Firestore
      const appRef = await admin.firestore()
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

      console.log(`Application created: ${appRef.id}`);

      return {
        id: appRef.id,
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
      console.error('Error:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', error.message || 'Generation failed');
    }
  }
);

async function generateVariants(job, profile, workExperience, education, skills) {
  const strategies = [
    { id: 'variant-impact', name: 'Impact-Focused', prompt: 'Focus on metrics and business impact' },
    { id: 'variant-keyword', name: 'Keyword-Optimized', prompt: 'Maximize ATS keyword matches' },
    { id: 'variant-concise', name: 'Concise', prompt: 'Streamlined one-page version' }
  ];

  return Promise.all(strategies.map(s => generateVariant(job, profile, workExperience, education, skills, s)));
}

async function generateVariant(job, profile, workExp, edu, skills, strategy) {
  const skillsList = job.requiredSkills ? job.requiredSkills.join(', ') : 'various skills';
  const expList = workExp.map(e => `${e.position} at ${e.company}`).join(', ');
  const eduList = edu.map(e => `${e.degree} from ${e.school}`).join(', ');
  const skillNames = skills.map(s => s.name).join(', ');

  const systemPrompt = `You are an expert resume writer. ${strategy.prompt}.

Return JSON with this EXACT structure:
{
  "resume": {
    "summary": "Brief professional summary string",
    "experience": [
      {
        "title": "Job title",
        "company": "Company name",
        "location": "City, State",
        "startDate": "YYYY-MM",
        "endDate": "YYYY-MM or Present",
        "bullets": ["• Achievement 1", "• Achievement 2", "• Achievement 3"]
      }
    ],
    "skills": ["Skill 1", "Skill 2", "Skill 3"],
    "education": [
      {
        "degree": "Degree name in Field",
        "school": "School name",
        "location": "City, State",
        "graduation": "YYYY-MM"
      }
    ]
  },
  "coverLetter": "Multi-paragraph cover letter text with \\n\\n separating paragraphs",
  "aiRationale": ["Reason 1", "Reason 2", "Reason 3"]
}`;

  const userPrompt = `Job: ${job.title} at ${job.company}
Skills needed: ${skillsList}

Candidate: ${profile.firstName} ${profile.lastName}
Experience: ${expList}
Education: ${eduList}
Skills: ${skillNames}

Generate tailored resume and cover letter following the exact JSON structure specified.`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return { id: strategy.id, name: strategy.name, ...result };
  } catch (error) {
    console.error(`OpenAI error for ${strategy.name}:`, error);
    return getFallbackVariant(job, profile, workExp, edu, skills, strategy);
  }
}

function getFallbackVariant(job, profile, workExp, edu, skills, strategy) {
  const topSkills = job.requiredSkills ? job.requiredSkills.slice(0,3).join(', ') : 'various technologies';

  return {
    id: strategy.id,
    name: strategy.name,
    resume: {
      summary: `${job.title} with expertise in ${topSkills}`,
      experience: workExp.slice(0,3).map(e => ({
        title: e.position,
        company: e.company,
        location: e.location,
        startDate: e.startDate,
        endDate: e.current ? 'Present' : e.endDate,
        bullets: e.accomplishments.slice(0,3).map(a => `• ${a}`)
      })),
      skills: skills.slice(0,10).map(s => s.name),
      education: edu.map(e => ({
        degree: `${e.degree} in ${e.field}`,
        school: e.school,
        location: e.location,
        graduation: e.endDate
      }))
    },
    coverLetter: `Dear Hiring Manager,\n\nI am interested in the ${job.title} position at ${job.company}.\n\nBest regards,\n${profile.firstName} ${profile.lastName}`,
    aiRationale: ['Fallback generation used', `${strategy.name} strategy applied`]
  };
}
