import { act, renderHook } from '@testing-library/react';
import useFavorites from './useFavorites';

const KEY = 'idx.favorites.v1';
const a = { L_ListingID: 'A1', L_Address: '1 A St' };
const b = { L_ListingID: 'B2', L_Address: '2 B St' };

beforeEach(() => window.localStorage.clear());

describe('useFavorites', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isFavorite('A1')).toBe(false);
  });

  it('favorites and unfavorites a listing, updating immediately', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite(a));
    expect(result.current.isFavorite('A1')).toBe(true);
    expect(result.current.count).toBe(1);
    act(() => result.current.toggleFavorite(a));
    expect(result.current.isFavorite('A1')).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('persists across a "refresh" (new hook instance reads localStorage)', () => {
    const { result, unmount } = renderHook(() => useFavorites());
    act(() => result.current.toggleFavorite(a));
    act(() => result.current.toggleFavorite(b));
    unmount();
    expect(JSON.parse(window.localStorage.getItem(KEY)).map((p) => p.L_ListingID)).toEqual(['A1', 'B2']);
    const { result: afterRefresh } = renderHook(() => useFavorites());
    expect(afterRefresh.current.favorites).toEqual([a, b]);
  });

  it('keeps every consumer in sync', () => {
    const { result: writer } = renderHook(() => useFavorites());
    const { result: reader } = renderHook(() => useFavorites());
    act(() => writer.current.toggleFavorite(a));
    expect(reader.current.isFavorite('A1')).toBe(true);
    expect(reader.current.count).toBe(1);
  });

  it.each([['not json'], ['{"a":1}'], ['[null, 5, {"x":1}]']])('ignores corrupt storage (%s)', (raw) => {
    window.localStorage.setItem(KEY, raw);
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it('picks up changes made in another tab', () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      window.localStorage.setItem(KEY, JSON.stringify([b]));
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    });
    expect(result.current.isFavorite('B2')).toBe(true);
  });

  it('still works in memory when localStorage throws', () => {
    const { result } = renderHook(() => useFavorites());
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    act(() => result.current.toggleFavorite(a));
    setItem.mockRestore();
    expect(result.current.isFavorite('A1')).toBe(true);
  });
});
