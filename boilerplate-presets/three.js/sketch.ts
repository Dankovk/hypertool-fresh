import type {
  ThreeContext,
  ThreeSketchContext,
  StartThreeSketchOptions,
} from "./__hypertool__/runtime/index.js";

// Define control parameters
export const controlDefinitions = {
  rotationSpeed: {
    type: "number" as const,
    label: "Rotation Speed",
    value: 3.6,
    min: 0,
    max: 5,
    step: 0.1,
  },
  cubeSize: {
    type: "number" as const,
    label: "Cube Size",
    value: 3.8,
    min: 0.5,
    max: 5,
    step: 0.1,
  },
  wireframe: {
    type: "boolean" as const,
    label: "Wireframe",
    value: false,
  },
  color: {
    type: "color" as const,
    label: "Cube Color",
    value: "#66fcf1",
  },
  geometryType: {
    type: "select" as const,
    label: "Geometry",
    value: "sphere",
    options: {
      Box: "box",
      Sphere: "sphere",
      Torus: "torus",
      Cone: "cone",
      Cylinder: "cylinder",
    },
  },
  lightIntensity: {
    type: "number" as const,
    label: "Light Intensity",
    value: 1,
    min: 0,
    max: 3,
    step: 0.1,
  },
  ambientIntensity: {
    type: "number" as const,
    label: "Ambient Light",
    value: 1.1,
    min: 0,
    max: 2,
    step: 0.1,
  },
  // Acid FX
  acidEnabled: {
    type: "boolean" as const,
    label: "Acid FX",
    value: true,
  },
  acidIntensity: {
    type: "number" as const,
    label: "Acid Intensity",
    value: 0.99,
    min: 0,
    max: 1,
    step: 0.01,
  },
  acidSpeed: {
    type: "number" as const,
    label: "Acid Speed",
    value: 2.55,
    min: 0,
    max: 5,
    step: 0.05,
  },
  hueShiftSpeed: {
    type: "number" as const,
    label: "Hue Shift Speed",
    value: 2.85,
    min: 0,
    max: 5,
    step: 0.05,
  },
  // Grain FX
  grainEnabled: {
    type: "boolean" as const,
    label: "Grain",
    value: true,
  },
  grainAmount: {
    type: "number" as const,
    label: "Grain Amount",
    value: 0.72,
    min: 0,
    max: 1,
    step: 0.01,
  },
  grainScale: {
    type: "number" as const,
    label: "Grain Size",
    value: 3.4,
    min: 0.5,
    max: 6,
    step: 0.1,
  },
};

// Store references to scene objects
let mesh: any = null;
let directionalLight: any = null;
let ambientLight: any = null;
let previousGeometryType = "box";
let startTime = (typeof performance !== "undefined" ? performance.now() : Date.now());
let grainCanvas: HTMLCanvasElement | null = null;
let grainCtx: CanvasRenderingContext2D | null = null;
let grainPatternCanvas: HTMLCanvasElement | null = null;

/**
 * Setup function - called once when scene is initialized
 */
export function setup(three: ThreeContext, context: ThreeSketchContext) {
  const { scene } = three;
  const { params } = context;

  // Get Three.js from window
  const THREE = (window as any).THREE;

  // Set scene background
  scene.background = new THREE.Color(0x0b0c10);

  // Add lights
  ambientLight = new THREE.AmbientLight(0xffffff, params.ambientIntensity);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, params.lightIntensity);
  directionalLight.position.set(5, 5, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Add a point light for dramatic effect
  const pointLight = new THREE.PointLight(0x45a29e, 0.5);
  pointLight.position.set(-5, 3, -5);
  scene.add(pointLight);

  // Create initial mesh
  mesh = createMesh(THREE, params);
  scene.add(mesh);

  // Initialize grain overlay
  ensureGrainOverlay();

  // Position camera
  three.camera.position.set(5, 5, 5);
  three.camera.lookAt(0, 0, 0);
}

/**
 * Animate function - called every frame
 */
export function animate(three: ThreeContext, context: ThreeSketchContext) {
  const { params } = context;

  if (!mesh) return;

  const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
  const t = (now - startTime) * 0.001;

  // Rotate the mesh
  const speed = params.rotationSpeed * 0.01;
  mesh.rotation.x += speed;
  mesh.rotation.y += speed * 0.7;

  // Apply acid deformation and hue shift
  if (params.acidEnabled) {
    const intensity = params.acidIntensity ?? 0.5;
    const acidSpeed = params.acidSpeed ?? 1.0;
    applyAcidDeform(mesh, intensity, acidSpeed, t);

    const THREE = (window as any).THREE;
    if (mesh.material && THREE) {
      const baseColor = new THREE.Color(params.color);
      const hsl = { h: 0, s: 0, l: 0 } as any;
      baseColor.getHSL(hsl);
      const hueSpeed = params.hueShiftSpeed ?? 0.2;
      const shifted = new THREE.Color().setHSL((hsl.h + t * hueSpeed) % 1, Math.min(1, hsl.s + 0.1), hsl.l);
      mesh.material.color.set(shifted);
    }
  } else {
    // Restore base geometry when acid is disabled
    const geometry = mesh.geometry;
    const pos = geometry?.attributes?.position;
    if (pos && geometry.userData?.basePosition) {
      const base = geometry.userData.basePosition as Float32Array;
      const pa = pos.array as Float32Array;
      if (pa.length === base.length) {
        pa.set(base);
        pos.needsUpdate = true;
      }
    }
  }

  // Update lights
  if (directionalLight) {
    directionalLight.intensity = params.lightIntensity;
  }
  if (ambientLight) {
    ambientLight.intensity = params.ambientIntensity;
  }

  // Recreate mesh if geometry type changed
  if (params.geometryType !== previousGeometryType) {
    recreateMesh(three, context);
    previousGeometryType = params.geometryType;
  }

  // Update mesh properties
  if (mesh) {
    const scale = params.cubeSize / 2;
    mesh.scale.set(scale, scale, scale);

    // Update material (unless acid FX overrides color)
    mesh.material.wireframe = params.wireframe;
    if (!params.acidEnabled) {
      mesh.material.color.set(params.color);
    }
  }

  // Update grain overlay
  if (params.grainEnabled) {
    updateGrainOverlay(params.grainAmount ?? 0.15, params.grainScale ?? 2);
    if (grainCanvas) {
      grainCanvas.style.opacity = String(Math.min(1, Math.max(0, params.grainAmount ?? 0.15)));
      grainCanvas.style.display = "block";
    }
  } else if (grainCanvas) {
    grainCanvas.style.display = "none";
  }
}

/**
 * Resize function - called when window is resized
 */
export function resize(three: ThreeContext, context: ThreeSketchContext) {
  // The Hyper Runtime library handles camera and renderer resize automatically
  // Update grain overlay size
  if (grainCanvas) {
    grainCanvas.width = window.innerWidth;
    grainCanvas.height = window.innerHeight;
    if (grainCtx) {
      grainCtx.imageSmoothingEnabled = false;
    }
  }
}

/**
 * Dispose function - called when sketch is destroyed
 */
export function dispose() {
  // Clean up geometries and materials
  if (mesh) {
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  // Remove grain canvas
  if (grainCanvas && grainCanvas.parentElement) {
    grainCanvas.parentElement.removeChild(grainCanvas);
  }
  grainCanvas = null;
  grainCtx = null;
  grainPatternCanvas = null;
}

/**
 * Helper: Apply acid-style vertex deformation and color cycling
 */
function applyAcidDeform(targetMesh: any, intensity: number, speed: number, t: number) {
  if (!targetMesh || !targetMesh.geometry) return;
  const geometry = targetMesh.geometry;
  const pos = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  if (!pos || !normal) return;

  if (!geometry.userData.basePosition) {
    geometry.userData.basePosition = new Float32Array(pos.array);
  }
  const base = geometry.userData.basePosition as Float32Array;

  const count = pos.count;
  const pa = pos.array as Float32Array;
  const na = normal.array as Float32Array;

  const f1 = 0.8;
  const f2 = 1.7;
  const f3 = 1.1;

  const amp = Math.max(0, intensity) * 0.6;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const bx = base[i3];
    const by = base[i3 + 1];
    const bz = base[i3 + 2];

    const nx = na[i3];
    const ny = na[i3 + 1];
    const nz = na[i3 + 2];

    const d =
      Math.sin((bx + by + bz) * f1 + t * speed * 1.3) * amp * 0.5 +
      Math.sin(by * f2 + t * speed * 0.9) * amp * 0.3 +
      Math.sin(bx * f3 - t * speed * 1.7) * amp * 0.2;

    pa[i3] = bx + nx * d;
    pa[i3 + 1] = by + ny * d;
    pa[i3 + 2] = bz + nz * d;
  }

  pos.needsUpdate = true;
}

/**
 * Grain overlay utilities
 */
function ensureGrainOverlay() {
  if (grainCanvas) return;

  grainCanvas = document.createElement("canvas");
  grainCanvas.width = window.innerWidth;
  grainCanvas.height = window.innerHeight;
  grainCanvas.style.position = "fixed";
  grainCanvas.style.top = "0";
  grainCanvas.style.left = "0";
  grainCanvas.style.width = "100vw";
  grainCanvas.style.height = "100vh";
  grainCanvas.style.pointerEvents = "none";
  grainCanvas.style.mixBlendMode = "overlay";
  grainCanvas.style.opacity = "0.15";
  grainCanvas.style.zIndex = "2";
  document.body.appendChild(grainCanvas);

  grainCtx = grainCanvas.getContext("2d");
  if (grainCtx) {
    grainCtx.imageSmoothingEnabled = false;
  }

  // Create small pattern canvas for performance
  grainPatternCanvas = document.createElement("canvas");
  grainPatternCanvas.width = 128;
  grainPatternCanvas.height = 128;
}

function updateGrainOverlay(amount: number, scale: number) {
  if (!grainCanvas || !grainCtx || !grainPatternCanvas) return;

  const ctx = grainCtx;
  const p = grainPatternCanvas.getContext("2d");
  if (!p) return;

  // Generate new noise into the pattern canvas
  const w = grainPatternCanvas.width;
  const h = grainPatternCanvas.height;
  const img = p.createImageData(w, h);
  const data = img.data;
  const a = Math.floor(Math.max(0, Math.min(1, amount)) * 255);

  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = a;
  }
  p.putImageData(img, 0, 0);

  // Draw the pattern scaled to cover screen
  ctx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const s = Math.max(0.5, Math.min(6, scale));
  const patternW = Math.floor(w * s);
  const patternH = Math.floor(h * s);

  // Use drawImage tiling
  for (let y = 0; y < grainCanvas.height; y += patternH) {
    for (let x = 0; x < grainCanvas.width; x += patternW) {
      ctx.drawImage(grainPatternCanvas, x, y, patternW, patternH);
    }
  }

  ctx.restore();
}

/**
 * Helper: Create mesh based on parameters
 */
function createMesh(THREE: any, params: any): any {
  let geometry: any;

  switch (params.geometryType) {
    case "sphere":
      geometry = new THREE.SphereGeometry(1, 32, 32);
      break;
    case "torus":
      geometry = new THREE.TorusGeometry(1, 0.4, 16, 100);
      break;
    case "cone":
      geometry = new THREE.ConeGeometry(1, 2, 32);
      break;
    case "cylinder":
      geometry = new THREE.CylinderGeometry(1, 1, 2, 32);
      break;
    case "box":
    default:
      geometry = new THREE.BoxGeometry(2, 2, 2);
  }

  const material = new THREE.MeshStandardMaterial({
    color: params.color,
    wireframe: params.wireframe,
    metalness: 0.5,
    roughness: 0.5,
  });

  const mesh = new THREE.Mesh(geometry, material);
  if (mesh.geometry && mesh.geometry.attributes && (mesh.geometry as any).attributes.position) {
    mesh.geometry.computeVertexNormals();
    (mesh.geometry as any).userData.basePosition = new Float32Array((mesh.geometry as any).attributes.position.array);
  }

  return mesh;
}

/**
 * Helper: Recreate mesh with new geometry
 */
function recreateMesh(three: ThreeContext, context: ThreeSketchContext) {
  const { scene } = three;
  const { params } = context;
  const THREE = (window as any).THREE;

  if (mesh) {
    // Clean up old mesh
    mesh.geometry.dispose();
    mesh.material.dispose();
    scene.remove(mesh);
  }

  // Create new mesh
  mesh = createMesh(THREE, params);
  const scale = params.cubeSize / 2;
  mesh.scale.set(scale, scale, scale);

  // Preserve rotation
  if (mesh) {
    mesh.rotation.x = 0.5;
    mesh.rotation.y = 0.5;
  }

  scene.add(mesh);
}

/**
 * Export the sketch configuration
 */
export const sketchConfig: Omit<StartThreeSketchOptions, "handlers"> = {
  controlDefinitions,
  controls: {
    title: "Scene Controls",
    position: "top-right",
    expanded: true,
  },
  mount: {
    orbitControls: true,
    camera: {
      fov: 75,
      position: [5, 5, 5],
    },
    renderer: {
      antialias: true,
    },
  },
};
