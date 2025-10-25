import mongoose from 'mongoose';
import { EditHistory, IEditHistory, IEdit } from '../models/EditHistory.js';
import { createLogger } from '../lib/logger.js';
import { isDatabaseConnected } from '../lib/database.js';

const logger = createLogger('historyService');

export interface CreateHistoryEntryOptions {
  sessionId?: string;
  entryId: string;
  timestamp: number;
  explanation?: string;
  edits: IEdit[];
  beforeState: Record<string, string>;
  afterState: Record<string, string>;
}

export interface GetHistoryOptions {
  sessionId?: string;
  limit?: number;
  skip?: number;
}

/**
 * Create a new edit history entry
 */
export async function createHistoryEntry(
  options: CreateHistoryEntryOptions
): Promise<IEditHistory | null> {
  if (!isDatabaseConnected()) {
    logger.warn('Database not connected, skipping history entry creation');
    return null;
  }

  try {
    const sessionObjectId = options.sessionId && mongoose.Types.ObjectId.isValid(options.sessionId)
      ? new mongoose.Types.ObjectId(options.sessionId)
      : undefined;

    const historyEntry = new EditHistory({
      sessionId: sessionObjectId,
      entryId: options.entryId,
      timestamp: options.timestamp,
      explanation: options.explanation,
      edits: options.edits,
      beforeState: options.beforeState,
      afterState: options.afterState,
    });

    await historyEntry.save();

    logger.info('Created history entry', {
      entryId: options.entryId,
      sessionId: options.sessionId,
      editsCount: options.edits.length,
    });

    return historyEntry;
  } catch (error) {
    logger.error('Failed to create history entry', error);
    return null;
  }
}

/**
 * Get history entry by ID
 */
export async function getHistoryEntry(entryId: string): Promise<IEditHistory | null> {
  if (!isDatabaseConnected()) {
    return null;
  }

  try {
    const entry = await EditHistory.findOne({ entryId });
    return entry;
  } catch (error) {
    logger.error('Failed to get history entry', error);
    return null;
  }
}

/**
 * Get all history entries with optional filtering
 */
export async function getHistory(options: GetHistoryOptions = {}): Promise<IEditHistory[]> {
  if (!isDatabaseConnected()) {
    return [];
  }

  try {
    const { sessionId, limit = 100, skip = 0 } = options;

    const query: any = {};

    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      query.sessionId = new mongoose.Types.ObjectId(sessionId);
    }

    const entries = await EditHistory.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    return entries;
  } catch (error) {
    logger.error('Failed to get history', error);
    return [];
  }
}

/**
 * Delete history entries for a session
 */
export async function deleteHistoryForSession(sessionId: string): Promise<boolean> {
  if (!isDatabaseConnected()) {
    return false;
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return false;
    }

    await EditHistory.deleteMany({ sessionId: new mongoose.Types.ObjectId(sessionId) });

    logger.info('Deleted history for session', { sessionId });
    return true;
  } catch (error) {
    logger.error('Failed to delete history', error);
    return false;
  }
}

/**
 * Clear all history entries
 */
export async function clearAllHistory(): Promise<boolean> {
  if (!isDatabaseConnected()) {
    return false;
  }

  try {
    await EditHistory.deleteMany({});
    logger.info('Cleared all history');
    return true;
  } catch (error) {
    logger.error('Failed to clear history', error);
    return false;
  }
}

/**
 * Get history summary
 */
export async function getHistorySummary(sessionId?: string): Promise<{
  totalEntries: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}> {
  if (!isDatabaseConnected()) {
    return { totalEntries: 0 };
  }

  try {
    const query: any = {};

    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      query.sessionId = new mongoose.Types.ObjectId(sessionId);
    }

    const totalEntries = await EditHistory.countDocuments(query);

    const oldest = await EditHistory.findOne(query).sort({ timestamp: 1 }).select('createdAt');
    const newest = await EditHistory.findOne(query).sort({ timestamp: -1 }).select('createdAt');

    return {
      totalEntries,
      oldestEntry: oldest?.createdAt,
      newestEntry: newest?.createdAt,
    };
  } catch (error) {
    logger.error('Failed to get history summary', error);
    return { totalEntries: 0 };
  }
}
