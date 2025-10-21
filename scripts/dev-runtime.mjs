import { spawn } from "node:child_process";
import { resolve } from "node:path";

const runtimeDir = resolve(process.cwd(), "hyper-runtime");
let shuttingDown = false;

function createProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    ...options,
  });

  child.on("error", (error) => {
    console.error(`[dev-runtime] Failed to start ${command}:`, error);
    requestShutdown(1);
  });

  return child;
}

const runtimeWatcher = createProcess("bun", ["run", "dev"], { cwd: runtimeDir });
const nextDev = createProcess("next", ["dev", "--turbo", "-p", "3030"]);

function requestShutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!runtimeWatcher.killed) {
    runtimeWatcher.kill("SIGINT");
  }

  if (!nextDev.killed) {
    nextDev.kill("SIGINT");
  }

  setTimeout(() => {
    process.exit(code);
  }, 100);
}

process.on("SIGINT", () => requestShutdown(0));
process.on("SIGTERM", () => requestShutdown(0));

runtimeWatcher.on("exit", (code) => {
  if (shuttingDown) {
    return;
  }
  console.error(`[dev-runtime] Runtime watcher exited with code ${code ?? 0}`);
  requestShutdown(typeof code === "number" ? code : 1);
});

nextDev.on("exit", (code) => {
  if (shuttingDown) {
    return;
  }
  console.error(`[dev-runtime] Next.js dev server exited with code ${code ?? 0}`);
  requestShutdown(typeof code === "number" ? code : 1);
});
