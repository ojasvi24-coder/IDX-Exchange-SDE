import { render, screen } from '@testing-library/react';
import PropertyMap from './PropertyMap';

const ORIGINAL_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  else process.env.REACT_APP_GOOGLE_MAPS_API_KEY = ORIGINAL_KEY;
});

describe('PropertyMap', () => {
  it('renders an embed iframe and a directions link for valid coordinates', () => {
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-key';
    render(<PropertyMap latitude="33.6846" longitude="-117.8265" address="12 Main St" />);
    const frame = screen.getByTitle('Map showing 12 Main St');
    expect(frame).toHaveAttribute('src', 'https://www.google.com/maps/embed/v1/place?key=test-key&q=33.6846,-117.8265&zoom=15');
    const link = screen.getByRole('link', { name: 'Get Directions' });
    expect(link).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=33.6846,-117.8265');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it.each([
    [null, null], [33.6, null], [null, -117], [0, 0], [0, -117.8], ['abc', 'def'], [undefined, undefined],
  ])('renders no map for coordinates (%p, %p)', (lat, lng) => {
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY = 'test-key';
    render(<PropertyMap latitude={lat} longitude={lng} />);
    expect(screen.queryByTitle(/Map showing/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Get Directions' })).not.toBeInTheDocument();
    expect(screen.getByText(/Map unavailable/)).toBeInTheDocument();
  });

  it('explains the missing API key but still offers directions', () => {
    delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    render(<PropertyMap latitude={33.6} longitude={-117.8} />);
    expect(screen.queryByTitle(/Map showing/)).not.toBeInTheDocument();
    expect(screen.getByText(/REACT_APP_GOOGLE_MAPS_API_KEY/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get Directions' })).toBeInTheDocument();
  });
});
