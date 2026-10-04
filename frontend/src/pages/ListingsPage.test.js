import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import TestRouter from '../testUtils';
import ListingsPage from './ListingsPage';

const property = (id, address) => ({
  id, L_ListingID: `L${id}`, L_Address: address, L_City: 'Irvine', L_State: 'CA', L_Zip: '92618',
  L_SystemPrice: 500000 + id, L_Keyword2: 3, LM_Dec_3: '2.0', LM_Int2_3: 1500, L_Photos: '[]',
});

const page = (items, total = items.length, offset = 0) => ({
  total, limit: 20, offset, results: items,
});

// A fetch whose responses the test resolves manually, to control ordering.
function deferredFetch() {
  const pending = [];
  global.fetch = jest.fn(() => new Promise((resolve) => {
    pending.push((body, ok = true, status = 200) => resolve({ ok, status, json: async () => body }));
  }));
  return pending;
}

function Probe() {
  const { search } = useLocation();
  return <div data-testid="search">{search}</div>;
}

const renderPage = (route = '/') => render(
  <TestRouter initialEntries={[route]}>
    <ListingsPage />
    <Probe />
  </TestRouter>,
);

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name) => fireEvent.click(screen.getByRole('button', { name }));
const lastUrl = () => global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0];

beforeEach(() => window.scrollTo.mockClear());

describe('ListingsPage', () => {
  it('shows loading, then results with the count summary', async () => {
    const pending = deferredFetch();
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading properties');
    await act(async () => pending[0](page([property(1, '1 Alpha St'), property(2, '2 Beta St')], 45)));
    expect(screen.getByText('Showing 1-2 of 45 properties')).toBeInTheDocument();
    expect(screen.getAllByTestId('property-card')).toHaveLength(2);
  });

  it('requests 20 results per page and sends only non-empty filters', async () => {
    const pending = deferredFetch();
    renderPage();
    await act(async () => pending[0](page([])));
    type('City', 'Irvine');
    type('Beds (min)', '3');
    click('Search');
    expect(lastUrl()).toBe('/api/properties?city=Irvine&beds=3&limit=20&offset=0');
  });

  it('shows the backend error message and can retry', async () => {
    const pending = deferredFetch();
    renderPage();
    await act(async () => pending[0]({ error: 'minPrice must be a non-negative integer' }, false, 400));
    expect(screen.getByRole('alert')).toHaveTextContent('minPrice must be a non-negative integer');
    click('Try again');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    await act(async () => pending[1](page([property(1, '1 Alpha St')])));
    expect(screen.getByText('1 Alpha St')).toBeInTheDocument();
  });

  it('shows a no-results state', async () => {
    const pending = deferredFetch();
    renderPage('/?city=Nowhere');
    await act(async () => pending[0](page([], 0)));
    expect(screen.getByText('No properties match your filters.')).toBeInTheDocument();
  });

  it('Clear resets the form and refetches without filters', async () => {
    const pending = deferredFetch();
    renderPage('/?city=Irvine');
    await act(async () => pending[0](page([property(1, '1 Alpha St')])));
    expect(screen.getByLabelText('City')).toHaveValue('Irvine');
    click('Clear Filters');
    expect(screen.getByLabelText('City')).toHaveValue('');
    expect(lastUrl()).toBe('/api/properties?limit=20&offset=0');
  });

  // Regression for the Week 6 debug challenge (Search -> Clear -> Search shows
  // the first search's results). Responses can arrive out of order; a response
  // belonging to a superseded request must never be rendered.
  it('regression: a slow response from an earlier search never overwrites later state', async () => {
    const pending = deferredFetch();
    renderPage();
    await act(async () => pending[0](page([property(1, '1 Initial St')])));

    type('City', 'Alpha');
    click('Search'); // request 1: city A (will be slow)
    click('Clear Filters'); // request 2: everything
    await act(async () => pending[2](page([property(2, '2 Everything St')])));

    type('City', 'Beta');
    click('Search'); // request 3: city B

    // City A's response finally arrives AFTER search B started.
    await act(async () => pending[1](page([property(9, '9 STALE-A St')])));
    expect(screen.queryByText('9 STALE-A St')).not.toBeInTheDocument();
    expect(screen.queryByText('2 Everything St')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => pending[3](page([property(3, '3 Beta St')])));
    expect(screen.getByText('3 Beta St')).toBeInTheDocument();
    expect(screen.queryByText('9 STALE-A St')).not.toBeInTheDocument();
  });

  it('regression: a stale error from an earlier search is also ignored', async () => {
    const pending = deferredFetch();
    renderPage();
    await act(async () => pending[0](page([])));
    type('City', 'Alpha');
    click('Search');
    click('Clear Filters');
    await act(async () => pending[2](page([property(2, '2 Everything St')])));
    await act(async () => pending[1]({ error: 'stale failure' }, false, 500));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('2 Everything St')).toBeInTheDocument();
  });
});

describe('ListingsPage pagination', () => {
  const full = (offset) => page(Array.from({ length: 20 }, (_, i) => property(offset + i + 1, `${offset + i + 1} Main St`)), 100, offset);

  it('changes page, preserves filters, and scrolls to top', async () => {
    const pending = deferredFetch();
    renderPage('/?city=Irvine&beds=3');
    await act(async () => pending[0](full(0)));
    expect(screen.getByText('Showing 1-20 of 100 properties')).toBeInTheDocument();

    click('Page 3');
    expect(lastUrl()).toBe('/api/properties?city=Irvine&beds=3&limit=20&offset=40');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    await act(async () => pending[1](full(40)));
    expect(screen.getByText('Showing 41-60 of 100 properties')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
  });

  it('resets to page 1 when new filters are searched', async () => {
    const pending = deferredFetch();
    renderPage('/?page=3');
    await act(async () => pending[0](full(40)));
    type('City', 'Tustin');
    click('Search');
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?city=Tustin'));
    expect(screen.getByTestId('search')).not.toHaveTextContent('page');
    expect(lastUrl()).toBe('/api/properties?city=Tustin&limit=20&offset=0');
  });

  it('hides pagination when there is a single page', async () => {
    const pending = deferredFetch();
    renderPage();
    await act(async () => pending[0](page([property(1, '1 Alpha St')], 1)));
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});
