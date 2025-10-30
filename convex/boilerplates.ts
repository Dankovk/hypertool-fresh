import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all available boilerplate presets
 */
export const listPresets = query(async ({ db }) => {
  const boilerplates = await db
    .query("boilerplates")
    .withIndex("by_created_at")
    .collect();

  return boilerplates.map((bp) => ({
    id: bp.id,
    name: bp.name,
    description: bp.description,
  }));
});

/**
 * Get a specific boilerplate by ID
 */
export const getBoilerplate = query({
  args: { presetId: v.string() },
  handler: async ({ db }, { presetId }) => {
    const boilerplate = await db
      .query("boilerplates")
      .withIndex("by_preset_id", (q) => q.eq("id", presetId))
      .first();

    if (!boilerplate) {
      return null;
    }

    return {
      id: boilerplate.id,
      name: boilerplate.name,
      description: boilerplate.description,
      files: boilerplate.files,
    };
  },
});

/**
 * Create or update a boilerplate preset
 */
export const upsertBoilerplate = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    description: v.string(),
    files: v.any(), // FileMap as JSON
  },
  handler: async ({ db }, { id, name, description, files }) => {
    const now = Date.now();

    // Check if boilerplate exists
    const existing = await db
      .query("boilerplates")
      .withIndex("by_preset_id", (q) => q.eq("id", id))
      .first();

    if (existing) {
      // Update existing boilerplate
      await db.patch(existing._id, {
        name,
        description,
        files,
        updatedAt: now,
      });

      return existing._id;
    } else {
      // Create new boilerplate
      return await db.insert("boilerplates", {
        id,
        name,
        description,
        files,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Delete a boilerplate preset
 */
export const deleteBoilerplate = mutation({
  args: { id: v.string() },
  handler: async ({ db }, { id }) => {
    const boilerplate = await db
      .query("boilerplates")
      .withIndex("by_preset_id", (q) => q.eq("id", id))
      .first();

    if (!boilerplate) {
      throw new Error("Boilerplate not found");
    }

    // Delete boilerplate record
    await db.delete(boilerplate._id);
  },
});

