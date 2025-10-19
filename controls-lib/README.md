# @hypertool/controls

A beautifully styled controls library for creative coding projects. Built with Tweakpane and automatically inherits the Hypertool Studio theme.

## Features

- 🎨 **Automatic theming** - Inherits Studio's design tokens at build time
- 🚀 **Zero configuration** - Works out of the box
- 📦 **Tiny bundle** - Minimal overhead
- 🎯 **Type-safe** - Full TypeScript support
- 🔧 **Flexible** - Simple API or advanced control

## Installation

The library is automatically injected into the Studio's WebContainer runtime. No manual installation needed!

## Usage

### Simple API (Recommended)

```typescript
import { createControls } from '@hypertool/controls';

// Define your controls
const params = createControls({
  speed: {
    type: 'number',
    label: 'Speed',
    value: 1,
    min: 0,
    max: 10,
    step: 0.1
  },
  color: {
    type: 'color',
    label: 'Color',
    value: '#58d5ff'
  },
  enabled: {
    type: 'boolean',
    label: 'Enabled',
    value: true
  }
});

// Use params directly - they update in real-time!
function draw() {
  fill(params.color);
  circle(x, y, params.speed * 10);
}
```

### Advanced API

```typescript
import { createControlPanel } from '@hypertool/controls';

const controls = createControlPanel(
  {
    // ... your definitions
  },
  {
    title: 'Simulation Controls',
    position: 'top-right', // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
    expanded: true,
    onChange: (params) => {
      console.log('Parameters changed:', params);
    },
    onReady: () => {
      console.log('Controls ready!');
    }
  }
);

// Access params
const params = controls.params;

// Programmatically update
controls.set('speed', 5);

// Hide/show
controls.setVisible(false);

// Destroy when done
controls.destroy();
```

## Control Types

### Number

```typescript
{
  type: 'number',
  label: 'Speed',
  value: 1,
  min: 0,
  max: 10,
  step: 0.1
}
```

### Color

```typescript
{
  type: 'color',
  label: 'Fill Color',
  value: '#58d5ff'
}
```

### Boolean

```typescript
{
  type: 'boolean',
  label: 'Show Grid',
  value: true
}
```

### String

```typescript
{
  type: 'string',
  label: 'Text',
  value: 'Hello World'
}
```

### Select

```typescript
{
  type: 'select',
  label: 'Mode',
  value: 'circles',
  options: {
    'Circles': 'circles',
    'Squares': 'squares',
    'Triangles': 'triangles'
  }
  // Or array: options: ['circles', 'squares', 'triangles']
}
```

## Examples

### p5.js Sketch

```typescript
import { createControls } from '@hypertool/controls';

const params = createControls({
  particleCount: { type: 'number', value: 100, min: 10, max: 500, step: 10 },
  particleSize: { type: 'number', value: 5, min: 1, max: 20 },
  backgroundColor: { type: 'color', value: '#0a0e14' },
  particleColor: { type: 'color', value: '#58d5ff' },
  animate: { type: 'boolean', value: true }
});

let particles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  initParticles();
}

function draw() {
  background(params.backgroundColor);

  // Adjust particle count
  while (particles.length < params.particleCount) {
    particles.push(new Particle());
  }
  while (particles.length > params.particleCount) {
    particles.pop();
  }

  // Update and draw
  for (let p of particles) {
    p.update(params.animate);
    p.display(params.particleColor, params.particleSize);
  }
}
```

### Three.js Scene

```typescript
import { createControls } from '@hypertool/controls';
import * as THREE from 'three';

const params = createControls({
  rotationSpeed: { type: 'number', value: 0.01, min: 0, max: 0.1, step: 0.001 },
  cubeColor: { type: 'color', value: '#58d5ff' },
  wireframe: { type: 'boolean', value: false }
});

const scene = new THREE.Scene();
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(),
  new THREE.MeshBasicMaterial()
);
scene.add(cube);

function animate() {
  requestAnimationFrame(animate);

  cube.rotation.x += params.rotationSpeed;
  cube.rotation.y += params.rotationSpeed;
  cube.material.color.set(params.cubeColor);
  cube.material.wireframe = params.wireframe;

  renderer.render(scene, camera);
}
```

## TypeScript Support

Full type inference for your parameters:

```typescript
import { createControls } from '@hypertool/controls';

const params = createControls({
  speed: { type: 'number', value: 1, min: 0, max: 10 },
  color: { type: 'color', value: '#ff0000' }
});

// TypeScript knows params.speed is a number
// TypeScript knows params.color is a string
params.speed.toFixed(2); // ✅ OK
params.color.toUpperCase(); // ✅ OK
```

## License

MIT
