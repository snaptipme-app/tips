const API_BASE = 'https://snaptip.me';

/**
 * Returns an Image-compatible source for any photo value from the backend.
 *
 * Handles:
 *   - null / undefined / empty  →  fallback initials icon (return null)
 *   - Absolute URL (http/https)  →  { uri }
 *   - Data URI (base64)         →  { uri }
 *   - Relative path (/uploads/…)→  { uri: API_BASE + path }
 */
export function getImageSource(url: string | null | undefined): { uri: string } | null {
  if (!url || url.trim() === '') return null;
  // Data URI or full URL — use as-is
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return { uri: url };
  }
  // Relative path from server
  if (url.startsWith('/')) {
    return { uri: `${API_BASE}${url}` };
  }
  // Fallback — treat as-is
  return { uri: url };
}
