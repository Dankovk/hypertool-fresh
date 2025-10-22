/**
 * API Client Configuration
 *
 * This module provides a configurable API client that can switch between:
 * 1. Next.js API routes (default) - /api/*
 * 2. Standalone Hono backend - http://localhost:3001/api/* or production URL
 *
 * Set NEXT_PUBLIC_API_BASE_URL environment variable to use standalone backend.
 */

/**
 * Get the API base URL based on environment configuration
 *
 * - If NEXT_PUBLIC_API_BASE_URL is set, use it (standalone backend)
 * - Otherwise, use empty string (Next.js API routes - relative paths)
 */
export function getApiBaseUrl(): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  // If explicitly set (even to empty string), use it
  if (envBaseUrl !== undefined) {
    return envBaseUrl;
  }

  // Default: use Next.js API routes (relative paths)
  return '';
}

/**
 * Build full API URL for a given endpoint
 *
 * @param endpoint - API endpoint path (e.g., '/api/boilerplate')
 * @returns Full URL or relative path depending on configuration
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();

  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If using standalone backend, combine base URL with endpoint
  if (baseUrl) {
    return `${baseUrl}${normalizedEndpoint}`;
  }

  // Using Next.js API routes - return relative path
  return normalizedEndpoint;
}

/**
 * Check if we're using the standalone backend
 */
export function isUsingStandaloneBackend(): boolean {
  return getApiBaseUrl() !== '';
}

/**
 * Get backend info for debugging
 */
export function getBackendInfo() {
  const baseUrl = getApiBaseUrl();
  return {
    mode: baseUrl ? 'standalone' : 'nextjs',
    baseUrl: baseUrl || '(Next.js API routes)',
    isStandalone: isUsingStandaloneBackend(),
  };
}

// Type-safe API endpoint helpers
export const API_ENDPOINTS = {
  BOILERPLATE: '/api/boilerplate',
  DOWNLOAD: '/api/download',
  RUNTIME_WATCH: '/api/runtime-watch',
  RUNTIME_WATCH_SNAPSHOT: '/api/runtime-watch/snapshot',
  AI: '/api/ai',
  AI_STREAM: '/api/ai/stream',
  HISTORY: '/api/history',
} as const;

/**
 * Fetch wrapper that automatically uses the correct backend
 */
export async function apiFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const url = getApiUrl(endpoint);
  return fetch(url, options);
}

/**
 * Typed API fetch with JSON response
 */
export async function apiFetchJson<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
