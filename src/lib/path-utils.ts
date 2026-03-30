/**
 * Truncate a path for display, showing the last N segments.
 * "/Users/john/projects/big-app/src/components" -> ".../src/components"
 */
export function truncatePath(fullPath: string, maxLength: number): string {
  if (fullPath.length <= maxLength) return fullPath;

  const segments = fullPath.split('/').filter(Boolean);
  let result = '';

  for (let i = segments.length - 1; i >= 0; i--) {
    const candidate = '/' + segments.slice(i).join('/');
    if (candidate.length + 3 > maxLength) {
      break;
    }
    result = candidate;
  }

  return result ? '...' + result : '.../' + (segments[segments.length - 1] ?? '');
}
