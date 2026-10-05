import { render, screen } from '@testing-library/react';
import OpenHouseList from './OpenHouseList';

const oh = (overrides) => ({
  id: 1,
  OpenHouseDate: '2026-09-27',
  OH_StartTime: '13:30:00',
  OH_EndTime: '15:30:00',
  all_data: JSON.stringify({ OpenHouseRemarks: 'Refreshments served' }),
  ...overrides,
});

describe('OpenHouseList', () => {
  it('shows the empty message when there are no open houses', () => {
    render(<OpenHouseList openHouses={[]} />);
    expect(screen.getByText('No open houses scheduled')).toBeInTheDocument();
  });

  it('shows date, formatted start/end time and remarks extracted from all_data', () => {
    render(<OpenHouseList openHouses={[oh()]} />);
    expect(screen.getByText('Sun, Sep 27, 2026, 1:30 PM – 3:30 PM')).toBeInTheDocument();
    expect(screen.getByText('Refreshments served')).toBeInTheDocument();
  });

  it.each([
    ['null remarks', JSON.stringify({ OpenHouseRemarks: null })],
    ['malformed JSON', '{not json'],
    ['empty string', ''],
    ['null all_data', null],
  ])('omits remarks safely for %s', (_name, allData) => {
    render(<OpenHouseList openHouses={[oh({ all_data: allData })]} />);
    expect(screen.getByText(/Sep 27, 2026/)).toBeInTheDocument();
    expect(screen.queryByText('Refreshments served')).not.toBeInTheDocument();
  });

  it('renders multiple events in the given order', () => {
    render(<OpenHouseList openHouses={[oh({ id: 1 }), oh({ id: 2, OpenHouseDate: '2026-09-28', all_data: '{}' })]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
