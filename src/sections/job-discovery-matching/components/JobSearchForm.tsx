/**
 * Job Search Form Component
 *
 * Provides a comprehensive search interface for scraping jobs from LinkedIn and Indeed
 * Features:
 * - Keyword and location search
 * - Job type and work arrangement filters
 * - Salary range and experience level filters
 * - Source selection (LinkedIn, Indeed, or both)
 * - Max results configuration
 */

import { useState } from 'react';
import { Search, MapPin, DollarSign, Briefcase, Building, Filter, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import type { JobSearchParams } from '../types';

interface JobSearchFormProps {
  onSearch: (params: JobSearchParams) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function JobSearchForm({ onSearch, loading = false, disabled = false }: JobSearchFormProps) {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState<JobSearchParams['jobType']>(undefined);
  const [workArrangement, setWorkArrangement] = useState<JobSearchParams['workArrangement']>(undefined);
  const [salaryMin, setSalaryMin] = useState<number | undefined>(undefined);
  const [salaryMax, setSalaryMax] = useState<number | undefined>(undefined);
  const [experienceLevel, setExperienceLevel] = useState<JobSearchParams['experienceLevel']>(undefined);
  const [maxResults, setMaxResults] = useState(20);
  const [linkedinEnabled, setLinkedinEnabled] = useState(true);
  const [indeedEnabled, setIndeedEnabled] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!keywords.trim()) {
      return;
    }

    const sources: ('linkedin' | 'indeed')[] = [];
    if (linkedinEnabled) sources.push('linkedin');
    if (indeedEnabled) sources.push('indeed');

    if (sources.length === 0) {
      return;
    }

    const params: JobSearchParams = {
      keywords: keywords.trim(),
      location: location.trim() || undefined,
      jobType,
      workArrangement,
      salaryMin,
      salaryMax,
      experienceLevel,
      maxResults,
      sources,
    };

    onSearch(params);
  };

  const isFormDisabled = disabled || loading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-stone-800 p-6 rounded-lg border border-stone-200 dark:border-stone-700">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          Search Jobs
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-stone-600 dark:text-stone-400"
        >
          <Filter className="w-4 h-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Filters
        </Button>
      </div>

      {/* Basic Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="keywords" className="text-stone-700 dark:text-stone-300">
            Keywords <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              id="keywords"
              type="text"
              placeholder="e.g., Software Engineer, Product Manager"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={isFormDisabled}
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="text-stone-700 dark:text-stone-300">
            Location
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              id="location"
              type="text"
              placeholder="e.g., San Francisco, CA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isFormDisabled}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-stone-200 dark:border-stone-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobType" className="text-stone-700 dark:text-stone-300">
                Job Type
              </Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none z-10" />
                <Select
                  value={jobType || ''}
                  onValueChange={(value) => setJobType(value as JobSearchParams['jobType'] || undefined)}
                  disabled={isFormDisabled}
                >
                  <SelectTrigger id="jobType" className="pl-10">
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workArrangement" className="text-stone-700 dark:text-stone-300">
                Work Arrangement
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none z-10" />
                <Select
                  value={workArrangement || ''}
                  onValueChange={(value) => setWorkArrangement(value as JobSearchParams['workArrangement'] || undefined)}
                  disabled={isFormDisabled}
                >
                  <SelectTrigger id="workArrangement" className="pl-10">
                    <SelectValue placeholder="Any arrangement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="on-site">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experienceLevel" className="text-stone-700 dark:text-stone-300">
                Experience Level
              </Label>
              <Select
                value={experienceLevel || ''}
                onValueChange={(value) => setExperienceLevel(value as JobSearchParams['experienceLevel'] || undefined)}
                disabled={isFormDisabled}
              >
                <SelectTrigger id="experienceLevel">
                  <SelectValue placeholder="Any level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior Level</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salaryMin" className="text-stone-700 dark:text-stone-300">
                Min Salary ($/year)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  id="salaryMin"
                  type="number"
                  placeholder="e.g., 80000"
                  value={salaryMin || ''}
                  onChange={(e) => setSalaryMin(e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={isFormDisabled}
                  className="pl-10"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salaryMax" className="text-stone-700 dark:text-stone-300">
                Max Salary ($/year)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  id="salaryMax"
                  type="number"
                  placeholder="e.g., 150000"
                  value={salaryMax || ''}
                  onChange={(e) => setSalaryMax(e.target.value ? parseInt(e.target.value) : undefined)}
                  disabled={isFormDisabled}
                  className="pl-10"
                  min="0"
                  step="1000"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxResults" className="text-stone-700 dark:text-stone-300">
              Max Results: {maxResults}
            </Label>
            <input
              id="maxResults"
              type="range"
              min="10"
              max="50"
              step="5"
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
              disabled={isFormDisabled}
              className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-lime-500"
            />
            <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>10</span>
              <span>50</span>
            </div>
          </div>
        </div>
      )}

      {/* Source Selection */}
      <div className="space-y-3 pt-4 border-t border-stone-200 dark:border-stone-700">
        <Label className="text-stone-700 dark:text-stone-300">
          Job Sources <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="linkedin"
              checked={linkedinEnabled}
              onCheckedChange={(checked) => setLinkedinEnabled(checked as boolean)}
              disabled={isFormDisabled}
            />
            <label
              htmlFor="linkedin"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              LinkedIn
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="indeed"
              checked={indeedEnabled}
              onCheckedChange={(checked) => setIndeedEnabled(checked as boolean)}
              disabled={isFormDisabled}
            />
            <label
              htmlFor="indeed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-stone-700 dark:text-stone-300 cursor-pointer"
            >
              Indeed
            </label>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isFormDisabled || !keywords.trim() || (!linkedinEnabled && !indeedEnabled)}
        className="w-full bg-lime-500 hover:bg-lime-600 text-stone-900"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Searching Jobs...
          </>
        ) : (
          <>
            <Search className="w-4 h-4 mr-2" />
            Search Jobs
          </>
        )}
      </Button>
    </form>
  );
}
