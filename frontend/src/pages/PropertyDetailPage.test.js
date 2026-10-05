import { render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import TestRouter from '../testUtils';
import PropertyDetailPage from './PropertyDetailPage';

const property = {
  id: 1,
  L_ListingID: 'ABC123',
  L_Address: '12 Main St',
  L_City: 'Irvine',
  L_State: 'CA',
  L_Zip: '92618',
  L_SystemPrice: 1250000,
  L_Keyword2: 4,
  LM_Dec_3: '3.5',
  LM_Int2_3: 2400,
  YearBuilt: 2015,
  L_Remarks: 'Bright corner home.',
  L_Photos: JSON.stringify(['https://img.test/1.jpg']),
  LMD_MP_Latitude: '33.6846',
  LMD_MP_Longitude: '-117.8265',
  PoolPrivateYN: '1',
  GarageYN: '',
  L_Type_: 'SingleFamilyResidence',
};

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

function mockApi({ detail = json(property), openhouses = json([]) } = {}) {
  global.fetch = jest.fn((url) => Promise.resolve(url.endsWith('/openhouses') ? openhouses : detail));
}

const renderDetail = async (id = 'ABC123') => {
  render(
    <TestRouter initialEntries={[`/property/${id}`]}>
      <Routes><Route path="/property/:id" element={<PropertyDetailPage />} /></Routes>
    </TestRouter>,
  );
  // Wait for both the property and open-house requests to settle.
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
};

describe('PropertyDetailPage', () => {
  it('shows price, address, facts, description, details and open houses', async () => {
    mockApi({
      openhouses: json([{
        id: 5, OpenHouseDate: '2026-10-10', OH_StartTime: '10:00:00', OH_EndTime: '12:00:00',
        all_data: JSON.stringify({ OpenHouseRemarks: 'Come say hi' }),
      }]),
    });
    await renderDetail();
    expect(screen.getByText('$1,250,000')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '12 Main St, Irvine, CA 92618' })).toBeInTheDocument();
    ['4 beds', '3.5 baths', '2,400 sqft', 'Built 2015'].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
    expect(screen.getByText('Bright corner home.')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Pool Yes/ })).toBeInTheDocument();
    expect(screen.getByText('Come say hi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get Directions' })).toBeInTheDocument();
  });

  it('shows "No open houses scheduled" for an empty list', async () => {
    mockApi();
    await renderDetail();
    expect(screen.getByText('No open houses scheduled')).toBeInTheDocument();
  });

  it('skips the map and missing facts instead of rendering null', async () => {
    mockApi({
      detail: json({
        ...property, LMD_MP_Latitude: 0, LMD_MP_Longitude: 0, L_Keyword2: null, LM_Dec_3: null, LM_Int2_3: null, L_Photos: null, L_Remarks: null,
      }),
    });
    await renderDetail();
    expect(screen.queryByTitle(/Map showing/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Get Directions' })).not.toBeInTheDocument();
    expect(screen.getByText('No photos available')).toBeInTheDocument();
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });

  it('shows a not-found state (not a crash) for an unknown id', async () => {
    mockApi({ detail: json({ error: 'Property NOPE not found' }, 404), openhouses: json({ error: 'nf' }, 404) });
    await renderDetail('NOPE');
    expect(screen.getByRole('alert')).toHaveTextContent('Property "NOPE" could not be found.');
    expect(screen.getByRole('link', { name: /Back to listings/ })).toHaveAttribute('href', '/');
  });

  it('shows the server error message for other failures', async () => {
    mockApi({ detail: json({ error: 'Internal server error' }, 500) });
    await renderDetail();
    expect(screen.getByRole('alert')).toHaveTextContent('Internal server error');
  });

  it('still shows the property when only the open-house request fails', async () => {
    mockApi({ openhouses: json({ error: 'Internal server error' }, 500) });
    await renderDetail();
    expect(screen.getByText('$1,250,000')).toBeInTheDocument();
    expect(screen.getByText(/Could not load open houses: Internal server error/)).toBeInTheDocument();
  });
});
