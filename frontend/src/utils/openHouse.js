/**
 * `all_data` is a JSON blob stored as text; OpenHouseRemarks is a key inside
 * it, not a column. The blob can be null or malformed, so never throw.
 */
export function parseOpenHouseRemarks(allData) {
  let data = allData;
  if (typeof allData === 'string') {
    try {
      data = JSON.parse(allData);
    } catch {
      return null;
    }
  }
  if (!data || typeof data !== 'object') return null;
  const remarks = data.OpenHouseRemarks;
  return typeof remarks === 'string' && remarks.trim() !== '' ? remarks.trim() : null;
}
