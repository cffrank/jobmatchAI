/**
 * Search Preferences Service Unit Tests
 *
 * Comprehensive tests for search preferences CRUD operations,
 * blacklist management, source toggling, and error handling.
 *
 * Tests cover:
 * - getUserPreferences() - Fetch preferences with proper null handling
 * - createPreferences() - Create with defaults and validation
 * - updatePreferences() - Partial updates and field mapping
 * - deletePreferences() - Deletion and error handling
 * - addToBlacklist() - Duplicate prevention and validation
 * - removeFromBlacklist() - Removal and error handling
 * - toggleSource() - Enable/disable job sources
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as searchPreferencesService from '../../src/services/searchPreferences.service';
import { HttpError } from '../../src/types';

// =============================================================================
// Mocks
// =============================================================================

// Mock the entire service with spy functionality
const mockSupabaseFrom = vi.fn();

vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const TEST_USER_ID = 'test-user-123';

const MOCK_DB_PREFERENCES = {
  id: 'pref-123',
  user_id: TEST_USER_ID,
  desired_roles: ['Software Engineer', 'Senior Developer'],
  locations: ['San Francisco', 'Remote'],
  salary_min: 100000,
  salary_max: 150000,
  remote_preference: 'remote',
  employment_types: ['full-time', 'contract'],
  experience_level: 'mid',
  industries: ['Technology', 'Finance'],
  company_sizes: ['startup', 'small'],
  company_blacklist: ['BadCorp', 'EvilInc'],
  keyword_blacklist: ['blockchain', 'cryptocurrency'],
  enabled_sources: { linkedin: true, indeed: true },
  search_frequency: 'daily',
  auto_search_enabled: true,
  notification_email: true,
  notification_in_app: false,
  match_score_threshold: 75,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

const EXPECTED_MAPPED_PREFERENCES = {
  id: 'pref-123',
  userId: TEST_USER_ID,
  desiredRoles: ['Software Engineer', 'Senior Developer'],
  locations: ['San Francisco', 'Remote'],
  salaryMin: 100000,
  salaryMax: 150000,
  remotePreference: 'remote',
  employmentTypes: ['full-time', 'contract'],
  experienceLevel: 'mid',
  industries: ['Technology', 'Finance'],
  companySizes: ['startup', 'small'],
  companyBlacklist: ['BadCorp', 'EvilInc'],
  keywordBlacklist: ['blockchain', 'cryptocurrency'],
  enabledSources: { linkedin: true, indeed: true },
  searchFrequency: 'daily',
  autoSearchEnabled: true,
  notificationEmail: true,
  notificationInApp: false,
  matchScoreThreshold: 75,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a mock Supabase query chain for SELECT operations
 */
function mockSelectQuery(data: unknown, error: unknown = null) {
  mockSupabaseFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

/**
 * Create a mock Supabase query chain for INSERT operations
 */
function mockInsertQuery(data: unknown, error: unknown = null) {
  mockSupabaseFrom.mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data, error }),
      }),
    }),
  });
}

/**
 * Create a mock Supabase query chain for UPDATE operations
 */
function mockUpdateQuery(data: unknown, error: unknown = null) {
  mockSupabaseFrom.mockReturnValue({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data, error }),
        }),
      }),
    }),
  });
}

/**
 * Create a mock Supabase query chain for DELETE operations
 */
function mockDeleteQuery(error: unknown = null) {
  mockSupabaseFrom.mockReturnValue({
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error }),
    }),
  });
}

// =============================================================================
// Test Suites
// =============================================================================

describe('Search Preferences Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // getUserPreferences Tests
  // ===========================================================================

  describe('getUserPreferences', () => {
    it('should successfully fetch user preferences', async () => {
      mockSelectQuery(MOCK_DB_PREFERENCES, null);

      const result = await searchPreferencesService.getUserPreferences(TEST_USER_ID);

      expect(result).toEqual(EXPECTED_MAPPED_PREFERENCES);
    });

    it('should return null when user has no preferences (PGRST116)', async () => {
      const notFoundError = { code: 'PGRST116', message: 'Not found' };
      mockSelectQuery(null, notFoundError);

      const result = await searchPreferencesService.getUserPreferences(TEST_USER_ID);

      expect(result).toBeNull();
    });

    it('should throw HttpError on database error', async () => {
      const dbError = { code: 'PGRST500', message: 'Internal server error' };
      mockSelectQuery(null, dbError);

      await expect(
        searchPreferencesService.getUserPreferences(TEST_USER_ID)
      ).rejects.toThrow(HttpError);
    });

    it('should map all database fields to camelCase correctly', async () => {
      mockSelectQuery(MOCK_DB_PREFERENCES, null);

      const result = await searchPreferencesService.getUserPreferences(TEST_USER_ID);

      // Verify all fields are correctly mapped
      expect(result).toHaveProperty('userId', TEST_USER_ID);
      expect(result).toHaveProperty('desiredRoles');
      expect(result).toHaveProperty('remotePreference');
      expect(result).toHaveProperty('employmentTypes');
      expect(result).toHaveProperty('experienceLevel');
      expect(result).toHaveProperty('companySizes');
      expect(result).toHaveProperty('companyBlacklist');
      expect(result).toHaveProperty('keywordBlacklist');
      expect(result).toHaveProperty('enabledSources');
      expect(result).toHaveProperty('searchFrequency');
      expect(result).toHaveProperty('autoSearchEnabled');
      expect(result).toHaveProperty('notificationEmail');
      expect(result).toHaveProperty('notificationInApp');
      expect(result).toHaveProperty('matchScoreThreshold');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should handle empty arrays with default fallbacks', async () => {
      const minimalPrefs = {
        ...MOCK_DB_PREFERENCES,
        desired_roles: undefined,
        locations: undefined,
        company_blacklist: undefined,
        keyword_blacklist: undefined,
      };
      mockSelectQuery(minimalPrefs, null);

      const result = await searchPreferencesService.getUserPreferences(TEST_USER_ID);

      expect(result?.desiredRoles).toEqual([]);
      expect(result?.locations).toEqual([]);
      expect(result?.companyBlacklist).toEqual([]);
      expect(result?.keywordBlacklist).toEqual([]);
    });
  });

  // ===========================================================================
  // createPreferences Tests
  // ===========================================================================

  describe('createPreferences', () => {
    it('should create preferences with default values when no data provided', async () => {
      // Mock getUserPreferences to return null (no existing preferences)
      const notFoundError = { code: 'PGRST116', message: 'Not found' };
      mockSelectQuery(null, notFoundError);

      // Mock insert
      const createdPrefs = { ...MOCK_DB_PREFERENCES, id: 'new-pref-id' };

      // First call is getUserPreferences (SELECT), second is the INSERT
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: notFoundError }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: createdPrefs, error: null }),
            }),
          }),
        });

      const result = await searchPreferencesService.createPreferences(TEST_USER_ID);

      expect(result).toBeDefined();
      expect(result.userId).toBe(TEST_USER_ID);
    });

    it('should throw HttpError 409 if preferences already exist', async () => {
      mockSelectQuery(MOCK_DB_PREFERENCES, null);

      await expect(
        searchPreferencesService.createPreferences(TEST_USER_ID)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError on database insert error', async () => {
      const notFoundError = { code: 'PGRST116', message: 'Not found' };
      const dbError = { code: 'PGRST500', message: 'Insert failed' };

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: notFoundError }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
            }),
          }),
        });

      await expect(
        searchPreferencesService.createPreferences(TEST_USER_ID)
      ).rejects.toThrow(HttpError);
    });
  });

  // ===========================================================================
  // updatePreferences Tests
  // ===========================================================================

  describe('updatePreferences', () => {
    it('should successfully update preferences with partial data', async () => {
      const updateData = {
        salaryMin: 110000,
        autoSearchEnabled: false,
      };

      const updatedPrefs = {
        ...MOCK_DB_PREFERENCES,
        salary_min: updateData.salaryMin,
        auto_search_enabled: updateData.autoSearchEnabled,
      };

      // First call: getUserPreferences (SELECT)
      // Second call: updatePreferences (UPDATE)
      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: MOCK_DB_PREFERENCES, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedPrefs, error: null }),
              }),
            }),
          }),
        });

      const result = await searchPreferencesService.updatePreferences(TEST_USER_ID, updateData);

      expect(result.salaryMin).toBe(updateData.salaryMin);
      expect(result.autoSearchEnabled).toBe(updateData.autoSearchEnabled);
    });

    it('should throw HttpError 404 if preferences do not exist', async () => {
      const notFoundError = { code: 'PGRST116', message: 'Not found' };
      mockSelectQuery(null, notFoundError);

      await expect(
        searchPreferencesService.updatePreferences(TEST_USER_ID, { salaryMin: 100000 })
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError on database update error', async () => {
      const dbError = { code: 'PGRST500', message: 'Update failed' };

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: MOCK_DB_PREFERENCES, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
              }),
            }),
          }),
        });

      await expect(
        searchPreferencesService.updatePreferences(TEST_USER_ID, { salaryMin: 100000 })
      ).rejects.toThrow(HttpError);
    });
  });

  // ===========================================================================
  // deletePreferences Tests
  // ===========================================================================

  describe('deletePreferences', () => {
    it('should successfully delete preferences', async () => {
      mockDeleteQuery(null);

      await expect(
        searchPreferencesService.deletePreferences(TEST_USER_ID)
      ).resolves.toBeUndefined();
    });

    it('should throw HttpError on database delete error', async () => {
      const dbError = { code: 'PGRST500', message: 'Delete failed' };
      mockDeleteQuery(dbError);

      await expect(
        searchPreferencesService.deletePreferences(TEST_USER_ID)
      ).rejects.toThrow(HttpError);
    });

    it('should not throw error if preferences do not exist', async () => {
      mockDeleteQuery(null);

      await expect(
        searchPreferencesService.deletePreferences(TEST_USER_ID)
      ).resolves.toBeUndefined();
    });
  });

  // ===========================================================================
  // addToBlacklist Tests
  // ===========================================================================

  describe('addToBlacklist', () => {
    it('should add company to blacklist', async () => {
      const updatedPrefs = {
        ...MOCK_DB_PREFERENCES,
        company_blacklist: [...MOCK_DB_PREFERENCES.company_blacklist, 'NewBadCorp'],
      };

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: MOCK_DB_PREFERENCES, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedPrefs, error: null }),
              }),
            }),
          }),
        });

      const result = await searchPreferencesService.addToBlacklist(TEST_USER_ID, 'company', 'NewBadCorp');

      expect(result.companyBlacklist).toContain('NewBadCorp');
    });

    it('should not add duplicate to blacklist', async () => {
      mockSelectQuery(MOCK_DB_PREFERENCES, null);

      // Try to add existing company
      const result = await searchPreferencesService.addToBlacklist(TEST_USER_ID, 'company', 'BadCorp');

      // Should return existing preferences without modification
      expect(result.companyBlacklist).toEqual(EXPECTED_MAPPED_PREFERENCES.companyBlacklist);
    });

    it('should throw HttpError 404 if preferences do not exist', async () => {
      const notFoundError = { code: 'PGRST116', message: 'Not found' };
      mockSelectQuery(null, notFoundError);

      await expect(
        searchPreferencesService.addToBlacklist(TEST_USER_ID, 'company', 'BadCorp')
      ).rejects.toThrow(HttpError);
    });
  });

  // ===========================================================================
  // removeFromBlacklist Tests
  // ===========================================================================

  describe('removeFromBlacklist', () => {
    it('should remove company from blacklist', async () => {
      const updatedPrefs = {
        ...MOCK_DB_PREFERENCES,
        company_blacklist: ['EvilInc'], // BadCorp removed
      };

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: MOCK_DB_PREFERENCES, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedPrefs, error: null }),
              }),
            }),
          }),
        });

      const result = await searchPreferencesService.removeFromBlacklist(TEST_USER_ID, 'company', 'BadCorp');

      expect(result.companyBlacklist).not.toContain('BadCorp');
      expect(result.companyBlacklist).toContain('EvilInc');
    });

    it('should throw HttpError 404 if preferences do not exist', async () => {
      const notFoundError = { code: 'PGRST116', message: 'Not found' };
      mockSelectQuery(null, notFoundError);

      await expect(
        searchPreferencesService.removeFromBlacklist(TEST_USER_ID, 'company', 'BadCorp')
      ).rejects.toThrow(HttpError);
    });
  });

  // ===========================================================================
  // toggleSource Tests
  // ===========================================================================

  describe('toggleSource', () => {
    it('should enable a disabled source', async () => {
      const prefsWithLinkedInDisabled = {
        ...MOCK_DB_PREFERENCES,
        enabled_sources: { linkedin: false, indeed: true },
      };

      const updatedPrefs = {
        ...MOCK_DB_PREFERENCES,
        enabled_sources: { linkedin: true, indeed: true },
      };

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: prefsWithLinkedInDisabled, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedPrefs, error: null }),
              }),
            }),
          }),
        });

      const result = await searchPreferencesService.toggleSource(TEST_USER_ID, 'linkedin', true);

      expect(result.enabledSources.linkedin).toBe(true);
      expect(result.enabledSources.indeed).toBe(true);
    });

    it('should disable an enabled source', async () => {
      const updatedPrefs = {
        ...MOCK_DB_PREFERENCES,
        enabled_sources: { linkedin: false, indeed: true },
      };

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: MOCK_DB_PREFERENCES, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedPrefs, error: null }),
              }),
            }),
          }),
        });

      const result = await searchPreferencesService.toggleSource(TEST_USER_ID, 'linkedin', false);

      expect(result.enabledSources.linkedin).toBe(false);
      expect(result.enabledSources.indeed).toBe(true);
    });

    it('should throw HttpError 404 if preferences do not exist', async () => {
      const notFoundError = { code: 'PGRST116', message: 'Not found' };
      mockSelectQuery(null, notFoundError);

      await expect(
        searchPreferencesService.toggleSource(TEST_USER_ID, 'linkedin', true)
      ).rejects.toThrow(HttpError);
    });
  });
});
