/**
 * Search Query Builder for LinkedIn and Indeed
 *
 * Converts user preferences and profile data into optimized search queries
 * for LinkedIn and Indeed job platforms via Apify actors.
 */

// =============================================================================
// LinkedIn Query Builder
// =============================================================================

/**
 * Build LinkedIn search parameters from user preferences
 *
 * @param {Object} userProfile - User profile data
 * @param {Object} jobPreferences - User's job search preferences
 * @param {Array} skills - User's skills
 * @param {number} maxResults - Maximum number of results to fetch
 * @returns {Object} LinkedIn Apify actor input parameters
 */
function buildLinkedInQuery(userProfile, jobPreferences, skills = [], maxResults = 20) {
  const input = {
    maxItems: maxResults,
    location: buildLocationQuery(userProfile, jobPreferences),
    keywords: buildKeywords(jobPreferences, skills),
  };

  // Add job type filters
  if (jobPreferences.employmentTypes && jobPreferences.employmentTypes.length > 0) {
    input.jobType = mapEmploymentTypesToLinkedIn(jobPreferences.employmentTypes);
  }

  // Add experience level filter
  if (jobPreferences.experienceLevel) {
    input.experienceLevel = mapExperienceLevelToLinkedIn(jobPreferences.experienceLevel);
  }

  // Add remote work filter
  if (jobPreferences.remotePreference && jobPreferences.remotePreference !== 'any') {
    input.remoteFilter = mapRemotePreferenceToLinkedIn(jobPreferences.remotePreference);
  }

  // Add date posted filter (for automated searches, focus on recent jobs)
  input.datePosted = 'past-week'; // Can be: 'past-24-hours', 'past-week', 'past-month'

  return input;
}

/**
 * Build Indeed search parameters from user preferences
 *
 * @param {Object} userProfile - User profile data
 * @param {Object} jobPreferences - User's job search preferences
 * @param {Array} skills - User's skills
 * @param {number} maxResults - Maximum number of results to fetch
 * @returns {Object} Indeed Apify actor input parameters
 */
function buildIndeedQuery(userProfile, jobPreferences, skills = [], maxResults = 20) {
  const input = {
    maxItems: maxResults,
    location: buildLocationQuery(userProfile, jobPreferences),
    position: buildKeywords(jobPreferences, skills),
  };

  // Add salary filter
  if (jobPreferences.salaryMin) {
    input.salaryMin = jobPreferences.salaryMin;
  }

  // Add job type filter
  if (jobPreferences.employmentTypes && jobPreferences.employmentTypes.length > 0) {
    input.jobType = mapEmploymentTypesToIndeed(jobPreferences.employmentTypes);
  }

  // Add remote work filter
  if (jobPreferences.remotePreference && jobPreferences.remotePreference !== 'any') {
    input.remoteOnly = jobPreferences.remotePreference === 'remote';
  }

  // Indeed-specific: search radius (in miles)
  input.radius = 50; // Default 50 miles

  // Date posted filter
  input.fromage = 7; // Jobs from last 7 days

  return input;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build location query from user profile and preferences
 */
function buildLocationQuery(userProfile, jobPreferences) {
  // Priority order:
  // 1. Preferred locations from jobPreferences
  // 2. User's current location
  // 3. Default to "United States"

  if (jobPreferences.locations && jobPreferences.locations.length > 0) {
    // Use first preferred location
    return jobPreferences.locations[0];
  }

  if (userProfile.location) {
    return userProfile.location;
  }

  return 'United States';
}

/**
 * Build keyword query from desired roles and skills
 */
function buildKeywords(jobPreferences, skills = []) {
  const keywords = [];

  // Add desired roles (highest priority)
  if (jobPreferences.desiredRoles && jobPreferences.desiredRoles.length > 0) {
    keywords.push(...jobPreferences.desiredRoles);
  }

  // Add top skills if no roles specified
  if (keywords.length === 0 && skills.length > 0) {
    // Sort by endorsements and take top 3
    const topSkills = skills
      .sort((a, b) => (b.endorsements || 0) - (a.endorsements || 0))
      .slice(0, 3)
      .map(s => s.name);

    keywords.push(...topSkills);
  }

  // If still no keywords, use a generic search
  if (keywords.length === 0) {
    return 'Software Engineer'; // Fallback
  }

  // Join with OR for broader search
  return keywords.join(' OR ');
}

/**
 * Map employment types to LinkedIn format
 */
function mapEmploymentTypesToLinkedIn(types) {
  const mapping = {
    'full-time': 'F',
    'part-time': 'P',
    'contract': 'C',
    'internship': 'I'
  };

  return types
    .map(type => mapping[type])
    .filter(Boolean)
    .join(',');
}

/**
 * Map employment types to Indeed format
 */
function mapEmploymentTypesToIndeed(types) {
  const mapping = {
    'full-time': 'fulltime',
    'part-time': 'parttime',
    'contract': 'contract',
    'internship': 'internship'
  };

  return types
    .map(type => mapping[type])
    .filter(Boolean)
    .join(',');
}

/**
 * Map experience level to LinkedIn format
 */
function mapExperienceLevelToLinkedIn(level) {
  const mapping = {
    'entry': '2', // Entry level
    'mid': '3',   // Associate
    'senior': '4', // Mid-Senior level
    'executive': '5' // Director/Executive
  };

  return mapping[level] || '3'; // Default to Associate
}

/**
 * Map remote preference to LinkedIn format
 */
function mapRemotePreferenceToLinkedIn(preference) {
  const mapping = {
    'remote': '2',  // Remote
    'hybrid': '3',  // Hybrid
    'on-site': '1'  // On-site
  };

  return mapping[preference] || '';
}

// =============================================================================
// Multi-Location Queries
// =============================================================================

/**
 * Build multiple search queries for users with multiple preferred locations
 * This allows parallel searches across different locations
 */
function buildMultiLocationQueries(userProfile, jobPreferences, skills = [], maxResultsPerLocation = 10) {
  const locations = jobPreferences.locations || [userProfile.location || 'United States'];

  return {
    linkedin: locations.map(location => {
      const query = buildLinkedInQuery(userProfile, jobPreferences, skills, maxResultsPerLocation);
      query.location = location;
      return { location, query };
    }),
    indeed: locations.map(location => {
      const query = buildIndeedQuery(userProfile, jobPreferences, skills, maxResultsPerLocation);
      query.location = location;
      return { location, query };
    })
  };
}

// =============================================================================
// Query Optimization
// =============================================================================

/**
 * Optimize query for specific search scenarios
 */
function optimizeQuery(query, scenario = 'daily') {
  const optimized = { ...query };

  switch (scenario) {
    case 'initial':
      // Initial search after signup - cast a wider net
      optimized.maxItems = Math.min(optimized.maxItems * 2, 50);
      optimized.datePosted = 'past-month';
      optimized.fromage = 30;
      break;

    case 'daily':
      // Daily automated search - focus on new jobs
      optimized.datePosted = 'past-24-hours';
      optimized.fromage = 1;
      break;

    case 'weekly':
      // Weekly search - past week
      optimized.datePosted = 'past-week';
      optimized.fromage = 7;
      break;

    case 'manual':
      // User-initiated search - keep as-is
      break;
  }

  return optimized;
}

/**
 * Validate search query parameters
 */
function validateQuery(query, platform) {
  const errors = [];

  if (!query.maxItems || query.maxItems < 1) {
    errors.push('maxItems must be at least 1');
  }

  if (query.maxItems > 100) {
    errors.push('maxItems cannot exceed 100');
  }

  if (platform === 'linkedin') {
    if (!query.keywords || query.keywords.trim().length === 0) {
      errors.push('keywords are required for LinkedIn search');
    }
  }

  if (platform === 'indeed') {
    if (!query.position || query.position.trim().length === 0) {
      errors.push('position is required for Indeed search');
    }
  }

  if (!query.location || query.location.trim().length === 0) {
    errors.push('location is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// =============================================================================
// Search History & Deduplication
// =============================================================================

/**
 * Build query fingerprint for deduplication
 * Helps identify if the same search was recently performed
 */
function buildQueryFingerprint(query, platform) {
  const key = platform === 'linkedin'
    ? `${query.keywords}|${query.location}|${query.jobType || ''}|${query.experienceLevel || ''}`
    : `${query.position}|${query.location}|${query.jobType || ''}|${query.salaryMin || ''}`;

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `${platform}_${Math.abs(hash).toString(36)}`;
}

/**
 * Check if a similar search was recently performed
 */
async function checkRecentSearch(db, userId, fingerprint, withinHours = 24) {
  const cutoffTime = new Date(Date.now() - withinHours * 60 * 60 * 1000);

  const recentSearches = await db
    .collection('users')
    .doc(userId)
    .collection('jobSearches')
    .where('fingerprint', '==', fingerprint)
    .where('createdAt', '>', cutoffTime)
    .limit(1)
    .get();

  return !recentSearches.empty;
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  buildLinkedInQuery,
  buildIndeedQuery,
  buildMultiLocationQueries,
  optimizeQuery,
  validateQuery,
  buildQueryFingerprint,
  checkRecentSearch
};
