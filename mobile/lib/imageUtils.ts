const API_BASE = 'http://156.67.28.181:5000';

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

/**
 * Returns a full image URL string (not an object).
 * Useful for places that need a raw string rather than { uri }.
 */
export function getFullImageUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') return null;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
}
