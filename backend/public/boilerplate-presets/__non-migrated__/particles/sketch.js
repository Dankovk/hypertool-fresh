// Control parameters - these will be controlled by Tweakpane
let params = {
  backgroundColor: '#0b0c10',
  backgroundAlpha: 25,
  particleColor: '#66fcf1',
  particleCount: 100,
  minSize: 2,
  maxSize: 8,
  minVelocity: -1,
  maxVelocity: 1,
  autoRegenerate: false,
  regenerateSpeed: 1.0
};

let particles = [];

function setup(){
  createCanvas(600, 400);
  
  // Initialize particles
  initializeParticles();
  
  // Initialize Tweakpane controls after a short delay to ensure it's loaded
  setTimeout(() => {
    if (typeof Pane !== 'undefined') {
      try {
        // Find the ControlPanel container
        const controlContainer = document.querySelector('.tweakpane-container');
        
        if (controlContainer) {
          // Create pane and attach to ControlPanel container
          const pane = new Pane({
            container: controlContainer,
            title: "Particle System Controls",
          });
          
          // Add bindings for each parameter
          pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
          });
          
          pane.addBinding(params, 'backgroundAlpha', {
            min: 0,
            max: 255,
            step: 1,
            label: 'Background Alpha'
          });
          
          pane.addBinding(params, 'particleColor', {
            label: 'Particle Color'
          });
          
          pane.addBinding(params, 'particleCount', {
            min: 10,
            max: 500,
            step: 10,
            label: 'Particle Count'
          });
          
          pane.addBinding(params, 'minSize', {
            min: 0.5,
            max: 20,
            step: 0.5,
            label: 'Min Size'
          });
          
          pane.addBinding(params, 'maxSize', {
            min: 0.5,
            max: 30,
            step: 0.5,
            label: 'Max Size'
          });
          
          pane.addBinding(params, 'minVelocity', {
            min: -5,
            max: 5,
            step: 0.1,
            label: 'Min Velocity'
          });
          
          pane.addBinding(params, 'maxVelocity', {
            min: -5,
            max: 5,
            step: 0.1,
            label: 'Max Velocity'
          });
          
          const autoRegenerateBinding = pane.addBinding(params, 'autoRegenerate', {
            label: 'Auto Regenerate'
          });
          
          pane.addBinding(params, 'regenerateSpeed', {
            min: 0.1,
            max: 5.0,
            step: 0.1,
            label: 'Regenerate Speed'
          });
          
          // Add event listeners
          autoRegenerateBinding.on('change', (ev) => {
            if (ev.value) {
              loop();
            } else {
              noLoop();
            }
          });
          
          // Add event listener for particle count change
          pane.addBinding(params, 'particleCount').on('change', () => {
            initializeParticles();
          });
          
        } else {
          // Fallback: create standalone pane
          const pane = new Pane();
          
          // Add bindings for each parameter
          pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
          });
          
          pane.addBinding(params, 'backgroundAlpha', {
            min: 0,
            max: 255,
            step: 1,
            label: 'Background Alpha'
          });
          
          pane.addBinding(params, 'particleColor', {
            label: 'Particle Color'
          });
          
          pane.addBinding(params, 'particleCount', {
            min: 10,
            max: 500,
            step: 10,
            label: 'Particle Count'
          });
          
          pane.addBinding(params, 'minSize', {
            min: 0.5,
            max: 20,
            step: 0.5,
            label: 'Min Size'
          });
          
          pane.addBinding(params, 'maxSize', {
            min: 0.5,
            max: 30,
            step: 0.5,
            label: 'Max Size'
          });
          
          pane.addBinding(params, 'minVelocity', {
            min: -5,
            max: 5,
            step: 0.1,
            label: 'Min Velocity'
          });
          
          pane.addBinding(params, 'maxVelocity', {
            min: -5,
            max: 5,
            step: 0.1,
            label: 'Max Velocity'
          });
          
          const autoRegenerateBindingFallback = pane.addBinding(params, 'autoRegenerate', {
            label: 'Auto Regenerate'
          });
          
          pane.addBinding(params, 'regenerateSpeed', {
            min: 0.1,
            max: 5.0,
            step: 0.1,
            label: 'Regenerate Speed'
          });
          
          // Add event listeners
          autoRegenerateBindingFallback.on('change', (ev) => {
            if (ev.value) {
              loop();
            } else {
              noLoop();
            }
          });
          
          // Add event listener for particle count change
          pane.addBinding(params, 'particleCount').on('change', () => {
            initializeParticles();
          });
        }
      } catch (error) {
        console.error('Error initializing Tweakpane:', error);
      }
    } else {
      console.log('Tweakpane not available');
    }
  }, 100);
}

function initializeParticles() {
  particles = [];
  for(let i = 0; i < params.particleCount; i++){
    particles.push({
      x: random(width),
      y: random(height),
      vx: random(params.minVelocity, params.maxVelocity),
      vy: random(params.minVelocity, params.maxVelocity),
      size: random(params.minSize, params.maxSize)
    });
  }
}

// Auto-regeneration functionality
let lastRegenerateTime = 0;

function draw(){
  background(params.backgroundColor, params.backgroundAlpha);

  for(let p of particles){
    p.x += p.vx;
    p.y += p.vy;

    if(p.x < 0 || p.x > width) p.vx *= -1;
    if(p.y < 0 || p.y > height) p.vy *= -1;

    fill(params.particleColor);
    noStroke();
    circle(p.x, p.y, p.size);
  }
  
  // Auto-regeneration logic
  if (params.autoRegenerate) {
    const currentTime = millis();
    const regenerateInterval = 1000 / params.regenerateSpeed;
    
    if (currentTime - lastRegenerateTime > regenerateInterval) {
      lastRegenerateTime = currentTime;
      initializeParticles();
    }
  }
}

function mousePressed(){
  initializeParticles();
}
