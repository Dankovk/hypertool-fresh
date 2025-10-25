import mongoose from 'mongoose';
import { ChatSession, IChatSession } from '../models/ChatSession.js';
import { ChatMessage, IChatMessage } from '../models/ChatMessage.js';
import { createLogger } from '../lib/logger.js';
import { isDatabaseConnected } from '../lib/database.js';

const logger = createLogger('chatService');

export interface CreateSessionOptions {
  title?: string;
  aiModel: string;
  metadata?: Record<string, any>;
}

export interface CreateMessageOptions {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  aiModel?: string;
  editMode?: 'full' | 'patch';
  tokenCount?: number;
  metadata?: Record<string, any>;
}

export interface GetSessionsOptions {
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastMessageAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GetMessagesOptions {
  sessionId: string;
  limit?: number;
  skip?: number;
}

/**
 * Create a new chat session
 */
export async function createSession(options: CreateSessionOptions): Promise<IChatSession | null> {
  if (!isDatabaseConnected()) {
    logger.warn('Database not connected, skipping session creation');
    return null;
  }

  try {
    const session = new ChatSession({
      title: options.title || 'New Chat',
      aiModel: options.aiModel,
      metadata: options.metadata || {},
      messageCount: 0,
      lastMessageAt: new Date(),
    });

    await session.save();
    logger.info('Created new chat session', { sessionId: session._id });
    return session;
  } catch (error) {
    logger.error('Failed to create chat session', error);
    return null;
  }
}

/**
 * Get a session by ID
 */
export async function getSession(sessionId: string): Promise<IChatSession | null> {
  if (!isDatabaseConnected()) {
    return null;
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      logger.warn('Invalid session ID format', { sessionId });
      return null;
    }

    const session = await ChatSession.findById(sessionId);
    return session;
  } catch (error) {
    logger.error('Failed to get chat session', error);
    return null;
  }
}

/**
 * Get all sessions with pagination
 */
export async function getSessions(options: GetSessionsOptions = {}): Promise<IChatSession[]> {
  if (!isDatabaseConnected()) {
    return [];
  }

  try {
    const {
      limit = 50,
      skip = 0,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = options;

    const sessions = await ChatSession.find()
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(limit)
      .skip(skip)
      .exec();

    return sessions;
  } catch (error) {
    logger.error('Failed to get chat sessions', error);
    return [];
  }
}

/**
 * Update session metadata
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Pick<IChatSession, 'title' | 'metadata'>>
): Promise<IChatSession | null> {
  if (!isDatabaseConnected()) {
    return null;
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return null;
    }

    const session = await ChatSession.findByIdAndUpdate(
      sessionId,
      { $set: updates },
      { new: true }
    );

    return session;
  } catch (error) {
    logger.error('Failed to update chat session', error);
    return null;
  }
}

/**
 * Delete a session and all its messages
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  if (!isDatabaseConnected()) {
    return false;
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return false;
    }

    // Delete all messages in the session
    await ChatMessage.deleteMany({ sessionId });

    // Delete the session
    await ChatSession.findByIdAndDelete(sessionId);

    logger.info('Deleted chat session and messages', { sessionId });
    return true;
  } catch (error) {
    logger.error('Failed to delete chat session', error);
    return false;
  }
}

/**
 * Create a new message in a session
 */
export async function createMessage(options: CreateMessageOptions): Promise<IChatMessage | null> {
  if (!isDatabaseConnected()) {
    logger.warn('Database not connected, skipping message creation');
    return null;
  }

  try {
    const { sessionId, role, content, aiModel, editMode, tokenCount, metadata } = options;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      logger.warn('Invalid session ID format', { sessionId });
      return null;
    }

    const message = new ChatMessage({
      sessionId: new mongoose.Types.ObjectId(sessionId),
      role,
      content,
      aiModel,
      editMode,
      tokenCount,
      metadata: metadata || {},
    });

    await message.save();

    // Update session's message count and last message time
    await ChatSession.findByIdAndUpdate(sessionId, {
      $inc: { messageCount: 1 },
      $set: { lastMessageAt: new Date() },
    });

    logger.info('Created new message', {
      sessionId,
      messageId: message._id,
      role,
    });

    return message;
  } catch (error) {
    logger.error('Failed to create message', error);
    return null;
  }
}

/**
 * Get messages for a session
 */
export async function getMessages(options: GetMessagesOptions): Promise<IChatMessage[]> {
  if (!isDatabaseConnected()) {
    return [];
  }

  try {
    const { sessionId, limit = 100, skip = 0 } = options;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return [];
    }

    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .skip(skip)
      .exec();

    return messages;
  } catch (error) {
    logger.error('Failed to get messages', error);
    return [];
  }
}

/**
 * Get message count for a session
 */
export async function getMessageCount(sessionId: string): Promise<number> {
  if (!isDatabaseConnected()) {
    return 0;
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return 0;
    }

    const count = await ChatMessage.countDocuments({ sessionId });
    return count;
  } catch (error) {
    logger.error('Failed to get message count', error);
    return 0;
  }
}

/**
 * Generate a title for a session based on its messages
 */
export async function generateSessionTitle(sessionId: string): Promise<string> {
  if (!isDatabaseConnected()) {
    return 'New Chat';
  }

  try {
    const messages = await getMessages({ sessionId, limit: 5 });

    if (messages.length === 0) {
      return 'New Chat';
    }

    // Get the first user message
    const firstUserMessage = messages.find((m) => m.role === 'user');

    if (!firstUserMessage) {
      return 'New Chat';
    }

    // Create a short title from the first message
    const content = firstUserMessage.content.trim();
    const maxLength = 50;

    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength).trim() + '...';
  } catch (error) {
    logger.error('Failed to generate session title', error);
    return 'New Chat';
  }
}
