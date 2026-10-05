import { fireEvent, render, screen } from '@testing-library/react';
import PropertyFilters from './PropertyFilters';

const setup = (props = {}) => {
  const onSearch = jest.fn();
  const onClear = jest.fn();
  render(<PropertyFilters onSearch={onSearch} onClear={onClear} {...props} />);
  return { onSearch, onClear };
};

const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('PropertyFilters', () => {
  it('renders all six inputs plus Search and Clear', () => {
    setup();
    ['City', 'ZIP', 'Min price', 'Max price', 'Beds (min)', 'Baths (min)'].forEach((label) => {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
  });

  it('submits only the non-empty values, trimmed', () => {
    const { onSearch } = setup();
    type('City', '  Irvine ');
    type('Min price', '300000');
    type('Beds (min)', '3');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith({ city: 'Irvine', minPrice: '300000', beds: '3' });
  });

  it('combines every filter', () => {
    const { onSearch } = setup();
    type('City', 'Irvine');
    type('ZIP', '92618');
    type('Min price', '100');
    type('Max price', '900');
    type('Beds (min)', '2');
    type('Baths (min)', '1.5');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith({
      city: 'Irvine', zipcode: '92618', minPrice: '100', maxPrice: '900', beds: '2', baths: '1.5',
    });
  });

  it('submits an empty object when nothing is entered', () => {
    const { onSearch } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSearch).toHaveBeenCalledWith({});
  });

  it('Clear resets every input and calls onClear', () => {
    const { onClear } = setup();
    type('City', 'Irvine');
    type('Max price', '500000');
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    expect(screen.getByLabelText('City')).toHaveValue('');
    expect(screen.getByLabelText('Max price')).toHaveValue(null);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('pre-fills from initialValues', () => {
    setup({ initialValues: { city: 'Tustin', beds: '2' } });
    expect(screen.getByLabelText('City')).toHaveValue('Tustin');
    expect(screen.getByLabelText('Beds (min)')).toHaveValue(2);
  });
});
