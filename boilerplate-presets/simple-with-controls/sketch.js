// Import the Hypertool Controls library
import { createControls } from '/shared/hypertool-controls.js';

// Define your interactive parameters
const params = createControls({
  backgroundColor: {
    type: 'color',
    label: 'Background',
    value: '#0a0e14'
  },
  circleColor: {
    type: 'color',
    label: 'Circle Color',
    value: '#58d5ff'
  },
  circleSize: {
    type: 'number',
    label: 'Size',
    value: 100,
    min: 20,
    max: 300,
    step: 10
  },
  speed: {
    type: 'number',
    label: 'Speed',
    value: 2,
    min: 0.1,
    max: 10,
    step: 0.1
  },
  animate: {
    type: 'boolean',
    label: 'Animate',
    value: true
  }
}, {
  title: 'Simple Controls',
  position: 'top-right'
});

// Animation state
let offset = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  noStroke();
}

function draw() {
  // Use params directly - they update in real-time!
  background(params.backgroundColor);

  if (params.animate) {
    offset += params.speed * 0.1;
  }

  // Draw animated circle
  fill(params.circleColor);
  const x = width / 2 + Math.cos(offset) * 200;
  const y = height / 2 + Math.sin(offset) * 200;
  circle(x, y, params.circleSize);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
