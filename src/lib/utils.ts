/**
 * Utility functions for Commutr
 */

/**
 * Generate CUID-like ID (compatible with legacy format)
 * Format: c{timestamp}{random}
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${random}`;
}

/**
 * Generate share token (22 characters)
 */
export function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Generate watch ID with 'w-' prefix
 */
export function generateWatchId(): string {
  return `w-${generateId()}`;
}

/**
 * Generate session ID with timestamp
 */
export function generateSessionId(): string {
  return `commute-${Date.now()}`;
}
