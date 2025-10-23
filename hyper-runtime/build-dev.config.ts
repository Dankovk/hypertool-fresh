// build-dev.config.ts
// Bun dev build with persistent fs/promises.watch and CSS injection

import { watch, readdir, stat } from "fs/promises";
import { join } from "path";

const entrypoints = [
    "src/index.ts",
    "src/controls/index.ts",
    "src/frame/index.ts",
];

// --- CSS Injection Plugin ---
const cssInjector = {
    name: "css-injector",
    setup(builder) {
        builder.onLoad({ filter: /\.css$/ }, async (args) => {
            const css = await Bun.file(args.path).text();
            const escaped = JSON.stringify(css);
            return {
                contents: `
          // Auto CSS injection
          const style = document.createElement('style');
          style.textContent = ${escaped};
          document.head.appendChild(style);
          export default ${escaped};
        `,
                loader: "js",
            };
        });
    },
};

let builder: Awaited<ReturnType<typeof Bun.build>> | null = null;

async function runBuild() {
    if (builder) builder.stop?.();
    builder = await Bun.build({
        entrypoints,
        outdir: "dist",
        target: "browser",
        format: "esm",
        sourcemap: "external",
        plugins: [cssInjector],
        watch: {
            onRebuild({ success, logs }) {
                const now = new Date().toLocaleTimeString();
                if (success) console.log(`[${now}] ✅ Rebuild succeeded`);
                else {
                    console.error(`[${now}] ❌ Rebuild failed`);
                    for (const log of logs) console.error(log);
                }
            },
        },
    });

    if (builder.success) console.log("🚀 Build complete, watching...");
    else for (const log of builder.logs) console.error(log);
}

// --- Spawn a persistent recursive watcher ---
async function startRecursiveWatcher(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (["dist", "node_modules"].includes(entry.name)) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            // Recurse into subdirectories
            startRecursiveWatcher(full);
        }
    }

    // Create persistent watcher for this directory
    (async () => {
        const watcher = watch(dir, { persistent: true });
        for await (const event of watcher) {
            const file = event.filename ? join(dir, event.filename) : null;
            if (!file || !/\.(ts|tsx|css)$/.test(file)) continue;
            console.log(`🔁 Detected ${event.eventType} in ${file}`);
            await runBuild();
        }
    })().catch((err) => console.error("Watcher error:", err));
}

// --- Start everything ---
await runBuild();
await startRecursiveWatcher("src");
console.log("👀 Persistent watcher active. Press Ctrl+C to exit.");

// Keep alive forever
await new Promise(() => {});
