/**
 * Scheduled Job Search for All Users
 *
 * Cloud Scheduler function that runs daily at 2 AM to:
 * 1. Fetch all active users with auto-search enabled
 * 2. Build search queries based on user preferences
 * 3. Scrape jobs from LinkedIn and Indeed
 * 4. Calculate match scores
 * 5. Save results to Firestore
 * 6. Send notifications for high-quality matches
 *
 * Schedule: Daily at 2:00 AM UTC
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { ApifyClient } = require('apify-client');
const { buildLinkedInQuery, buildIndeedQuery, optimizeQuery } = require('../lib/buildSearchQuery');
const { batchCalculateMatches } = require('../lib/matchingEngine');
const { sendHighMatchNotification, sendDailyDigest } = require('../lib/notificationService');

// =============================================================================
// Configuration
// =============================================================================

const BATCH_SIZE = 10; // Process 10 users at a time
const MAX_JOBS_PER_SOURCE = 20; // Max jobs to fetch per source
const HIGH_MATCH_THRESHOLD = 80; // Send immediate notification for matches >= 80%
const DIGEST_MATCH_THRESHOLD = 60; // Include in daily digest for matches >= 60%

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get Apify client
 */
function getApifyClient() {
  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN environment variable is not set');
  }
  return new ApifyClient({ token: apiToken });
}

/**
 * Parse salary string to min/max values
 */
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

/**
 * Normalize work arrangement
 */
function normalizeWorkArrangement(arrangement) {
  if (!arrangement) return 'Unknown';
  const lower = arrangement.toLowerCase();
  if (lower.includes('remote')) return 'Remote';
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('office')) return 'On-site';
  return 'Unknown';
}

/**
 * Extract required skills from job description
 */
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

  return found.slice(0, 10); // Max 10 skills
}

/**
 * Normalize scraped job to our data model
 */
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

/**
 * Scrape jobs from LinkedIn
 */
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

/**
 * Scrape jobs from Indeed
 */
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

/**
 * Scrape jobs for a user
 */
async function scrapeJobsForUser(userId, userProfile, jobPreferences, skills) {
  try {
    // Build queries
    const linkedInQuery = optimizeQuery(
      buildLinkedInQuery(userProfile, jobPreferences, skills, MAX_JOBS_PER_SOURCE),
      'daily'
    );
    const indeedQuery = optimizeQuery(
      buildIndeedQuery(userProfile, jobPreferences, skills, MAX_JOBS_PER_SOURCE),
      'daily'
    );

    // Scrape in parallel
    const [linkedInJobs, indeedJobs] = await Promise.all([
      scrapeLinkedIn(linkedInQuery),
      scrapeIndeed(indeedQuery)
    ]);

    const allJobs = [...linkedInJobs, ...indeedJobs];

    console.log(`Scraped ${allJobs.length} jobs for user ${userId} (LinkedIn: ${linkedInJobs.length}, Indeed: ${indeedJobs.length})`);

    return allJobs;
  } catch (error) {
    console.error(`Error scraping jobs for user ${userId}:`, error);
    return [];
  }
}

/**
 * Calculate matches and save jobs
 */
async function processJobsForUser(userId, jobs, userProfile, workExperience, education, skills, jobPreferences) {
  const db = admin.firestore();

  try {
    // Calculate match scores
    const matches = await batchCalculateMatches(
      jobs,
      userProfile,
      workExperience,
      education,
      skills,
      jobPreferences,
      {
        enableAI: true,
        concurrency: 5,
        aiThreshold: 70 // Only use AI for jobs with algorithmic score >= 70
      }
    );

    // Generate search ID
    const searchId = db.collection('_').doc().id;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // Prepare batch writes
    const batch = db.batch();
    const highMatchJobs = [];
    const digestJobs = [];

    // Create search metadata
    const searchRef = db
      .collection('users')
      .doc(userId)
      .collection('jobSearches')
      .doc(searchId);

    batch.set(searchRef, {
      type: 'automated',
      createdAt: timestamp,
      jobCount: jobs.length,
      source: 'daily_scheduled'
    });

    // Save jobs with match scores
    matches.forEach((match, index) => {
      const job = jobs[index];
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
      const jobRef = db
        .collection('users')
        .doc(userId)
        .collection('jobs')
        .doc(jobId);

      batch.set(jobRef, jobData);

      // Also save to search history
      const searchJobRef = searchRef.collection('jobs').doc(jobId);
      batch.set(searchJobRef, jobData);

      // Categorize for notifications
      if (match.matchScore >= HIGH_MATCH_THRESHOLD) {
        highMatchJobs.push({ ...jobData, id: jobId });
      } else if (match.matchScore >= DIGEST_MATCH_THRESHOLD) {
        digestJobs.push({ ...jobData, id: jobId });
      }
    });

    // Update user's last search time
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      'searchSettings.lastSearchAt': timestamp
    });

    // Commit batch
    await batch.commit();

    console.log(`Saved ${jobs.length} jobs for user ${userId} (High matches: ${highMatchJobs.length}, Digest: ${digestJobs.length})`);

    return {
      jobCount: jobs.length,
      highMatchJobs,
      digestJobs
    };

  } catch (error) {
    console.error(`Error processing jobs for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Send notifications for user's new jobs
 */
async function sendNotificationsForUser(userId, highMatchJobs, digestJobs) {
  const results = {
    highMatchNotifications: 0,
    digestSent: false
  };

  try {
    // Send immediate notifications for high matches
    for (const job of highMatchJobs.slice(0, 3)) { // Max 3 immediate notifications
      const result = await sendHighMatchNotification(userId, job, {
        matchScore: job.matchScore,
        breakdown: job.breakdown
      });

      if (result.success) {
        results.highMatchNotifications++;
      }
    }

    // Send daily digest if there are jobs
    const allJobs = [...highMatchJobs, ...digestJobs]
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10); // Top 10 jobs in digest

    if (allJobs.length > 0) {
      const digestResult = await sendDailyDigest(userId, allJobs);
      results.digestSent = digestResult.success;
    }

    return results;
  } catch (error) {
    console.error(`Error sending notifications for user ${userId}:`, error);
    return results;
  }
}

/**
 * Process a single user
 */
async function processUser(userId) {
  const db = admin.firestore();

  try {
    console.log(`Processing user ${userId}...`);

    // Fetch user data
    const [userDoc, workExpSnap, eduSnap, skillsSnap] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('users').doc(userId).collection('workExperience').orderBy('startDate', 'desc').get(),
      db.collection('users').doc(userId).collection('education').orderBy('endDate', 'desc').get(),
      db.collection('users').doc(userId).collection('skills').orderBy('endorsements', 'desc').get()
    ]);

    if (!userDoc.exists) {
      console.log(`User ${userId} not found, skipping`);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const workExperience = workExpSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const education = eduSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const skills = skillsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Scrape jobs
    const jobs = await scrapeJobsForUser(
      userId,
      userData,
      userData.jobPreferences || {},
      skills
    );

    if (jobs.length === 0) {
      console.log(`No jobs found for user ${userId}`);
      return { success: true, jobCount: 0 };
    }

    // Process jobs (calculate matches and save)
    const { jobCount, highMatchJobs, digestJobs } = await processJobsForUser(
      userId,
      jobs,
      userData,
      workExperience,
      education,
      skills,
      userData.jobPreferences || {}
    );

    // Send notifications
    const notificationResults = await sendNotificationsForUser(
      userId,
      highMatchJobs,
      digestJobs
    );

    return {
      success: true,
      jobCount,
      highMatchCount: highMatchJobs.length,
      digestCount: digestJobs.length,
      ...notificationResults
    };

  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// Main Scheduled Function
// =============================================================================

/**
 * Scheduled function to search jobs for all active users
 * Runs daily at 2:00 AM UTC
 */
exports.searchJobsForAllUsers = onSchedule(
  {
    schedule: '0 2 * * *', // 2 AM daily (cron format)
    timeZone: 'UTC',
    timeoutSeconds: 540, // 9 minutes (max for scheduled functions)
    memory: '1GiB',
    secrets: ['OPENAI_API_KEY', 'APIFY_API_TOKEN', 'SENDGRID_API_KEY']
  },
  async (event) => {
    const db = admin.firestore();

    console.log('Starting daily job search for all users...');

    try {
      // Fetch active users with auto-search enabled
      const usersSnapshot = await db
        .collection('users')
        .where('searchSettings.autoSearchEnabled', '==', true)
        .where('searchSettings.searchFrequency', '==', 'daily')
        .get();

      console.log(`Found ${usersSnapshot.size} active users`);

      if (usersSnapshot.empty) {
        console.log('No active users found');
        return { success: true, userCount: 0 };
      }

      const userIds = usersSnapshot.docs.map(doc => doc.id);
      const results = {
        total: userIds.length,
        successful: 0,
        failed: 0,
        totalJobs: 0,
        totalHighMatches: 0
      };

      // Process users in batches to avoid timeout
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);

        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} users)...`);

        // Process batch in parallel
        const batchResults = await Promise.allSettled(
          batch.map(userId => processUser(userId))
        );

        // Aggregate results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            results.successful++;
            results.totalJobs += result.value.jobCount || 0;
            results.totalHighMatches += result.value.highMatchCount || 0;
          } else {
            results.failed++;
            console.error(`Failed to process user ${batch[index]}:`, result.reason || result.value?.error);
          }
        });

        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < userIds.length) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }
      }

      console.log('Daily job search completed:', results);

      return {
        success: true,
        ...results
      };

    } catch (error) {
      console.error('Error in scheduled job search:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
);
