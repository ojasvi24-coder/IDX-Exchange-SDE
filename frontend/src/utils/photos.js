/**
 * L_Photos comes from an MLS feed and is untrusted: it may be a JSON array
 * string, '', null, malformed JSON, or JSON of the wrong type. Never throws.
 */
export function parsePhotos(raw) {
  let value = raw;
  if (typeof raw === 'string') {
    if (raw.trim() === '') return [];
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value.filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url.trim())).map((u) => u.trim());
}
