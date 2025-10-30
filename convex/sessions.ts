import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get selected preset for a session
 */
export const getSelectedPreset = query({
  args: { sessionId: v.string() },
  handler: async ({ db }, { sessionId }) => {
    const session = await db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!session) {
      return null;
    }

    return {
      selectedPresetId: session.selectedPresetId,
      updatedAt: session.updatedAt,
    };
  },
});

/**
 * Save selected preset for a session
 */
export const setSelectedPreset = mutation({
  args: {
    sessionId: v.string(),
    presetId: v.string(),
  },
  handler: async ({ db }, { sessionId, presetId }) => {
    const now = Date.now();

    const existing = await db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      await db.patch(existing._id, {
        selectedPresetId: presetId,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await db.insert("sessions", {
        sessionId,
        selectedPresetId: presetId,
        updatedAt: now,
      });
    }
  },
});

/**
 * Clear selected preset for a session
 */
export const clearSelectedPreset = mutation({
  args: { sessionId: v.string() },
  handler: async ({ db }, { sessionId }) => {
    const session = await db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (session) {
      await db.delete(session._id);
    }
  },
});

