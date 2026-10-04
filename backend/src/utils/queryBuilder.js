const { HttpError } = require('./errors');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// sortBy must be one of these ACTUAL rets_property column names. The key is
// what the client may send; the value is what gets interpolated into SQL. A
// client-supplied string never reaches ORDER BY unless it is a key of this map.
const SORT_COLUMNS = Object.freeze({
  L_SystemPrice: 'L_SystemPrice',
  ListingContractDate: 'ListingContractDate',
  LM_Int2_3: 'LM_Int2_3',
  L_Keyword2: 'L_Keyword2',
});

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

function asInt(name, raw, { min, max }) {
  const s = String(raw).trim();
  if (!/^\d+$/.test(s)) throw new HttpError(400, `${name} must be a non-negative integer`);
  const n = Number(s);
  if (n < min || n > max) throw new HttpError(400, `${name} must be between ${min} and ${max}`);
  return n;
}

function asBaths(raw) {
  const s = String(raw).trim();
  if (!/^\d+(\.\d)?$/.test(s)) throw new HttpError(400, 'baths must be a non-negative number');
  const n = Number(s);
  if (n > 50) throw new HttpError(400, 'baths must be between 0 and 50');
  return n;
}

/**
 * Validate raw input and return normalised filters. Blank values (undefined,
 * null, '') are dropped so they can never reach SQL as NULL placeholders. The
 * same function is meant to be reused for validated AI output.
 */
function parseFilters(input = {}) {
  const f = {};
  if (!isBlank(input.city)) {
    const city = String(input.city).trim();
    if (city.length > 50) throw new HttpError(400, 'city must be at most 50 characters');
    f.city = city;
  }
  if (!isBlank(input.zipcode)) {
    const zip = String(input.zipcode).trim();
    if (!/^\d{5}(-\d{4})?$/.test(zip)) throw new HttpError(400, 'zipcode must be 5 digits (or ZIP+4)');
    f.zipcode = zip;
  }
  if (!isBlank(input.minPrice)) f.minPrice = asInt('minPrice', input.minPrice, { min: 0, max: 2147483647 });
  if (!isBlank(input.maxPrice)) f.maxPrice = asInt('maxPrice', input.maxPrice, { min: 0, max: 2147483647 });
  if (f.minPrice !== undefined && f.maxPrice !== undefined && f.minPrice > f.maxPrice) {
    throw new HttpError(400, 'minPrice cannot be greater than maxPrice');
  }
  if (!isBlank(input.beds)) f.beds = asInt('beds', input.beds, { min: 0, max: 50 });
  if (!isBlank(input.baths)) f.baths = asBaths(input.baths);
  return f;
}

function parsePaging(input = {}) {
  return {
    limit: isBlank(input.limit) ? DEFAULT_LIMIT : asInt('limit', input.limit, { min: 1, max: MAX_LIMIT }),
    offset: isBlank(input.offset) ? 0 : asInt('offset', input.offset, { min: 0, max: 100000000 }),
  };
}

function parseSort(input = {}) {
  const hasBy = !isBlank(input.sortBy);
  const hasOrder = !isBlank(input.sortOrder);
  if (!hasBy && !hasOrder) return null;
  const by = hasBy ? String(input.sortBy).trim() : 'ListingContractDate';
  if (!Object.prototype.hasOwnProperty.call(SORT_COLUMNS, by)) {
    throw new HttpError(400, `sortBy must be one of: ${Object.keys(SORT_COLUMNS).join(', ')}`);
  }
  const order = hasOrder ? String(input.sortOrder).trim().toLowerCase() : 'asc';
  if (order !== 'asc' && order !== 'desc') throw new HttpError(400, 'sortOrder must be asc or desc');
  return { column: SORT_COLUMNS[by], order: order.toUpperCase() };
}

/**
 * Build the WHERE clause as parallel conditions[] / values[] arrays.
 *
 * The SAME `values` array feeds the COUNT query; the data query copies it and
 * appends LIMIT/OFFSET afterwards. The classic bug is pushing LIMIT/OFFSET (or
 * a second copy of a filter) into `values` before COUNT runs, which shifts
 * every placeholder and silently yields the wrong total.
 */
function buildWhere(f) {
  const conditions = [];
  const values = [];
  if (f.city) { conditions.push('L_City = ?'); values.push(f.city); }
  if (f.zipcode) { conditions.push('L_Zip = ?'); values.push(f.zipcode); }
  if (f.minPrice !== undefined) { conditions.push('L_SystemPrice >= ?'); values.push(f.minPrice); }
  if (f.maxPrice !== undefined) { conditions.push('L_SystemPrice <= ?'); values.push(f.maxPrice); }
  if (f.beds !== undefined) { conditions.push('L_Keyword2 >= ?'); values.push(f.beds); }
  if (f.baths !== undefined) { conditions.push('LM_Dec_3 >= ?'); values.push(f.baths); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, values };
}

// `col IS NULL` first pushes NULLs last in both directions; `id` makes the
// order total so pages never repeat or skip rows between requests.
function buildOrderBy(sort) {
  if (!sort) return 'ORDER BY id ASC';
  return `ORDER BY ${sort.column} IS NULL, ${sort.column} ${sort.order}, id ASC`;
}

module.exports = {
  SORT_COLUMNS,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parseFilters,
  parsePaging,
  parseSort,
  buildWhere,
  buildOrderBy,
};
