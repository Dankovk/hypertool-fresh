#!/usr/bin/env bun
/**
 * Migration script to populate Convex with existing boilerplates from filesystem
 * This reads directly from packages/boilerplate-presets and uploads to Convex
 * Ignores __non-migrated__ directory as requested
 */

import { ConvexHttpClient } from "convex/browser";
import type { Api } from "../convex/_generated/api.js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CONVEX_URL = process.env.CONVEX_URL || "";

if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL environment variable is not set");
  console.error("   Set it with: export CONVEX_URL='your-convex-url'");
  console.error("   Or load from .env.local file");
  process.exit(1);
}

const client = new ConvexHttpClient<Api>(CONVEX_URL);

type FileMap = Record<string, string>;

/**
 * Recursively read all files in a directory and create a FileMap
 */
function readDirectoryRecursive(dir: string, base: string = dir, out: FileMap = {}): FileMap {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      readDirectoryRecursive(full, base, out);
    } else {
      const rel = full.replace(base + "/", "");
      out["/" + rel] = readFileSync(full, "utf8");
    }
  }
  return out;
}

async function migrateBoilerplates() {
  console.log("🚀 Starting boilerplate migration to Convex...\n");

  try {
    // Get presets directory path
    const projectRoot = resolve(process.cwd());
    const presetsPath = join(projectRoot, "packages/boilerplate-presets");

    if (!existsSync(presetsPath)) {
      throw new Error(`Presets directory not found at: ${presetsPath}`);
    }

    console.log(`📁 Reading presets from: ${presetsPath}\n`);

    const entries = readdirSync(presetsPath, { withFileTypes: true });
    const presets: Array<{ id: string; name: string; description: string; files: FileMap }> = [];

    // Collect all presets (excluding __non-migrated__)
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === "__non-migrated__") {
        continue;
      }

      const presetPath = join(presetsPath, entry.name);
      const packageJsonPath = join(presetPath, "package.json");
      const indexHtmlPath = join(presetPath, "index.html");

      // Skip if no index.html
      if (!existsSync(indexHtmlPath)) {
        console.log(`⚠️  Skipping ${entry.name} (no index.html)`);
        continue;
      }

      let name = entry.name;
      let description = "";

      // Read package.json if exists
      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
          name = packageJson.name || entry.name;
          description = packageJson.description || "";
        } catch (e) {
          console.warn(`⚠️  Failed to parse package.json for ${entry.name}`);
        }
      }

      // Read all files in this preset
      const files = readDirectoryRecursive(presetPath);

      console.log(`📦 Found preset: ${entry.name} (${Object.keys(files).length} files)`);

      presets.push({
        id: entry.name,
        name,
        description,
        files,
      });
    }

    console.log(`\n📊 Total presets to migrate: ${presets.length}\n`);

    if (presets.length === 0) {
      console.log("⚠️  No presets found to migrate");
      return;
    }

    // Migrate each preset to Convex
    for (const preset of presets) {
      console.log(`⬆️  Migrating preset: ${preset.id} (${preset.name})...`);

      try {
        await client.mutation("boilerplates:upsertBoilerplate", {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          files: preset.files,
        });

        console.log(`  ✅ Successfully migrated ${preset.id}`);
      } catch (error: any) {
        console.error(`  ❌ Failed to migrate ${preset.id}:`, error.message);
        if (error.data) {
          console.error(`     Details:`, error.data);
        }
      }
    }

    console.log("\n✅ Migration complete!");
    
    // Verify migration
    console.log("\n🔍 Verifying migration...");
    const migratedPresets = await client.query("boilerplates:listPresets", {});
    console.log(`   Found ${migratedPresets.length} presets in Convex`);
    
    if (migratedPresets.length > 0) {
      console.log("\n   Migrated presets:");
      migratedPresets.forEach((p: any) => {
        console.log(`   - ${p.id}: ${p.name}`);
      });
    }
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

migrateBoilerplates();
