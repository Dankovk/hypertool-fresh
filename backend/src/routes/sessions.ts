import { Hono } from 'hono';
import { z } from 'zod';
import { createLogger } from '../lib/logger.js';
import {
  createSession,
  getSession,
  getSessions,
  updateSession,
  deleteSession,
  getMessages,
  generateSessionTitle,
  CreateSessionOptions,
} from '../services/chatService.js';
import { isDatabaseConnected } from '../lib/database.js';

const app = new Hono();

const CreateSessionSchema = z.object({
  title: z.string().optional(),
  aiModel: z.string(),
  metadata: z.record(z.any()).optional(),
});

const UpdateSessionSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const GetSessionsQuerySchema = z.object({
  limit: z.string().optional(),
  skip: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lastMessageAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Create a new session
app.post('/', async (c) => {
  const requestId = `session-create-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/sessions', requestId);

  if (!isDatabaseConnected()) {
    logger.warn('Database not connected');
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    const json = await c.req.json();
    const parsed = CreateSessionSchema.safeParse(json);

    if (!parsed.success) {
      logger.warn('Invalid request body', { validationErrors: parsed.error.errors });
      return c.json({ error: 'Invalid request body', details: parsed.error.errors }, 400);
    }

    const session = await createSession(parsed.data as CreateSessionOptions);

    if (!session) {
      return c.json({ error: 'Failed to create session' }, 500);
    }

    logger.info('Session created successfully', { sessionId: session._id });

    return c.json({
      success: true,
      session: {
        id: session._id.toString(),
        title: session.title,
        aiModel: session.aiModel,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastMessageAt: session.lastMessageAt,
        metadata: session.metadata,
      },
    });
  } catch (error) {
    logger.error('Failed to create session', error);
    return c.json({ error: 'Failed to create session' }, 500);
  }
});

// Get all sessions
app.get('/', async (c) => {
  const requestId = `session-list-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/sessions', requestId);

  if (!isDatabaseConnected()) {
    logger.warn('Database not connected');
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    const query = c.req.query();
    const parsed = GetSessionsQuerySchema.safeParse(query);

    if (!parsed.success) {
      logger.warn('Invalid query parameters', { validationErrors: parsed.error.errors });
      return c.json({ error: 'Invalid query parameters' }, 400);
    }

    const options = {
      limit: parsed.data.limit ? parseInt(parsed.data.limit) : undefined,
      skip: parsed.data.skip ? parseInt(parsed.data.skip) : undefined,
      sortBy: parsed.data.sortBy,
      sortOrder: parsed.data.sortOrder,
    };

    const sessions = await getSessions(options);

    logger.info('Sessions retrieved successfully', { count: sessions.length });

    return c.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session._id.toString(),
        title: session.title,
        aiModel: session.aiModel,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastMessageAt: session.lastMessageAt,
        metadata: session.metadata,
      })),
    });
  } catch (error) {
    logger.error('Failed to get sessions', error);
    return c.json({ error: 'Failed to get sessions' }, 500);
  }
});

// Get a specific session
app.get('/:id', async (c) => {
  const requestId = `session-get-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/sessions', requestId);

  if (!isDatabaseConnected()) {
    logger.warn('Database not connected');
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    const sessionId = c.req.param('id');

    const session = await getSession(sessionId);

    if (!session) {
      logger.warn('Session not found', { sessionId });
      return c.json({ error: 'Session not found' }, 404);
    }

    logger.info('Session retrieved successfully', { sessionId });

    return c.json({
      success: true,
      session: {
        id: session._id.toString(),
        title: session.title,
        aiModel: session.aiModel,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastMessageAt: session.lastMessageAt,
        metadata: session.metadata,
      },
    });
  } catch (error) {
    logger.error('Failed to get session', error);
    return c.json({ error: 'Failed to get session' }, 500);
  }
});

// Update a session
app.patch('/:id', async (c) => {
  const requestId = `session-update-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/sessions', requestId);

  if (!isDatabaseConnected()) {
    logger.warn('Database not connected');
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    const sessionId = c.req.param('id');
    const json = await c.req.json();
    const parsed = UpdateSessionSchema.safeParse(json);

    if (!parsed.success) {
      logger.warn('Invalid request body', { validationErrors: parsed.error.errors });
      return c.json({ error: 'Invalid request body', details: parsed.error.errors }, 400);
    }

    const session = await updateSession(sessionId, parsed.data);

    if (!session) {
      logger.warn('Session not found or update failed', { sessionId });
      return c.json({ error: 'Session not found or update failed' }, 404);
    }

    logger.info('Session updated successfully', { sessionId });

    return c.json({
      success: true,
      session: {
        id: session._id.toString(),
        title: session.title,
        aiModel: session.aiModel,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastMessageAt: session.lastMessageAt,
        metadata: session.metadata,
      },
    });
  } catch (error) {
    logger.error('Failed to update session', error);
    return c.json({ error: 'Failed to update session' }, 500);
  }
});

// Delete a session
app.delete('/:id', async (c) => {
  const requestId = `session-delete-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/sessions', requestId);

  if (!isDatabaseConnected()) {
    logger.warn('Database not connected');
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    const sessionId = c.req.param('id');

    const success = await deleteSession(sessionId);

    if (!success) {
      logger.warn('Session not found or delete failed', { sessionId });
      return c.json({ error: 'Session not found or delete failed' }, 404);
    }

    logger.info('Session deleted successfully', { sessionId });

    return c.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete session', error);
    return c.json({ error: 'Failed to delete session' }, 500);
  }
});

// Get messages for a session
app.get('/:id/messages', async (c) => {
  const requestId = `session-messages-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/sessions', requestId);

  if (!isDatabaseConnected()) {
    logger.warn('Database not connected');
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    const sessionId = c.req.param('id');
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : undefined;
    const skip = c.req.query('skip') ? parseInt(c.req.query('skip')!) : undefined;

    const messages = await getMessages({ sessionId, limit, skip });

    logger.info('Messages retrieved successfully', { sessionId, count: messages.length });

    return c.json({
      success: true,
      messages: messages.map((message) => ({
        id: message._id.toString(),
        sessionId: message.sessionId.toString(),
        role: message.role,
        content: message.content,
        aiModel: message.aiModel,
        editMode: message.editMode,
        tokenCount: message.tokenCount,
        createdAt: message.createdAt,
        metadata: message.metadata,
      })),
    });
  } catch (error) {
    logger.error('Failed to get messages', error);
    return c.json({ error: 'Failed to get messages' }, 500);
  }
});

// Generate title for a session
app.post('/:id/generate-title', async (c) => {
  const requestId = `session-title-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/sessions', requestId);

  if (!isDatabaseConnected()) {
    logger.warn('Database not connected');
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    const sessionId = c.req.param('id');

    const title = await generateSessionTitle(sessionId);

    // Update the session with the new title
    const session = await updateSession(sessionId, { title });

    if (!session) {
      logger.warn('Session not found', { sessionId });
      return c.json({ error: 'Session not found' }, 404);
    }

    logger.info('Title generated successfully', { sessionId, title });

    return c.json({
      success: true,
      title,
    });
  } catch (error) {
    logger.error('Failed to generate title', error);
    return c.json({ error: 'Failed to generate title' }, 500);
  }
});

export default app;
