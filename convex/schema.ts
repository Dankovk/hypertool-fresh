import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Schema for boilerplates and code versions
 * Files are stored as JSON directly in the database (not file storage)
 * to avoid fetch() limitations in queries/mutations
 */
export default defineSchema({
  /**
   * Boilerplate presets metadata
   */
  boilerplates: defineTable({
    id: v.string(), // Preset ID (e.g., "circle", "universal")
    name: v.string(),
    description: v.string(),
    files: v.any(), // FileMap stored as JSON directly
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_preset_id", ["id"])
    .index("by_created_at", ["createdAt"]),

  /**
   * Code versions/state snapshots
   * Each version is associated with a session ID to isolate history per browser
   */
  codeVersions: defineTable({
    id: v.string(),
    sessionId: v.string(), // Browser session ID
    timestamp: v.number(),
    files: v.any(), // FileMap stored as JSON directly
    prompt: v.string(),
    model: v.string(),
    createdAt: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_version_id", ["id"])
    .index("by_session_id", ["sessionId"])
    .index("by_session_timestamp", ["sessionId", "timestamp"]),

  /**
   * Session preferences (temporary, per browser session)
   * Stores the selected preset for each session
   */
  sessions: defineTable({
    sessionId: v.string(), // Browser session ID
    selectedPresetId: v.string(), // Currently selected preset ID
    updatedAt: v.number(),
  })
    .index("by_session_id", ["sessionId"]),
});

