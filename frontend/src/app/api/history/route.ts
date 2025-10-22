import { NextResponse } from "next/server";
import { getHistoryManager } from "@/lib/history";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const HistoryActionSchema = z.object({
  action: z.enum(["undo", "redo", "get", "clear", "summary"]),
  entryId: z.string().optional(),
});

export async function GET() {
  const requestId = `history-get-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/history', requestId);

  logger.info('History GET request received');

  try {
    const historyManager = getHistoryManager();
    const history = historyManager.getHistory();
    const summary = historyManager.getSummary();

    logger.info('History retrieved successfully', {
      entryCount: history.length,
      canUndo: summary.canUndo,
      canRedo: summary.canRedo,
      currentIndex: summary.currentIndex,
    });

    return NextResponse.json({
      history: history.map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        explanation: entry.explanation,
        editsCount: entry.edits.length,
      })),
      summary,
    });
  } catch (error) {
    logger.error("History GET request failed", error);
    return NextResponse.json(
      { error: "Failed to retrieve history" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const requestId = `history-post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const logger = createLogger('api/history', requestId);

  logger.info('History POST request received');

  try {
    const json = await req.json();
    const parsed = HistoryActionSchema.safeParse(json);

    if (!parsed.success) {
      logger.warn('Invalid request body', {
        validationErrors: parsed.error.errors,
      });
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { action, entryId } = parsed.data;
    logger.info('Processing history action', { action, entryId });

    const historyManager = getHistoryManager();

    switch (action) {
      case "undo": {
        const entry = historyManager.undo();
        if (!entry) {
          logger.warn('Undo requested but nothing to undo');
          return NextResponse.json(
            { error: "Nothing to undo" },
            { status: 400 }
          );
        }

        logger.info('Undo completed successfully', {
          entryId: entry.id,
          editsCount: entry.edits.length,
        });

        return NextResponse.json({
          success: true,
          action: "undo",
          files: entry.beforeState,
          entry: {
            id: entry.id,
            timestamp: entry.timestamp,
            explanation: entry.explanation,
          },
        });
      }

      case "redo": {
        const entry = historyManager.redo();
        if (!entry) {
          logger.warn('Redo requested but nothing to redo');
          return NextResponse.json(
            { error: "Nothing to redo" },
            { status: 400 }
          );
        }

        logger.info('Redo completed successfully', {
          entryId: entry.id,
          editsCount: entry.edits.length,
        });

        return NextResponse.json({
          success: true,
          action: "redo",
          files: entry.afterState,
          entry: {
            id: entry.id,
            timestamp: entry.timestamp,
            explanation: entry.explanation,
          },
        });
      }

      case "get": {
        if (!entryId) {
          logger.warn('Get action requested without entryId');
          return NextResponse.json(
            { error: "entryId required for get action" },
            { status: 400 }
          );
        }

        const entry = historyManager.getEntryById(entryId);
        if (!entry) {
          logger.warn('Entry not found', { entryId });
          return NextResponse.json(
            { error: "Entry not found" },
            { status: 404 }
          );
        }

        logger.info('Entry retrieved successfully', {
          entryId: entry.id,
          editsCount: entry.edits.length,
        });

        return NextResponse.json({
          success: true,
          entry,
        });
      }

      case "clear": {
        const beforeCount = historyManager.getHistory().length;
        historyManager.clear();
        logger.info('History cleared', { clearedEntries: beforeCount });

        return NextResponse.json({
          success: true,
          action: "clear",
        });
      }

      case "summary": {
        const summary = historyManager.getSummary();
        logger.info('Summary retrieved', summary);

        return NextResponse.json({
          success: true,
          summary,
        });
      }

      default:
        logger.warn('Unknown action requested', { action });
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("History POST request failed", error);
    return NextResponse.json(
      { error: "Failed to process history action" },
      { status: 500 }
    );
  }
}

// export const runtime = "nodejs";
