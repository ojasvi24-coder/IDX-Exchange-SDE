import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cleanParams, fetchProperties } from '../api/client';
import Pagination from '../components/Pagination';
import PropertyCard from '../components/PropertyCard';
import PropertyFilters from '../components/PropertyFilters';
import SortControls from '../components/SortControls';

export const PAGE_SIZE = 20;
const FILTER_KEYS = ['city', 'zipcode', 'minPrice', 'maxPrice', 'beds', 'baths'];

const parsePage = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : 1;
};

export default function ListingsPage() {
  // Filters, page and sort live in the URL: back/forward and refresh restore
  // them, and a single source of truth drives the fetch below.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.toString();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const params = Object.fromEntries(new URLSearchParams(query));
    const { page: rawPage, ...apiParams } = params;
    const page = parsePage(rawPage);
    const controller = new AbortController();

    // Drop the previous result immediately so stale rows can never show
    // while the new request is in flight.
    setState({ status: 'loading', data: null, error: null });

    fetchProperties(
      { ...apiParams, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
      { signal: controller.signal },
    )
      .then((data) => {
        // ROOT CAUSE of the "old results flash" bug: responses were committed
        // whenever they arrived, so a slow response for search A could land
        // after Clear / search B had started. Each effect run now owns one
        // AbortController; cleanup aborts it, and the guard below also covers
        // a response that resolves despite the abort.
        if (controller.signal.aborted) return;
        setState({ status: 'success', data, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: err.message });
      });

    return () => controller.abort();
  }, [query, reloadKey]);

  const page = parsePage(searchParams.get('page'));
  const initialFilters = Object.fromEntries(FILTER_KEYS.map((k) => [k, searchParams.get(k) || '']));

  // A new search replaces ALL params, which resets the page (and sort) to default.
  const handleSearch = (values) => setSearchParams(cleanParams(values));
  const handleClear = () => setSearchParams({});

  // Sort lives in the URL next to the filters, so it persists across page
  // changes (handlePageChange copies all params) and is dropped by a new search
  // (handleSearch replaces them). Changing the sort itself returns to page 1.
  const sortValue = searchParams.get('sortBy')
    ? `${searchParams.get('sortBy')}:${searchParams.get('sortOrder') || 'asc'}`
    : '';

  const handleSortChange = (value) => {
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    next.delete('sortBy');
    next.delete('sortOrder');
    if (value) {
      const [sortBy, sortOrder] = value.split(':');
      next.set('sortBy', sortBy);
      next.set('sortOrder', sortOrder);
    }
    setSearchParams(next);
  };

  const handlePageChange = (nextPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
    window.scrollTo(0, 0);
  };

  const { status, data, error } = state;
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <section>
      <PropertyFilters
        key={JSON.stringify(initialFilters)}
        initialValues={initialFilters}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      {status === 'loading' && <p role="status" className="message">Loading properties…</p>}

      {status === 'error' && (
        <div role="alert" className="message message--error">
          <p>{error}</p>
          <button type="button" className="btn" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
        </div>
      )}

      {status === 'success' && data.results.length === 0 && (
        <p className="message">
          {data.total === 0 ? 'No properties match your filters.' : 'No properties on this page.'}
        </p>
      )}

      {status === 'success' && data.results.length > 0 && (
        <>
          <div className="toolbar">
            <p className="summary">
              {`Showing ${data.offset + 1}-${data.offset + data.results.length} of ${data.total.toLocaleString('en-US')} properties`}
            </p>
            <SortControls value={sortValue} onChange={handleSortChange} />
          </div>
          <div className="grid">
            {data.results.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </section>
  );
}
