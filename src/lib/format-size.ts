const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Format bytes to human-readable string.
 * Examples: 0 -> "0 B", 1024 -> "1.0 KB", 4300 -> "4.2 KB"
 */
export function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B';

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    UNITS.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  const unit = UNITS[exponent]!;

  return exponent === 0
    ? `${bytes} ${unit}`
    : `${value.toFixed(1)} ${unit}`;
}
