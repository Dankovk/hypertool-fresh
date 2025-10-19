type NumberControlDefinition = {
  type: 'number';
  value: number;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
};

type ColorControlDefinition = {
  type: 'color';
  value: string;
  label?: string;
};

type BooleanControlDefinition = {
  type: 'boolean';
  value: boolean;
  label?: string;
};

type ControlDefinition =
  | NumberControlDefinition
  | ColorControlDefinition
  | BooleanControlDefinition;

type ControlDefinitions = Record<string, ControlDefinition>;

type P5SketchContext = {
  params: Record<string, any>;
  controls: {
    set: (key: string, value: any) => void;
  };
  getP5Instance(): any;
};

type ControlChangePayload = {
  key: string;
  value: any;
  event: any;
};

export const controlDefinitions: ControlDefinitions = {
  background: {
    type: 'color',
    label: 'Background',
    value: '#0b0c10',
  },
  strokeColor: {
    type: 'color',
    label: 'Stroke',
    value: '#66fcf1',
  },
  radius: {
    type: 'number',
    label: 'Radius Base',
    min: 10,
    max: 300,
    step: 1,
    value: 120,
  },
  amplitude: {
    type: 'number',
    label: 'Animation Amplitude',
    min: 0,
    max: 50,
    step: 1,
    value: 8,
  },
  animationSpeed: {
    type: 'number',
    label: 'Animation Speed',
    min: 0.001,
    max: 0.5,
    step: 0.001,
    value: 0.05,
  },
  strokeWeight: {
    type: 'number',
    label: 'Stroke Weight',
    min: 0.5,
    max: 10,
    step: 0.5,
    value: 2,
  },
  autoRegenerate: {
    type: 'boolean',
    label: 'Auto Regenerate',
    value: false,
  },
  regenerateSpeed: {
    type: 'number',
    label: 'Regenerate Speed',
    min: 0.1,
    max: 5.0,
    step: 0.1,
    value: 1,
  },
  triangleFillColor: {
    type: 'color',
    label: 'Triangle Fill',
    value: '#1f2833',
  },
  triangleStrokeColor: {
    type: 'color',
    label: 'Triangle Stroke',
    value: '#c5c6c7',
  },
  showClown: {
    type: 'boolean',
    label: 'Show Clown',
    value: true,
  },
  clownSize: {
    type: 'number',
    label: 'Clown Size',
    min: 50,
    max: 400,
    step: 10,
    value: 200,
  },
  clownSpeed: {
    type: 'number',
    label: 'Clown Dance Speed',
    min: 0.1,
    max: 5,
    step: 0.1,
    value: 1.5,
  },
  show3DModel: {
    type: 'boolean',
    label: 'Show 3D Model',
    value: true,
  },
  modelSize: {
    type: 'number',
    label: '3D Model Size',
    min: 20,
    max: 400,
    step: 5,
    value: 150,
  },
  modelRotationSpeed: {
    type: 'number',
    label: '3D Rotation Speed',
    min: 0.001,
    max: 0.1,
    step: 0.001,
    value: 0.02,
  },
  modelFloatAmplitude: {
    type: 'number',
    label: '3D Float Amplitude',
    min: 0,
    max: 200,
    step: 1,
    value: 60,
  },
  modelColor: {
    type: 'color',
    label: '3D Color',
    value: '#66fcf1',
  },
};

let lastRegenerateTime = 0;

let g3d: any;

function drawClown(p5: any, cx: number, cy: number, size: number, t: number) {
  p5.push();
  p5.translate(cx, cy + p5.sin(t) * size * 0.05);

  const outline = '#1b1e23';
  const suit = '#ff3b30';
  const suitAlt = '#ffd60a';
  const face = '#ffe0bd';
  const wigL = '#00c3ff';
  const wigR = '#ff00c8';
  const nose = '#ff2d55';
  const hat = '#8e44ad';

  const bodyH = size * 0.6;
  const bodyW = size * 0.35;
  const headR = size * 0.18;

  const sway = p5.sin(t * 2) * 0.2;
  p5.rotate(sway);

  // Body
  p5.noStroke();
  p5.fill(suit);
  p5.ellipse(0, 0, bodyW, bodyH);

  // Buttons
  p5.fill(suitAlt);
  for (let i = -2; i <= 2; i += 2) {
    p5.circle(0, (i / 2) * (bodyH * 0.25), size * 0.04);
  }

  // Arms
  p5.stroke(outline);
  p5.strokeWeight(Math.max(1, size * 0.02));
  const shoulderY = -bodyH * 0.25;
  const armLen = size * 0.35;
  const armAngle = 0.8 + p5.sin(t * 2.5) * 0.6;
  const armAngleR = -0.8 + p5.sin(t * 2.5 + p5.PI) * 0.6;
  p5.line(0, shoulderY, armLen * p5.cos(armAngle), shoulderY + armLen * p5.sin(armAngle));
  p5.line(0, shoulderY, armLen * p5.cos(armAngleR), shoulderY + armLen * p5.sin(armAngleR));

  // Legs
  const hipY = bodyH * 0.35;
  const legLen = size * 0.45;
  const legAngle = 0.9 + p5.sin(t * 2 + p5.HALF_PI) * 0.4;
  const legAngleR = p5.PI - legAngle;
  p5.line(0, hipY, legLen * p5.cos(legAngle), hipY + legLen * p5.sin(legAngle));
  p5.line(0, hipY, legLen * p5.cos(legAngleR), hipY + legLen * p5.sin(legAngleR));

  // Shoes
  p5.noStroke();
  p5.fill('#222');
  p5.ellipse(legLen * p5.cos(legAngle), hipY + legLen * p5.sin(legAngle), size * 0.16, size * 0.08);
  p5.ellipse(legLen * p5.cos(legAngleR), hipY + legLen * p5.sin(legAngleR), size * 0.16, size * 0.08);

  // Head
  const headY = -bodyH * 0.5 - headR * 0.6;
  p5.fill(face);
  p5.stroke(outline);
  p5.strokeWeight(Math.max(1, size * 0.01));
  p5.circle(0, headY, headR * 2);

  // Wig
  p5.noStroke();
  p5.fill(wigL);
  p5.circle(-headR * 0.9, headY - headR * 0.2, headR * 1.2);
  p5.fill(wigR);
  p5.circle(headR * 0.9, headY - headR * 0.2, headR * 1.2);

  // Eyes
  p5.fill('#111');
  p5.circle(-headR * 0.35, headY - headR * 0.15, headR * 0.16);
  p5.circle(headR * 0.35, headY - headR * 0.15, headR * 0.16);

  // Nose
  p5.fill(nose);
  p5.circle(0, headY, headR * 0.22);

  // Mouth
  p5.noFill();
  p5.stroke('#b30000');
  p5.strokeWeight(Math.max(1, size * 0.012));
  p5.arc(0, headY + headR * 0.25, headR * 0.9, headR * 0.6, 0, p5.PI);

  // Hat
  p5.noStroke();
  p5.fill(hat);
  const brimW = headR * 1.6;
  const brimH = headR * 0.18;
  p5.rectMode(p5.CENTER);
  p5.rect(0, headY - headR * 0.95, brimW, brimH, brimH * 0.5);
  p5.triangle(
    0, headY - headR * 1.9,
    -headR * 0.6, headY - headR * 1.0,
    headR * 0.6, headY - headR * 1.0
  );

  p5.pop();
}

export function setup(p5: any) {
  p5.createCanvas(window.innerWidth, window.innerHeight);
  g3d = p5.createGraphics(p5.width, p5.height, p5.WEBGL);
  g3d.setAttributes('alpha', true);
  g3d.pixelDensity(1);
}

export function draw(p5: any, context: P5SketchContext) {
  const { params } = context;

  p5.background(params.background);
  p5.stroke(params.strokeColor);
  p5.strokeWeight(params.strokeWeight);
  p5.noFill();

  const radius = params.radius + params.amplitude * p5.sin(p5.frameCount * params.animationSpeed);
  p5.circle(p5.width / 2, p5.height / 2, radius * 2);

  // Draw centered equilateral triangle with independent colors
  const tSize = radius * 0.9;
  const cx = p5.width / 2;
  const cy = p5.height / 2;
  const a = -p5.PI / 2; // top vertex angle
  const x1 = cx + tSize * p5.cos(a);
  const y1 = cy + tSize * p5.sin(a);
  const x2 = cx + tSize * p5.cos(a + (2 * p5.PI) / 3);
  const y2 = cy + tSize * p5.sin(a + (2 * p5.PI) / 3);
  const x3 = cx + tSize * p5.cos(a + (4 * p5.PI) / 3);
  const y3 = cy + tSize * p5.sin(a + (4 * p5.PI) / 3);
  p5.fill(params.triangleFillColor);
  p5.stroke(params.triangleStrokeColor);
  p5.triangle(x1, y1, x2, y2, x3, y3);

  // Clown dancing
  if (params.showClown) {
    const t = p5.frameCount * 0.05 * params.clownSpeed;
    const cSize = params.clownSize;
    const cY = p5.height * 0.7;
    drawClown(p5, p5.width / 2, cY, cSize, t);
  }

  // 3D model floating
  if (params.show3DModel) {
    if (!g3d || g3d.width !== p5.width || g3d.height !== p5.height) {
      g3d = p5.createGraphics(p5.width, p5.height, p5.WEBGL);
      g3d.setAttributes('alpha', true);
      g3d.pixelDensity(1);
    }

    g3d.clear();
    g3d.push();

    // Lighting
    g3d.ambientLight(60);
    g3d.directionalLight(255, 255, 255, 0.5, 0.5, -1);

    // Material and motion
    g3d.noStroke();
    g3d.ambientMaterial(params.modelColor);

    const tt = p5.frameCount * params.modelRotationSpeed;
    const amp = params.modelFloatAmplitude;
    g3d.translate(
      p5.sin(tt * 0.9) * amp,
      p5.cos(tt * 0.7) * amp,
      p5.sin(tt * 0.5) * amp * 0.5
    );
    g3d.rotateX(tt * 1.3);
    g3d.rotateY(tt * 1.7);
    g3d.rotateZ(tt * 0.8);

    // Torus geometry
    g3d.torus(params.modelSize, params.modelSize * 0.28, 40, 28);

    g3d.pop();

    // Draw the WEBGL buffer on top of the main canvas
    p5.image(g3d, 0, 0);
  }

  if (params.autoRegenerate) {
    const currentTime = p5.millis();
    const regenerateInterval = 1000 / params.regenerateSpeed;

    if (currentTime - lastRegenerateTime > regenerateInterval) {
      lastRegenerateTime = currentTime;
      p5.redraw();
    }
  }
}

export function mousePressed(p5: any, context: P5SketchContext) {
  const { params } = context;
  p5.redraw();
  console.info(`Mouse pressed. Current radius: ${params.radius.toFixed(2)}`);
}

export function keyPressed(p5: any, context: P5SketchContext) {
  if (p5.key === 'r' || p5.key === 'R') {
    const newRadius = Math.random() * 200 + 50;
    context.controls.set('radius', newRadius);
  }
}

export function handleControlChange(change: ControlChangePayload, context: P5SketchContext) {
  if (change.key === 'autoRegenerate') {
    const instance = context.getP5Instance();
    if (instance) {
      if (change.value) {
        instance.loop();
      } else {
        instance.noLoop();
      }
    }
  }
}
