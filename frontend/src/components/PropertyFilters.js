import { useState } from 'react';
import PropTypes from 'prop-types';
import { cleanParams } from '../api/client';

const EMPTY = {
  city: '', zipcode: '', minPrice: '', maxPrice: '', beds: '', baths: '',
};

export default function PropertyFilters({ initialValues = {}, onSearch, onClear }) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Empty strings are removed so they are never sent to the API.
    onSearch(cleanParams(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]))));
  };

  const handleClear = () => {
    setValues(EMPTY);
    onClear();
  };

  return (
    <form className="filters" onSubmit={handleSubmit} aria-label="Property filters">
      <label>
        City
        <input name="city" type="text" value={values.city} onChange={handleChange} placeholder="e.g. Irvine" />
      </label>
      <label>
        ZIP
        <input name="zipcode" type="text" inputMode="numeric" value={values.zipcode} onChange={handleChange} placeholder="92618" />
      </label>
      <label>
        Min price
        <input name="minPrice" type="number" min="0" value={values.minPrice} onChange={handleChange} placeholder="No min" />
      </label>
      <label>
        Max price
        <input name="maxPrice" type="number" min="0" value={values.maxPrice} onChange={handleChange} placeholder="No max" />
      </label>
      <label>
        Beds (min)
        <input name="beds" type="number" min="0" value={values.beds} onChange={handleChange} placeholder="Any" />
      </label>
      <label>
        Baths (min)
        <input name="baths" type="number" min="0" step="0.5" value={values.baths} onChange={handleChange} placeholder="Any" />
      </label>
      <div className="filters__actions">
        <button type="submit" className="btn btn--primary">Search</button>
        <button type="button" className="btn" onClick={handleClear}>Clear Filters</button>
      </div>
    </form>
  );
}

PropertyFilters.propTypes = {
  initialValues: PropTypes.shape({
    city: PropTypes.string,
    zipcode: PropTypes.string,
    minPrice: PropTypes.string,
    maxPrice: PropTypes.string,
    beds: PropTypes.string,
    baths: PropTypes.string,
  }),
  onSearch: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};
