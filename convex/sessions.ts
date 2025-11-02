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

/**
 * Get saved files for a session
 * Handles migration from old `currentFiles` field to `files` field
 */
export const getCurrentFiles = query({
  args: { sessionId: v.string() },
  handler: async ({ db }, { sessionId }) => {
    const session = await db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!session) {
      return null;
    }

    // Handle migration from old `currentFiles` field to `files`
    const files = session.files || session.currentFiles;

    if (!files) {
      return null;
    }

    return {
      files,
      updatedAt: session.updatedAt,
    };
  },
});

/**
 * Save current files for a session
 * Migrates old `currentFiles` field to `files` if needed
 */
export const saveCurrentFiles = mutation({
  args: {
    sessionId: v.string(),
    files: v.any(), // FileMap stored as JSON
  },
  handler: async ({ db }, { sessionId, files }) => {
    const now = Date.now();

    const existing = await db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (existing) {
      // Migrate: if document has currentFiles but not files, migrate it
      const filesToSave = files || existing.currentFiles || null;
      
      // Patch with files field, and set currentFiles to undefined to mark as migrated
      // Convex will keep the field but we'll ignore it going forward
      await db.patch(existing._id, {
        files: filesToSave,
        currentFiles: undefined, // Mark as migrated (field will remain but we ignore it)
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await db.insert("sessions", {
        sessionId,
        selectedPresetId: undefined,
        files,
        updatedAt: now,
      });
    }
  },
});

/**
 * Clear saved files for a session
 */
export const clearCurrentFiles = mutation({
  args: { sessionId: v.string() },
  handler: async ({ db }, { sessionId }) => {
    const session = await db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .first();

    if (session) {
      await db.patch(session._id, {
        files: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

