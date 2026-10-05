import { fireEvent, render, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import TestRouter from '../testUtils';
import App from '../App';
import FavoritesPage from './FavoritesPage';

const make = (id) => ({
  id: Number(id.slice(1)),
  L_ListingID: id,
  L_Address: `${id} Main St`,
  L_City: 'Irvine',
  L_State: 'CA',
  L_Zip: '92618',
  L_SystemPrice: 500000,
  L_Keyword2: 3,
  LM_Dec_3: '2.0',
  LM_Int2_3: 1500,
  L_Photos: '[]',
});

const seed = (...ids) => window.localStorage.setItem('idx.favorites.v1', JSON.stringify(ids.map(make)));

function Location() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

beforeEach(() => window.localStorage.clear());

describe('FavoritesPage', () => {
  it('shows an empty state with a link back to listings', () => {
    render(<TestRouter><FavoritesPage /></TestRouter>);
    expect(screen.getByText(/No favorites yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse listings' })).toHaveAttribute('href', '/');
  });

  it('lists saved properties with a count and filled hearts', () => {
    seed('L1', 'L2');
    render(<TestRouter><FavoritesPage /></TestRouter>);
    expect(screen.getByText('2 favorite properties')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove from favorites' })).toHaveLength(2);
  });

  it('unfavoriting removes the card immediately', () => {
    seed('L1', 'L2');
    render(<TestRouter><FavoritesPage /></TestRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove from favorites' })[0]);
    expect(screen.queryByText('L1 Main St')).not.toBeInTheDocument();
    expect(screen.getByText('1 favorite property')).toBeInTheDocument();
  });

  it('heart click does not navigate to the detail page', () => {
    seed('L1');
    render(
      <TestRouter>
        <Routes>
          <Route path="/" element={<FavoritesPage />} />
          <Route path="*" element={<Location />} />
        </Routes>
      </TestRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove from favorites' }));
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });
});

describe('header favorites count', () => {
  it('reflects favorites and updates live', () => {
    seed('L1');
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<TestRouter initialEntries={['/favorites']}><App /></TestRouter>);
    expect(screen.getByRole('link', { name: 'Favorites (1)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove from favorites' }));
    expect(screen.getByRole('link', { name: 'Favorites (0)' })).toBeInTheDocument();
  });
});
