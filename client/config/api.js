const deriveDefaultBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }

  return '';
};

const RAW_BASE = deriveDefaultBase();
const NORMALIZED_BASE = RAW_BASE.replace(/\/$/, '');

export const API_BASE_URL = NORMALIZED_BASE;
export const AUTH_TOKEN = import.meta.env.VITE_API_AUTH_TOKEN || 'Bearer TEST';

export function buildApiUrl(path = '') {
  if (!path) {
    return API_BASE_URL;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
