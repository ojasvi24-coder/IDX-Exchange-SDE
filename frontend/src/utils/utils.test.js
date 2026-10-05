import { parseCoordinates } from './coordinates';
import {
  formatAddress, formatBaths, formatBeds, formatDate, formatPrice, formatSqft, formatTime,
} from './format';
import { parseOpenHouseRemarks } from './openHouse';
import { parsePhotos } from './photos';

describe('parsePhotos', () => {
  it('parses a JSON array string', () => {
    expect(parsePhotos('["https://a/1.jpg","https://a/2.jpg"]')).toEqual(['https://a/1.jpg', 'https://a/2.jpg']);
  });

  it('accepts an already-parsed array', () => {
    expect(parsePhotos(['https://a/1.jpg'])).toEqual(['https://a/1.jpg']);
  });

  it.each([[null], [undefined], [''], ['   '], ['[broken'], ['null'], ['{"a":1}'], ['"str"'], [42]])(
    'returns [] for %p',
    (value) => expect(parsePhotos(value)).toEqual([]),
  );

  it('drops non-http entries', () => {
    expect(parsePhotos('["https://a/1.jpg", null, 5, "", "javascript:alert(1)"]')).toEqual(['https://a/1.jpg']);
  });
});

describe('parseOpenHouseRemarks', () => {
  it('extracts OpenHouseRemarks from the all_data JSON string', () => {
    expect(parseOpenHouseRemarks('{"OpenHouseRemarks":" Free pizza ","x":1}')).toBe('Free pizza');
  });

  it.each([[null], [''], ['{bad'], ['{"OpenHouseRemarks":null}'], ['{"OpenHouseRemarks":"  "}'], ['[]'], ['5']])(
    'returns null for %p',
    (value) => expect(parseOpenHouseRemarks(value)).toBeNull(),
  );

  it('accepts an already-parsed object', () => {
    expect(parseOpenHouseRemarks({ OpenHouseRemarks: 'Hi' })).toBe('Hi');
  });
});

describe('parseCoordinates', () => {
  it('accepts valid numbers and numeric strings', () => {
    expect(parseCoordinates(33.6, -117.8)).toEqual({ lat: 33.6, lng: -117.8 });
    expect(parseCoordinates('33.6000000', '-117.8000000')).toEqual({ lat: 33.6, lng: -117.8 });
  });

  it.each([
    [null, -117], [33, null], [undefined, undefined], [0, 0], [0, -117], [33, 0],
    ['abc', 1], ['', ''], [91, 10], [10, 181], [NaN, 5],
  ])('rejects (%p, %p)', (lat, lng) => expect(parseCoordinates(lat, lng)).toBeNull());
});

describe('formatters', () => {
  it('formats price and rejects null/zero', () => {
    expect(formatPrice(1234567)).toBe('$1,234,567');
    expect(formatPrice('950000')).toBe('$950,000');
    expect(formatPrice(null)).toBe('Price unavailable');
    expect(formatPrice(0)).toBe('Price unavailable');
  });

  it('formats beds, baths, sqft or returns null', () => {
    expect(formatBeds(1)).toBe('1 bed');
    expect(formatBeds(0)).toBe('0 beds');
    expect(formatBeds(null)).toBeNull();
    expect(formatBaths('2.5')).toBe('2.5 baths');
    expect(formatBaths(undefined)).toBeNull();
    expect(formatSqft(2000)).toBe('2,000 sqft');
    expect(formatSqft(0)).toBeNull();
  });

  it('formats addresses with missing parts', () => {
    expect(formatAddress({ L_Address: '1 A St', L_City: 'X', L_State: 'CA', L_Zip: '90210' }))
      .toEqual({ street: '1 A St', locality: 'X, CA 90210' });
    expect(formatAddress({})).toEqual({ street: 'Address unavailable', locality: '' });
  });

  it('formats times and dates without timezone drift', () => {
    expect(formatTime('13:30:00')).toBe('1:30 PM');
    expect(formatTime('00:05:00')).toBe('12:05 AM');
    expect(formatTime('12:00:00')).toBe('12:00 PM');
    expect(formatTime(null)).toBe('');
    expect(formatDate('2026-09-27')).toBe('Sun, Sep 27, 2026');
    expect(formatDate('garbage')).toBe('');
  });
});
