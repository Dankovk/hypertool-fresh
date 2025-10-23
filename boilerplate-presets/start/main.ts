import { createSandbox } from "./__hypertool__/frame/index.js";

const controlDefinitions = {
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
  rainbow: {
    type: "boolean",
    label: "Rainbow",
    value: true,
  },
  saturation: {
    type: "number",
    label: "Saturation",
    value: 0.9,
    min: 0,
    max: 1,
    step: 0.01,
  },
  lightness: {
    type: "number",
    label: "Lightness",
    value: 0.6,
    min: 0,
    max: 1,
    step: 0.01,
  },
  ringCount: {
    type: "number",
    label: "Rings",
    value: 14,
    min: 6,
    max: 24,
    step: 1,
  },
  ringThickness: {
    type: "number",
    label: "Ring Thickness",
    value: 45,
    min: 10,
    max: 80,
    step: 1,
  },
  pulseShape: {
    type: "select",
    label: "Pulse Shape",
    options: [
      { label: "Circle", value: "circle" },
      { label: "Square", value: "square" },
      { label: "Star", value: "star" }
    ],
    value: "circle",
  },
  kaleidoSegments: {
    type: "number",
    label: "Kaleido Segments",
    value: 8,
    min: 1,
    max: 12,
    step: 1,
  },
  petalSize: {
    type: "number",
    label: "Orb Size",
    value: 60,
    min: 20,
    max: 120,
    step: 1,
  },
  grain: {
    type: "number",
    label: "Grain",
    value: 0.2,
    min: 0,
    max: 1,
    step: 0.01,
  },
};

createSandbox({
  dependencies: [],
  controls: {
    definitions: controlDefinitions,
    options: {
      title: "Hippie Pulse",
    },
  },
  setup: (context) => initialisePulse(context),
}).catch((error) => {
  console.error("[hyper-pulse] Failed to initialise sandbox", error);
});

function initialisePulse(context: any) {
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

  // Hippie helpers: noise texture for grain overlay
  const noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = 128;
  noiseCanvas.height = 128;
  const nctx = noiseCanvas.getContext("2d");
  const updateNoise = () => {
    if (!nctx) return;
    const imageData = nctx.createImageData(noiseCanvas.width, noiseCanvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = 255;
    }
    nctx.putImageData(imageData, 0, 0);
  };

  exports.setFilename("hippie-pulse");
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

    // Background
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = params.background ?? "#020617";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX ** 2 + centerY ** 2);

    const ringCount = Math.max(1, Math.floor(params.ringCount ?? 14));
    const ringThickness = Math.max(1, Math.floor(params.ringThickness ?? 45));
    const useRainbow = params.rainbow ?? true;
    const shape = String(params.pulseShape ?? "circle");

    if (useRainbow) {
      ctx.globalCompositeOperation = "lighter";
    }

    for (let i = 0; i < ringCount; i += 1) {
      const progress = ((elapsed * 0.0005 + i / ringCount) % 1);
      const radius = progress * maxRadius;
      const alpha = Math.max(0, 1 - progress);

      const wobbleAmp = (params.noise ?? 0.35) * 80;
      const wobble = Math.sin((elapsed * 0.002 + i) * 2.4) * wobbleAmp;

      const innerRadius = Math.max(0, radius - ringThickness + wobble);
      const outerRadius = Math.max(0, radius + wobble);

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        innerRadius,
        centerX,
        centerY,
        outerRadius,
      );

      let color = params.accent ?? "#38bdf8";
      if (useRainbow) {
        const hueBase = (elapsed * 0.02) % 360;
        const hue = (hueBase + (i * 360) / ringCount) % 360;
        const sat = Math.max(0, Math.min(1, params.saturation ?? 0.9)) * 100;
        const lit = Math.max(0, Math.min(1, params.lightness ?? 0.6)) * 100;
        color = `hsl(${hue.toFixed(1)}deg, ${sat.toFixed(1)}%, ${lit.toFixed(1)}%)`;
      }

      gradient.addColorStop(0, withAlpha(color, alpha * 0.75));
      gradient.addColorStop(1, withAlpha(color, 0));

      if (shape === "circle") {
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.beginPath();
        pathForShape(ctx, centerX, centerY, outerRadius, shape);
        ctx.clip();
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Kaleidoscopic orbs
    const segments = Math.max(1, Math.floor(params.kaleidoSegments ?? 8));
    if (segments > 1) {
      const petalSize = Math.max(5, Math.floor(params.petalSize ?? 60));
      const hueBase = (elapsed * 0.02) % 360;
      for (let s = 0; s < segments; s += 1) {
        const angle = s * ((Math.PI * 2) / segments) + (elapsed * 0.0006);
        const r = (Math.sin(elapsed * 0.001 + s) * 0.5 + 0.5) * Math.min(centerX, centerY) * 0.85;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        const orbGradient = ctx.createRadialGradient(x, y, 0, x, y, petalSize);
        const hue = (hueBase + (s * 360) / segments) % 360;
        const sat = Math.max(0, Math.min(1, params.saturation ?? 0.9)) * 100;
        const lit = Math.max(0, Math.min(1, params.lightness ?? 0.6)) * 100;
        const c = useRainbow ? `hsl(${hue.toFixed(1)}deg, ${sat.toFixed(1)}%, ${lit.toFixed(1)}%)` : (params.accent ?? "#38bdf8");

        orbGradient.addColorStop(0, withAlpha(c, 0.85));
        orbGradient.addColorStop(1, withAlpha(c, 0));

        ctx.beginPath();
        ctx.fillStyle = orbGradient;
        ctx.arc(x, y, petalSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Grain overlay
    const grainStrength = Math.max(0, Math.min(1, params.grain ?? 0.2));
    if (grainStrength > 0) {
      updateNoise();
      const pattern = ctx.createPattern(noiseCanvas, "repeat");
      if (pattern) {
        ctx.save();
        ctx.globalAlpha = grainStrength * 0.25;
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    animationFrame = window.requestAnimationFrame(render);
  };

  animationFrame = window.requestAnimationFrame(render);

  return () => {
    window.cancelAnimationFrame(animationFrame);
  };
}

function pathForShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, shape: string) {
  if (shape === "square") {
    const size = radius * 2;
    ctx.rect(cx - radius, cy - radius, size, size);
    return;
  }
  if (shape === "star") {
    const points = 5;
    const outer = radius;
    const inner = radius * 0.5;
    let angle = -Math.PI / 2;
    const step = Math.PI / points;
    ctx.moveTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    for (let i = 0; i < points; i++) {
      angle += step;
      ctx.lineTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      angle += step;
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    }
    ctx.closePath();
    return;
  }
  // default circle
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
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
    const [r, g, b] = parts.split(",").map((value: string) => Number(value.trim()));
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  });
}
