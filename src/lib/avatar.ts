/**
 * Helper to ensure profile avatar URLs load reliably in the browser.
 * Google OAuth profile photos (lh3.googleusercontent.com) frequently return HTTP 429/403
 * when requested directly from localhost due to browser Referer headers.
 * Routing them through the internal /api/avatar proxy guarantees 200 OK delivery and caching.
 */
export function getAvatarUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;

  // If already relative (e.g. /uploads/... or /api/avatar...)
  if (url.startsWith("/")) return url;

  // Google user content URLs
  if (url.includes("googleusercontent.com") || url.includes("google.com/")) {
    return `/api/avatar?url=${encodeURIComponent(url)}`;
  }

  // GitHub or other external avatars can also be proxied if needed
  if (url.includes("avatars.githubusercontent.com")) {
    return `/api/avatar?url=${encodeURIComponent(url)}`;
  }

  return url;
}
