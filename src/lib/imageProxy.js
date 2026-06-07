/**
 * Wrap external image URLs through our proxy to avoid CORS/hotlink issues.
 * Supabase storage URLs are passed through directly.
 */
export function proxyImage(url) {
  if (!url) return null
  // Supabase storage - no proxy needed
  if (url.includes('supabase.co/storage')) return url
  // Already a proxy URL
  if (url.startsWith('/api/image-proxy')) return url
  // Wrap external URLs
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}
