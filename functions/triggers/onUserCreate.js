/**
 * User Creation Trigger - Initial Job Search
 *
 * Firestore trigger that runs when a new user is created.
 * Waits for profile completion, then performs initial job search.
 *
 * Trigger: users/{userId} onCreate
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { ApifyClient } = require('apify-client');
const { buildLinkedInQuery, buildIndeedQuery, optimizeQuery } = require('../lib/buildSearchQuery');
const { batchCalculateMatches } = require('../lib/matchingEngine');
const { sendHighMatchNotification } = require('../lib/notificationService');

// =============================================================================
// Configuration
// =============================================================================

const INITIAL_SEARCH_MAX_JOBS = 30; // More jobs for initial search
const HIGH_MATCH_THRESHOLD = 80;

// =============================================================================
// Helper Functions (duplicated from scheduled function)
// =============================================================================

function getApifyClient() {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN environment variable is not set');
  }
  return new ApifyClient({ token: apiToken });
}

function parseSalary(salaryStr) {
  if (!salaryStr) return { min: 0, max: 0 };
  const cleanStr = salaryStr.replace(/[,$]/g, '').toLowerCase();
  const rangeMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*k?\s*[-–to]\s*(\d+(?:\.\d+)?)\s*k?/);

  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]) * (rangeMatch[1].includes('.') ? 1 : 1000);
    const max = parseFloat(rangeMatch[2]) * (rangeMatch[2].includes('.') ? 1 : 1000);
    return { min, max };
  }

  const singleMatch = cleanStr.match(/(\d+(?:\.\d+)?)\s*k?/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]) * (singleMatch[1].includes('.') ? 1 : 1000);
    return { min: value, max: value };
  }

  return { min: 0, max: 0 };
}

function normalizeWorkArrangement(arrangement) {
  if (!arrangement) return 'Unknown';
  const lower = arrangement.toLowerCase();
  if (lower.includes('remote')) return 'Remote';
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('office')) return 'On-site';
  return 'Unknown';
}

function extractRequiredSkills(description) {
  if (!description) return [];

  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Go', 'Rust',
    'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring', 'ASP.NET',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
    'Git', 'CI/CD', 'Agile', 'Scrum', 'REST', 'GraphQL', 'Microservices'
  ];

  const found = [];
  const lowerDesc = description.toLowerCase();

  commonSkills.forEach(skill => {
    if (lowerDesc.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  });

  return found.slice(0, 10);
}

function normalizeJob(job, source) {
  const salary = parseSalary(job.salary);

  return {
    title: job.title || '',
    company: job.company || '',
    companyLogo: job.companyLogo || '',
    location: job.location || '',
    workArrangement: normalizeWorkArrangement(job.workArrangement),
    salaryMin: salary.min,
    salaryMax: salary.max,
    postedDate: job.postedDate || new Date().toISOString(),
    description: job.description || '',
    url: job.url || '',
    source,
    experienceLevel: job.experienceLevel,
    requiredSkills: extractRequiredSkills(job.description),
    scrapedAt: admin.firestore.Timestamp.now(),
    isSaved: false
  };
}

async function scrapeLinkedIn(query) {
  const client = getApifyClient();
  const actorId = 'bebity/linkedin-jobs-scraper';

  try {
    const run = await client.actor(actorId).call(query, { timeout: 180 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    return items.map(item => normalizeJob({
      title: String(item.title || ''),
      company: String(item.company || ''),
      location: String(item.location || ''),
      description: String(item.description || ''),
      salary: item.salary ? String(item.salary) : undefined,
      postedDate: item.postedDate ? String(item.postedDate) : undefined,
      url: String(item.url || ''),
      experienceLevel: item.experienceLevel ? String(item.experienceLevel) : undefined,
      workArrangement: item.workArrangement ? String(item.workArrangement) : undefined
    }, 'linkedin'));
  } catch (error) {
    console.error('LinkedIn scraping error:', error);
    return [];
  }
}

async function scrapeIndeed(query) {
  const client = getApifyClient();
  const actorId = 'misceres/indeed-scraper';

  try {
    const run = await client.actor(actorId).call(query, { timeout: 180 });
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    return items.map(item => normalizeJob({
      title: String(item.title || item.positionName || ''),
      company: String(item.company || item.companyName || ''),
      location: String(item.location || ''),
      description: String(item.description || ''),
      salary: item.salary ? String(item.salary) : undefined,
      postedDate: item.postedAt ? String(item.postedAt) : undefined,
      url: String(item.url || item.link || ''),
      workArrangement: item.workType ? String(item.workType) : undefined
    }, 'indeed'));
  } catch (error) {
    console.error('Indeed scraping error:', error);
    return [];
  }
}

// =============================================================================
// Profile Validation
// =============================================================================

/**
 * Check if user profile is complete enough to perform job search
 */
function isProfileComplete(userData) {
  // Basic required fields
  if (!userData.firstName || !userData.lastName || !userData.email) {
    return false;
  }

  // Must have job preferences
  if (!userData.jobPreferences) {
    return false;
  }

  const prefs = userData.jobPreferences;

  // Must have at least desired roles or location
  if ((!prefs.desiredRoles || prefs.desiredRoles.length === 0) &&
      (!prefs.locations || prefs.locations.length === 0)) {
    return false;
  }

  return true;
}

// =============================================================================
// Initial Job Search
// =============================================================================

/**
 * Perform initial job search for new user
 */
async function performInitialJobSearch(userId, userData) {
  const db = admin.firestore();

  try {
    console.log(`Starting initial job search for user ${userId}...`);

    // Fetch user's skills, work experience, and education
    const [workExpSnap, eduSnap, skillsSnap] = await Promise.all([
      db.collection('users').doc(userId).collection('workExperience').orderBy('startDate', 'desc').get(),
      db.collection('users').doc(userId).collection('education').orderBy('endDate', 'desc').get(),
      db.collection('users').doc(userId).collection('skills').orderBy('endorsements', 'desc').get()
    ]);

    const workExperience = workExpSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const education = eduSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const skills = skillsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Build and optimize queries for initial search
    const linkedInQuery = optimizeQuery(
      buildLinkedInQuery(userData, userData.jobPreferences || {}, skills, INITIAL_SEARCH_MAX_JOBS),
      'initial'
    );
    const indeedQuery = optimizeQuery(
      buildIndeedQuery(userData, userData.jobPreferences || {}, skills, INITIAL_SEARCH_MAX_JOBS),
      'initial'
    );

    // Scrape jobs from both sources
    console.log(`Scraping jobs for user ${userId}...`);
    const [linkedInJobs, indeedJobs] = await Promise.all([
      scrapeLinkedIn(linkedInQuery),
      scrapeIndeed(indeedQuery)
    ]);

    const allJobs = [...linkedInJobs, ...indeedJobs];

    console.log(`Found ${allJobs.length} jobs for user ${userId} (LinkedIn: ${linkedInJobs.length}, Indeed: ${indeedJobs.length})`);

    if (allJobs.length === 0) {
      console.log(`No jobs found for user ${userId}`);

      // Create notification about no jobs found
      await db.collection('users').doc(userId).collection('notifications').add({
        type: 'initial_search_complete',
        title: 'Job Search Complete',
        message: 'We couldn\'t find any jobs matching your preferences yet. Try adjusting your job preferences or check back later.',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, jobCount: 0 };
    }

    // Calculate match scores
    console.log(`Calculating match scores for ${allJobs.length} jobs...`);
    const matches = await batchCalculateMatches(
      allJobs,
      userData,
      workExperience,
      education,
      skills,
      userData.jobPreferences || {},
      {
        enableAI: true,
        concurrency: 5,
        aiThreshold: 70
      }
    );

    // Save jobs to Firestore
    const searchId = db.collection('_').doc().id;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    const batch = db.batch();
    const highMatchJobs = [];

    // Create search metadata
    const searchRef = db
      .collection('users')
      .doc(userId)
      .collection('jobSearches')
      .doc(searchId);

    batch.set(searchRef, {
      type: 'initial',
      createdAt: timestamp,
      jobCount: allJobs.length,
      source: 'user_signup'
    });

    // Save jobs with match scores
    matches.forEach((match, index) => {
      const job = allJobs[index];
      const jobId = `${searchId}_${index}_${Date.now()}`;

      const jobData = {
        ...job,
        id: jobId,
        matchScore: match.matchScore,
        algorithmicScore: match.algorithmicScore,
        aiScore: match.aiScore,
        breakdown: match.breakdown,
        aiInsights: match.aiInsights,
        requiredSkills: match.requiredSkills,
        missingSkills: match.missingSkills,
        recommendations: match.recommendations,
        searchId,
        addedAt: timestamp
      };

      // Save to jobs collection
      const jobRef = db.collection('users').doc(userId).collection('jobs').doc(jobId);
      batch.set(jobRef, jobData);

      // Also save to search history
      const searchJobRef = searchRef.collection('jobs').doc(jobId);
      batch.set(searchJobRef, jobData);

      // Track high matches
      if (match.matchScore >= HIGH_MATCH_THRESHOLD) {
        highMatchJobs.push({ ...jobData, id: jobId });
      }
    });

    // Update user's last search time
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      'searchSettings.lastSearchAt': timestamp
    });

    // Add welcome notification
    const notificationRef = db.collection('users').doc(userId).collection('notifications').doc();
    batch.set(notificationRef, {
      type: 'initial_search_complete',
      title: 'Welcome to JobMatch AI!',
      message: `We found ${allJobs.length} jobs matching your profile. ${highMatchJobs.length} are excellent matches!`,
      read: false,
      createdAt: timestamp
    });

    await batch.commit();

    console.log(`Saved ${allJobs.length} jobs for user ${userId} (${highMatchJobs.length} high matches)`);

    // Send notification for top match if exists
    if (highMatchJobs.length > 0) {
      const topMatch = highMatchJobs.sort((a, b) => b.matchScore - a.matchScore)[0];
      await sendHighMatchNotification(userId, topMatch, {
        matchScore: topMatch.matchScore,
        breakdown: topMatch.breakdown
      });
    }

    return {
      success: true,
      jobCount: allJobs.length,
      highMatchCount: highMatchJobs.length
    };

  } catch (error) {
    console.error(`Error performing initial job search for user ${userId}:`, error);
    throw error;
  }
}

// =============================================================================
// Firestore Trigger
// =============================================================================

/**
 * Trigger function that runs when a new user document is created
 */
exports.onUserCreate = onDocumentCreated(
  {
    document: 'users/{userId}',
    timeoutSeconds: 540, // 9 minutes
    memory: '1GiB',
    secrets: ['OPENAI_API_KEY', 'APIFY_API_TOKEN', 'SENDGRID_API_KEY']
  },
  async (event) => {
    const userId = event.params.userId;
    const userData = event.data.data();

    console.log(`User created: ${userId}`);

    // Check if profile is complete
    if (!isProfileComplete(userData)) {
      console.log(`User ${userId} profile incomplete, skipping initial job search`);
      return { success: false, reason: 'profile_incomplete' };
    }

    // Check if auto-search is enabled
    const autoSearchEnabled = userData.searchSettings?.autoSearchEnabled;
    if (autoSearchEnabled === false) {
      console.log(`User ${userId} has auto-search disabled, skipping initial job search`);
      return { success: false, reason: 'auto_search_disabled' };
    }

    // Perform initial job search
    try {
      const result = await performInitialJobSearch(userId, userData);
      console.log(`Initial job search completed for user ${userId}:`, result);
      return result;
    } catch (error) {
      console.error(`Error in onUserCreate trigger for user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }
);
