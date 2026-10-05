import {
  fireEvent, render, screen, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropertyImageGallery from './PropertyImageGallery';

const photos = JSON.stringify(['https://img.test/1.jpg', 'https://img.test/2.jpg', 'https://img.test/3.jpg']);
// The main image is the first <img> with this alt (the lightbox renders a second one).
const mainImage = () => screen.getAllByAltText('Property photo')[0];
const mainSrc = () => mainImage().getAttribute('src');

describe('PropertyImageGallery', () => {
  it('shows the first photo and a thumbnail per photo', () => {
    render(<PropertyImageGallery rawPhotos={photos} />);
    expect(mainSrc()).toBe('https://img.test/1.jpg');
    expect(screen.getAllByRole('button', { name: /Show photo/ })).toHaveLength(3);
  });

  it('thumbnails update the main image', () => {
    render(<PropertyImageGallery rawPhotos={photos} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show photo 3 of 3' }));
    expect(mainSrc()).toBe('https://img.test/3.jpg');
  });

  it('omits the thumbnail strip for a single photo', () => {
    render(<PropertyImageGallery rawPhotos={JSON.stringify(['https://img.test/1.jpg'])} />);
    expect(screen.queryByRole('button', { name: /Show photo/ })).not.toBeInTheDocument();
  });

  it.each([[null], [undefined], [''], ['[oops'], ['[]']])('shows an empty state for L_Photos=%p', (raw) => {
    render(<PropertyImageGallery rawPhotos={raw} />);
    expect(screen.getByText('No photos available')).toBeInTheDocument();
  });

  it('drops photos that fail to load', () => {
    render(<PropertyImageGallery rawPhotos={photos} />);
    fireEvent.error(mainImage());
    expect(mainSrc()).toBe('https://img.test/2.jpg');
    expect(screen.getAllByRole('button', { name: /Show photo/ })).toHaveLength(2);
  });
});

describe('lightbox', () => {
  const open = () => {
    render(<PropertyImageGallery rawPhotos={photos} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open photo in full screen' }));
    return screen.getByRole('dialog', { name: 'Photo viewer' });
  };

  it('opens full-screen on main-image click and receives focus', () => {
    const dialog = open();
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveFocus();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  // Regression for the Week 8 debug challenge. userEvent.keyboard sends the key
  // to document.activeElement - exactly what a real browser does. Without a
  // focusable dialog (tabIndex) focus stays on the opener and this test fails.
  it('regression: Escape closes the lightbox via a real keyboard event', async () => {
    const user = userEvent.setup();
    open();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('restores focus to the opener after closing', async () => {
    const user = userEvent.setup();
    open();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Open photo in full screen' })).toHaveFocus();
  });

  it('closes when the backdrop is clicked but not when the image is', () => {
    const dialog = open();
    fireEvent.click(within(dialog).getByRole('img', { name: 'Property photo' }));
    expect(dialog).toBeInTheDocument();
    fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with the close button', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates with buttons and arrow keys, wrapping around', async () => {
    const user = userEvent.setup();
    const dialog = open();
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'Property photo' })).toHaveAttribute('src', 'https://img.test/2.jpg');
  });
});
