import { createSandbox } from "./__hypertool__";

const controlDefinitions: ControlDefinitions = {
  squareColor: {
    type: "color",
    label: "Square Color",
    value: "#a855f7",
  },
};

createSandbox({
  controls: {
    definitions: controlDefinitions,
    options: {
      title: "Simple Square",
    },
  },
  exportWidget: {
    filename: "simple-square",
    useCanvasCapture: true,
    enabled: true,
  },
  setup: (context: SandboxContext) => initialiseSquare(context),
}).catch((error) => {
  console.error("[square] Failed to initialise sandbox", error);
});

function initialiseSquare(context: SandboxContext) {
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

  exports.setFilename("simple-square");
  exports.useDefaultCanvasCapture(true);

  let width = 0;
  let height = 0;

  const resize = () => {
    const { clientWidth, clientHeight } = mount;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
  };

  resize();
  environment.onResize(resize);

  let animationFrame = 0;

  const render = () => {
    const squareColor = params.squareColor ?? "#a855f7";

    // Black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Draw centered purple square
    const squareSize = 100;
    const x = (width - squareSize) / 2;
    const y = (height - squareSize) / 2;
    
    ctx.fillStyle = squareColor;
    ctx.fillRect(x, y, squareSize, squareSize);

    animationFrame = window.requestAnimationFrame(render);
  };

  animationFrame = window.requestAnimationFrame(render);

  return () => {
    window.cancelAnimationFrame(animationFrame);
  };
}
