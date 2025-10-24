// Control parameters - these will be controlled by Tweakpane
let params = {
  backgroundColor: '#0b0c10',
  wave1Color: '#66fcf1',
  wave2Color: '#45a29e',
  strokeWeight: 2,
  wave1Amplitude: 200,
  wave2Amplitude: 150,
  wave1Offset: 0,
  wave2Offset: 100,
  noiseScale: 0.01,
  timeSpeed: 0.01,
  waveResolution: 4,
  autoRegenerate: false,
  regenerateSpeed: 1.0
};

let t = 0;

function setup(){
  createCanvas(600, 400);
  
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
            title: "Wave Controls",
          });
          
          // Add bindings for each parameter
          pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
          });
          
          pane.addBinding(params, 'wave1Color', {
            label: 'Wave 1 Color'
          });
          
          pane.addBinding(params, 'wave2Color', {
            label: 'Wave 2 Color'
          });
          
          pane.addBinding(params, 'strokeWeight', {
            min: 0.5,
            max: 10,
            step: 0.5,
            label: 'Stroke Weight'
          });
          
          pane.addBinding(params, 'wave1Amplitude', {
            min: 10,
            max: 400,
            step: 10,
            label: 'Wave 1 Amplitude'
          });
          
          pane.addBinding(params, 'wave2Amplitude', {
            min: 10,
            max: 400,
            step: 10,
            label: 'Wave 2 Amplitude'
          });
          
          pane.addBinding(params, 'wave1Offset', {
            min: 0,
            max: 1000,
            step: 10,
            label: 'Wave 1 Offset'
          });
          
          pane.addBinding(params, 'wave2Offset', {
            min: 0,
            max: 1000,
            step: 10,
            label: 'Wave 2 Offset'
          });
          
          pane.addBinding(params, 'noiseScale', {
            min: 0.001,
            max: 0.1,
            step: 0.001,
            label: 'Noise Scale'
          });
          
          pane.addBinding(params, 'timeSpeed', {
            min: 0.001,
            max: 0.1,
            step: 0.001,
            label: 'Time Speed'
          });
          
          pane.addBinding(params, 'waveResolution', {
            min: 1,
            max: 20,
            step: 1,
            label: 'Wave Resolution'
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
          
          // Add event listener for auto-regenerate toggle
          autoRegenerateBinding.on('change', (ev) => {
            if (ev.value) {
              loop();
            } else {
              noLoop();
            }
          });
          
        } else {
          // Fallback: create standalone pane
          const pane = new Pane();
          
          // Add bindings for each parameter
          pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
          });
          
          pane.addBinding(params, 'wave1Color', {
            label: 'Wave 1 Color'
          });
          
          pane.addBinding(params, 'wave2Color', {
            label: 'Wave 2 Color'
          });
          
          pane.addBinding(params, 'strokeWeight', {
            min: 0.5,
            max: 10,
            step: 0.5,
            label: 'Stroke Weight'
          });
          
          pane.addBinding(params, 'wave1Amplitude', {
            min: 10,
            max: 400,
            step: 10,
            label: 'Wave 1 Amplitude'
          });
          
          pane.addBinding(params, 'wave2Amplitude', {
            min: 10,
            max: 400,
            step: 10,
            label: 'Wave 2 Amplitude'
          });
          
          pane.addBinding(params, 'wave1Offset', {
            min: 0,
            max: 1000,
            step: 10,
            label: 'Wave 1 Offset'
          });
          
          pane.addBinding(params, 'wave2Offset', {
            min: 0,
            max: 1000,
            step: 10,
            label: 'Wave 2 Offset'
          });
          
          pane.addBinding(params, 'noiseScale', {
            min: 0.001,
            max: 0.1,
            step: 0.001,
            label: 'Noise Scale'
          });
          
          pane.addBinding(params, 'timeSpeed', {
            min: 0.001,
            max: 0.1,
            step: 0.001,
            label: 'Time Speed'
          });
          
          pane.addBinding(params, 'waveResolution', {
            min: 1,
            max: 20,
            step: 1,
            label: 'Wave Resolution'
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
          
          // Add event listener for auto-regenerate toggle
          autoRegenerateBindingFallback.on('change', (ev) => {
            if (ev.value) {
              loop();
            } else {
              noLoop();
            }
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

// Auto-regeneration functionality
let lastRegenerateTime = 0;

function draw(){
  background(params.backgroundColor);

  stroke(params.wave1Color);
  strokeWeight(params.strokeWeight);
  noFill();

  beginShape();
  for(let x = 0; x < width; x += params.waveResolution){
    const y = height/2 + noise(x * params.noiseScale, t + params.wave1Offset) * params.wave1Amplitude - params.wave1Amplitude/2;
    vertex(x, y);
  }
  endShape();

  stroke(params.wave2Color);
  beginShape();
  for(let x = 0; x < width; x += params.waveResolution){
    const y = height/2 + noise(x * params.noiseScale, t + params.wave2Offset) * params.wave2Amplitude - params.wave2Amplitude/2;
    vertex(x, y);
  }
  endShape();

  t += params.timeSpeed;
  
  // Auto-regeneration logic
  if (params.autoRegenerate) {
    const currentTime = millis();
    const regenerateInterval = 1000 / params.regenerateSpeed;
    
    if (currentTime - lastRegenerateTime > regenerateInterval) {
      lastRegenerateTime = currentTime;
      t = 0; // Reset time for regeneration
      redraw();
    }
  }
}

function mousePressed(){
  t = 0;
  redraw();
}
