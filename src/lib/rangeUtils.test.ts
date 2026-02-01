import { describe, it, expect } from 'vitest';
import {
  createRangeId,
  validateRange,
  validateRanges,
  normalizeRangesForExport,
  expandRangesToPages,
  formatPageListForDisplay,
  type PageRange,
} from './rangeUtils';

describe('createRangeId', () => {
  it('returns unique ids', () => {
    const a = createRangeId();
    const b = createRangeId();
    expect(a).toMatch(/^range-\d+-[a-z0-9]+$/);
    expect(b).toMatch(/^range-\d+-[a-z0-9]+$/);
    expect(a).not.toBe(b);
  });
});

describe('validateRange', () => {
  const numPages = 10;

  it('accepts valid range', () => {
    expect(validateRange({ id: '1', start: '2', end: '5' }, numPages)).toBeNull();
  });

  it('rejects empty start', () => {
    expect(validateRange({ id: '1', start: '', end: '5' }, numPages)).toBe(
      'All range fields must be filled.'
    );
  });

  it('rejects empty end', () => {
    expect(validateRange({ id: '1', start: '2', end: '' }, numPages)).toBe(
      'All range fields must be filled.'
    );
  });

  it('rejects start < 1', () => {
    expect(validateRange({ id: '1', start: '0', end: '5' }, numPages)).toBe(
      'Start page must be at least 1.'
    );
  });

  it('rejects end > numPages', () => {
    expect(validateRange({ id: '1', start: '2', end: '11' }, numPages)).toBe(
      'End page cannot exceed 10.'
    );
  });

  it('rejects start > end', () => {
    expect(validateRange({ id: '1', start: '5', end: '3' }, numPages)).toBe(
      'Start page must be less than or equal to end page.'
    );
  });
});

describe('validateRanges', () => {
  const numPages = 10;

  it('accepts empty array as invalid (needs at least one)', () => {
    expect(validateRanges([], numPages)).toBe('At least one range is required.');
  });

  it('accepts valid ranges', () => {
    expect(
      validateRanges(
        [
          { id: '1', start: '2', end: '3' },
          { id: '2', start: '5', end: '6' },
        ],
        numPages
      )
    ).toBeNull();
  });

  it('returns first error', () => {
    expect(
      validateRanges(
        [
          { id: '1', start: '2', end: '5' },
          { id: '2', start: '', end: '6' },
        ],
        numPages
      )
    ).toBe('All range fields must be filled.');
  });
});

describe('normalizeRangesForExport', () => {
  it('merges overlapping ranges', () => {
    const ranges: PageRange[] = [
      { id: '1', start: '2', end: '5' },
      { id: '2', start: '4', end: '7' },
    ];
    expect(normalizeRangesForExport(ranges)).toEqual([{ start: 2, end: 7 }]);
  });

  it('merges adjacent ranges', () => {
    const ranges: PageRange[] = [
      { id: '1', start: '2', end: '3' },
      { id: '2', start: '4', end: '6' },
    ];
    expect(normalizeRangesForExport(ranges)).toEqual([{ start: 2, end: 6 }]);
  });

  it('keeps separate non-overlapping ranges', () => {
    const ranges: PageRange[] = [
      { id: '1', start: '2', end: '3' },
      { id: '2', start: '5', end: '6' },
    ];
    expect(normalizeRangesForExport(ranges)).toEqual([
      { start: 2, end: 3 },
      { start: 5, end: 6 },
    ]);
  });

  it('normalizes reversed start/end', () => {
    const ranges: PageRange[] = [{ id: '1', start: '5', end: '2' }];
    expect(normalizeRangesForExport(ranges)).toEqual([{ start: 2, end: 5 }]);
  });
});

describe('expandRangesToPages', () => {
  it('expands single range', () => {
    const ranges: PageRange[] = [{ id: '1', start: '2', end: '4' }];
    expect(expandRangesToPages(ranges)).toEqual([2, 3, 4]);
  });

  it('expands and dedupes overlapping ranges', () => {
    const ranges: PageRange[] = [
      { id: '1', start: '2', end: '4' },
      { id: '2', start: '4', end: '6' },
    ];
    expect(expandRangesToPages(ranges)).toEqual([2, 3, 4, 5, 6]);
  });

  it('returns sorted unique pages', () => {
    const ranges: PageRange[] = [
      { id: '1', start: '5', end: '6' },
      { id: '2', start: '2', end: '3' },
    ];
    expect(expandRangesToPages(ranges)).toEqual([2, 3, 5, 6]);
  });

  it('skips invalid ranges', () => {
    const ranges: PageRange[] = [
      { id: '1', start: '2', end: '3' },
      { id: '2', start: '', end: '6' },
      { id: '3', start: '5', end: '6' },
    ];
    expect(expandRangesToPages(ranges)).toEqual([2, 3, 5, 6]);
  });
});

describe('formatPageListForDisplay', () => {
  it('formats short list', () => {
    expect(formatPageListForDisplay([2, 3, 5, 6])).toBe('2, 3, 5, 6');
  });

  it('truncates long list', () => {
    expect(formatPageListForDisplay([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 8)).toBe(
      '1, 2, 3, 4, 5, 6, 7, 8, …'
    );
  });

  it('returns empty for empty', () => {
    expect(formatPageListForDisplay([])).toBe('');
  });
});
