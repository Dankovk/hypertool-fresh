import { createSandbox } from "./__hypertool__";

const controlDefinitions: ControlDefinitions = {
  birdCount: {
    type: "number",
    label: "Bird Count",
    value: 100,
    min: 10,
    max: 1000,
    step: 10,
  },
  maxSpeed: {
    type: "number",
    label: "Max Speed",
    value: 4,
    min: 1,
    max: 10,
    step: 0.5,
  },
  separationRadius: {
    type: "number",
    label: "Separation Radius",
    value: 25,
    min: 10,
    max: 100,
    step: 5,
  },
  alignmentRadius: {
    type: "number",
    label: "Alignment Radius",
    value: 50,
    min: 10,
    max: 150,
    step: 5,
  },
  cohesionRadius: {
    type: "number",
    label: "Cohesion Radius",
    value: 50,
    min: 10,
    max: 150,
    step: 5,
  },
  separationWeight: {
    type: "number",
    label: "Separation Weight",
    value: 1.5,
    min: 0,
    max: 3,
    step: 0.1,
  },
  alignmentWeight: {
    type: "number",
    label: "Alignment Weight",
    value: 1.0,
    min: 0,
    max: 3,
    step: 0.1,
  },
  cohesionWeight: {
    type: "number",
    label: "Cohesion Weight",
    value: 1.0,
    min: 0,
    max: 3,
    step: 0.1,
  },
  turnFactor: {
    type: "number",
    label: "Turn Factor",
    value: 0.2,
    min: 0.05,
    max: 1,
    step: 0.05,
  },
  birdSize: {
    type: "number",
    label: "Bird Size",
    value: 3,
    min: 1,
    max: 10,
    step: 0.5,
  },
  birdColor: {
    type: "color",
    label: "Bird Color",
    value: "#38bdf8",
  },
  background: {
    type: "color",
    label: "Background",
    value: "#0a0a0a",
  },
  showTrails: {
    type: "boolean",
    label: "Show Trails",
    value: false,
  },
  trailOpacity: {
    type: "number",
    label: "Trail Fade",
    value: 0.1,
    min: 0.01,
    max: 0.5,
    step: 0.01,
  },
  displayText: {
    type: "text",
    label: "Display Text",
    value: "HYPERTOOL",
  },
};

createSandbox({
  controls: {
    definitions: controlDefinitions,
    options: {
      title: "BOIDS Flocking",
    },
  },
  exportWidget: {
    filename: "boids-flocking",
    useCanvasCapture: true,
    enabled: true,
  },
  setup: (context: SandboxContext) => initialiseBoids(context),
}).catch((error) => {
  console.error("[boids] Failed to initialise sandbox", error);
});

class Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;

  constructor(width: number, height: number, position?: { x: number; y: number }) {
    if (position) {
      this.x = position.x;
      this.y = position.y;
      this.targetX = position.x;
      this.targetY = position.y;
    } else {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.targetX = this.x;
      this.targetY = this.y;
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(
    birds: Bird[],
    width: number,
    height: number,
    params: any,
    isGathering: boolean = false
  ) {
    const maxSpeed = params.maxSpeed ?? 4;
    const separationRadius = params.separationRadius ?? 25;
    const alignmentRadius = params.alignmentRadius ?? 50;
    const cohesionRadius = params.cohesionRadius ?? 50;
    const separationWeight = params.separationWeight ?? 1.5;
    const alignmentWeight = params.alignmentWeight ?? 1.0;
    const cohesionWeight = params.cohesionWeight ?? 1.0;
    const turnFactor = params.turnFactor ?? 0.2;
    const margin = 50;

    // If gathering, strongly pull towards target position
    if (isGathering) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 1) {
        // Strong attraction to target
        this.vx += (dx / dist) * 0.5;
        this.vy += (dy / dist) * 0.5;
      }
    }

    let separationX = 0;
    let separationY = 0;
    let separationCount = 0;

    let alignmentX = 0;
    let alignmentY = 0;
    let alignmentCount = 0;

    let cohesionX = 0;
    let cohesionY = 0;
    let cohesionCount = 0;

    // Calculate forces from nearby birds
    for (const other of birds) {
      if (other === this) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Separation: avoid crowding neighbors
      if (dist < separationRadius && dist > 0) {
        separationX += dx / dist;
        separationY += dy / dist;
        separationCount++;
      }

      // Alignment: steer towards average heading of neighbors
      if (dist < alignmentRadius) {
        alignmentX += other.vx;
        alignmentY += other.vy;
        alignmentCount++;
      }

      // Cohesion: steer towards average position of neighbors
      if (dist < cohesionRadius) {
        cohesionX += other.x;
        cohesionY += other.y;
        cohesionCount++;
      }
    }

    // Apply separation
    if (separationCount > 0) {
      separationX /= separationCount;
      separationY /= separationCount;
      this.vx += separationX * separationWeight * 0.05;
      this.vy += separationY * separationWeight * 0.05;
    }

    // Apply alignment
    if (alignmentCount > 0) {
      alignmentX /= alignmentCount;
      alignmentY /= alignmentCount;
      this.vx += (alignmentX - this.vx) * alignmentWeight * 0.05;
      this.vy += (alignmentY - this.vy) * alignmentWeight * 0.05;
    }

    // Apply cohesion
    if (cohesionCount > 0) {
      cohesionX /= cohesionCount;
      cohesionY /= cohesionCount;
      this.vx += (cohesionX - this.x) * cohesionWeight * 0.001;
      this.vy += (cohesionY - this.y) * cohesionWeight * 0.001;
    }

    // Edge avoidance (soft boundaries)
    if (this.x < margin) {
      this.vx += turnFactor;
    }
    if (this.x > width - margin) {
      this.vx -= turnFactor;
    }
    if (this.y < margin) {
      this.vy += turnFactor;
    }
    if (this.y > height - margin) {
      this.vy -= turnFactor;
    }

    // Limit speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Wrap around edges (hard boundaries)
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
  }

  draw(ctx: CanvasRenderingContext2D, color: string, size: number) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initialiseBoids(context: SandboxContext) {
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

  exports.setFilename("boids-flocking");
  exports.useDefaultCanvasCapture(true);

  let birds: Bird[] = [];
  let width = 0;
  let height = 0;
  let initialized = false;
  let isGathering = false;
  let gatheringTimer = 0;
  let mouseDownTime = 0;
  let isMouseDown = false;
  let lastDisplayText = params.displayText ?? 'HYPERTOOL';

  const resize = () => {
    const { clientWidth, clientHeight } = mount;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    
    // Reinitialize birds on resize
    if (initialized) {
      const targetCount = Math.floor(params.birdCount ?? 100);
      if (birds.length !== targetCount) {
        const displayText = params.displayText ?? 'HYPERTOOL';
        const textPoints = generateTextPoints(displayText, targetCount, width, height);
        birds = [];
        for (let i = 0; i < targetCount; i++) {
          birds.push(new Bird(width, height, textPoints[i]));
        }
      }
    }
  };

  resize();
  environment.onResize(resize);

  // Initialize birds in HYPERTOOL formation
  const initialCount = Math.floor(params.birdCount ?? 100);
  const displayText = params.displayText ?? 'HYPERTOOL';
  const textPoints = generateTextPoints(displayText, initialCount, width, height);
  for (let i = 0; i < initialCount; i++) {
    birds.push(new Bird(width, height, textPoints[i]));
  }
  initialized = true;

  // Add long press handler to trigger gathering
  canvas.addEventListener('mousedown', () => {
    isMouseDown = true;
    mouseDownTime = Date.now();
  });

  canvas.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  canvas.addEventListener('mouseleave', () => {
    isMouseDown = false;
  });

  // Check for long press in animation loop
  const checkLongPress = () => {
    if (isMouseDown && !isGathering) {
      const pressDuration = Date.now() - mouseDownTime;
      if (pressDuration >= 500) { // 500ms long press
        isGathering = true;
        gatheringTimer = 180; // Gather for 3 seconds at 60fps
        isMouseDown = false; // Prevent re-triggering
        
        // Reassign target positions for all birds
        const targetCount = birds.length;
        const displayText = params.displayText ?? 'HYPERTOOL';
        const newTextPoints = generateTextPoints(displayText, targetCount, width, height);
        for (let i = 0; i < birds.length; i++) {
          birds[i].targetX = newTextPoints[i].x;
          birds[i].targetY = newTextPoints[i].y;
        }
      }
    }
  };

  let animationFrame = 0;

  const render = () => {
    // Check for long press
    checkLongPress();

    // Update gathering timer
    if (isGathering) {
      gatheringTimer--;
      if (gatheringTimer <= 0) {
        isGathering = false;
      }
    }

    const displayText = params.displayText ?? 'HYPERTOOL';
    
    // Check if display text changed
    if (displayText !== lastDisplayText) {
      lastDisplayText = displayText;
      const textPoints = generateTextPoints(displayText, birds.length, width, height);
      for (let i = 0; i < birds.length; i++) {
        birds[i].targetX = textPoints[i].x;
        birds[i].targetY = textPoints[i].y;
      }
    }

    // Check if bird count changed
    const targetCount = Math.floor(params.birdCount ?? 100);
    if (birds.length < targetCount) {
      // Add birds - get new text points for the additional birds
      const additionalCount = targetCount - birds.length;
      const textPoints = generateTextPoints(displayText, additionalCount, width, height);
      for (let i = 0; i < additionalCount; i++) {
        birds.push(new Bird(width, height, textPoints[i]));
      }
    } else if (birds.length > targetCount) {
      // Remove birds
      birds = birds.slice(0, targetCount);
    }

    const showTrails = params.showTrails ?? false;
    const trailOpacity = params.trailOpacity ?? 0.1;
    const background = params.background ?? "#0a0a0a";
    const birdColor = params.birdColor ?? "#38bdf8";
    const birdSize = params.birdSize ?? 3;

    // Background (with trail effect if enabled)
    if (showTrails) {
      ctx.fillStyle = `rgba(${hexToRgb(background)}, ${trailOpacity})`;
    } else {
      ctx.fillStyle = background;
    }
    ctx.fillRect(0, 0, width, height);

    // Update and draw birds
    for (const bird of birds) {
      bird.update(birds, width, height, params, isGathering);
      bird.draw(ctx, birdColor, birdSize);
    }

    animationFrame = window.requestAnimationFrame(render);
  };

  animationFrame = window.requestAnimationFrame(render);

  return () => {
    window.cancelAnimationFrame(animationFrame);
  };
}

function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  
  return `${r}, ${g}, ${b}`;
}

function generateTextPoints(text: string, count: number, width: number, height: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  
  // Create a temporary canvas to render text
  const tempCanvas = document.createElement('canvas');
  const scale = 2; // Higher resolution for better sampling
  tempCanvas.width = width * scale;
  tempCanvas.height = height * scale;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) return points;
  
  // Set up text rendering
  const fontSize = Math.min(width, height) * 0.15 * scale;
  tempCtx.font = `bold ${fontSize}px Arial, sans-serif`;
  tempCtx.fillStyle = 'white';
  tempCtx.textAlign = 'center';
  tempCtx.textBaseline = 'middle';
  
  // Draw text in center
  tempCtx.fillText(text, (width * scale) / 2, (height * scale) / 2);
  
  // Get image data
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const pixels = imageData.data;
  
  // Collect all white pixels (text pixels)
  const textPixels: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < tempCanvas.height; y += 2) {
    for (let x = 0; x < tempCanvas.width; x += 2) {
      const index = (y * tempCanvas.width + x) * 4;
      const alpha = pixels[index + 3];
      if (alpha > 128) {
        textPixels.push({ x: x / scale, y: y / scale });
      }
    }
  }
  
  // Sample points from text pixels
  if (textPixels.length > 0) {
    for (let i = 0; i < count; i++) {
      const randomPixel = textPixels[Math.floor(Math.random() * textPixels.length)];
      points.push({
        x: randomPixel.x,
        y: randomPixel.y
      });
    }
  }
  
  // If no points were generated, fall back to random positions
  if (points.length === 0) {
    for (let i = 0; i < count; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height
      });
    }
  }
  
  return points;
}
