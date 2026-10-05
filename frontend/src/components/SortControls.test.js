import { fireEvent, render, screen } from '@testing-library/react';
import SortControls, { SORT_OPTIONS } from './SortControls';

describe('SortControls', () => {
  it('offers price, date listed, square footage and beds in both directions', () => {
    render(<SortControls value="" onChange={() => {}} />);
    const values = SORT_OPTIONS.map((o) => o.value).filter(Boolean);
    expect([...values].sort()).toEqual([
      'L_Keyword2:asc', 'L_Keyword2:desc', 'L_SystemPrice:asc', 'L_SystemPrice:desc',
      'ListingContractDate:asc', 'ListingContractDate:desc', 'LM_Int2_3:asc', 'LM_Int2_3:desc',
    ].sort());
    expect(screen.getAllByRole('option')).toHaveLength(SORT_OPTIONS.length);
  });

  it('reports the selected value', () => {
    const onChange = jest.fn();
    render(<SortControls value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'L_SystemPrice:asc' } });
    expect(onChange).toHaveBeenCalledWith('L_SystemPrice:asc');
  });

  it('reflects the current value', () => {
    render(<SortControls value="L_Keyword2:desc" onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('L_Keyword2:desc');
  });
});
