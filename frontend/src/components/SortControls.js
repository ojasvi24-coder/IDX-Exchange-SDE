import PropTypes from 'prop-types';

// `value` is "<sortBy>:<sortOrder>" using the REAL rets_property column names
// the backend whitelists (not RESO names such as ListPrice).
export const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'ListingContractDate:desc', label: 'Newest listed' },
  { value: 'ListingContractDate:asc', label: 'Oldest listed' },
  { value: 'L_SystemPrice:asc', label: 'Price: low to high' },
  { value: 'L_SystemPrice:desc', label: 'Price: high to low' },
  { value: 'LM_Int2_3:desc', label: 'Square feet: largest first' },
  { value: 'LM_Int2_3:asc', label: 'Square feet: smallest first' },
  { value: 'L_Keyword2:desc', label: 'Beds: most first' },
  { value: 'L_Keyword2:asc', label: 'Beds: fewest first' },
];

export default function SortControls({ value, onChange }) {
  return (
    <label className="sort">
      Sort by
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

SortControls.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};
