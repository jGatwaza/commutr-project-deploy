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

/**
 * Get authentication headers with Firebase ID token
 * @param {Object} user - Firebase user object from useContext(AuthContext)
 * @returns {Promise<Object>} Headers object with Authorization token
 */
export async function getAuthHeaders(user) {
  if (!user) {
    // No user authenticated, use test token
    return { 'Authorization': AUTH_TOKEN };
  }
  
  try {
    // Get fresh ID token from Firebase
    const idToken = await user.getIdToken();
    return { 'Authorization': `Bearer ${idToken}` };
  } catch (error) {
    console.error('Failed to get ID token:', error);
    // Fallback to test token
    return { 'Authorization': AUTH_TOKEN };
  }
}

export function buildApiUrl(path = '') {
  if (!path) {
    console.warn('[buildApiUrl] Empty path provided, returning base URL');
    return NORMALIZED_BASE;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    console.log(`[buildApiUrl] Absolute URL detected, returning as-is: ${path}`);
    return path;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const result = `${NORMALIZED_BASE}${cleanPath}`;
  console.log(`[buildApiUrl] Built URL: ${result}`);
  return result;
}

/**
 * Make an authenticated API request
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {Object} user - Firebase user object
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedFetch(url, options = {}, user) {
  const authHeaders = await getAuthHeaders(user);
  const headers = {
    ...options.headers,
    ...authHeaders
  };
  
  return fetch(url, {
    ...options,
    headers
  });
}
