/**
 * Latitude/longitude can be null, missing, 0 (placeholder for "unknown") or
 * come back as strings (DECIMAL columns). Returns {lat, lng} or null.
 */
export function parseCoordinates(latitude, longitude) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) return null;
  if (String(latitude).trim() === '' || String(longitude).trim() === '') return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 || lng === 0) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
