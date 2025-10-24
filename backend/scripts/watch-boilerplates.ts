#!/usr/bin/env bun
/**
 * Watch boilerplate presets directory and auto-regenerate on changes
 */

import { watch } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { $ } from "bun";

const projectRoot = resolve(process.cwd(), "..");
const presetsPath = join(projectRoot, "boilerplate-presets");

if (!existsSync(presetsPath)) {
  console.error(`❌ Presets directory not found at: ${presetsPath}`);
  process.exit(1);
}

console.log("👀 Watching boilerplate presets for changes...");
console.log(`📁 ${presetsPath}\n`);

// Run initial transform
console.log("🔄 Running initial transform...");
await $`bun run scripts/transform-boilerplates.ts`.quiet();
console.log("✅ Initial transform complete\n");

let debounceTimer: Timer | null = null;
let isTransforming = false;

async function runTransform() {
  if (isTransforming) {
    console.log("⏳ Transform already in progress, skipping...");
    return;
  }

  isTransforming = true;
  const now = new Date().toLocaleTimeString();
  console.log(`\n[${now}] 🔄 Regenerating boilerplate data...`);

  try {
    await $`bun run scripts/transform-boilerplates.ts`.quiet();
    console.log(`[${now}] ✅ Regeneration complete`);
  } catch (error) {
    console.error(`[${now}] ❌ Regeneration failed:`, error);
  } finally {
    isTransforming = false;
  }
}

// Watch the presets directory
const watcher = watch(presetsPath, { recursive: true });

for await (const event of watcher) {
  const filename = event.filename || "unknown";

  // Ignore non-source files
  if (filename.includes('node_modules') ||
      filename.includes('.git') ||
      filename.endsWith('.log')) {
    continue;
  }

  console.log(`📝 Change detected: ${event.eventType} ${filename}`);

  // Debounce: wait 500ms after last change
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    runTransform().catch(console.error);
  }, 500);
}
