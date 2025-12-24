/**
 * Hook for job scraping operations using Apify through Supabase Edge Functions
 *
 * This hook provides:
 * - Job scraping from LinkedIn and Indeed
 * - Loading and error states
 * - Supabase integration for saving scraped jobs
 * - Real-time job search history
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { JobSearchParams, JobSearchResult, Job } from '../sections/job-discovery-matching/types';

interface UseJobScrapingReturn {
  scrapeJobs: (params: JobSearchParams) => Promise<JobSearchResult | null>;
  loading: boolean;
  error: string | null;
  lastSearchId: string | null;
}

/**
 * Hook for scraping jobs from LinkedIn and Indeed
 */
export function useJobScraping(): UseJobScrapingReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearchId, setLastSearchId] = useState<string | null>(null);
  const { user } = useAuth();

  const scrapeJobs = useCallback(
    async (params: JobSearchParams): Promise<JobSearchResult | null> => {
      if (!user) {
        setError('You must be logged in to search for jobs');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // Get authentication token
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('Please sign in to scrape jobs');
        }

        // Call the Railway backend API
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/jobs/scrape`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(errorData.error || `Failed to scrape jobs: ${response.status}`);
        }

        const data: JobSearchResult = await response.json();

        if (!data) {
          throw new Error('No data returned from job scraping service');
        }

        // Update state
        setLastSearchId(data.searchId);

        // Show warnings if any source failed
        if (data.errors && data.errors.length > 0) {
          console.warn('Some job sources failed:', data.errors);
        }

        setLoading(false);
        return data;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to scrape jobs';
        setError(errorMessage);
        setLoading(false);
        console.error('Job scraping error:', err);
        return null;
      }
    },
    [user]
  );

  return {
    scrapeJobs,
    loading,
    error,
    lastSearchId,
  };
}

interface UseJobSearchHistoryReturn {
  searches: JobSearch[];
  loading: boolean;
  error: string | null;
}

interface JobSearch {
  id: string;
  createdAt: Date;
  jobCount: number;
}

/**
 * Hook for fetching user's job search history
 * Note: job_searches table doesn't exist in schema - this is a placeholder
 */
export function useJobSearchHistory(): UseJobSearchHistoryReturn {
  const [searches] = useState<JobSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // TODO: Implement when job_searches table is added to schema
    setLoading(false);
  }, [user]);

  return { searches, loading, error };
}

interface UseSavedJobsReturn {
  savedJobs: Job[];
  loading: boolean;
  error: string | null;
  saveJob: (job: Job) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
}

/**
 * Hook for managing saved jobs
 */
export function useSavedJobs(): UseSavedJobsReturn {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const saveJob = useCallback(
    async (job: Job) => {
      if (!user) {
        throw new Error('You must be logged in to save jobs');
      }

      // Insert or update the job in the jobs table with is_saved flag
      const { error: saveError } = await supabase
        .from('jobs')
        .upsert({
          id: job.id,
          user_id: user.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          url: job.url,
          source: job.source,
          salary_min: job.salaryMin,
          salary_max: job.salaryMax,
          saved: true,
          added_at: new Date().toISOString(),
        });

      if (saveError) {
        throw saveError;
      }
    },
    [user]
  );

  const unsaveJob = useCallback(
    async (jobId: string) => {
      if (!user) {
        throw new Error('You must be logged in to unsave jobs');
      }

      const { error: unsaveError } = await supabase
        .from('jobs')
        .update({ saved: false })
        .eq('id', jobId)
        .eq('user_id', user.id);

      if (unsaveError) {
        throw unsaveError;
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch saved jobs from Supabase
    const fetchSavedJobs = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select('*')
          .eq('user_id', user.id)
          .eq('saved', true)
          .order('added_at', { ascending: false });

        if (fetchError) throw fetchError;

        const jobs = (data || []).map((row) => ({
          id: row.id,
          title: row.title,
          company: row.company,
          companyLogo: '',
          location: row.location || '',
          workArrangement: 'Unknown' as const,
          salaryMin: row.salary_min || 0,
          salaryMax: row.salary_max || 0,
          postedDate: row.created_at,
          description: row.description || '',
          isSaved: row.saved || false,
          url: row.url || undefined,
          source: row.source as 'linkedin' | 'indeed' | 'manual' | undefined,
          scrapedAt: row.created_at ? new Date(row.created_at) : undefined,
        })) as Job[];

        setSavedJobs(jobs);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch saved jobs';
        setError(errorMessage);
        setLoading(false);
      }
    };

    void fetchSavedJobs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('saved_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchSavedJobs();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return { savedJobs, loading, error, saveJob, unsaveJob };
}
