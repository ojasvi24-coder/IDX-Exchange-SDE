import { fireEvent, render, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import TestRouter from '../testUtils';
import PropertyCard from './PropertyCard';

const base = {
  id: 1,
  L_ListingID: 'ABC123',
  L_Address: '12 Main St',
  L_City: 'Irvine',
  L_State: 'CA',
  L_Zip: '92618',
  L_SystemPrice: 750000,
  L_Keyword2: 3,
  LM_Dec_3: '2.5',
  LM_Int2_3: 1850,
  L_Photos: JSON.stringify(['https://img.test/1.jpg', 'https://img.test/2.jpg']),
};

function Location() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

const renderCard = (property) => render(
  <TestRouter>
    <Routes>
      <Route path="/" element={<PropertyCard property={property} />} />
      <Route path="*" element={<Location />} />
    </Routes>
  </TestRouter>,
);

beforeEach(() => window.localStorage.clear());

describe('PropertyCard', () => {
  it('heart toggles favorite state without navigating', () => {
    renderCard(base);
    const heart = screen.getByRole('button', { name: 'Add to favorites' });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    expect(heart).toHaveTextContent('♡');
    fireEvent.click(heart);
    const filled = screen.getByRole('button', { name: 'Remove from favorites' });
    expect(filled).toHaveAttribute('aria-pressed', 'true');
    expect(filled).toHaveTextContent('♥');
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    fireEvent.click(filled);
    expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument();
  });

  it('shows price, address, locality, beds, baths, sqft and the first photo', () => {
    renderCard(base);
    expect(screen.getByText('$750,000')).toBeInTheDocument();
    expect(screen.getByText('12 Main St')).toBeInTheDocument();
    expect(screen.getByText('Irvine, CA 92618')).toBeInTheDocument();
    expect(screen.getByText('3 beds · 2.5 baths · 1,850 sqft')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Photo of 12 Main St' })).toHaveAttribute('src', 'https://img.test/1.jpg');
  });

  it('never renders "null" for missing beds, baths or sqft', () => {
    renderCard({ ...base, L_Keyword2: null, LM_Dec_3: null, LM_Int2_3: null });
    expect(screen.queryByText(/null/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bed|bath|sqft/i)).not.toBeInTheDocument();
  });

  it('shows "Price unavailable" for null or zero prices', () => {
    const { unmount } = renderCard({ ...base, L_SystemPrice: null });
    expect(screen.getByText('Price unavailable')).toBeInTheDocument();
    unmount();
    renderCard({ ...base, L_SystemPrice: 0 });
    expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  });

  it.each([[null], [''], ['[not json'], ['{"a":1}'], ['[]']])(
    'survives bad L_Photos (%p) with a placeholder',
    (photos) => {
      renderCard({ ...base, L_Photos: photos });
      expect(screen.getByText('No photo available')).toBeInTheDocument();
    },
  );

  it('navigates to the detail page when the card is clicked', () => {
    renderCard(base);
    fireEvent.click(screen.getByTestId('property-card'));
    expect(screen.getByTestId('location')).toHaveTextContent('/property/ABC123');
  });

  it('navigates through the address link too', () => {
    renderCard(base);
    fireEvent.click(screen.getByRole('link', { name: '12 Main St' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/property/ABC123');
  });

  it('carousel arrows change the photo and do NOT navigate', () => {
    renderCard(base);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Photo of/ })).toHaveAttribute('src', 'https://img.test/2.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('hides carousel controls for a single photo', () => {
    renderCard({ ...base, L_Photos: JSON.stringify(['https://img.test/1.jpg']) });
    expect(screen.queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });

  it('falls back to the placeholder when an image fails to load', () => {
    renderCard({ ...base, L_Photos: JSON.stringify(['https://img.test/dead.jpg']) });
    fireEvent.error(screen.getByRole('img', { name: /Photo of/ }));
    expect(screen.getByText('No photo available')).toBeInTheDocument();
  });
});
