export const ELLIPSIS_START = 'ellipsis-start';
export const ELLIPSIS_END = 'ellipsis-end';

/**
 * Page items to render, e.g. [1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 24].
 *
 * Strategy: always show first and last page, plus a window of pages around the
 * current one. Near either edge the window is widened so the list keeps a
 * constant length (7) and never shifts as the user clicks. The first/last pages
 * are added exactly once, which is what prevents "1 ... 2 3 4 ... 1" when
 * current is close to the end (the old code appended `total` unconditionally).
 */
export function getPageNumbers(current, total) {
  if (!Number.isInteger(total) || total < 1) return [];
  const page = Math.min(Math.max(Number(current) || 1, 1), total);

  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  let start;
  let end;
  if (page <= 4) {
    start = 2;
    end = 5;
  } else if (page >= total - 3) {
    start = total - 4;
    end = total - 1;
  } else {
    start = page - 1;
    end = page + 1;
  }

  const items = [1];
  if (start > 2) items.push(ELLIPSIS_START);
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < total - 1) items.push(ELLIPSIS_END);
  items.push(total);
  return items;
}
