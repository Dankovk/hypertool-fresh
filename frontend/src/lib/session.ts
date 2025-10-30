/**
 * Session management for browser-based code history
 * Generates and persists a session ID in localStorage
 */

const SESSION_STORAGE_KEY = "studio_session_id";

/**
 * Generate a new session ID
 */
function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Get or create a session ID for the current browser
 * Persists the session ID in localStorage across page reloads
 */
export function getSessionId(): string {
  if (typeof window === "undefined") {
    // Server-side: return a placeholder (shouldn't happen in client components)
    return "server-session";
  }

  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Reset the session (creates a new session ID)
 * Useful for "new session" functionality
 */
export function resetSession(): string {
  if (typeof window === "undefined") {
    return generateSessionId();
  }

  const newSessionId = generateSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
  return newSessionId;
}

/**
 * Get the current session ID without creating a new one
 * Returns null if no session exists
 */
export function getCurrentSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(SESSION_STORAGE_KEY);
}

