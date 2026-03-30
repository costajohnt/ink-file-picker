import { describe, it, expect } from 'vitest';
import { formatSize } from '../src/lib/format-size.js';

describe('formatSize', () => {
  it('formats 0 bytes', () => {
    expect(formatSize(0)).toBe('0 B');
  });

  it('formats bytes (< 1024)', () => {
    expect(formatSize(500)).toBe('500 B');
    expect(formatSize(1)).toBe('1 B');
    expect(formatSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(4300)).toBe('4.2 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatSize(1048576)).toBe('1.0 MB');
    expect(formatSize(5242880)).toBe('5.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatSize(1073741824)).toBe('1.0 GB');
  });

  it('treats negative bytes as 0 B', () => {
    expect(formatSize(-1)).toBe('0 B');
    expect(formatSize(-1024)).toBe('0 B');
  });
});
