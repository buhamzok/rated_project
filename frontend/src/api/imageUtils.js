import client from './client';

export function resolveImageUrl(rawUrl) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  // Relative paths are served from the API origin
  const origin = client.defaults.baseURL?.replace(/\/api\/?$/, '') ?? '';
  const path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${origin}${path}`;
}

export function isPlaceholderUrl(rawUrl) {
  return !rawUrl || rawUrl.includes('placeholder');
}
