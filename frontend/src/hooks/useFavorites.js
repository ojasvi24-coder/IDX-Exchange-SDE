import { useCallback, useMemo, useSyncExternalStore } from 'react';

// All localStorage access for favorites lives in this file.
const STORAGE_KEY = 'idx.favorites.v1';

const listeners = new Set();
let cachedRaw = null;
let cachedValue = [];

function read() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode etc.): behave as if empty.
  }
  // useSyncExternalStore requires a referentially stable snapshot, so only
  // re-parse when the stored string actually changed.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      cachedValue = Array.isArray(parsed) ? parsed.filter((p) => p && p.L_ListingID) : [];
    } catch {
      cachedValue = [];
    }
  }
  return cachedValue;
}

function write(next) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota/blocked: keep the in-memory value so the UI still responds.
    cachedRaw = null;
    cachedValue = next;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Favorited listings, persisted in localStorage and shared across components. */
export default function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, () => []);
  const ids = useMemo(() => new Set(favorites.map((p) => p.L_ListingID)), [favorites]);

  const isFavorite = useCallback((id) => ids.has(id), [ids]);

  // The whole listing is stored so the Favorites view can render offline from
  // the snapshot without refetching every property.
  const toggleFavorite = useCallback((property) => {
    const current = read();
    const exists = current.some((p) => p.L_ListingID === property.L_ListingID);
    write(exists ? current.filter((p) => p.L_ListingID !== property.L_ListingID) : [...current, property]);
  }, []);

  return { favorites, count: favorites.length, isFavorite, toggleFavorite };
}
