import { NextResponse } from "next/server";
import { getHistoryManager } from "@/lib/history";
import { z } from "zod";

const HistoryActionSchema = z.object({
  action: z.enum(["undo", "redo", "get", "clear", "summary"]),
  entryId: z.string().optional(),
});

export async function GET() {
  try {
    const historyManager = getHistoryManager();
    const history = historyManager.getHistory();
    const summary = historyManager.getSummary();

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
    console.error("History GET failed", error);
    return NextResponse.json(
      { error: "Failed to retrieve history" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = HistoryActionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { action, entryId } = parsed.data;
    const historyManager = getHistoryManager();

    switch (action) {
      case "undo": {
        const entry = historyManager.undo();
        if (!entry) {
          return NextResponse.json(
            { error: "Nothing to undo" },
            { status: 400 }
          );
        }

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
          return NextResponse.json(
            { error: "Nothing to redo" },
            { status: 400 }
          );
        }

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
          return NextResponse.json(
            { error: "entryId required for get action" },
            { status: 400 }
          );
        }

        const entry = historyManager.getEntryById(entryId);
        if (!entry) {
          return NextResponse.json(
            { error: "Entry not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          entry,
        });
      }

      case "clear": {
        historyManager.clear();
        return NextResponse.json({
          success: true,
          action: "clear",
        });
      }

      case "summary": {
        const summary = historyManager.getSummary();
        return NextResponse.json({
          success: true,
          summary,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("History POST failed", error);
    return NextResponse.json(
      { error: "Failed to process history action" },
      { status: 500 }
    );
  }
}

// export const runtime = "nodejs";
