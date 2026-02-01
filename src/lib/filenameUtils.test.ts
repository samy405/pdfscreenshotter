import { describe, it, expect } from 'vitest';
import { sanitizeFilenamePrefix } from './filenameUtils';

describe('sanitizeFilenamePrefix', () => {
  it('removes invalid Windows chars', () => {
    expect(sanitizeFilenamePrefix('file/name')).toBe('filename');
    expect(sanitizeFilenamePrefix('file\\name')).toBe('filename');
    expect(sanitizeFilenamePrefix('file:name')).toBe('filename');
    expect(sanitizeFilenamePrefix('file*name')).toBe('filename');
    expect(sanitizeFilenamePrefix('file?name')).toBe('filename');
    expect(sanitizeFilenamePrefix('file"name')).toBe('filename');
    expect(sanitizeFilenamePrefix('file<name')).toBe('filename');
    expect(sanitizeFilenamePrefix('file>name')).toBe('filename');
    expect(sanitizeFilenamePrefix('file|name')).toBe('filename');
  });

  it('collapses whitespace', () => {
    expect(sanitizeFilenamePrefix('file   name')).toBe('file name');
    expect(sanitizeFilenamePrefix('  file  name  ')).toBe('file name');
  });

  it('trims', () => {
    expect(sanitizeFilenamePrefix('  filename  ')).toBe('filename');
  });

  it('returns empty for invalid-only input', () => {
    expect(sanitizeFilenamePrefix('/\\:*?"<>|')).toBe('');
    expect(sanitizeFilenamePrefix('   ')).toBe('');
  });

  it('preserves valid chars', () => {
    expect(sanitizeFilenamePrefix('my-document_123')).toBe('my-document_123');
  });
});
