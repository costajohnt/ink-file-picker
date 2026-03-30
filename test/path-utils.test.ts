import { describe, it, expect } from 'vitest';
import { safePath, truncatePath } from '../src/lib/path-utils.js';
import { resolve } from 'node:path';

describe('safePath', () => {
  it('resolves relative paths', () => {
    const result = safePath('foo/bar');
    expect(result).toBe(resolve('foo/bar'));
  });

  it('clamps to root when path escapes', () => {
    const root = '/home/user/project';
    const result = safePath('/etc/passwd', root);
    expect(result).toBe(resolve(root));
  });

  it('allows paths within root', () => {
    const root = '/home/user/project';
    const result = safePath('/home/user/project/src/index.ts', root);
    expect(result).toBe(resolve('/home/user/project/src/index.ts'));
  });

  it('resolves absolute paths without root', () => {
    const result = safePath('/tmp/test');
    expect(result).toBe('/tmp/test');
  });

  it('clamps path traversal attempts', () => {
    const root = '/home/user/project';
    const result = safePath('/home/user/project/../../etc/passwd', root);
    expect(result).toBe(resolve(root));
  });
});

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
