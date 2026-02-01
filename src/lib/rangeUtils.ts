export type PageRange = { id: string; start: number; end: number };

/** Generate a unique id for a new range. */
export function createRangeId(): string {
  return `range-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Validate ranges for export. Returns error message or null if valid. */
export function validateRanges(ranges: PageRange[], numPages: number): string | null {
  if (ranges.length === 0) return 'At least one range is required.';
  for (const r of ranges) {
    if (r.start == null || r.end == null || Number.isNaN(r.start) || Number.isNaN(r.end)) {
      return 'All range fields must be filled.';
    }
    if (r.start < 1) return 'Start page must be at least 1.';
    if (r.end > numPages) return `End page cannot exceed ${numPages}.`;
    if (r.start > r.end) return 'Start page must be less than or equal to end page.';
  }
  return null;
}

type NormalizedRange = { start: number; end: number };

/**
 * Merge overlapping and adjacent ranges for export.
 * Internal only; does not mutate input.
 */
export function normalizeRangesForExport(ranges: PageRange[]): NormalizedRange[] {
  const sorted = [...ranges]
    .map((r) => ({ start: Math.min(r.start, r.end), end: Math.max(r.start, r.end) }))
    .sort((a, b) => a.start - b.start);

  const merged: NormalizedRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end + 1) {
      merged.push({ start: r.start, end: r.end });
    } else {
      last.end = Math.max(last.end, r.end);
    }
  }
  return merged;
}

/**
 * Convert ranges to a sorted list of unique page numbers.
 * Overlapping/adjacent ranges are merged internally.
 */
export function expandRangesToPages(ranges: PageRange[]): number[] {
  const normalized = normalizeRangesForExport(ranges);
  const pages: number[] = [];
  for (const { start, end } of normalized) {
    for (let p = start; p <= end; p++) pages.push(p);
  }
  return [...new Set(pages)].sort((a, b) => a - b);
}

/** Format page list for display, with truncation. */
export function formatPageListForDisplay(pages: number[], maxShow = 8): string {
  if (pages.length === 0) return '';
  if (pages.length <= maxShow) return pages.join(', ');
  return pages.slice(0, maxShow).join(', ') + ', …';
}
