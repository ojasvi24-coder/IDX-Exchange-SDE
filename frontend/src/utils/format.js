const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

// L_SystemPrice can be null or 0 in the data; neither is a real price.
export function formatPrice(value) {
  if (!isNum(value) || Number(value) <= 0) return 'Price unavailable';
  return `$${Number(value).toLocaleString('en-US')}`;
}

export function formatBeds(value) {
  if (!isNum(value)) return null;
  const n = Number(value);
  return `${n} ${n === 1 ? 'bed' : 'beds'}`;
}

export function formatBaths(value) {
  if (!isNum(value)) return null;
  const n = Number(value);
  return `${n} ${n === 1 ? 'bath' : 'baths'}`;
}

export function formatSqft(value) {
  if (!isNum(value) || Number(value) <= 0) return null;
  return `${Number(value).toLocaleString('en-US')} sqft`;
}

export function formatAddress(property) {
  const { L_Address: street, L_City: city, L_State: state, L_Zip: zip } = property;
  const locality = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return { street: street || 'Address unavailable', locality };
}

// 'HH:MM:SS' -> '1:30 PM'
export function formatTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || '');
  if (!match) return '';
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

// 'YYYY-MM-DD' -> 'Sat, Sep 27, 2026'. Parsed as UTC parts so the day never
// shifts with the viewer's timezone.
export function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}
