import { fireEvent, render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error('boom');
  return <p>All good</p>;
}

describe('ErrorBoundary', () => {
  let consoleError;
  beforeEach(() => {
    shouldThrow = true;
    // React logs caught render errors; silence that expected noise for these tests only.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  it('renders children when nothing throws', () => {
    shouldThrow = false;
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows a recovery UI instead of crashing when a child throws', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('recovers when "Try again" is clicked and the problem is gone', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('clears the error automatically when resetKey changes (route change)', () => {
    const { rerender } = render(<ErrorBoundary resetKey="/a"><Bomb /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    shouldThrow = false;
    rerender(<ErrorBoundary resetKey="/b"><Bomb /></ErrorBoundary>);
    expect(screen.getByText('All good')).toBeInTheDocument();
  });
});
