/**
 * Cloudflare Workers API Client
 *
 * Centralized API client for communicating with Cloudflare Workers backend.
 * Handles authentication, error handling, and type-safe requests.
 *
 * Migration from Supabase to Workers:
 * - Auth: Workers handles JWT tokens (stored in localStorage)
 * - Storage: R2 via Workers endpoints (not Supabase Storage)
 * - Database: D1 via Workers API (not direct Supabase queries)
 */

import { API_URL } from './config';

// =============================================================================
// Types
// =============================================================================

interface ApiError {
  error: string;
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

interface JobSearchParams {
  query: string;
  limit?: number;
  searchType?: 'semantic' | 'hybrid';
}

interface JobScrapeParams {
  keywords: string[];
  location?: string;
  workArrangement?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  maxResults?: number;
  sources?: ('linkedin' | 'indeed')[];
}

// =============================================================================
// API Client Class
// =============================================================================

export class WorkersAPI {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_URL;
    // Initialize token from localStorage
    this.token = localStorage.getItem('jobmatch-auth-token');
  }

  // ---------------------------------------------------------------------------
  // Core Request Method
  // ---------------------------------------------------------------------------

  /**
   * Make a type-safe API request
   *
   * @param endpoint - API endpoint (e.g., '/api/auth/login')
   * @param options - Fetch options
   * @returns Response data
   * @throws ApiError with error details
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    // Add auth token if available (except for public endpoints)
    if (this.token && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle non-JSON responses (e.g., 204 No Content)
      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();

      if (!response.ok) {
        // API returned an error
        const error = data as ApiError;
        throw new Error(error.message || error.error || `API Error: ${response.statusText}`);
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error: Failed to connect to API');
    }
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as ApiError;
      throw new Error(error.message || error.error || 'Upload failed');
    }

    return data as T;
  }

  // ---------------------------------------------------------------------------
  // Authentication Methods
  // ---------------------------------------------------------------------------

  /**
   * Sign up a new user
   */
  async signup(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });

    // Store token
    this.token = data.token;
    localStorage.setItem('jobmatch-auth-token', data.token);

    return data;
  }

  /**
   * Log in existing user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token
    this.token = data.token;
    localStorage.setItem('jobmatch-auth-token', data.token);

    return data;
  }

  /**
   * Log out current user
   */
  async logout(): Promise<void> {
    await this.request('/api/auth/logout', {
      method: 'POST',
    });

    // Clear token
    this.token = null;
    localStorage.removeItem('jobmatch-auth-token');
  }

  /**
   * Get current session
   */
  async getSession(): Promise<AuthResponse | null> {
    try {
      return await this.request<AuthResponse>('/api/auth/session');
    } catch {
      return null;
    }
  }

  /**
   * Refresh auth token
   */
  async refreshToken(): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
    });

    this.token = data.token;
    localStorage.setItem('jobmatch-auth-token', data.token);

    return data;
  }

  // ---------------------------------------------------------------------------
  // Job Methods
  // ---------------------------------------------------------------------------

  /**
   * List jobs with filters
   */
  async listJobs(params?: {
    page?: number;
    limit?: number;
    archived?: boolean;
    saved?: boolean;
    source?: 'linkedin' | 'indeed' | 'manual';
    minMatchScore?: number;
    search?: string;
    workArrangement?: 'Remote' | 'Hybrid' | 'On-site';
  }): Promise<{
    jobs: unknown[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value));
        }
      });
    }

    return this.request(`/api/jobs?${searchParams.toString()}`);
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<unknown> {
    return this.request(`/api/jobs/${jobId}`);
  }

  /**
   * Search jobs (semantic or hybrid)
   */
  async searchJobs(params: JobSearchParams): Promise<{
    jobs: unknown[];
    searchType: 'semantic' | 'hybrid';
    resultCount: number;
    scores?: unknown[];
  }> {
    return this.request('/api/jobs/search', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Scrape jobs from LinkedIn/Indeed
   */
  async scrapeJobs(params: JobScrapeParams): Promise<{
    jobCount: number;
    newJobs: number;
    duplicates: number;
    sources: Record<string, number>;
  }> {
    return this.request('/api/jobs/scrape', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Update job (save/archive)
   */
  async updateJob(jobId: string, updates: { isSaved?: boolean; isArchived?: boolean }): Promise<unknown> {
    return this.request(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete job
   */
  async deleteJob(jobId: string): Promise<void> {
    return this.request(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Analyze job compatibility
   */
  async analyzeJob(jobId: string): Promise<unknown> {
    return this.request(`/api/jobs/${jobId}/analyze`, {
      method: 'POST',
    });
  }

  // ---------------------------------------------------------------------------
  // File Upload Methods (R2)
  // ---------------------------------------------------------------------------

  /**
   * Upload avatar (R2 storage)
   */
  async uploadAvatar(file: File): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.upload('/api/profile/avatar', formData);
  }

  /**
   * Upload resume (R2 storage)
   */
  async uploadResume(file: File): Promise<{
    id: string;
    filename: string;
    url: string;
    parsedData?: unknown;
  }> {
    const formData = new FormData();
    formData.append('resume', file);

    return this.upload('/api/resume/upload', formData);
  }

  /**
   * Get file download URL (authenticated)
   */
  async getFileUrl(fileKey: string): Promise<{ url: string; expiresIn: number }> {
    return this.request(`/api/files/download/${encodeURIComponent(fileKey)}`);
  }

  // ---------------------------------------------------------------------------
  // Email Methods
  // ---------------------------------------------------------------------------

  /**
   * Send email via SendGrid
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<{ success: boolean; messageId: string }> {
    return this.request('/api/emails/send', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // ---------------------------------------------------------------------------
  // Export Methods (PDF/DOCX)
  // ---------------------------------------------------------------------------

  /**
   * Generate resume PDF
   */
  async exportResumePDF(resumeId: string): Promise<{ url: string; expiresAt: string }> {
    return this.request('/api/exports/resume/pdf', {
      method: 'POST',
      body: JSON.stringify({ resumeId }),
    });
  }

  /**
   * Generate resume DOCX
   */
  async exportResumeDOCX(resumeId: string): Promise<{ url: string; expiresAt: string }> {
    return this.request('/api/exports/resume/docx', {
      method: 'POST',
      body: JSON.stringify({ resumeId }),
    });
  }

  // ---------------------------------------------------------------------------
  // Profile Methods
  // ---------------------------------------------------------------------------

  /**
   * Get user profile
   */
  async getProfile(): Promise<unknown> {
    return this.request('/api/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Record<string, unknown>): Promise<unknown> {
    return this.request('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ---------------------------------------------------------------------------
  // Work Experience Methods
  // ---------------------------------------------------------------------------

  /**
   * Get all work experience for current user
   */
  async getWorkExperience(): Promise<{ workExperience: unknown[] }> {
    return this.request('/api/profile/work-experience');
  }

  /**
   * Create new work experience entry
   */
  async createWorkExperience(data: {
    company: string;
    position: string;
    location?: string;
    description?: string;
    startDate: string;
    endDate?: string | null;
    current?: boolean;
    accomplishments?: string[];
  }): Promise<{ success: boolean; message: string; workExperience: unknown }> {
    return this.request('/api/profile/work-experience', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update existing work experience entry
   */
  async updateWorkExperience(
    id: string,
    data: {
      company?: string;
      position?: string;
      location?: string;
      description?: string;
      startDate?: string;
      endDate?: string | null;
      current?: boolean;
      accomplishments?: string[];
    }
  ): Promise<{ success: boolean; message: string; workExperience: unknown }> {
    return this.request(`/api/profile/work-experience/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete work experience entry
   */
  async deleteWorkExperience(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/profile/work-experience/${id}`, {
      method: 'DELETE',
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const workersApi = new WorkersAPI();
