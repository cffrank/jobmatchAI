/**
 * Hook for job scraping operations using Apify through Firebase Cloud Functions
 *
 * This hook provides:
 * - Job scraping from LinkedIn and Indeed
 * - Loading and error states
 * - Firestore integration for saving scraped jobs
 * - Real-time job search history
 */

import { useState, useCallback, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
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
  const [user] = useAuthState(getAuth());

  const scrapeJobs = useCallback(
    async (params: JobSearchParams): Promise<JobSearchResult | null> => {
      if (!user) {
        setError('You must be logged in to search for jobs');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // Call the Cloud Function
        const functions = getFunctions();
        const scrapeJobsFunction = httpsCallable<JobSearchParams, JobSearchResult>(
          functions,
          'scrapeJobs'
        );

        const result = await scrapeJobsFunction(params);

        // Update state
        setLastSearchId(result.data.searchId);

        // Show warnings if any source failed
        if (result.data.errors && result.data.errors.length > 0) {
          console.warn('Some job sources failed:', result.data.errors);
        }

        setLoading(false);
        return result.data;
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
 */
export function useJobSearchHistory(): UseJobSearchHistoryReturn {
  const [searches, setSearches] = useState<JobSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user] = useAuthState(getAuth());

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const searchesRef = collection(db, `users/${user.uid}/jobSearches`);
    const q = query(searchesRef, orderBy('createdAt', 'desc'), limit(10));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const searchData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            jobCount: data.jobCount || 0,
          };
        });
        setSearches(searchData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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
  const [user] = useAuthState(getAuth());

  const saveJob = useCallback(
    async (job: Job) => {
      if (!user) {
        throw new Error('You must be logged in to save jobs');
      }

      const db = getFirestore();
      const savedJobRef = doc(db, `users/${user.uid}/savedJobs/${job.id}`);

      await setDoc(savedJobRef, {
        ...job,
        isSaved: true,
        savedAt: Timestamp.now(),
      });
    },
    [user]
  );

  const unsaveJob = useCallback(
    async (jobId: string) => {
      if (!user) {
        throw new Error('You must be logged in to unsave jobs');
      }

      const db = getFirestore();
      const savedJobRef = doc(db, `users/${user.uid}/savedJobs/${jobId}`);

      await updateDoc(savedJobRef, {
        isSaved: false,
      });
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const savedJobsRef = collection(db, `users/${user.uid}/savedJobs`);
    const q = query(savedJobsRef, orderBy('savedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const jobs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            scrapedAt: data.scrapedAt?.toDate(),
          } as Job;
        });
        setSavedJobs(jobs.filter(job => job.isSaved));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { savedJobs, loading, error, saveJob, unsaveJob };
}
