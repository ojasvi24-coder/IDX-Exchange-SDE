import { ELLIPSIS_END as E2, ELLIPSIS_START as E1, getPageNumbers } from './pagination';

describe('getPageNumbers', () => {
  it('returns nothing for zero pages and one page for a single page', () => {
    expect(getPageNumbers(1, 0)).toEqual([]);
    expect(getPageNumbers(1, 1)).toEqual([1]);
  });

  it('lists every page when they all fit', () => {
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('near the start: 1 2 3 4 5 ... N', () => {
    expect(getPageNumbers(1, 24)).toEqual([1, 2, 3, 4, 5, E2, 24]);
    expect(getPageNumbers(4, 24)).toEqual([1, 2, 3, 4, 5, E2, 24]);
  });

  it('in the middle: 1 ... 4 5 6 ... N', () => {
    expect(getPageNumbers(5, 24)).toEqual([1, E1, 4, 5, 6, E2, 24]);
    expect(getPageNumbers(12, 24)).toEqual([1, E1, 11, 12, 13, E2, 24]);
  });

  it('near the end: 1 ... N-4 .. N', () => {
    expect(getPageNumbers(21, 24)).toEqual([1, E1, 20, 21, 22, 23, 24]);
    expect(getPageNumbers(24, 24)).toEqual([1, E1, 20, 21, 22, 23, 24]);
  });

  // Regression: the old algorithm appended the last page unconditionally, giving
  // "1 ... 2 3 4 ... 1" for a 4-page result set (and similar near the end).
  it('regression: never duplicates the last page', () => {
    for (let total = 1; total <= 40; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const numbers = getPageNumbers(current, total).filter((i) => typeof i === 'number');
        expect(new Set(numbers).size).toBe(numbers.length);
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        expect(numbers[0]).toBe(1);
        expect(numbers[numbers.length - 1]).toBe(total);
        expect(numbers).toContain(current);
      }
    }
  });

  it('regression: the exact failing shapes render correctly', () => {
    expect(getPageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
    expect(getPageNumbers(3, 4)).toEqual([1, 2, 3, 4]);
  });

  it('only places an ellipsis where pages are actually skipped', () => {
    const violations = [];
    for (let total = 8; total <= 30; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const items = getPageNumbers(current, total);
        items.forEach((item, i) => {
          const isEllipsis = item === E1 || item === E2;
          // An ellipsis must hide at least one page, i.e. its neighbours differ by > 1.
          if (isEllipsis && items[i + 1] - items[i - 1] <= 2) violations.push({ total, current });
        });
      }
    }
    expect(violations).toEqual([]);
  });

  it('clamps out-of-range current pages', () => {
    expect(getPageNumbers(99, 10)).toEqual(getPageNumbers(10, 10));
    expect(getPageNumbers(0, 10)).toEqual(getPageNumbers(1, 10));
  });
});
