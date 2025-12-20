const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');
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
  const skillNames = skills.map(s => s.name).join(', ');

  // Extract detailed work experience with achievements
  const experienceWithDetails = workExp.map(exp => {
    const bullets = exp.accomplishments || exp.bullets || [];
    return {
      position: exp.position,
      company: exp.company,
      location: exp.location || 'Location not specified',
      duration: `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`,
      achievements: bullets.length > 0 ? bullets : ['No specific achievements listed']
    };
  });

  const systemPrompt = `You are an expert resume writer specializing in ATS-optimized applications. ${strategy.prompt}.

EXAMPLES OF EXCELLENT RESUME BULLETS:

❌ Weak: "Responsible for managing kitchen staff and preparing meals"
✅ Strong: "Led team of 20+ kitchen staff in upscale steakhouse, reducing food waste by 35% and increasing customer satisfaction scores from 4.2 to 4.8/5.0 through menu innovation and staff training"

❌ Weak: "Worked as head chef at restaurant"
✅ Strong: "Directed all culinary operations for 200-seat fine dining establishment generating $2.5M annual revenue, earning Michelin recommendation in first year"

❌ Weak: "Created new menu items"
✅ Strong: "Developed seasonal farm-to-table menu featuring 40+ locally-sourced dishes, resulting in 25% increase in repeat customers and $180K additional quarterly revenue"

❌ Weak: "Managed software development projects"
✅ Strong: "Led cross-functional team of 8 engineers to deliver React-based dashboard 2 weeks ahead of schedule, improving user engagement by 45% and reducing support tickets by 60%"

KEY PRINCIPLES FOR RESUME BULLETS:
- Start with powerful action verbs (Led, Managed, Developed, Increased, Reduced, Improved, Created, Built, Designed, Implemented, Streamlined, Established)
- Include specific, quantifiable metrics (%, $, numbers, time saved, efficiency gains)
- Show clear impact and business results
- Length: 50-150 characters per bullet
- Avoid generic phrases like "responsible for" or "worked on" or "helped with"
- Use past tense for previous roles, present tense for current role

PROFESSIONAL SUMMARY REQUIREMENTS:
- Length: 100-300 characters
- Mention total years of experience
- Include 2-3 most relevant skills from the job description
- Highlight 1-2 key achievements with numbers
- Professional tone matching the industry

COVER LETTER REQUIREMENTS:
- Length: 500-1500 characters
- Mention company name at least twice
- Reference specific job title in opening paragraph
- Include 2-3 concrete achievements with metrics
- Show genuine enthusiasm and research about the company
- Professional greeting ("Dear Hiring Manager" or "Dear [Company] Team")
- Strong closing with call to action

QUALITY CHECKLIST (verify before returning):
☑ Resume summary: 100-300 chars, mentions years of experience, includes numbers
☑ Resume bullets: 70%+ include metrics, all start with action verbs, 50-150 chars each
☑ At least 3 bullets per work experience position
☑ Keywords from job description appear naturally in resume
☑ Cover letter: mentions company name 2+ times, job title in first paragraph
☑ Cover letter: includes 2-3 specific achievements with numbers
☑ Cover letter: has professional greeting and closing
☑ Skills section includes keywords from job requirements

Return JSON with this EXACT structure:
{
  "resume": {
    "summary": "Brief professional summary string (100-300 chars with metrics)",
    "experience": [
      {
        "title": "Job title",
        "company": "Company name",
        "location": "City, State",
        "startDate": "YYYY-MM",
        "endDate": "YYYY-MM or Present",
        "bullets": ["• Achievement with metrics", "• Another achievement with numbers", "• Third achievement showing impact"]
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
  "coverLetter": "Multi-paragraph cover letter text with \\n\\n separating paragraphs. Must mention company name and job title.",
  "aiRationale": ["Specific reason why this resume matches job requirement 1", "How achievement X addresses need Y", "Why skill Z is emphasized for this role"]
}`;

  const userPrompt = `JOB POSTING DETAILS:

Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Work Arrangement: ${job.workArrangement || 'Not specified'}
${job.salaryMin && job.salaryMax ? `Salary Range: $${job.salaryMin.toLocaleString()} - $${job.salaryMax.toLocaleString()}` : ''}

FULL JOB DESCRIPTION:
${job.description || 'No detailed description provided. Use job title and required skills to infer responsibilities.'}

REQUIRED SKILLS: ${skillsList}
${job.preferredSkills && job.preferredSkills.length > 0 ? `PREFERRED SKILLS: ${job.preferredSkills.join(', ')}` : ''}

---

CANDIDATE PROFILE:

Name: ${profile.firstName} ${profile.lastName}
Location: ${profile.location || 'Not specified'}
Phone: ${profile.phone || 'Not provided'}
Email: ${profile.email || 'Not provided'}

${profile.summary ? `CURRENT PROFESSIONAL SUMMARY:\n${profile.summary}\n` : ''}

WORK EXPERIENCE (use as basis, but improve with metrics):
${experienceWithDetails.map((exp, i) => `
${i + 1}. ${exp.position} at ${exp.company}
   ${exp.duration} | ${exp.location}
   Current achievements listed:
${exp.achievements.map(a => `   - ${a}`).join('\n')}
`).join('\n')}

EDUCATION:
${edu.map(e => `- ${e.degree} from ${e.school}${e.graduationYear ? ` (${e.graduationYear})` : ''}`).join('\n')}

SKILLS:
${skillNames}

---

TASK:
Create a tailored resume and cover letter that:

1. KEYWORD OPTIMIZATION: Use keywords from the job description naturally throughout the resume. Match required skills: ${skillsList}

2. QUANTIFY EVERYTHING: Transform the candidate's experience into achievement bullets with specific metrics. If exact numbers aren't provided, use reasonable estimates based on role scope (e.g., "team of 15+", "improved efficiency by ~30%", "managed $200K+ budget").

3. HIGHLIGHT RELEVANCE: Emphasize the 3-5 most relevant experiences for THIS specific ${job.title} position. Less relevant experiences can be condensed or omitted.

4. PROFESSIONAL SUMMARY: Write a compelling 100-300 character summary mentioning:
   - Years of experience in the field
   - Top 2-3 skills that match job requirements
   - 1-2 impressive quantified achievements

5. COVER LETTER: Write 500-1500 characters that:
   - Opens by mentioning the specific job title: "${job.title}"
   - References the company name "${job.company}" at least twice
   - Highlights 2-3 specific achievements with metrics that match job needs
   - Shows enthusiasm and genuine interest
   - Ends with a call to action

6. VALIDATION: Before returning, verify:
   - At least 70% of resume bullets include numbers/metrics
   - Every bullet starts with a strong action verb
   - Summary is 100-300 characters
   - Cover letter mentions company and job title
   - Keywords from job description appear naturally

Generate the complete application following the exact JSON structure specified above.`;

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

// =============================================================================
// LinkedIn OAuth Functions
// =============================================================================

/**
 * Initiate LinkedIn OAuth flow
 * Returns the authorization URL to redirect the user to
 *
 * Security features:
 * - Generates cryptographically secure state token for CSRF protection
 * - Stores state with expiration in Firestore
 * - Validates user authentication
 *
 * @returns {Object} { authUrl: string, state: string }
 */
exports.linkedInAuth = onCall(
  {
    secrets: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET']
  },
  async (request) => {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to connect LinkedIn');
    }

    try {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      if (!clientId) {
        console.error('LINKEDIN_CLIENT_ID environment variable not set');
        throw new HttpsError(
          'failed-precondition',
          'LinkedIn integration is not configured. Please contact support.'
        );
      }

      // Construct callback URL
      // In production: https://us-central1-PROJECT_ID.cloudfunctions.net/linkedInCallback
      // In emulator: http://127.0.0.1:5001/PROJECT_ID/us-central1/linkedInCallback
      const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
      const functionUrl = process.env.FUNCTION_URL ||
        `https://us-central1-${projectId}.cloudfunctions.net/linkedInCallback`;

      // Generate cryptographically secure state token for CSRF protection
      const crypto = require('crypto');
      const stateData = {
        userId,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
      };
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      // Store state in Firestore for verification (expires in 10 minutes)
      await admin.firestore().collection('_oauth_states').doc(state).set({
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });

      // Build LinkedIn OAuth authorization URL
      // Scopes documentation: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication
      // Available with standard access:
      //   - openid: Required for OpenID Connect
      //   - profile: First name, last name, profile picture
      //   - email: Email address
      // Requires partner access (not included):
      //   - r_member_social: Work experience, education, skills
      const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', functionUrl);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('scope', 'openid profile email');

      console.log(`LinkedIn auth initiated for user ${userId}`, {
        callbackUrl: functionUrl,
        scopes: 'openid profile email'
      });

      return {
        authUrl: authUrl.toString(),
        state
      };
    } catch (error) {
      console.error('Error initiating LinkedIn auth:', error);

      // Re-throw HttpsError as-is
      if (error instanceof HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new HttpsError('internal', `Failed to initiate LinkedIn OAuth: ${error.message}`);
    }
  }
);

/**
 * Handle LinkedIn OAuth callback
 * Exchanges authorization code for access token and imports profile data
 *
 * Flow:
 * 1. Validate OAuth response (code, state, errors)
 * 2. Verify CSRF state token
 * 3. Exchange authorization code for access token
 * 4. Fetch profile data from LinkedIn API
 * 5. Import data to Firestore
 * 6. Redirect user back to app
 */
exports.linkedInCallback = onRequest(
  {
    secrets: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
    cors: true,
    timeoutSeconds: 60
  },
  async (req, res) => {
    let userId = null;

    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors from LinkedIn (user denied access, etc.)
      if (error) {
        console.error('LinkedIn OAuth error:', {
          error,
          description: error_description,
          query: req.query
        });
        return redirectWithError(res, error === 'user_cancelled_authorize' ? 'user_cancelled' : 'oauth_error');
      }

      // Validate required parameters
      if (!code || !state) {
        console.error('Missing required OAuth parameters:', { code: !!code, state: !!state });
        return redirectWithError(res, 'missing_parameters');
      }

      // Verify state token to prevent CSRF attacks
      const stateDoc = await admin.firestore().collection('_oauth_states').doc(state).get();
      if (!stateDoc.exists) {
        console.error('Invalid or already-used state token:', state.substring(0, 20));
        return redirectWithError(res, 'invalid_state');
      }

      const stateData = stateDoc.data();
      userId = stateData.userId;

      // Delete used state token (one-time use)
      await stateDoc.ref.delete().catch(err => {
        console.warn('Failed to delete state token:', err);
      });

      // Check if state has expired (10 minute window)
      if (stateData.expiresAt.toDate() < new Date()) {
        console.error('Expired state token for user:', userId);
        return redirectWithError(res, 'expired_state');
      }

      console.log(`Processing LinkedIn callback for user ${userId}`);

      // Exchange authorization code for access token
      const tokenData = await exchangeCodeForToken(code, req);
      if (!tokenData || !tokenData.access_token) {
        console.error('Token exchange failed for user:', userId);
        return redirectWithError(res, 'token_exchange_failed');
      }

      console.log(`Access token obtained for user ${userId}, expires in ${tokenData.expires_in} seconds`);

      // Fetch LinkedIn profile data using access token
      const profileData = await fetchLinkedInProfile(tokenData.access_token);
      if (!profileData) {
        console.error('Profile fetch failed for user:', userId);
        return redirectWithError(res, 'profile_fetch_failed');
      }

      // Import data to Firestore
      await importProfileToFirestore(userId, profileData);

      console.log(`Successfully imported LinkedIn data for user ${userId}`);

      // Redirect to success page in the app
      return redirectWithSuccess(res);

    } catch (error) {
      console.error('LinkedIn callback error:', {
        userId,
        error: error.message,
        stack: error.stack,
        code: error.code
      });
      return redirectWithError(res, 'internal_error');
    }
  }
);

/**
 * Exchange authorization code for access token
 * Uses LinkedIn's OAuth 2.0 token endpoint
 *
 * @param {string} code - Authorization code from LinkedIn
 * @param {Object} req - HTTP request object (unused but kept for consistency)
 * @returns {Object|null} Token data with access_token, expires_in, etc.
 */
async function exchangeCodeForToken(code, req) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn credentials not configured in environment');
  }

  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const functionUrl = process.env.FUNCTION_URL ||
    `https://us-central1-${projectId}.cloudfunctions.net/linkedInCallback`;

  const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
  const tokenParams = {
    grant_type: 'authorization_code',
    code: code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: functionUrl
  };

  console.log('Exchanging authorization code for access token', {
    tokenUrl,
    redirectUri: functionUrl
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(tokenParams).toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { error: errorText };
      }

      console.error('Token exchange failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorJson
      });

      return null;
    }

    const tokenData = await response.json();
    console.log('Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      expiresIn: tokenData.expires_in,
      tokenType: tokenData.token_type
    });

    return tokenData;
  } catch (error) {
    console.error('Error during token exchange:', {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Fetch LinkedIn profile data using OpenID Connect and LinkedIn API v2
 *
 * API Limitations:
 * - Standard OAuth (openid, profile, email) provides: name, email, picture, locale
 * - Work experience, education, skills require r_member_social (Partner API access)
 * - See: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
 *
 * @param {string} accessToken - LinkedIn OAuth access token
 * @returns {Object|null} Profile data object with userInfo, profileDetails, limitedAccess flag
 */
async function fetchLinkedInProfile(accessToken) {
  console.log('Fetching LinkedIn profile data');

  try {
    // Primary endpoint: OpenID Connect UserInfo (most reliable)
    // Returns: sub, name, given_name, family_name, picture, locale, email, email_verified
    const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('Failed to fetch LinkedIn userinfo:', {
        status: userInfoResponse.status,
        statusText: userInfoResponse.statusText,
        error: errorText
      });
      return null;
    }

    const userInfo = await userInfoResponse.json();
    console.log('UserInfo fetched successfully:', {
      hasSub: !!userInfo.sub,
      hasName: !!userInfo.name,
      hasEmail: !!userInfo.email,
      hasGivenName: !!userInfo.given_name,
      hasFamilyName: !!userInfo.family_name
    });

    // Secondary endpoint: LinkedIn Profile API v2 (may provide additional data)
    // This may fail if user hasn't granted sufficient permissions
    let profileDetails = null;
    try {
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (profileResponse.ok) {
        profileDetails = await profileResponse.json();
        console.log('Extended profile details fetched:', {
          hasId: !!profileDetails.id,
          hasLocalizedFirstName: !!profileDetails.localizedFirstName,
          hasLocalizedLastName: !!profileDetails.localizedLastName
        });
      } else {
        console.warn('Extended profile fetch failed (expected for standard OAuth):', {
          status: profileResponse.status
        });
      }
    } catch (error) {
      console.warn('Could not fetch extended profile details:', error.message);
    }

    // IMPORTANT: LinkedIn API restrictions
    // Work experience, education, and skills require Partner API access (r_member_social scope)
    // This is NOT available to standard OAuth applications
    // Users will need to manually enter this data or upload a resume

    return {
      userInfo,
      profileDetails,
      limitedAccess: true, // Always true for non-partner applications
      importedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error fetching LinkedIn profile:', {
      message: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Import LinkedIn profile data to Firestore
 * Maps LinkedIn OpenID Connect data to our user profile schema
 *
 * Data mapping:
 * - LinkedIn userInfo.given_name → Firestore firstName
 * - LinkedIn userInfo.family_name → Firestore lastName
 * - LinkedIn userInfo.email → Firestore email
 * - LinkedIn userInfo.picture → Firestore profileImageUrl
 * - LinkedIn userInfo.sub → Used to construct LinkedIn profile URL
 *
 * @param {string} userId - Firebase Auth user ID
 * @param {Object} linkedInData - Profile data from LinkedIn API
 */
async function importProfileToFirestore(userId, linkedInData) {
  const { userInfo, profileDetails, limitedAccess, importedAt } = linkedInData;

  console.log(`Importing LinkedIn data to Firestore for user ${userId}`);

  try {
    const userRef = admin.firestore().collection('users').doc(userId);

    // Check if user document exists
    const userDoc = await userRef.get();
    const userExists = userDoc.exists;

    // Build profile update object
    const profileUpdate = {
      linkedInImported: true,
      linkedInImportedAt: admin.firestore.FieldValue.serverTimestamp(),
      linkedInLimitedAccess: limitedAccess || true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Map LinkedIn fields to our schema
    // Only update fields if they have values
    if (userInfo.given_name) {
      profileUpdate.firstName = userInfo.given_name;
    }

    if (userInfo.family_name) {
      profileUpdate.lastName = userInfo.family_name;
    }

    if (userInfo.email) {
      profileUpdate.email = userInfo.email;
    }

    if (userInfo.picture) {
      profileUpdate.profileImageUrl = userInfo.picture;
    }

    // Construct LinkedIn profile URL from sub (user ID)
    // Note: LinkedIn sub is in format "urn:li:person:ABC123" or just the profile ID
    if (userInfo.sub) {
      // Extract profile ID from URN if present
      const profileId = userInfo.sub.includes(':')
        ? userInfo.sub.split(':').pop()
        : userInfo.sub;
      profileUpdate.linkedInUrl = `https://www.linkedin.com/in/${profileId}`;
    }

    // LinkedIn headline from v2 API (if available)
    if (profileDetails?.localizedHeadline) {
      profileUpdate.headline = profileDetails.localizedHeadline;
    }

    // Locale information (useful for internationalization)
    if (userInfo.locale) {
      profileUpdate.locale = userInfo.locale;
    }

    // Use set with merge to create or update the document
    await userRef.set(profileUpdate, { merge: true });

    console.log(`Profile updated successfully for user ${userId}:`, {
      firstName: !!profileUpdate.firstName,
      lastName: !!profileUpdate.lastName,
      email: !!profileUpdate.email,
      hasProfileImage: !!profileUpdate.profileImageUrl,
      hasLinkedInUrl: !!profileUpdate.linkedInUrl
    });

    // Create a notification for the user about limited data import
    if (limitedAccess) {
      const notificationRef = userRef.collection('notifications').doc();
      await notificationRef.set({
        type: 'linkedin_import_limited',
        title: 'LinkedIn Import Completed',
        message: 'Basic profile information has been imported from LinkedIn. To add work experience, education, and skills, please enter them manually in your profile or upload your resume.',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        actionUrl: '/profile/edit',
        actionText: 'Complete Profile'
      });

      console.log(`Created limited access notification for user ${userId}`);
    }

  } catch (error) {
    console.error('Error importing profile to Firestore:', {
      userId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Redirect user to success page in the app after LinkedIn import
 *
 * @param {Object} res - HTTP response object
 */
function redirectWithSuccess(res) {
  // Get app URL from environment or use default
  // For local development, set: firebase functions:config:set app.url="http://localhost:5173"
  const appUrl = process.env.APP_URL ||
    process.env.FIREBASE_CONFIG?.appUrl ||
    'https://ai-career-os-139db.web.app';

  const redirectUrl = `${appUrl}/profile?linkedin=success`;
  console.log(`Redirecting to success page: ${redirectUrl}`);

  // 302 temporary redirect
  res.redirect(302, redirectUrl);
}

/**
 * Redirect user to error page in the app with error code
 *
 * Error codes:
 * - user_cancelled: User cancelled the OAuth flow
 * - oauth_error: LinkedIn returned an OAuth error
 * - missing_parameters: Missing code or state parameters
 * - invalid_state: State token validation failed
 * - expired_state: State token has expired
 * - token_exchange_failed: Failed to exchange code for access token
 * - profile_fetch_failed: Failed to fetch profile from LinkedIn
 * - internal_error: Unexpected server error
 *
 * @param {Object} res - HTTP response object
 * @param {string} errorCode - Error code to display to user
 */
function redirectWithError(res, errorCode) {
  const appUrl = process.env.APP_URL ||
    process.env.FIREBASE_CONFIG?.appUrl ||
    'https://ai-career-os-139db.web.app';

  const redirectUrl = `${appUrl}/profile?linkedin=error&error=${encodeURIComponent(errorCode)}`;
  console.log(`Redirecting to error page: ${redirectUrl}`);

  // 302 temporary redirect
  res.redirect(302, redirectUrl);
}

// =============================================================================
// Export Application Functions
// =============================================================================

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

// =============================================================================
// Email Sending Function
// =============================================================================

const sgMail = require('@sendgrid/mail');

/**
 * Rate limiting configuration: max 10 emails per hour per user
 */
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_MAX_EMAILS = 10;

/**
 * Validates email address format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Checks if user has exceeded rate limit
 */
async function checkRateLimit(userId) {
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Query recent emails sent by this user
  const recentEmailsSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('emails')
    .where('sentAt', '>=', new Date(windowStart))
    .get();

  const emailCount = recentEmailsSnapshot.size;
  const remaining = Math.max(0, RATE_LIMIT_MAX_EMAILS - emailCount);
  const allowed = emailCount < RATE_LIMIT_MAX_EMAILS;

  return { allowed, remaining };
}

/**
 * Sanitizes HTML content to prevent XSS
 */
function sanitizeHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Converts plain text to HTML with paragraph breaks
 */
function textToHtml(text) {
  if (!text) return '';
  return text
    .split('\n\n')
    .map(paragraph => `<p style="margin-bottom: 1em;">${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Formats resume data as HTML
 */
function formatResumeAsHtml(resume) {
  let html = '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">';

  // Summary
  if (resume.summary) {
    html += `<div style="margin-bottom: 20px;">
      <h3 style="color: #2563eb; margin-bottom: 8px;">Professional Summary</h3>
      <p style="margin: 0;">${sanitizeHtml(resume.summary)}</p>
    </div>`;
  }

  // Experience
  if (resume.experience && resume.experience.length > 0) {
    html += '<div style="margin-bottom: 20px;"><h3 style="color: #2563eb; margin-bottom: 8px;">Experience</h3>';
    resume.experience.forEach(exp => {
      html += `<div style="margin-bottom: 16px;">
        <div style="font-weight: bold; font-size: 16px;">${sanitizeHtml(exp.title)}</div>
        <div style="color: #666; margin-bottom: 4px;">${sanitizeHtml(exp.company)} | ${sanitizeHtml(exp.location)}</div>
        <div style="color: #666; font-size: 14px; margin-bottom: 8px;">${sanitizeHtml(exp.startDate)} - ${sanitizeHtml(exp.endDate)}</div>
        <ul style="margin: 0; padding-left: 20px;">
          ${exp.bullets.map(bullet => `<li style="margin-bottom: 4px;">${sanitizeHtml(bullet)}</li>`).join('')}
        </ul>
      </div>`;
    });
    html += '</div>';
  }

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    html += `<div style="margin-bottom: 20px;">
      <h3 style="color: #2563eb; margin-bottom: 8px;">Skills</h3>
      <p style="margin: 0;">${resume.skills.map(s => sanitizeHtml(s)).join(' • ')}</p>
    </div>`;
  }

  // Education
  if (resume.education && resume.education.length > 0) {
    html += '<div style="margin-bottom: 20px;"><h3 style="color: #2563eb; margin-bottom: 8px;">Education</h3>';
    resume.education.forEach(edu => {
      html += `<div style="margin-bottom: 12px;">
        <div style="font-weight: bold;">${sanitizeHtml(edu.degree)}</div>
        <div style="color: #666;">${sanitizeHtml(edu.school)} | ${sanitizeHtml(edu.location)}</div>
        <div style="color: #666; font-size: 14px;">${sanitizeHtml(edu.graduation)}</div>
        ${edu.focus ? `<div style="font-size: 14px; margin-top: 4px;">Focus: ${sanitizeHtml(edu.focus)}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/**
 * Cloud Function to send job application email
 *
 * Security features:
 * - Validates email addresses
 * - Rate limiting (10 emails/hour per user)
 * - Input sanitization
 * - Firestore email history tracking
 * - Authentication required
 *
 * @param {Object} data - Request data
 * @param {string} data.applicationId - The application ID to send
 * @param {string} data.recipientEmail - Recipient email address (default: carl.f.frank@gmail.com)
 * @returns {Object} { success: boolean, emailId: string, message: string }
 */
exports.sendApplicationEmail = onCall(
  {
    secrets: ['SENDGRID_API_KEY'],
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (request) => {
    const data = request.data;

    // Ensure user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to send emails'
      );
    }

    // Initialize SendGrid with API key from environment
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    if (!SENDGRID_API_KEY) {
      throw new HttpsError(
        'failed-precondition',
        'SendGrid API key is not configured. Please contact support.'
      );
    }
    sgMail.setApiKey(SENDGRID_API_KEY);

    const userId = request.auth.uid;
    const { applicationId, recipientEmail = 'carl.f.frank@gmail.com' } = data;

    try {
      // Validate required fields
      if (!applicationId) {
        throw new HttpsError(
          'invalid-argument',
          'Missing required field: applicationId'
        );
      }

      // Validate email address
      if (!isValidEmail(recipientEmail)) {
        throw new HttpsError(
          'invalid-argument',
          'Invalid recipient email address format'
        );
      }

      // Check rate limiting
      const rateLimit = await checkRateLimit(userId);
      if (!rateLimit.allowed) {
        throw new HttpsError(
          'resource-exhausted',
          `Rate limit exceeded. You can send ${RATE_LIMIT_MAX_EMAILS} emails per hour. Please try again later.`
        );
      }

      const db = admin.firestore();

      // Fetch application data
      const applicationRef = db.collection('users').doc(userId).collection('applications').doc(applicationId);
      const applicationDoc = await applicationRef.get();

      if (!applicationDoc.exists) {
        throw new HttpsError(
          'not-found',
          'Application not found'
        );
      }

      const application = applicationDoc.data();
      if (!application) {
        throw new HttpsError(
          'internal',
          'Failed to load application data'
        );
      }

      // Get selected variant
      const selectedVariant = application.variants.find(v => v.id === application.selectedVariantId) || application.variants[0];
      if (!selectedVariant) {
        throw new HttpsError(
          'internal',
          'No application variant found'
        );
      }

      // Get user profile for "from" email
      const userDoc = await db.collection('users').doc(userId).get();
      const userProfile = userDoc.data();
      const fromEmail = userProfile?.email || request.auth.token.email || 'noreply@jobmatch-ai.com';
      const fromName = userProfile?.fullName || request.auth.token.name || 'JobMatch AI User';

      // Create email subject
      const subject = `Application for ${application.jobTitle} at ${application.company}`;

      // Create email body with cover letter and resume
      const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

    <!-- Cover Letter -->
    <div style="margin-bottom: 40px;">
      <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Cover Letter</h2>
      ${textToHtml(selectedVariant.coverLetter)}
    </div>

    <!-- Resume -->
    <div style="margin-bottom: 40px;">
      <h2 style="color: #1f2937; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">Resume</h2>
      ${formatResumeAsHtml(selectedVariant.resume)}
    </div>

    <!-- Signature -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
      <p style="margin: 0 0 12px 0; font-weight: bold; font-size: 16px;">${sanitizeHtml(fromName)}</p>
      <p style="margin: 0 0 4px 0; color: #6b7280;">Email: ${sanitizeHtml(fromEmail)}</p>
      ${userProfile?.phone ? `<p style="margin: 0 0 4px 0; color: #6b7280;">Phone: ${sanitizeHtml(userProfile.phone)}</p>` : ''}
      ${userProfile?.linkedinUrl ? `<p style="margin: 0 0 4px 0;"><a href="${sanitizeHtml(userProfile.linkedinUrl)}" style="color: #2563eb; text-decoration: none;">LinkedIn Profile</a></p>` : ''}
    </div>

  </div>

  <!-- Footer -->
  <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
    <p style="margin: 0;">Sent via JobMatch AI - Application Tracking System</p>
  </div>
</body>
</html>
      `.trim();

      // Plain text version
      const textBody = `
Cover Letter:

${selectedVariant.coverLetter}

---

Resume:

${selectedVariant.resume.summary}

Experience:
${selectedVariant.resume.experience.map(exp =>
  `${exp.title} at ${exp.company}\n${exp.startDate} - ${exp.endDate}\n${exp.bullets.join('\n')}`
).join('\n\n')}

Skills: ${selectedVariant.resume.skills.join(', ')}

Education:
${selectedVariant.resume.education.map(edu =>
  `${edu.degree} - ${edu.school} (${edu.graduation})`
).join('\n')}

---

${fromName}
${fromEmail}
${userProfile?.phone || ''}
${userProfile?.linkedinUrl || ''}
      `.trim();

      // Send email via SendGrid
      const msg = {
        to: recipientEmail,
        from: {
          email: 'carl.f.frank@gmail.com', // Must be verified SendGrid sender
          name: fromName,
        },
        replyTo: fromEmail,
        subject: subject,
        text: textBody,
        html: htmlBody,
        trackingSettings: {
          clickTracking: {
            enable: true,
          },
          openTracking: {
            enable: true,
          },
        },
        customArgs: {
          applicationId: applicationId,
          userId: userId,
        },
      };

      await sgMail.send(msg);

      // Create email history record
      const emailHistoryRef = db
        .collection('users')
        .doc(userId)
        .collection('applications')
        .doc(applicationId)
        .collection('emails')
        .doc();

      const emailHistory = {
        id: emailHistoryRef.id,
        recipientEmail,
        subject,
        body: selectedVariant.coverLetter,
        includeResume: true,
        includeCoverLetter: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        fromEmail,
        fromName,
      };

      await emailHistoryRef.set(emailHistory);

      // Also store in user's top-level emails collection for rate limiting
      await db
        .collection('users')
        .doc(userId)
        .collection('emails')
        .doc(emailHistoryRef.id)
        .set({
          applicationId,
          recipientEmail,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Update application with last email sent timestamp
      await applicationRef.update({
        lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('Email sent successfully', {
        userId,
        applicationId,
        emailId: emailHistoryRef.id,
        recipientEmail,
      });

      return {
        success: true,
        emailId: emailHistoryRef.id,
        message: 'Email sent successfully',
      };
    } catch (error) {
      console.error('Error sending email', {
        userId,
        applicationId,
        error: error.message,
        stack: error.stack,
      });

      // Handle SendGrid-specific errors
      if (error.code >= 400 && error.code < 500) {
        throw new HttpsError(
          'invalid-argument',
          `SendGrid error: ${error.message}`
        );
      }

      // Re-throw if already a functions error
      if (error instanceof HttpsError) {
        throw error;
      }

      // Generic error
      throw new HttpsError(
        'internal',
        `Failed to send email: ${error.message}`
      );
    }
  }
);
