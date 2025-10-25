import { createSession, getSessions } from '../services/chatService.js';
import { createLogger } from './logger.js';
import { isDatabaseConnected } from './database.js';

const logger = createLogger('sessionManager');

/**
 * Get or create a session for the current request
 * Uses userId from header/query, or falls back to 'default' user
 */
export async function getOrCreateSession(options: {
  userId?: string;
  model: string;
  title?: string;
}): Promise<string | null> {
  if (!isDatabaseConnected()) {
    logger.warn('Database not connected, cannot create session');
    return null;
  }

  try {
    const userId = options.userId || 'default';

    // Try to get the most recent session for this user
    const sessions = await getSessions({
      limit: 1,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    // Filter by userId in metadata if we have sessions
    let userSession = sessions.find((s) => s.metadata?.userId === userId);

    if (!userSession && sessions.length > 0 && userId === 'default') {
      // For default user, just use the most recent session
      userSession = sessions[0];
    }

    // If we found a session, return its ID
    if (userSession) {
      logger.info('Using existing session', {
        sessionId: userSession._id.toString(),
        userId,
      });
      return userSession._id.toString();
    }

    // Create a new session
    logger.info('Creating new session', { userId, model: options.model });
    const newSession = await createSession({
      title: options.title || 'New Chat',
      aiModel: options.model,
      metadata: { userId },
    });

    if (newSession) {
      logger.info('Created new session', {
        sessionId: newSession._id.toString(),
        userId,
      });
      return newSession._id.toString();
    }

    return null;
  } catch (error) {
    logger.error('Failed to get or create session', error);
    return null;
  }
}

/**
 * Get session ID from request (query param or header)
 */
export function getSessionIdFromRequest(request: {
  query: (key: string) => string | undefined;
  header: (key: string) => string | undefined;
}): string | undefined {
  return request.query('sessionId') || request.header('x-session-id');
}

/**
 * Get user ID from request (header or query param)
 */
export function getUserIdFromRequest(request: {
  query: (key: string) => string | undefined;
  header: (key: string) => string | undefined;
}): string | undefined {
  return request.header('x-user-id') || request.query('userId') || 'default';
}
