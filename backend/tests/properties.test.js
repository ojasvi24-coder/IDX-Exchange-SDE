jest.mock('../src/db/pool', () => ({ query: jest.fn() }));

const request = require('supertest');
const pool = require('../src/db/pool');
const createApp = require('../src/app');

const app = createApp({ logger: (_req, _res, next) => next() });

const placeholders = (sql) => (sql.match(/\?/g) || []).length;

// Behaves like MySQL for the one thing that matters here: the number of `?`
// placeholders must equal the number of bound values, otherwise the query fails
// (or, with off-by-one ordering bugs, silently filters on the wrong values).
function mockDb({ total = 0, rows = [], detail = [], openhouses = [] } = {}) {
  pool.query.mockImplementation(async (sql, values = []) => {
    if (placeholders(sql) !== values.length) {
      throw new Error(`placeholder mismatch: ${placeholders(sql)} vs ${values.length}`);
    }
    if (/COUNT\(\*\)/.test(sql)) return [[{ total }]];
    if (/FROM rets_openhouse/.test(sql)) return [openhouses];
    if (/LIMIT \? OFFSET \?/.test(sql)) return [rows];
    return [detail];
  });
}

const callMatching = (re) => pool.query.mock.calls.find(([sql]) => re.test(sql));

beforeEach(() => pool.query.mockReset());

describe('GET /api/properties', () => {
  it('returns paginated results with total and defaults (limit 20, offset 0)', async () => {
    mockDb({ total: 87, rows: [{ id: 1 }] });
    const res = await request(app).get('/api/properties');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 87, limit: 20, offset: 0, results: [{ id: 1 }] });
  });

  it('passes limit and offset to the data query only', async () => {
    mockDb({ total: 100 });
    await request(app).get('/api/properties?limit=10&offset=20');
    const [, dataValues] = callMatching(/LIMIT \? OFFSET \?/);
    const [, countValues] = callMatching(/COUNT/);
    expect(dataValues).toEqual([10, 20]);
    expect(countValues).toEqual([]);
  });

  it('applies the city filter with a parameterised, trimmed value', async () => {
    mockDb();
    await request(app).get('/api/properties?city=%20Irvine%20');
    const [sql, values] = callMatching(/COUNT/);
    expect(sql).toContain('WHERE L_City = ?');
    expect(values).toEqual(['Irvine']);
  });

  it('applies zipcode, price range, beds and baths filters together', async () => {
    mockDb();
    await request(app).get('/api/properties?zipcode=92618&minPrice=100&maxPrice=900&beds=2&baths=1.5');
    const [sql, values] = callMatching(/COUNT/);
    expect(sql).toContain('L_Zip = ? AND L_SystemPrice >= ? AND L_SystemPrice <= ? AND L_Keyword2 >= ? AND LM_Dec_3 >= ?');
    expect(values).toEqual(['92618', 100, 900, 2, 1.5]);
  });

  // Regression for the Week 3 debug challenge: minPrice + beds gave a wrong
  // total because the COUNT query received a different values array than the
  // data query (LIMIT/OFFSET leaked in, shifting placeholders).
  it('regression: minPrice + beds binds identical filter values to COUNT and SELECT', async () => {
    mockDb({ total: 5, rows: [] });
    const res = await request(app).get('/api/properties?minPrice=300000&beds=3&limit=20&offset=0');
    expect(res.status).toBe(200);
    const [countSql, countValues] = callMatching(/COUNT/);
    const [dataSql, dataValues] = callMatching(/LIMIT \? OFFSET \?/);
    expect(countValues).toEqual([300000, 3]);
    expect(dataValues).toEqual([300000, 3, 20, 0]);
    expect(placeholders(countSql)).toBe(countValues.length);
    expect(placeholders(dataSql)).toBe(dataValues.length);
    expect(res.body.total).toBe(5);
  });

  it('ignores blank filter values', async () => {
    mockDb();
    await request(app).get('/api/properties?city=&beds=&minPrice=');
    const [sql, values] = callMatching(/COUNT/);
    expect(sql).not.toContain('WHERE');
    expect(values).toEqual([]);
  });

  it('returns an empty result set with total 0', async () => {
    mockDb({ total: 0, rows: [] });
    const res = await request(app).get('/api/properties?city=Nowhere');
    expect(res.body).toEqual({ total: 0, limit: 20, offset: 0, results: [] });
  });

  it.each([
    ['minPrice=abc'],
    ['maxPrice=-5'],
    ['minPrice=500&maxPrice=100'],
    ['limit=0'],
    ['limit=200'],
    ['limit=abc'],
    ['offset=-1'],
    ['beds=1.5'],
    ['baths=x'],
    ['zipcode=9261'],
    [`city=${'a'.repeat(51)}`],
  ])('rejects invalid input (%s) with 400 and never touches the database', async (qs) => {
    const res = await request(app).get(`/api/properties?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns 500 with a generic message when the database fails', async () => {
    pool.query.mockRejectedValue(new Error('ECONNREFUSED secret-host'));
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const res = await request(app).get('/api/properties');
    stderr.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('secret-host');
  });
});

describe('sorting', () => {
  it.each([
    ['L_SystemPrice', 'desc', 'ORDER BY L_SystemPrice IS NULL, L_SystemPrice DESC, id ASC'],
    ['ListingContractDate', 'asc', 'ORDER BY ListingContractDate IS NULL, ListingContractDate ASC, id ASC'],
    ['LM_Int2_3', 'DESC', 'ORDER BY LM_Int2_3 IS NULL, LM_Int2_3 DESC, id ASC'],
    ['L_Keyword2', 'asc', 'ORDER BY L_Keyword2 IS NULL, L_Keyword2 ASC, id ASC'],
  ])('sorts by %s %s using the real column', async (by, order, expected) => {
    mockDb();
    const res = await request(app).get(`/api/properties?sortBy=${by}&sortOrder=${order}`);
    expect(res.status).toBe(200);
    expect(callMatching(/LIMIT \? OFFSET \?/)[0]).toContain(expected);
  });

  it('defaults to a stable id ordering when no sort is given', async () => {
    mockDb();
    await request(app).get('/api/properties');
    expect(callMatching(/LIMIT \? OFFSET \?/)[0]).toContain('ORDER BY id ASC');
  });

  it.each([
    ['sortBy=ListPrice'],
    ['sortBy=L_SystemPrice;DROP TABLE rets_property'],
    ['sortBy=constructor'],
    ['sortBy=L_SystemPrice&sortOrder=sideways'],
  ])('rejects invalid sort (%s) with 400', async (qs) => {
    const res = await request(app).get(`/api/properties?${qs}`);
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe('GET /api/properties/:id', () => {
  it('returns the property', async () => {
    mockDb({ detail: [{ L_ListingID: 'ABC123', L_City: 'Irvine' }] });
    const res = await request(app).get('/api/properties/ABC123');
    expect(res.status).toBe(200);
    expect(res.body.L_City).toBe('Irvine');
    expect(pool.query.mock.calls[0][1]).toEqual(['ABC123']);
  });

  it('returns 404 for an unknown id', async () => {
    mockDb({ detail: [] });
    const res = await request(app).get('/api/properties/NOPE');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it.each([['bad%20id'], ['a'.repeat(65)], ['x;DROP']])('returns 400 for malformed id %s', async (id) => {
    const res = await request(app).get(`/api/properties/${id}`);
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns 500 on database failure', async () => {
    pool.query.mockRejectedValue(new Error('boom'));
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const res = await request(app).get('/api/properties/ABC123');
    stderr.mockRestore();
    expect(res.status).toBe(500);
  });
});

describe('GET /api/properties/:id/openhouses', () => {
  it('returns open houses ordered by date and start time', async () => {
    mockDb({ detail: [{ L_ListingID: 'ABC123' }], openhouses: [{ id: 1 }, { id: 2 }] });
    const res = await request(app).get('/api/properties/ABC123/openhouses');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1 }, { id: 2 }]);
    expect(callMatching(/rets_openhouse/)[0]).toContain('ORDER BY OpenHouseDate ASC, OH_StartTime ASC');
  });

  it('returns an empty array when the property has no open houses', async () => {
    mockDb({ detail: [{ L_ListingID: 'ABC123' }], openhouses: [] });
    const res = await request(app).get('/api/properties/ABC123/openhouses');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 404 for an unknown property', async () => {
    mockDb({ detail: [] });
    const res = await request(app).get('/api/properties/NOPE/openhouses');
    expect(res.status).toBe(404);
  });

  it('is routed to the open-house handler, not the detail handler', async () => {
    mockDb({ detail: [{ L_ListingID: 'ABC123' }], openhouses: [] });
    const res = await request(app).get('/api/properties/ABC123/openhouses');
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await request(app).get('/api/properties/bad$id/openhouses');
    expect(res.status).toBe(400);
  });

  it('returns 500 on database failure', async () => {
    pool.query.mockRejectedValue(new Error('boom'));
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const res = await request(app).get('/api/properties/ABC123/openhouses');
    stderr.mockRestore();
    expect(res.status).toBe(500);
  });
});
