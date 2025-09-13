// Utility functions for URL handling

/**
 * Get the correct base URL based on environment
 * Uses the production domain in production, localhost in development
 */
export const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'http://elmadawymarket.store';
  }
  
  // In production, use the custom domain
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'http://elmadawymarket.store';
  }
  
  // In development, use localhost
  return window.location.origin;
};

/**
 * Get the current page URL with the correct base URL
 */
export const getCurrentUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'http://elmadawymarket.store';
  }
  
  const baseUrl = getBaseUrl();
  const pathname = window.location.pathname;
  const search = window.location.search;
  
  return `${baseUrl}${pathname}${search}`;
};

/**
 * Build a full URL with the correct base URL
 */
export const buildUrl = (path: string): string => {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};