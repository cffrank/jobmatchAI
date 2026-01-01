/**
 * Search Templates Service
 *
 * Manages reusable job search templates for users.
 * Allows users to:
 * - Save commonly used search criteria as templates
 * - Quickly rerun saved searches
 * - Track template usage statistics
 * - Share templates (future feature)
 *
 * Phase 1 of Automated Job Search Implementation
 */

import { supabaseAdmin } from '../config/supabase';
import { HttpError } from '../types';
import type {
  SearchTemplate,
  UpdateTemplateData,
} from '../types';

// =============================================================================
// Constants
// =============================================================================

const TABLE_NAME = 'search_templates';

/**
 * Maximum number of templates per user
 */
const MAX_TEMPLATES_PER_USER = 50;

// =============================================================================
// Main CRUD Operations
// =============================================================================

/**
 * Create a new search template
 *
 * @param userId - The user's ID
 * @param name - Template name
 * @param criteria - Search criteria to save
 * @returns Created search template
 * @throws HttpError if template limit exceeded or database error
 */
export async function createTemplate(
  userId: string,
  name: string,
  criteria: Record<string, unknown>
): Promise<SearchTemplate> {
  // Check template count limit
  const userTemplates = await getTemplates(userId);
  if (userTemplates.length >= MAX_TEMPLATES_PER_USER) {
    throw new HttpError(
      400,
      `Maximum of ${MAX_TEMPLATES_PER_USER} templates allowed per user`,
      'TEMPLATE_LIMIT_EXCEEDED'
    );
  }

  // Validate name is not empty
  if (!name || name.trim().length === 0) {
    throw new HttpError(
      400,
      'Template name is required',
      'INVALID_TEMPLATE_NAME'
    );
  }

  const templateData = {
    user_id: userId,
    name: name.trim(),
    criteria,
    use_count: 0,
  };

  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .insert(templateData)
    .select()
    .single();

  if (error) {
    // Handle duplicate template name
    if (error.code === '23505') {
      throw new HttpError(
        409,
        'A template with this name already exists',
        'DUPLICATE_TEMPLATE_NAME'
      );
    }

    console.error('Error creating search template:', error);
    throw new HttpError(
      500,
      'Failed to create search template',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToTemplate(data);
}

/**
 * Get all templates for a user
 *
 * @param userId - The user's ID
 * @returns Array of user's search templates (sorted by use count)
 * @throws HttpError if database error
 */
export async function getTemplates(userId: string): Promise<SearchTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('use_count', { ascending: false });

  if (error) {
    console.error('Error fetching search templates:', error);
    throw new HttpError(
      500,
      'Failed to fetch search templates',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return data.map(mapDatabaseToTemplate);
}

/**
 * Get a specific template by ID
 *
 * @param userId - The user's ID
 * @param templateId - Template ID
 * @returns Search template
 * @throws HttpError if template not found or database error
 */
export async function getTemplate(
  userId: string,
  templateId: string
): Promise<SearchTemplate> {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('*')
    .eq('id', templateId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new HttpError(
        404,
        'Template not found',
        'TEMPLATE_NOT_FOUND'
      );
    }

    console.error('Error fetching search template:', error);
    throw new HttpError(
      500,
      'Failed to fetch search template',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToTemplate(data);
}

/**
 * Update a search template
 *
 * @param userId - The user's ID
 * @param templateId - Template ID to update
 * @param data - Partial template data to update
 * @returns Updated search template
 * @throws HttpError if template not found or database error
 */
export async function updateTemplate(
  userId: string,
  templateId: string,
  data: UpdateTemplateData
): Promise<SearchTemplate> {
  // Verify template exists and belongs to user
  await getTemplate(userId, templateId);

  // Build update object (only include provided fields)
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw new HttpError(
        400,
        'Template name cannot be empty',
        'INVALID_TEMPLATE_NAME'
      );
    }
    updateData.name = data.name.trim();
  }

  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  if (data.criteria !== undefined) {
    updateData.criteria = data.criteria;
  }

  const { data: updated, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .update(updateData)
    .eq('id', templateId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    // Handle duplicate template name
    if (error.code === '23505') {
      throw new HttpError(
        409,
        'A template with this name already exists',
        'DUPLICATE_TEMPLATE_NAME'
      );
    }

    console.error('Error updating search template:', error);
    throw new HttpError(
      500,
      'Failed to update search template',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToTemplate(updated);
}

/**
 * Delete a search template
 *
 * @param userId - The user's ID
 * @param templateId - Template ID to delete
 * @throws HttpError if template not found or database error
 */
export async function deleteTemplate(
  userId: string,
  templateId: string
): Promise<void> {
  // Verify template exists and belongs to user
  await getTemplate(userId, templateId);

  const { error } = await supabaseAdmin
    .from(TABLE_NAME)
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting search template:', error);
    throw new HttpError(
      500,
      'Failed to delete search template',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }
}

// =============================================================================
// Template Usage Tracking
// =============================================================================

/**
 * Increment template use count when template is used for a search
 * Also updates last_used_at timestamp
 *
 * @param userId - The user's ID
 * @param templateId - Template ID that was used
 * @returns Updated search template
 * @throws HttpError if template not found or database error
 */
export async function useTemplate(
  userId: string,
  templateId: string
): Promise<SearchTemplate> {
  // Verify template exists and belongs to user
  const template = await getTemplate(userId, templateId);

  const { data: updated, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .update({
      use_count: template.useCount + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating template usage:', error);
    throw new HttpError(
      500,
      'Failed to update template usage',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return mapDatabaseToTemplate(updated);
}

/**
 * Get user's most frequently used templates
 *
 * @param userId - The user's ID
 * @param limit - Maximum number of templates to return (default: 5)
 * @returns Array of most used templates
 * @throws HttpError if database error
 */
export async function getMostUsedTemplates(
  userId: string,
  limit: number = 5
): Promise<SearchTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .order('use_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching most used templates:', error);
    throw new HttpError(
      500,
      'Failed to fetch most used templates',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return data.map(mapDatabaseToTemplate);
}

/**
 * Get recently used templates
 *
 * @param userId - The user's ID
 * @param limit - Maximum number of templates to return (default: 5)
 * @returns Array of recently used templates
 * @throws HttpError if database error
 */
export async function getRecentlyUsedTemplates(
  userId: string,
  limit: number = 5
): Promise<SearchTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .not('last_used_at', 'is', null)
    .order('last_used_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recently used templates:', error);
    throw new HttpError(
      500,
      'Failed to fetch recently used templates',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return data.map(mapDatabaseToTemplate);
}

// =============================================================================
// Template Search & Discovery
// =============================================================================

/**
 * Search templates by name (case-insensitive)
 *
 * @param userId - The user's ID
 * @param query - Search query string
 * @returns Array of matching templates
 * @throws HttpError if database error
 */
export async function searchTemplatesByName(
  userId: string,
  query: string
): Promise<SearchTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .ilike('name', `%${query}%`)
    .order('use_count', { ascending: false });

  if (error) {
    console.error('Error searching templates:', error);
    throw new HttpError(
      500,
      'Failed to search templates',
      'DATABASE_ERROR',
      { error: error.message }
    );
  }

  return data.map(mapDatabaseToTemplate);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map database record to SearchTemplate interface
 * Converts snake_case database fields to camelCase TypeScript properties
 *
 * @param record - Database record
 * @returns SearchTemplate object
 */
function mapDatabaseToTemplate(record: Record<string, unknown>): SearchTemplate {
  return {
    id: record.id as string,
    userId: record.user_id as string,
    name: record.name as string,
    description: record.description as string | undefined,
    criteria: (record.criteria as Record<string, unknown>) || {},
    useCount: (record.use_count as number) || 0,
    lastUsedAt: record.last_used_at as string | undefined,
    createdAt: record.created_at as string,
    updatedAt: record.updated_at as string,
  };
}

/**
 * Validate template criteria
 * Ensures criteria object has required fields for a valid search
 *
 * @param criteria - Search criteria to validate
 * @returns True if valid, throws error if invalid
 * @throws HttpError if criteria is invalid
 */
export function validateTemplateCriteria(criteria: Record<string, unknown>): boolean {
  // Criteria must be a non-empty object
  if (!criteria || typeof criteria !== 'object' || Object.keys(criteria).length === 0) {
    throw new HttpError(
      400,
      'Template criteria must be a non-empty object',
      'INVALID_CRITERIA'
    );
  }

  // At minimum, should have either keywords or desiredRoles
  const hasKeywords = criteria.keywords && (criteria.keywords as unknown[]).length > 0;
  const hasRoles = criteria.desiredRoles && (criteria.desiredRoles as unknown[]).length > 0;

  if (!hasKeywords && !hasRoles) {
    throw new HttpError(
      400,
      'Template criteria must include keywords or desired roles',
      'INVALID_CRITERIA'
    );
  }

  return true;
}
