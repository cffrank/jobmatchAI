import { useState } from 'react';
import { SlidersHorizontal, X, Check, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import type { FeedbackFilters } from '../types-feedback';

interface FeedbackFilterControlsProps {
  filters: FeedbackFilters;
  onFilterChange: (filters: FeedbackFilters) => void;
  jobCount: number;
  filteredJobCount: number;
}

export function FeedbackFilterControls({
  filters,
  onFilterChange,
  jobCount,
  filteredJobCount,
}: FeedbackFilterControlsProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterToggle = (key: keyof FeedbackFilters, value: boolean) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleSortChange = (
    sortBy: FeedbackFilters['sortBy'],
    sortOrder: FeedbackFilters['sortOrder']
  ) => {
    onFilterChange({ ...filters, sortBy, sortOrder });
  };

  const handleMinMatchScoreChange = (score: number) => {
    onFilterChange({ ...filters, minMatchScore: score });
  };

  const resetFilters = () => {
    onFilterChange({
      hideNotInterested: false,
      hideSpam: false,
      hideDuplicates: false,
      showOnlyVerified: false,
      minMatchScore: 0,
      showOnlyHighQuality: false,
      sortBy: 'match_score',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters =
    filters.hideNotInterested ||
    filters.hideSpam ||
    filters.hideDuplicates ||
    filters.showOnlyVerified ||
    (filters.minMatchScore && filters.minMatchScore > 0) ||
    filters.showOnlyHighQuality;

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button & Stats */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md ${
            showFilters || hasActiveFilters
              ? 'bg-blue-600 text-white border border-blue-600'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-white/20 text-xs font-bold rounded-full">
              {Object.values(filters).filter(Boolean).length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            Showing <span className="font-bold text-slate-900 dark:text-slate-50">{filteredJobCount}</span> of{' '}
            <span className="font-bold text-slate-900 dark:text-slate-50">{jobCount}</span> jobs
          </span>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xl animate-slide-in-from-top">
          <div className="space-y-6">
            {/* Quick Filters */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-3 uppercase tracking-wide">
                Quick Filters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FilterToggle
                  label="Hide Not Interested"
                  description="Hide jobs you marked as not interested"
                  checked={filters.hideNotInterested ?? false}
                  onChange={(checked) => handleFilterToggle('hideNotInterested', checked)}
                />
                <FilterToggle
                  label="Hide Spam"
                  description="Hide jobs reported as spam"
                  checked={filters.hideSpam ?? false}
                  onChange={(checked) => handleFilterToggle('hideSpam', checked)}
                />
                <FilterToggle
                  label="Hide Duplicates"
                  description="Hide duplicate job listings"
                  checked={filters.hideDuplicates ?? false}
                  onChange={(checked) => handleFilterToggle('hideDuplicates', checked)}
                />
                <FilterToggle
                  label="Verified Jobs Only"
                  description="Show only spam-verified listings"
                  checked={filters.showOnlyVerified ?? false}
                  onChange={(checked) => handleFilterToggle('showOnlyVerified', checked)}
                />
                <FilterToggle
                  label="High Quality Only"
                  description="Show only 75%+ match scores"
                  checked={filters.showOnlyHighQuality ?? false}
                  onChange={(checked) => handleFilterToggle('showOnlyHighQuality', checked)}
                />
              </div>
            </div>

            {/* Match Score Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-wide">
                  Minimum Match Score
                </h3>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {filters.minMatchScore ?? 0}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.minMatchScore ?? 0}
                onChange={(e) => handleMinMatchScoreChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 mb-3 uppercase tracking-wide">
                Sort By
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SortButton
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Match Score"
                  active={filters.sortBy === 'match_score'}
                  sortOrder={filters.sortOrder}
                  onClick={(order) => handleSortChange('match_score', order)}
                />
                <SortButton
                  icon={<Calendar className="w-4 h-4" />}
                  label="Date Posted"
                  active={filters.sortBy === 'date_posted'}
                  sortOrder={filters.sortOrder}
                  onClick={(order) => handleSortChange('date_posted', order)}
                />
                <SortButton
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Salary"
                  active={filters.sortBy === 'salary'}
                  sortOrder={filters.sortOrder}
                  onClick={(order) => handleSortChange('salary', order)}
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function FilterToggle({ label, description, checked, onChange }: FilterToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
        checked
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          checked ? 'border-blue-500 bg-blue-500' : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold mb-0.5 ${
            checked ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </button>
  );
}

interface SortButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  sortOrder?: 'asc' | 'desc';
  onClick: (order: 'asc' | 'desc') => void;
}

function SortButton({ icon, label, active, sortOrder, onClick }: SortButtonProps) {
  return (
    <button
      onClick={() => onClick(active && sortOrder === 'desc' ? 'asc' : 'desc')}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
        active
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      {icon}
      <span className="text-sm font-semibold flex-1">{label}</span>
      {active && (
        <span className="text-xs font-bold">
          {sortOrder === 'desc' ? '↓' : '↑'}
        </span>
      )}
    </button>
  );
}
