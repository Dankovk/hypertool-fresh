import { createSandbox } from "./__hypertool__/frame/index.js";
// Using HyperFrame global injected by the parent
type ControlDefinitions = Record<string, any>;
type SandboxContext = any;

const controlDefinitions: ControlDefinitions = {
  accent: {
    type: "color",
    label: "Accent",
    value: "#b22234",
  },
  background: {
    type: "color",
    label: "Background",
    value: "#0a1a44",
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
    value: false,
  },
  patrioticPalette: {
    type: "boolean",
    label: "Patriotic Palette",
    value: true,
  },
  showStars: {
    type: "boolean",
    label: "Stars",
    value: true,
  },
  starCount: {
    type: "number",
    label: "Star Count",
    value: 80,
    min: 0,
    max: 500,
    step: 1,
  },
  starTwinkle: {
    type: "number",
    label: "Star Twinkle",
    value: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
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
        title: "MAGA Pulse",
      },
    },
    setup: (context: SandboxContext) => initialisePulse(context),
  })
  .catch((error: unknown) => {
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

  // Star field for patriotic theme
  let stars: { x: number; y: number; r: number; phase: number }[] = [];
  const regenStars = () => {
    const count = Math.max(0, Math.floor(params.starCount ?? 80));
    stars = new Array(count).fill(0).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.5 + 0.5,
      phase: Math.random() * Math.PI * 2,
    }));
  };

  exports.setFilename("maga-pulse");
  exports.useDefaultCanvasCapture(true);

  const resize = () => {
    const { clientWidth, clientHeight } = mount;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    regenStars();
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

      let color = params.accent ?? "#b22234";
      const patriotic = params.patrioticPalette ?? true;
      const palette = ["#b22234", "#ffffff", "#3c3b6e"];
      if (useRainbow) {
        const hueBase = (elapsed * 0.02) % 360;
        const hue = (hueBase + (i * 360) / ringCount) % 360;
        const sat = Math.max(0, Math.min(1, params.saturation ?? 0.9)) * 100;
        const lit = Math.max(0, Math.min(1, params.lightness ?? 0.6)) * 100;
        color = `hsl(${hue.toFixed(1)}deg, ${sat.toFixed(1)}%, ${lit.toFixed(1)}%)`;
      } else if (patriotic) {
        color = palette[i % palette.length];
      }

      gradient.addColorStop(0, withAlpha(color, alpha * 0.75));
      gradient.addColorStop(1, withAlpha(color, 0));

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.fill();
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
        const patriotic = params.patrioticPalette ?? true;
        const palette = ["#b22234", "#ffffff", "#3c3b6e"];
        const c = useRainbow
          ? `hsl(${hue.toFixed(1)}deg, ${sat.toFixed(1)}%, ${lit.toFixed(1)}%)`
          : patriotic
            ? palette[s % palette.length]
            : (params.accent ?? "#b22234");

        orbGradient.addColorStop(0, withAlpha(c, 0.85));
        orbGradient.addColorStop(1, withAlpha(c, 0));

        ctx.beginPath();
        ctx.fillStyle = orbGradient;
        ctx.arc(x, y, petalSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Star overlay
    if (params.showStars ?? true) {
      const twinkle = Math.max(0, Math.min(1, params.starTwinkle ?? 0.5));
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "#ffffff";
      for (const star of stars) {
        const x = star.x * width;
        const y = star.y * height;
        const a = 0.3 + 0.7 * Math.max(0, Math.min(1, 0.5 + 0.5 * Math.sin(elapsed * 0.002 + star.phase))) * twinkle;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(x, y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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
