import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createLogger } from "@/lib/logger";

const logger = createLogger('boilerplate');

type FileMap = Record<string, string>;

interface ScriptDescriptor {
  src: string;
  module?: boolean;
}

interface PresetInfo {
  id: string;
  name: string;
  description: string;
}

const DEFAULT_RELATIVE_PATH = "boilerplate-presets/universal";
const PRESETS_RELATIVE_PATH = "boilerplate-presets";
const FALLBACK_RELATIVE_PATHS = [
  "./boilerplate-presets/universal",
  "../boilerplate-presets/universal",
  "../../boilerplate-presets/universal",
  "./boilerplate-presets",
  "../boilerplate-presets",
  "../../boilerplate-presets",
];

export function resolveBoilerplatePath(): string {
  const cwd = process.cwd();
  const candidatePaths = [DEFAULT_RELATIVE_PATH, ...FALLBACK_RELATIVE_PATHS];

  logger.debug('Resolving boilerplate path', { cwd, candidatePaths });

  for (const relativePath of candidatePaths) {
    const candidate = resolve(cwd, relativePath);
    if (existsSync(candidate) && existsSync(join(candidate, "index.html"))) {
      logger.info('Boilerplate path resolved', { path: candidate });
      return candidate;
    }
  }

  logger.error('Unable to locate boilerplate project', undefined, { cwd, checkedPaths: candidatePaths });
  throw new Error(`Unable to locate boilerplate project from cwd: ${cwd}`);
}

export function resolvePresetsPath(): string | null {
  const cwd = process.cwd();
  const candidate = resolve(cwd, PRESETS_RELATIVE_PATH);
  if (existsSync(candidate)) {
    return candidate;
  }
  return null;
}

export function readDirectoryRecursive(dir: string, base: string = dir, out: FileMap = {}): FileMap {
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

export function loadBoilerplateFiles(presetId?: string): FileMap {
  let files: FileMap | null = null;

  if (presetId) {
    const presetsPath = resolvePresetsPath();
    if (presetsPath) {
      const presetPath = join(presetsPath, presetId);
      if (existsSync(presetPath) && existsSync(join(presetPath, "index.html"))) {
        files = readDirectoryRecursive(presetPath);
      }
    }
  }

  if (!files) {
    const boilerplatePath = resolveBoilerplatePath();
    files = readDirectoryRecursive(boilerplatePath);
  }

  return ensureSystemFiles(files);
}

export function listAvailablePresets(): PresetInfo[] {
  const presetsPath = resolvePresetsPath();
  if (!presetsPath) {
    return [];
  }

  const presets: PresetInfo[] = [];
  const entries = readdirSync(presetsPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '__non-migrated__') {
      const presetPath = join(presetsPath, entry.name);
      const packageJsonPath = join(presetPath, "package.json");

      let name = entry.name;
      let description = "";

      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
          name = packageJson.name || entry.name;
          description = packageJson.description || "";
        } catch (e) {
          // Ignore invalid package.json
        }
      }



      presets.push({
        id: entry.name,
        name,
        description,
      });
    }
  }

  return presets;
}

const CONTROLS_DIST_RELATIVE_PATH = "hyper-runtime/dist/controls/index.js";
const CONTROLS_BUNDLE_PATH = "/__hypertool__/controls/index.js";
const CONTROLS_GLOBALS_PATH = "/__hypertool__/controls/globals.js";
const FRAME_DIST_RELATIVE_PATH = "hyper-runtime/dist/frame/index.js";
const FRAME_BUNDLE_PATH = "/__hypertool__/frame/index.js";
const FRAME_GLOBALS_PATH = "/__hypertool__/frame/globals.js";

function injectControlsLibrary(files: FileMap): ScriptDescriptor | null {
  logger.debug('Injecting controls library');

  try {
    const distPath = resolve(process.cwd(), CONTROLS_DIST_RELATIVE_PATH);
    if (!existsSync(distPath)) {
      logger.warn('Controls dist not found', { distPath });
      return null;
    }

    const distCode = readFileSync(distPath, "utf8");
    logger.info('Loaded controls bundle', {
      sizeBytes: distCode.length,
      hashPreview: distCode.substring(0, 50),
    });
    files[CONTROLS_BUNDLE_PATH] = distCode;

    const globalsCode = `
import { createControls, createControlPanel, HypertoolControls, injectThemeVariables, studioTheme } from "./index.js";

if (typeof window !== "undefined") {
  window.hypertoolControls = {
    createControls,
    createControlPanel,
    HypertoolControls,
    injectThemeVariables,
    studioTheme,
  };
}
`.trimStart();

    files[CONTROLS_GLOBALS_PATH] = globalsCode;
    logger.info('Controls library injected successfully');
    return { src: "./__hypertool__/controls/globals.js", module: true };
  } catch (error) {
    logger.error('Failed to inject controls library', error);
    return null;
  }
}

function injectFrameLibrary(files: FileMap): ScriptDescriptor[] {
  const scripts: ScriptDescriptor[] = [];

  logger.debug('Injecting frame library');

  try {
    const distPath = resolve(process.cwd(), FRAME_DIST_RELATIVE_PATH);
    if (!existsSync(distPath)) {
      logger.warn('Frame dist not found', { distPath });
      return scripts;
    }

    const distCode = readFileSync(distPath, "utf8");
    logger.info('Loaded frame bundle', {
      sizeBytes: distCode.length,
      hashPreview: distCode.substring(0, 50),
    });
    files[FRAME_BUNDLE_PATH] = distCode;

    const globalsCode = `
import { createSandbox, ensureDependencies, mirrorCss, runtime } from "./index.js";

if (typeof window !== "undefined") {
  const existing = window.hyperFrame || {};
  window.hyperFrame = Object.assign({}, existing, {
    version: "universal",
    runtime,
    createSandbox,
    ensureDependencies,
    mirrorCss,
  });

  // Add message handling for capture functionality
  let recordingState = {
    isRecording: false,
    recorder: null,
    recordedChunks: []
  };

  window.addEventListener('message', (event) => {
    if (event.data?.source !== 'hypertool-main') return;
    
    const { type } = event.data;
    
    switch (type) {
      case 'HYPERTOOL_CAPTURE_PNG':
        handleCapturePNG();
        break;
      case 'HYPERTOOL_START_RECORDING':
        handleStartRecording();
        break;
      case 'HYPERTOOL_STOP_RECORDING':
        handleStopRecording();
        break;
    }
  });

  function handleCapturePNG() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          window.parent.postMessage({
            type: 'HYPERTOOL_CAPTURE_RESPONSE',
            data: {
              blob: blob,
              filename: 'hypertool-capture.png'
            }
          }, '*');
        }
      }, 'image/png');
    } else {
      console.warn('No canvas found for capture');
    }
  }

  function handleStartRecording() {
    console.log('Starting recording...');
    const canvas = document.querySelector('canvas');
    if (canvas && typeof canvas.captureStream === 'function') {
      const stream = canvas.captureStream(60);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });
      
      recordingState.recordedChunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingState.recordedChunks.push(event.data);
          console.log('Recording data available:', event.data.size, 'bytes');
        }
      };
      
      recorder.onstop = () => {
        console.log('Recording stopped, processing...');
        const blob = new Blob(recordingState.recordedChunks, { type: 'video/webm' });
        console.log('Recording blob size:', blob.size, 'bytes');
        window.parent.postMessage({
          type: 'HYPERTOOL_RECORDING_RESPONSE',
          data: {
            blob: blob,
            filename: 'hypertool-recording.webm'
          }
        }, '*');
        recordingState.isRecording = false;
        recordingState.recorder = null;
      };
      
      recorder.start();
      recordingState.recorder = recorder;
      recordingState.isRecording = true;
      console.log('Recording started successfully');
    } else {
      console.warn('Canvas not found or captureStream not supported');
    }
  }

  function handleStopRecording() {
    console.log('Stopping recording...');
    if (recordingState.recorder) {
      recordingState.recorder.stop();
      // Send immediate stop confirmation
      window.parent.postMessage({
        type: 'HYPERTOOL_RECORDING_STOPPED',
        data: {}
      }, '*');
      console.log('Stop recording message sent');
    } else {
      console.warn('No active recorder to stop');
    }
  }
}
`.trimStart();

    files[FRAME_GLOBALS_PATH] = globalsCode;
    scripts.push({ src: "./__hypertool__/frame/globals.js", module: true });
    logger.info('Frame library injected successfully');
  } catch (error) {
    logger.error('Failed to inject frame library', error);
  }

  return scripts;
}

function injectLibraryScripts(html: string, scriptSources: ScriptDescriptor[]): string {
  let output = html;
  const mainScriptPatterns = [
    '<script type="module" src="./main.tsx"></script>',
    '<script type="module" src="./main.ts"></script>',
  ];

  for (const descriptor of scriptSources) {
    if (output.includes(descriptor.src)) {
      continue;
    }

    const scriptTag = descriptor.module === false
      ? `    <script src="${descriptor.src}"></script>`
      : `    <script type="module" src="${descriptor.src}"></script>`;

    // Try to inject before main script (tsx or ts)
    let injected = false;
    for (const mainScriptTag of mainScriptPatterns) {
      if (output.includes(mainScriptTag)) {
        output = output.replace(mainScriptTag, `${scriptTag}\n    ${mainScriptTag}`);
        injected = true;
        break;
      }
    }

    if (injected) {
      continue;
    }

    // Fallback: inject before </body>
    if (output.includes("</body>")) {
      output = output.replace("</body>", `${scriptTag}\n</body>`);
      continue;
    }

    // Last resort: append at end
    output = `${output.trim()}\n${scriptTag}\n`;
  }

  return output;
}

export function ensureSystemFiles(original: FileMap): FileMap {
  const files = { ...original };
  const scriptSources: ScriptDescriptor[] = [];

  const frameScripts = injectFrameLibrary(files);
  if (frameScripts.length > 0) {
    scriptSources.push(...frameScripts);
  }

  const controlsScript = injectControlsLibrary(files);
  if (controlsScript) {
    scriptSources.push(controlsScript);
  }

  if (files["/index.html"] && scriptSources.length > 0) {
    files["/index.html"] = injectLibraryScripts(files["/index.html"], scriptSources);
  }

  return files;
}

export function loadRuntimeBundles(): FileMap {
  const files = ensureSystemFiles({});
  return Object.fromEntries(
    Object.entries(files).filter(([path]) => path.startsWith("/__hypertool__/")),
  );
}
