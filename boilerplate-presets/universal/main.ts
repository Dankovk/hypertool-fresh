import { createSandbox } from "./__hypertool__/frame/index.js";
import type {
  ControlDefinitions,
  SandboxContext,
} from "./__hypertool__/frame/index.js";

const controlDefinitions: ControlDefinitions = {
  accent: {
    type: "color",
    label: "Accent",
    value: "#38bdf8",
  },
  background: {
    type: "color",
    label: "Background",
    value: "#020617",
  },
  pulseSpeed: {
    type: "number",
    label: "Pulse Speed",
    value: 0.4,
    min: 0,
    max: 1,
    step: 0.01,
  },
  noise: {
    type: "number",
    label: "Noise",
    value: 0.35,
    min: 0,
    max: 1,
    step: 0.01,
  },
};

createSandbox({
  controls: {
    definitions: controlDefinitions,
    options: {
      title: "Pulse", 
    },
  },
  exportWidget: {
    filename: "hyper-pulse",
    useCanvasCapture: true,
  },
  setup: (context: SandboxContext) => initialisePulse(context),
}).catch((error) => {
  console.error("[hyper-pulse] Failed to initialise sandbox", error);
});

function initialisePulse(context: SandboxContext) {
  const { mount, params, exports, environment } = context;

  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  mount.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to obtain 2D rendering context");
  }

  exports.setFilename("hyper-pulse");
  exports.useDefaultCanvasCapture(true);

  const resize = () => {
    const { clientWidth, clientHeight } = mount;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
  };

  resize();
  environment.onResize(resize);

  let animationFrame = 0;
  let startTime = performance.now();

  const render = () => {
    const now = performance.now();
    const elapsed = (now - startTime) * (params.pulseSpeed ?? 0.4);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.fillStyle = params.background ?? "#020617";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX ** 2 + centerY ** 2);

    const ringCount = 12;
    for (let i = 0; i < ringCount; i += 1) {
      const progress = ((elapsed * 0.0005 + i / ringCount) % 1);
      const radius = progress * maxRadius;
      const alpha = Math.max(0, 1 - progress);
      const noise = (params.noise ?? 0.35) * 80;
      const wobble = Math.sin((elapsed * 0.002 + i) * 2.4) * noise;
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.max(0, radius - 40 + wobble),
        centerX,
        centerY,
        radius + wobble,
      );

      gradient.addColorStop(0, withAlpha(params.accent ?? "#38bdf8", alpha * 0.6));
      gradient.addColorStop(1, withAlpha(params.accent ?? "#38bdf8", 0));

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(centerX, centerY, radius + wobble, 0, Math.PI * 2);
      ctx.fill();
    }

    animationFrame = window.requestAnimationFrame(render);
  };

  animationFrame = window.requestAnimationFrame(render);

  return () => {
    window.cancelAnimationFrame(animationFrame);
  };
}

function withAlpha(color: string, alpha: number) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return color;
  }
  ctx.fillStyle = color;
  const computed = ctx.fillStyle;

  if (computed.startsWith("#")) {
    const bigint = parseInt(computed.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }

  return computed.replace(/rgba?\(([^)]+)\)/, (_match, parts) => {
    const [r, g, b] = parts.split(",").map((value) => Number(value.trim()));
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  });
}
