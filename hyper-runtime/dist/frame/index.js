var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};

// src/frame/index.ts
var exports_frame = {};
__export(exports_frame, {
  runtime: () => runtime,
  mirrorCss: () => mirrorCss,
  ensureDependencies: () => ensureDependencies,
  createSandbox: () => createSandbox,
  configureRuntime: () => configureRuntime,
  attachToWindow: () => attachToWindow
});

// src/frame/cssBridge.ts
var CLONE_ATTRIBUTE = "data-hyper-frame-clone";
var SUPPORTED_NODE_NAMES = new Set(["STYLE", "LINK"]);
var CSS_SYNC_MESSAGE_TYPE = "hyper-frame:css-sync";

class CssBridge {
  source;
  target;
  observer = null;
  nodeMap = new WeakMap;
  active = false;
  messageListener = null;
  usePostMessage = false;
  cssNodesById = new Map;
  constructor(options = {}) {
    let sourceDoc = null;
    if (options.sourceDocument) {
      sourceDoc = options.sourceDocument;
    } else if (typeof window !== "undefined") {
      try {
        sourceDoc = window.parent?.document ?? null;
      } catch (error) {
        console.debug("[hyper-frame] Using postMessage for CSS sync (cross-origin)");
        this.usePostMessage = true;
        sourceDoc = null;
      }
    }
    this.source = sourceDoc;
    this.target = options.targetDocument ?? (typeof document !== "undefined" ? document : null);
    this.active = Boolean(options.mirror ?? true);
  }
  start() {
    if (!this.active)
      return;
    if (this.usePostMessage) {
      this.startPostMessageMode();
    } else if (this.source && this.target) {
      this.cleanupPreviousClones();
      this.syncAll();
      this.attachObserver();
    } else {
      console.warn("[hyper-frame] Unable to mirror CSS – missing source or target document.");
    }
  }
  stop() {
    this.observer?.disconnect();
    this.observer = null;
    this.nodeMap = new WeakMap;
    this.cleanupPreviousClones();
    if (this.messageListener && typeof window !== "undefined") {
      window.removeEventListener("message", this.messageListener);
      this.messageListener = null;
    }
    this.cssNodesById.clear();
  }
  startPostMessageMode() {
    if (!this.target || typeof window === "undefined")
      return;
    this.cleanupPreviousClones();
    this.messageListener = (event) => {
      if (!event.data || event.data.type !== CSS_SYNC_MESSAGE_TYPE)
        return;
      this.handleCssMessage(event.data);
    };
    window.addEventListener("message", this.messageListener);
    console.debug("[hyper-frame] CSS postMessage receiver ready");
  }
  handleCssMessage(message) {
    if (!this.target)
      return;
    switch (message.action) {
      case "init":
        this.cleanupPreviousClones();
        this.cssNodesById.clear();
        break;
      case "add":
        if (message.id && message.tagName) {
          this.addCssNode(message.id, message.tagName, message.attributes, message.textContent);
        }
        break;
      case "remove":
        if (message.id) {
          this.removeCssNode(message.id);
        }
        break;
      case "update":
        if (message.id) {
          this.updateCssNode(message.id, message.attributes, message.textContent);
        }
        break;
    }
  }
  addCssNode(id, tagName, attributes, textContent) {
    if (!this.target)
      return;
    if (this.cssNodesById.has(id))
      return;
    const element = document.createElement(tagName);
    element.setAttribute(CLONE_ATTRIBUTE, "true");
    element.setAttribute("data-css-id", id);
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
      }
    }
    if (textContent) {
      element.textContent = textContent;
    }
    this.target.head.appendChild(element);
    this.cssNodesById.set(id, element);
  }
  removeCssNode(id) {
    const element = this.cssNodesById.get(id);
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
      this.cssNodesById.delete(id);
    }
  }
  updateCssNode(id, attributes, textContent) {
    const element = this.cssNodesById.get(id);
    if (!element)
      return;
    if (attributes) {
      for (const attr of Array.from(element.attributes)) {
        if (!attr.name.startsWith("data-")) {
          element.removeAttribute(attr.name);
        }
      }
      for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
      }
    }
    if (textContent !== undefined) {
      element.textContent = textContent;
    }
  }
  cleanupPreviousClones() {
    if (!this.target)
      return;
    this.target.querySelectorAll(`[${CLONE_ATTRIBUTE}="true"]`).forEach((node) => node.parentNode?.removeChild(node));
  }
  syncAll() {
    if (!this.source || !this.target)
      return;
    const head = this.source.head;
    const nodes = Array.from(head.children).filter((node) => SUPPORTED_NODE_NAMES.has(node.nodeName));
    nodes.forEach((node) => {
      const clone = this.cloneNode(node);
      if (!clone)
        return;
      this.target?.head.appendChild(clone);
      this.nodeMap.set(node, clone);
    });
  }
  attachObserver() {
    if (!this.source || !this.target)
      return;
    if (this.observer)
      return;
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        switch (mutation.type) {
          case "childList":
            this.handleChildListMutation(mutation);
            break;
          case "characterData":
            this.handleCharacterDataMutation(mutation);
            break;
          case "attributes":
            this.handleAttributeMutation(mutation);
            break;
        }
      });
    });
    this.observer.observe(this.source.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true
    });
  }
  handleChildListMutation(mutation) {
    if (!this.target)
      return;
    mutation.removedNodes.forEach((node) => {
      const mapped = this.nodeMap.get(node);
      if (mapped && mapped.parentNode) {
        mapped.parentNode.removeChild(mapped);
        this.nodeMap.delete(node);
      }
    });
    mutation.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement))
        return;
      if (!SUPPORTED_NODE_NAMES.has(node.nodeName))
        return;
      const clone = this.cloneNode(node);
      if (!clone)
        return;
      const reference = mutation.nextSibling ? this.nodeMap.get(mutation.nextSibling) : null;
      if (reference && reference.parentNode) {
        reference.parentNode.insertBefore(clone, reference);
      } else {
        this.target?.head.appendChild(clone);
      }
      this.nodeMap.set(node, clone);
    });
  }
  handleCharacterDataMutation(mutation) {
    const targetNode = mutation.target;
    const parent = targetNode.parentNode;
    if (!parent)
      return;
    const mappedParent = this.nodeMap.get(parent);
    if (!mappedParent)
      return;
    mappedParent.textContent = parent.textContent;
  }
  handleAttributeMutation(mutation) {
    const target = mutation.target;
    const mapped = this.nodeMap.get(target);
    if (!mapped || !(mapped instanceof Element))
      return;
    if (mutation.attributeName) {
      const value = target.getAttribute(mutation.attributeName);
      if (value === null) {
        mapped.removeAttribute(mutation.attributeName);
      } else {
        mapped.setAttribute(mutation.attributeName, value);
      }
    }
  }
  cloneNode(node) {
    if (!(node instanceof HTMLElement))
      return null;
    if (!SUPPORTED_NODE_NAMES.has(node.nodeName))
      return null;
    const clone = node.cloneNode(true);
    clone.setAttribute(CLONE_ATTRIBUTE, "true");
    return clone;
  }
}

// src/frame/controlsBridge.ts
class ControlsBridge {
  controlsApi;
  constructor() {
    this.controlsApi = this.resolveControlsApi();
  }
  resolveControlsApi() {
    if (typeof window === "undefined") {
      throw new Error("[hyper-frame] window is not available");
    }
    const hyperWindow = window;
    if (!hyperWindow.hypertoolControls) {
      throw new Error("[hyper-frame] hypertool controls are not available on window");
    }
    return hyperWindow.hypertoolControls;
  }
  init(options) {
    const panelOptions = options.options || {};
    const controls = this.controlsApi.createControlPanel(options.definitions, {
      title: panelOptions.title,
      position: panelOptions.position,
      expanded: panelOptions.expanded,
      container: panelOptions.container,
      onChange: (params, changeContext) => {
        const change = {
          key: changeContext.key,
          value: changeContext.value,
          event: changeContext.event
        };
        options.onControlChange?.(change);
        if (typeof panelOptions.onChange === "function") {
          panelOptions.onChange(change, options.context);
        }
      }
    });
    return controls;
  }
}

// src/frame/exportBridge.ts
class ExportBridge {
  container;
  position;
  filename;
  root = null;
  imageButton = null;
  videoButton = null;
  statusLabel = null;
  statusTimeout = null;
  userImageCapture = null;
  userVideoCapture = null;
  defaultCanvasCaptureEnabled = false;
  recording = false;
  recorder = null;
  recordedChunks = [];
  constructor(options) {
    this.container = options.container;
    this.position = options.position;
    this.filename = options.filename ?? "hyperframe-export";
    this.mount();
  }
  mount() {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.createElement("div");
    root.className = "hyper-frame-export-widget";
    root.dataset.hyperFrame = "export-widget";
    Object.assign(root.style, {
      position: "fixed",
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      padding: "0.5rem 0.75rem",
      borderRadius: "0.75rem",
      color: "#f8fafc",
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont",
      fontSize: "12px",
      lineHeight: "16px",
      boxShadow: "0 20px 40px rgba(15, 23, 42, 0.3)",
      zIndex: "2147483646",
      pointerEvents: "auto",
      backdropFilter: "blur(8px)"
    });
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexDirection = "row";
    controls.style.alignItems = "center";
    controls.style.justifyContent = "space-between";
    controls.style.gap = "0.5rem";
    const imageButton = document.createElement("button");
    imageButton.type = "button";
    imageButton.textContent = "Capture PNG";
    imageButton.style.flex = "1 1 auto";
    imageButton.style.padding = "0.35rem 0.6rem";
    imageButton.style.border = "0";
    imageButton.style.borderRadius = "0.5rem";
    imageButton.style.cursor = "pointer";
    imageButton.style.background = "rgba(94, 234, 212, 0.2)";
    imageButton.style.color = "#5eead4";
    imageButton.style.fontWeight = "600";
    const videoButton = document.createElement("button");
    videoButton.type = "button";
    videoButton.textContent = "Record Video";
    videoButton.style.flex = "1 1 auto";
    videoButton.style.padding = "0.35rem 0.6rem";
    videoButton.style.border = "0";
    videoButton.style.borderRadius = "0.5rem";
    videoButton.style.cursor = "pointer";
    videoButton.style.background = "rgba(129, 140, 248, 0.2)";
    videoButton.style.color = "#a5b4fc";
    videoButton.style.fontWeight = "600";
    imageButton.addEventListener("click", () => this.handleImageCapture(), { passive: true });
    videoButton.addEventListener("click", () => this.toggleRecording(), { passive: true });
    const status = document.createElement("span");
    status.style.display = "block";
    status.style.color = "#e2e8f0";
    status.style.opacity = "0.8";
    status.style.minHeight = "16px";
    controls.appendChild(imageButton);
    controls.appendChild(videoButton);
    root.appendChild(controls);
    root.appendChild(status);
    this.root = root;
    this.imageButton = imageButton;
    this.videoButton = videoButton;
    this.statusLabel = status;
    this.applyPosition();
    document.body.appendChild(root);
    this.updateButtonStates();
  }
  applyPosition() {
    if (!this.root)
      return;
    const position = this.position ?? "top-left";
    const offsets = {
      "bottom-right": { bottom: "1rem", right: "1rem", top: "", left: "" },
      "bottom-left": { bottom: "1rem", left: "1rem", top: "", right: "" },
      "top-right": { top: "1rem", right: "1rem", bottom: "", left: "" },
      "top-left": { top: "1rem", left: "1rem", bottom: "", right: "" }
    };
    const styles = offsets[position];
    Object.assign(this.root.style, styles);
  }
  setStatus(message, tone = "default") {
    if (!this.statusLabel)
      return;
    if (this.statusTimeout) {
      window.clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }
    this.statusLabel.textContent = message;
    switch (tone) {
      case "error":
        this.statusLabel.style.color = "#fca5a5";
        break;
      case "success":
        this.statusLabel.style.color = "#bbf7d0";
        break;
      default:
        this.statusLabel.style.color = "#e2e8f0";
    }
    if (message) {
      this.statusTimeout = window.setTimeout(() => {
        if (this.statusLabel) {
          this.statusLabel.textContent = "";
          this.statusLabel.style.color = "#e2e8f0";
        }
        this.statusTimeout = null;
      }, 4000);
    }
  }
  updateButtonStates() {
    if (this.imageButton) {
      this.imageButton.disabled = !this.getActiveImageCapture();
      this.imageButton.style.opacity = this.imageButton.disabled ? "0.6" : "1";
    }
    if (this.videoButton) {
      const hasVideo = Boolean(this.getActiveVideoCapture());
      this.videoButton.disabled = !hasVideo;
      this.videoButton.style.opacity = hasVideo ? "1" : "0.6";
    }
  }
  normalizeImageCapture(handler) {
    if (!handler)
      return null;
    if (typeof handler === "function") {
      return { capture: handler };
    }
    return {
      capture: handler.capture,
      filename: handler.filename,
      mimeType: handler.mimeType
    };
  }
  normalizeVideoCapture(handler) {
    if (!handler)
      return null;
    return {
      requestStream: handler.requestStream,
      filename: handler.filename,
      mimeType: handler.mimeType,
      bitsPerSecond: handler.bitsPerSecond,
      timeSlice: handler.timeSlice
    };
  }
  getActiveImageCapture() {
    if (this.userImageCapture) {
      return this.userImageCapture;
    }
    if (this.defaultCanvasCaptureEnabled) {
      return {
        capture: () => this.captureCanvasSnapshot(),
        filename: undefined,
        mimeType: "image/png"
      };
    }
    return null;
  }
  getActiveVideoCapture() {
    if (this.userVideoCapture) {
      return this.userVideoCapture;
    }
    if (this.defaultCanvasCaptureEnabled) {
      return {
        requestStream: () => this.captureCanvasStream(),
        filename: undefined,
        mimeType: "video/webm;codecs=vp9"
      };
    }
    return null;
  }
  async captureCanvasSnapshot() {
    const canvas = this.container.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("No canvas element available for capture.");
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas capture returned an empty blob."));
        }
      });
    });
  }
  async captureCanvasStream() {
    const canvas = this.container.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("No canvas element available for recording.");
    }
    if (typeof canvas.captureStream !== "function") {
      throw new Error("Canvas captureStream API is not supported in this browser.");
    }
    return canvas.captureStream(60);
  }
  async handleImageCapture() {
    const handler = this.getActiveImageCapture();
    if (!handler) {
      this.setStatus("No capture handler available", "error");
      return;
    }
    try {
      this.setBusy(true, "image");
      const result = await handler.capture();
      const blob = await this.resolveCaptureResult(result, handler.mimeType ?? "image/png");
      if (blob) {
        const filename = handler.filename ?? `${this.filename}.png`;
        this.downloadBlob(blob, filename);
        this.setStatus("PNG exported", "success");
      }
    } catch (error) {
      console.error("[hyper-frame] Failed to capture image", error);
      this.setStatus(error.message || "Failed to capture image", "error");
    } finally {
      this.setBusy(false, "image");
    }
  }
  async toggleRecording() {
    if (this.recording) {
      this.stopRecording();
      return;
    }
    const handler = this.getActiveVideoCapture();
    if (!handler) {
      this.setStatus("No recorder available", "error");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      this.setStatus("MediaRecorder is not supported in this browser", "error");
      return;
    }
    try {
      const stream = await handler.requestStream();
      if (!stream) {
        throw new Error("Recording stream is not available");
      }
      this.recordedChunks = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: handler.mimeType,
        videoBitsPerSecond: handler.bitsPerSecond
      });
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data?.size) {
          this.recordedChunks.push(event.data);
        }
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(this.recordedChunks, { type: handler.mimeType ?? "video/webm" });
        const filename = handler.filename ?? `${this.filename}.webm`;
        this.downloadBlob(blob, filename);
        this.setStatus("Recording saved", "success");
        stream.getTracks().forEach((track) => track.stop());
        this.recording = false;
        this.updateRecordingUi();
      });
      recorder.start(handler.timeSlice);
      this.recorder = recorder;
      this.recording = true;
      this.setStatus("Recording in progress…");
      this.updateRecordingUi();
    } catch (error) {
      console.error("[hyper-frame] Failed to start recording", error);
      this.setStatus(error.message || "Failed to record video", "error");
      this.recording = false;
      this.recorder = null;
      this.updateRecordingUi();
    }
  }
  stopRecording() {
    if (!this.recorder) {
      return;
    }
    this.setStatus("Finishing recording…");
    this.recorder.stop();
    this.recorder = null;
    this.recording = false;
    this.updateRecordingUi();
  }
  updateRecordingUi() {
    if (!this.videoButton)
      return;
    this.videoButton.textContent = this.recording ? "Stop Recording" : "Record Video";
    this.videoButton.style.background = this.recording ? "rgba(248, 113, 113, 0.25)" : "rgba(129, 140, 248, 0.2)";
    this.videoButton.style.color = this.recording ? "#fecaca" : "#a5b4fc";
  }
  async resolveCaptureResult(result, mimeType) {
    if (!result) {
      return null;
    }
    if (result instanceof Blob) {
      return result;
    }
    if (typeof result === "string") {
      if (result.startsWith("data:")) {
        const response2 = await fetch(result);
        return await response2.blob();
      }
      const response = await fetch(result);
      return await response.blob();
    }
    if (result instanceof HTMLCanvasElement) {
      return await new Promise((resolve, reject) => {
        result.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas export failed."));
          }
        }, mimeType);
      });
    }
    if (typeof OffscreenCanvas !== "undefined" && result instanceof OffscreenCanvas) {
      const blob = await result.convertToBlob({ type: mimeType });
      return blob;
    }
    return null;
  }
  downloadBlob(blob, filename) {
    if (typeof window === "undefined") {
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
  setBusy(busy, mode) {
    const button = mode === "image" ? this.imageButton : this.videoButton;
    if (!button)
      return;
    button.disabled = busy;
    button.style.opacity = busy ? "0.6" : "1";
  }
  setFilename(filename) {
    this.filename = filename;
  }
  setVisible(visible) {
    if (!this.root)
      return;
    this.root.style.display = visible ? "flex" : "none";
  }
  registerImageCapture(handler) {
    this.userImageCapture = this.normalizeImageCapture(handler);
    this.updateButtonStates();
  }
  registerVideoCapture(handler) {
    this.userVideoCapture = this.normalizeVideoCapture(handler);
    this.updateButtonStates();
  }
  useDefaultCanvasCapture(enable = true) {
    this.defaultCanvasCaptureEnabled = enable;
    this.updateButtonStates();
  }
  getApi() {
    return {
      registerImageCapture: (handler) => this.registerImageCapture(handler),
      registerVideoCapture: (handler) => this.registerVideoCapture(handler),
      setFilename: (filename) => this.setFilename(filename),
      setVisible: (visible) => this.setVisible(visible),
      useDefaultCanvasCapture: (enable) => this.useDefaultCanvasCapture(enable),
      destroy: () => this.destroy()
    };
  }
  destroy() {
    if (this.statusTimeout) {
      window.clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }
    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    this.root = null;
    this.imageButton = null;
    this.videoButton = null;
    this.statusLabel = null;
    this.recorder = null;
    this.recording = false;
    this.recordedChunks = [];
  }
}

// src/frame/dependencyManager.ts
class DependencyManager {
  pending = new Map;
  ensure(dependency) {
    const key = this.createKey(dependency);
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    const task = this.load(dependency);
    this.pending.set(key, task);
    return task;
  }
  async ensureAll(dependencies = []) {
    for (const dependency of dependencies) {
      await this.ensure(dependency);
    }
  }
  createKey(dependency) {
    return `${dependency.type}:${dependency.url}`;
  }
  load(dependency) {
    switch (dependency.type) {
      case "script":
        return this.injectScript(dependency);
      case "style":
        return this.injectStyle(dependency);
      default:
        return Promise.reject(new Error(`[hyper-frame] Unsupported dependency type: ${dependency.type}`));
    }
  }
  injectScript(dependency) {
    if (typeof document === "undefined") {
      return Promise.reject(new Error("[hyper-frame] document is not available"));
    }
    const existing = Array.from(document.querySelectorAll("script")).find((script) => script.src === dependency.url);
    if (existing) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = dependency.url;
      script.async = true;
      script.dataset.hyperFrame = "external";
      if (dependency.integrity) {
        script.integrity = dependency.integrity;
      }
      if (dependency.crossOrigin) {
        script.crossOrigin = dependency.crossOrigin;
      }
      if (dependency.attributes) {
        Object.entries(dependency.attributes).forEach(([key, value]) => {
          script.setAttribute(key, value);
        });
      }
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error(`[hyper-frame] Failed to load script ${dependency.url}`)), {
        once: true
      });
      document.head.appendChild(script);
    });
  }
  injectStyle(dependency) {
    if (typeof document === "undefined") {
      return Promise.reject(new Error("[hyper-frame] document is not available"));
    }
    const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((link) => link.href === dependency.url);
    if (existing) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = dependency.url;
      link.dataset.hyperFrame = "external";
      if (dependency.attributes) {
        Object.entries(dependency.attributes).forEach(([key, value]) => {
          link.setAttribute(key, value);
        });
      }
      link.addEventListener("load", () => resolve(), { once: true });
      link.addEventListener("error", () => reject(new Error(`[hyper-frame] Failed to load stylesheet ${dependency.url}`)), {
        once: true
      });
      document.head.appendChild(link);
    });
  }
}

// src/frame/utils/dom.ts
function resolveContainer(options = {}) {
  const doc = options.documentRef ?? document;
  if (!doc) {
    throw new Error("[hyper-frame] document is not available");
  }
  const className = options.containerClassName || "hypertool-sketch";
  const target = options.target;
  if (target instanceof HTMLElement) {
    target.classList.add(className);
    return { element: target, createdInternally: false };
  }
  if (typeof target === "string" && target.trim().length > 0) {
    const node = doc.querySelector(target);
    if (node) {
      node.classList.add(className);
      return { element: node, createdInternally: false };
    }
    console.warn(`[hyper-frame] Could not find container for selector "${target}", creating one instead.`);
  }
  const container = doc.createElement("div");
  container.classList.add(className);
  doc.body.appendChild(container);
  return { element: container, createdInternally: true };
}

// src/frame/runtime.ts
function runCleanups(cleanups) {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) {
      try {
        cleanup();
      } catch (error) {
        console.error("[hyper-frame] cleanup failed", error);
      }
    }
  }
}

class HyperFrameRuntime {
  dependencyManager = new DependencyManager;
  cssBridge = null;
  config;
  constructor(config = {}) {
    this.config = config;
  }
  async ensureDependencies(dependencies = []) {
    if (!dependencies.length) {
      return;
    }
    await this.dependencyManager.ensureAll(dependencies);
  }
  mirrorCss() {
    if (this.cssBridge) {
      return;
    }
    this.cssBridge = new CssBridge({ mirror: this.config.mirrorCss !== false });
    this.cssBridge.start();
  }
  async createSandbox(options) {
    if (options.dependencies?.length) {
      await this.ensureDependencies(options.dependencies);
    }
    if (this.config.mirrorCss !== false && options.mirrorCss !== false) {
      this.mirrorCss();
    }
    const mount = this.createMount(options.mount);
    const cleanups = [];
    const pushCleanup = (cleanup) => {
      if (typeof cleanup === "function") {
        cleanups.push(cleanup);
      }
    };
    const exportBridge = new ExportBridge({
      container: mount.container,
      position: options.exportWidget?.position,
      filename: options.exportWidget?.filename
    });
    if (options.exportWidget?.enabled === false) {
      exportBridge.setVisible(false);
    }
    if (options.exportWidget?.useCanvasCapture !== false) {
      exportBridge.useDefaultCanvasCapture(true);
    }
    const environment = this.createEnvironment(pushCleanup);
    const context = {
      mount: mount.container,
      params: {},
      controls: null,
      exports: exportBridge.getApi(),
      runtime: this,
      environment
    };
    let controlsHandle = null;
    if (options.controls?.definitions) {
      const controlsBridge = new ControlsBridge;
      controlsHandle = controlsBridge.init({
        definitions: options.controls.definitions,
        options: options.controls.options,
        context,
        onControlChange: (change) => {
          options.controls?.onChange?.(change, context);
        }
      });
      context.controls = controlsHandle;
      context.params = controlsHandle?.params ?? {};
      pushCleanup(() => {
        if (!controlsHandle)
          return;
        if (typeof controlsHandle.destroy === "function") {
          controlsHandle.destroy();
        } else if (typeof controlsHandle.dispose === "function") {
          controlsHandle.dispose();
        }
      });
    }
    pushCleanup(() => exportBridge.destroy());
    pushCleanup(() => mount.destroy());
    let setupCleanup;
    try {
      setupCleanup = await options.setup(context);
    } catch (error) {
      console.error("[hyper-frame] sandbox setup failed", error);
      runCleanups(cleanups);
      throw error;
    }
    if (typeof setupCleanup === "function") {
      pushCleanup(() => {
        try {
          setupCleanup?.();
        } catch (error) {
          console.error("[hyper-frame] teardown failed", error);
        }
      });
    }
    const handle = {
      container: mount.container,
      controls: controlsHandle,
      params: context.params,
      destroy: () => {
        runCleanups(cleanups);
      }
    };
    return handle;
  }
  createEnvironment(pushCleanup) {
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error("[hyper-frame] window or document is not available");
    }
    return {
      window,
      document,
      addCleanup: (cleanup) => {
        if (typeof cleanup === "function") {
          pushCleanup(cleanup);
        }
      },
      onResize: (handler, options) => {
        window.addEventListener("resize", handler, options);
        const dispose = () => window.removeEventListener("resize", handler, options);
        pushCleanup(dispose);
        return dispose;
      }
    };
  }
  createMount(options) {
    const baseOptions = options;
    const resolved = resolveContainer({
      target: baseOptions?.target,
      containerClassName: baseOptions?.containerClassName
    });
    if (typeof baseOptions?.onReady === "function") {
      baseOptions.onReady({ container: resolved.element });
    }
    return {
      container: resolved.element,
      destroy: () => {
        if (resolved.createdInternally) {
          resolved.element.remove();
        }
      }
    };
  }
}

// src/frame/index.ts
var defaultConfig = { mirrorCss: true };
var runtime = new HyperFrameRuntime(defaultConfig);
function configureRuntime(config) {
  return new HyperFrameRuntime(config);
}
function createSandbox(options) {
  return runtime.createSandbox(options);
}
function ensureDependencies(options) {
  return runtime.ensureDependencies(options ?? []);
}
function mirrorCss() {
  runtime.mirrorCss();
}
function attachToWindow() {
  if (typeof window === "undefined") {
    return;
  }
  const hyperWindow = window;
  const existing = hyperWindow.hyperFrame || {};
  const api = {
    version: "universal",
    runtime,
    createSandbox,
    ensureDependencies,
    mirrorCss
  };
  hyperWindow.hyperFrame = { ...existing, ...api };
}
attachToWindow();
export {
  runtime,
  mirrorCss,
  ensureDependencies,
  createSandbox,
  configureRuntime,
  attachToWindow
};

//# debugId=5531DE839D5ABFE664756E2164756E21
