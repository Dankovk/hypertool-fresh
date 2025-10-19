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
};

let lastRegenerateTime = 0;

export function setup(p5: any) {
  p5.createCanvas(window.innerWidth, window.innerHeight);
}

export function draw(p5: any, context: P5SketchContext) {
  const { params } = context;

  p5.background(params.background);
  p5.stroke(params.strokeColor);
  p5.strokeWeight(params.strokeWeight);
  p5.noFill();

  const radius = params.radius + params.amplitude * p5.sin(p5.frameCount * params.animationSpeed);
  p5.circle(p5.width / 2, p5.height / 2, radius * 2);

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
