# Pagination Migration Guide for Developers

## Overview

The database hooks now support cursor-based pagination to dramatically reduce Firestore reads and improve performance. This guide helps you migrate your components to use the new pagination features.

## What Changed?

### New Return Values

All collection hooks now return three additional values:

```typescript
const {
  // Existing
  items,
  loading,
  error,

  // NEW
  loadMore,   // Function to load next page
  hasMore,    // Boolean - more results available
  reset,      // Function to reset pagination state
} = useHook();
```

## Migration Paths

### Option 1: No Changes Required (Basic Usage)

If you just display the items and don't need pagination, **no changes are required**.

```typescript
// Before
const { jobs, loading, error } = useJobs();

// After - WORKS EXACTLY THE SAME
const { jobs, loading, error } = useJobs();
```

**What happens:** You'll get the first 20 items instead of all items. For most users with < 20 items, this is invisible.

### Option 2: Add "Load More" Button

Simple pagination with a button.

```typescript
function JobList() {
  const { jobs, loading, loadMore, hasMore } = useJobs();

  return (
    <div>
      {jobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load More Jobs'}
        </button>
      )}
    </div>
  );
}
```

### Option 3: Infinite Scroll

Use a library like `react-infinite-scroll-component`.

```bash
npm install react-infinite-scroll-component
```

```typescript
import InfiniteScroll from 'react-infinite-scroll-component';

function JobList() {
  const { jobs, loading, loadMore, hasMore } = useJobs();

  return (
    <InfiniteScroll
      dataLength={jobs.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<h4>Loading...</h4>}
      endMessage={<p>No more jobs</p>}
    >
      {jobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </InfiniteScroll>
  );
}
```

### Option 4: Custom Page Size

Change the default page size (20) if needed.

```typescript
// Load 50 items per page
const { jobs, loadMore, hasMore } = useJobs(50);
```

## Hook-Specific Examples

### useJobs

```typescript
function JobsPage() {
  const { jobs, loading, error, loadMore, hasMore, reset } = useJobs();

  // Reset pagination when filters change
  const handleFilterChange = (newFilters) => {
    reset();
    applyFilters(newFilters);
  };

  return (
    <div>
      <FilterBar onFilterChange={handleFilterChange} />

      {loading && <Spinner />}
      {error && <Error message={error.message} />}

      <div className="job-grid">
        {jobs.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {hasMore && (
        <button onClick={loadMore}>
          Load More
        </button>
      )}
    </div>
  );
}
```

### useTrackedApplications

```typescript
function ApplicationTracker() {
  const {
    trackedApplications,
    loading,
    loadMore,
    hasMore
  } = useTrackedApplications();

  return (
    <InfiniteScroll
      dataLength={trackedApplications.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<Spinner />}
    >
      {trackedApplications.map(app => (
        <ApplicationCard key={app.id} application={app} />
      ))}
    </InfiniteScroll>
  );
}
```

### useActiveTrackedApplications

```typescript
function ActiveApplications() {
  const {
    activeApplications,
    loading,
    loadMore,
    hasMore
  } = useActiveTrackedApplications();

  // Only shows non-archived applications
  // Pagination works the same way

  return (
    <div>
      {activeApplications.map(app => (
        <ApplicationCard key={app.id} application={app} />
      ))}

      {hasMore && (
        <button onClick={loadMore}>
          Show More Applications
        </button>
      )}
    </div>
  );
}
```

### useApplications

```typescript
function GeneratedApplicationsList() {
  const {
    applications,
    loading,
    loadMore,
    hasMore
  } = useApplications();

  return (
    <div>
      {applications.map(app => (
        <GeneratedApplicationCard key={app.id} application={app} />
      ))}

      {hasMore && !loading && (
        <button onClick={loadMore}>
          Load Older Applications
        </button>
      )}

      {loading && <Spinner />}
    </div>
  );
}
```

## Common Patterns

### 1. Intersection Observer (Advanced Infinite Scroll)

```typescript
function JobList() {
  const { jobs, loadMore, hasMore } = useJobs();
  const loaderRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div>
      {jobs.map(job => <JobCard key={job.id} job={job} />)}
      {hasMore && <div ref={loaderRef}>Loading...</div>}
    </div>
  );
}
```

### 2. Keyboard Navigation

```typescript
function JobList() {
  const { jobs, loadMore, hasMore } = useJobs();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Load more on space bar at bottom
      if (e.key === ' ' && hasMore && window.scrollY > window.innerHeight) {
        e.preventDefault();
        loadMore();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMore, loadMore]);

  return <div>{/* ... */}</div>;
}
```

### 3. Loading State Management

```typescript
function JobList() {
  const { jobs, loading, loadMore, hasMore } = useJobs();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await loadMore();
    setIsLoadingMore(false);
  };

  return (
    <div>
      {jobs.map(job => <JobCard key={job.id} job={job} />)}

      {hasMore && (
        <button onClick={handleLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Performance Tips

### 1. Debounce Load More in Infinite Scroll

```typescript
import { debounce } from 'lodash';

function JobList() {
  const { jobs, loadMore, hasMore } = useJobs();

  const debouncedLoadMore = useMemo(
    () => debounce(loadMore, 300),
    [loadMore]
  );

  return (
    <InfiniteScroll
      dataLength={jobs.length}
      next={debouncedLoadMore}
      hasMore={hasMore}
      loader={<Spinner />}
    />
  );
}
```

### 2. Virtualize Long Lists

For very long lists (100+ items), use virtualization:

```bash
npm install react-window
```

```typescript
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

function VirtualizedJobList() {
  const { jobs, loadMore, hasMore } = useJobs();

  const loadMoreItems = hasMore ? loadMore : () => {};
  const itemCount = hasMore ? jobs.length + 1 : jobs.length;

  return (
    <InfiniteLoader
      isItemLoaded={index => index < jobs.length}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <FixedSizeList
          height={600}
          itemCount={itemCount}
          itemSize={100}
          onItemsRendered={onItemsRendered}
          ref={ref}
        >
          {({ index, style }) => (
            <div style={style}>
              {index < jobs.length ? (
                <JobCard job={jobs[index]} />
              ) : (
                <Spinner />
              )}
            </div>
          )}
        </FixedSizeList>
      )}
    </InfiniteLoader>
  );
}
```

## Testing

### Test Pagination Logic

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useJobs } from '@/hooks/useJobs';

describe('useJobs pagination', () => {
  it('should load initial page', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useJobs());

    await waitForNextUpdate();

    expect(result.current.jobs.length).toBeLessThanOrEqual(20);
  });

  it('should load more jobs', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useJobs());

    await waitForNextUpdate();
    const initialCount = result.current.jobs.length;

    act(() => {
      result.current.loadMore();
    });

    await waitForNextUpdate();

    expect(result.current.jobs.length).toBeGreaterThan(initialCount);
  });

  it('should set hasMore to false when all loaded', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useJobs());

    await waitForNextUpdate();

    // If user has < 20 jobs
    if (result.current.jobs.length < 20) {
      expect(result.current.hasMore).toBe(false);
    }
  });
});
```

### Test Infinite Scroll Component

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('JobList with pagination', () => {
  it('should load more when button clicked', async () => {
    render(<JobList />);

    const initialJobs = screen.getAllByRole('article');

    const loadMoreButton = screen.getByText(/load more/i);
    await userEvent.click(loadMoreButton);

    await waitFor(() => {
      const updatedJobs = screen.getAllByRole('article');
      expect(updatedJobs.length).toBeGreaterThan(initialJobs.length);
    });
  });
});
```

## Troubleshooting

### Issue: LoadMore doesn't do anything

**Cause:** `hasMore` is false

**Solution:** Check if there are more results. If user has fewer than 20 items total, `hasMore` will be false.

```typescript
console.log('Has more?', hasMore);
console.log('Current count:', jobs.length);
```

### Issue: Duplicate items appear

**Cause:** React key collision

**Solution:** Ensure each item has a unique `id` and use it as key:

```typescript
{jobs.map(job => (
  <JobCard key={job.id} job={job} /> // ✅ Use id, not index
))}
```

### Issue: Page resets when navigating back

**Cause:** Pagination state is lost on unmount

**Solution:** Use a global state manager or persist pagination state:

```typescript
// Option 1: Global state (Redux, Zustand)
const jobs = useSelector(state => state.jobs.items);

// Option 2: React Query
const { data: jobs } = useQuery('jobs', fetchJobs, {
  keepPreviousData: true,
});
```

### Issue: Items jump around when loading more

**Cause:** Items don't have stable heights

**Solution:** Give items fixed or min-height:

```css
.job-card {
  min-height: 200px;
}
```

## Best Practices

1. **Always show loading state** when `loading` is true
2. **Disable load more button** while loading
3. **Handle empty states** gracefully
4. **Use skeleton screens** for better UX during initial load
5. **Show total count** if available (e.g., "Showing 20 of 150 jobs")
6. **Debounce rapid scroll events** in infinite scroll
7. **Test with slow connections** to ensure good UX
8. **Add analytics** to track how many users load additional pages

## Performance Comparison

### Before Pagination

```
User with 500 jobs:
- Initial load: 500 Firestore reads
- Every page refresh: 500 reads
- Monthly (30 views): 15,000 reads
```

### After Pagination

```
User with 500 jobs:
- Initial load: 20 Firestore reads
- Load 2 more pages: +40 reads (60 total)
- Monthly (30 views): 1,800 reads

Savings: 88% reduction
```

## Questions?

For implementation questions, refer to:
- `PAGINATION_IMPLEMENTATION_SUMMARY.md` - Technical details
- `FIRESTORE_PERFORMANCE_ANALYSIS.md` - Original analysis
- Hook source code in `src/hooks/`

## Next Steps

After migrating to pagination, consider:

1. **Implement server-side match scores** to eliminate client-side ranking
2. **Add caching** with React Query or SWR
3. **Enable offline persistence** in Firestore
4. **Set up monitoring** to track read counts and costs
