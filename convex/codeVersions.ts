import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List code versions for a specific session (with optional limit)
 */
export const listVersions = query({
  args: { 
    sessionId: v.string(),
    limit: v.optional(v.number()) 
  },
  handler: async ({ db }, { sessionId, limit }) => {
    const versions = await db
      .query("codeVersions")
      .withIndex("by_session_timestamp", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .take(limit ?? 100);

    return versions.map((v) => ({
      id: v.id,
      timestamp: v.timestamp,
      prompt: v.prompt,
      model: v.model,
      createdAt: v.createdAt,
    }));
  },
});

/**
 * Get a specific code version with files (must belong to the session)
 */
export const getVersion = query({
  args: { id: v.string(), sessionId: v.string() },
  handler: async ({ db }, { id, sessionId }) => {
    const version = await db
      .query("codeVersions")
      .withIndex("by_version_id", (q) => q.eq("id", id))
      .first();

    if (!version) {
      return null;
    }

    // Ensure version belongs to the session
    if (version.sessionId !== sessionId) {
      return null;
    }

    return {
      id: version.id,
      timestamp: version.timestamp,
      files: version.files,
      prompt: version.prompt,
      model: version.model,
      createdAt: version.createdAt,
    };
  },
});

/**
 * Create a new code version for a session
 */
export const createVersion = mutation({
  args: {
    id: v.string(),
    sessionId: v.string(),
    timestamp: v.number(),
    files: v.any(), // FileMap as JSON
    prompt: v.string(),
    model: v.string(),
  },
  handler: async (
    { db },
    { id, sessionId, timestamp, files, prompt, model }
  ) => {
    const now = Date.now();

    return await db.insert("codeVersions", {
      id,
      sessionId,
      timestamp,
      files,
      prompt,
      model,
      createdAt: now,
    });
  },
});

/**
 * Delete a code version (must belong to the session)
 */
export const deleteVersion = mutation({
  args: { id: v.string(), sessionId: v.string() },
  handler: async ({ db }, { id, sessionId }) => {
    const version = await db
      .query("codeVersions")
      .withIndex("by_version_id", (q) => q.eq("id", id))
      .first();

    if (!version) {
      throw new Error("Version not found");
    }

    // Ensure version belongs to the session
    if (version.sessionId !== sessionId) {
      throw new Error("Version does not belong to this session");
    }

    // Delete version record
    await db.delete(version._id);
  },
});

/**
 * Clear all code versions for a specific session
 */
export const clearVersions = mutation({
  args: { sessionId: v.string() },
  handler: async ({ db }, { sessionId }) => {
    const versions = await db
      .query("codeVersions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", sessionId))
      .collect();

    // Delete all version records for this session
    for (const version of versions) {
      await db.delete(version._id);
    }

    return { deleted: versions.length };
  },
});

/**
 * Get latest code version for a specific session
 */
export const getLatestVersion = query({
  args: { sessionId: v.string() },
  handler: async ({ db }, { sessionId }) => {
    const version = await db
      .query("codeVersions")
      .withIndex("by_session_timestamp", (q) => q.eq("sessionId", sessionId))
      .order("desc")
      .first();

    if (!version) {
      return null;
    }

    return {
      id: version.id,
      timestamp: version.timestamp,
      files: version.files,
      prompt: version.prompt,
      model: version.model,
      createdAt: version.createdAt,
    };
  },
});

