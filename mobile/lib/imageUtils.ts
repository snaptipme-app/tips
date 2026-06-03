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
  const cleanUrl = url?.trim();
  if (!cleanUrl) return null;
  // Data URI or full URL — use as-is
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return { uri: cleanUrl };
  }
  // Relative path from server
  if (cleanUrl.startsWith('/')) {
    return { uri: `${API_BASE}${cleanUrl}` };
  }
  // Fallback — treat as-is
  return { uri: cleanUrl };
}

/**
 * Returns a full image URL string (not an object).
 * Useful for places that need a raw string rather than { uri }.
 */
export function getFullImageUrl(url: string | null | undefined): string | null {
  const cleanUrl = url?.trim();
  if (!cleanUrl) return null;
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) return cleanUrl;
  if (cleanUrl.startsWith('/')) return `${API_BASE}${cleanUrl}`;
  return cleanUrl;
}
