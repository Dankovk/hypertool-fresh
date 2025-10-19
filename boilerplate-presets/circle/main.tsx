import React, { memo } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactP5Wrapper } from '@p5-wrapper/react';

type ParameterValues<T extends Record<string, { value: unknown }>> = {
  [K in keyof T]: T[K]['value'];
};

declare global {
  interface Window {
    hypertoolControls?: any;
  }
}

const controlDefinitions = {
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
} as const;

type CircleParameters = ParameterValues<typeof controlDefinitions>;

let p5Instance: any = null;

function getHyperControls() {
  if (typeof window === 'undefined' || !window.hypertoolControls) {
    throw new Error('Hypertool controls library is not available');
  }
  return window.hypertoolControls;
}

const controls = getHyperControls().createControlPanel(controlDefinitions, {
  title: 'Circle Controls',
  onChange: (values, { key }) => {
    if (!p5Instance) {
      return;
    }

    if (key === 'autoRegenerate') {
      values.autoRegenerate ? p5Instance.loop() : p5Instance.noLoop();
    }
  },
});

const params = controls.params as CircleParameters;

let lastRegenerateTime = 0;

function setup(p5: any) {
  p5.createCanvas(window.innerWidth, window.innerHeight);
  p5Instance = p5;
}

function draw(p5: any) {
  p5.background(params.background);
  p5.stroke(params.strokeColor);
  p5.strokeWeight(params.strokeWeight);
  p5.noFill();

  const r = params.radius + params.amplitude * p5.sin(p5.frameCount * params.animationSpeed);
  p5.circle(p5.width / 2, p5.height / 2, r * 2);

  if (params.autoRegenerate) {
    const currentTime = p5.millis();
    const regenerateInterval = 1000 / params.regenerateSpeed;

    if (currentTime - lastRegenerateTime > regenerateInterval) {
      lastRegenerateTime = currentTime;
      p5.redraw();
    }
  }
}

function mousePressed(p5: any) {
  p5.redraw();
  console.info(`Mouse pressed. Current radius: ${params.radius.toFixed(2)}`);
}

function keyPressed(p5: any) {
  if (p5.key === 'r' || p5.key === 'R') {
    const newRadius = Math.random() * 200 + 50;
    controls.set('radius', newRadius);
  }
}

const App = memo(() => {
  const sketch = (p5: any) => {
    p5.setup = () => setup(p5);
    p5.draw = () => draw(p5);
    p5.keyPressed = () => keyPressed(p5);
    p5.mousePressed = () => mousePressed(p5);
  };

  return <ReactP5Wrapper sketch={sketch} />;
});

const domNode = document.createElement('div');
domNode.classList.add('circle');
document.body.appendChild(domNode);
const root = createRoot(domNode);
root.render(<App />);
