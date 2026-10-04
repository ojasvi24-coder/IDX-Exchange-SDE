import {
  cleanParams, fetchOpenHouses, fetchProperties, fetchPropertyDetail,
} from './client';

const okResponse = (body) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('fetchProperties', () => {
  it('returns parsed JSON on success', async () => {
    global.fetch.mockResolvedValue(okResponse({ total: 1, results: [{ id: 1 }] }));
    await expect(fetchProperties({ city: 'Irvine' })).resolves.toEqual({ total: 1, results: [{ id: 1 }] });
    expect(global.fetch).toHaveBeenCalledWith('/api/properties?city=Irvine', { signal: undefined });
  });

  it('omits empty, null and undefined params from the query string', async () => {
    global.fetch.mockResolvedValue(okResponse({}));
    await fetchProperties({
      city: 'Irvine', zipcode: '', beds: undefined, baths: null, minPrice: 0,
    });
    expect(global.fetch.mock.calls[0][0]).toBe('/api/properties?city=Irvine&minPrice=0');
  });

  it('throws the backend error message on an HTTP error', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 400, json: async () => ({ error: 'minPrice must be a non-negative integer' }),
    });
    await expect(fetchProperties({ minPrice: 'abc' })).rejects.toMatchObject({
      message: 'minPrice must be a non-negative integer',
      status: 400,
    });
  });

  it('falls back to a status message when the error body is not JSON', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 502, json: async () => { throw new Error('not json'); },
    });
    await expect(fetchProperties()).rejects.toThrow('Request failed (502)');
  });

  it('throws a friendly message when the network request fails', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchProperties()).rejects.toThrow(/Unable to reach the server/);
  });

  it('rethrows aborts untouched so callers can ignore them', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    global.fetch.mockRejectedValue(abort);
    await expect(fetchProperties()).rejects.toBe(abort);
  });
});

describe('detail endpoints', () => {
  it('fetchPropertyDetail encodes the id', async () => {
    global.fetch.mockResolvedValue(okResponse({ L_ListingID: 'a/b' }));
    await fetchPropertyDetail('a/b');
    expect(global.fetch.mock.calls[0][0]).toBe('/api/properties/a%2Fb');
  });

  it('fetchOpenHouses hits the openhouses route', async () => {
    global.fetch.mockResolvedValue(okResponse([]));
    await expect(fetchOpenHouses('X1')).resolves.toEqual([]);
    expect(global.fetch.mock.calls[0][0]).toBe('/api/properties/X1/openhouses');
  });
});

describe('cleanParams', () => {
  it('keeps zero but drops whitespace-only strings', () => {
    expect(cleanParams({ a: 0, b: '  ', c: 'x' })).toEqual({ a: 0, c: 'x' });
  });
});
