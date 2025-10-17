/**
 * Format bytes to KB with commas, no decimals
 * @param bytes - File size in bytes
 * @returns Formatted string like "1,024 KB" or "34 KB"
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null || bytes === 0) {
    return '0 KB';
  }

  // Always convert to KB and round, no decimals
  const kb = Math.round(bytes / 1024);

  // Add commas for thousands
  return `${kb.toLocaleString()} KB`;
}

/**
 * Format bytes to MB specifically
 * @param bytes - File size in bytes
 * @returns Formatted string like "1.08 MB"
 */
export function formatBytesToMB(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null || bytes === 0) {
    return '0.00 MB';
  }

  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}
