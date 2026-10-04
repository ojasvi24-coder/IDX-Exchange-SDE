import { fireEvent, render, screen } from '@testing-library/react';
import Pagination from './Pagination';

const setup = (currentPage, totalPages) => {
  const onPageChange = jest.fn();
  const view = render(<Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />);
  return { onPageChange, ...view };
};

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = setup(1, 1);
    expect(container).toBeEmptyDOMElement();
  });

  it('disables Previous on the first page', () => {
    setup(1, 5);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('disables Next on the last page', () => {
    setup(5, 5);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  it('calls onPageChange for Previous, Next and numbered buttons', () => {
    const { onPageChange } = setup(3, 5);
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page 5' }));
    expect(onPageChange.mock.calls.map((c) => c[0])).toEqual([2, 4, 5]);
  });

  it('marks the current page', () => {
    setup(3, 5);
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute('aria-current');
  });

  it('shows ellipses for large page counts: 1 ... 4 5 6 ... 24', () => {
    setup(5, 24);
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav.textContent).toBe('Previous1…456…24Next');
  });

  it('first, last and middle pages navigate correctly', () => {
    const { onPageChange } = setup(12, 24);
    fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page 24' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page 13' }));
    expect(onPageChange.mock.calls.map((c) => c[0])).toEqual([1, 24, 13]);
  });

  it('near the end shows no duplicate last page', () => {
    setup(4, 4);
    expect(screen.getAllByRole('button', { name: 'Page 4' })).toHaveLength(1);
  });
});
