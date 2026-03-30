import { describe, it, expect } from 'vitest';
import { truncatePath } from '../src/lib/path-utils.js';

describe('truncatePath', () => {
  it('returns short paths unchanged', () => {
    expect(truncatePath('/foo/bar', 50)).toBe('/foo/bar');
  });

  it('truncates long paths with ellipsis prefix', () => {
    const longPath = '/Users/john/projects/big-app/src/components/deep/nested';
    const result = truncatePath(longPath, 30);
    expect(result.startsWith('...')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(33); // 30 + "..."
  });

  it('handles root path', () => {
    expect(truncatePath('/', 50)).toBe('/');
  });

  it('shows at least the last segment', () => {
    const longPath = '/a/b/c/d/e/f/g/h/i/j/very-long-directory-name';
    const result = truncatePath(longPath, 10);
    expect(result).toContain('very-long-directory-name');
  });
});
