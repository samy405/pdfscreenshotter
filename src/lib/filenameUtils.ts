/** Characters invalid in Windows filenames: \ / : * ? " < > | */
const INVALID_CHARS = /[\\/:*?"<>|]/g;
const WHITESPACE = /\s+/g;

/**
 * Sanitize a string for use as a filename prefix on Windows.
 * Removes \/:\*?"<>| and collapses consecutive whitespace to a single space.
 */
export function sanitizeFilenamePrefix(prefix: string): string {
  return prefix
    .replace(INVALID_CHARS, '')
    .replace(WHITESPACE, ' ')
    .trim();
}
