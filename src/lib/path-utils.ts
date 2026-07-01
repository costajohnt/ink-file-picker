import { sep } from 'node:path';

/**
 * Truncate a path for display, showing the last N segments.
 * "/Users/john/projects/big-app/src/components" -> ".../src/components"
 *
 * Splits on the platform path separator (node:path `sep`) so it stays correct
 * on Windows, where paths are built with backslashes via node:path.join.
 */
export function truncatePath(fullPath: string, maxLength: number): string {
  if (fullPath.length <= maxLength) return fullPath;

  const segments = fullPath.split(sep).filter(Boolean);
  let result = '';

  for (let i = segments.length - 1; i >= 0; i--) {
    const candidate = sep + segments.slice(i).join(sep);
    if (candidate.length + 3 > maxLength) {
      break;
    }
    result = candidate;
  }

  return result ? '...' + result : '...' + sep + (segments[segments.length - 1] ?? '');
}
