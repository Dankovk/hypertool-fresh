// Control parameters - these will be controlled by Tweakpane
let params = {
  gridSize: 30,
  strokeWeight: 2,
  diagonalProbability: 0.5,
  color1: '#66fcf1',
  color2: '#45a29e',
  backgroundColor: '#0b0c10',
  autoRegenerate: false,
  regenerateSpeed: 1.0
};

function setup(){
  createCanvas(600, 400);
  // Start with noLoop, will be enabled if autoRegenerate is true
  noLoop();
  
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
            title: "Generative Art Controls",
          });
          
          // Add bindings for each parameter
          pane.addBinding(params, 'gridSize', {
            min: 10,
            max: 100,
            step: 5,
            label: 'Grid Size'
          });
          
          pane.addBinding(params, 'strokeWeight', {
            min: 0.5,
            max: 10,
            step: 0.5,
            label: 'Stroke Weight'
          });
          
          pane.addBinding(params, 'diagonalProbability', {
            min: 0,
            max: 1,
            step: 0.1,
            label: 'Diagonal Probability'
          });
          
          pane.addBinding(params, 'color1', {
            label: 'Primary Color'
          });
          
          pane.addBinding(params, 'color2', {
            label: 'Secondary Color'
          });
          
          pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
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
          pane.addBinding(params, 'gridSize', {
            min: 10,
            max: 100,
            step: 5,
            label: 'Grid Size'
          });
          
          pane.addBinding(params, 'strokeWeight', {
            min: 0.5,
            max: 10,
            step: 0.5,
            label: 'Stroke Weight'
          });
          
          pane.addBinding(params, 'diagonalProbability', {
            min: 0,
            max: 1,
            step: 0.1,
            label: 'Diagonal Probability'
          });
          
          pane.addBinding(params, 'color1', {
            label: 'Primary Color'
          });
          
          pane.addBinding(params, 'color2', {
            label: 'Secondary Color'
          });
          
          pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
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

function draw() {
  // Use params.backgroundColor for background
  background(params.backgroundColor);

  // Use params.gridSize for grid size
  const gridSize = params.gridSize;
  const cols = floor(width / gridSize);
  const rows = floor(height / gridSize);

  for(let i = 0; i < cols; i++){
    for(let j = 0; j < rows; j++){
      const x = i * gridSize + gridSize/2;
      const y = j * gridSize + gridSize/2;

      const r = random(1);

      push();
      translate(x, y);

      // Use params.diagonalProbability for diagonal probability
      if(r < params.diagonalProbability){
        // Use params.color1 and params.strokeWeight
        stroke(params.color1);
        strokeWeight(params.strokeWeight);
        line(-gridSize/3, -gridSize/3, gridSize/3, gridSize/3);
      } else {
        // Use params.color2 and params.strokeWeight
        stroke(params.color2);
        strokeWeight(params.strokeWeight);
        line(-gridSize/3, gridSize/3, gridSize/3, -gridSize/3);
      }

      pop();
    }
  }
  
  // Auto-regeneration logic
  if (params.autoRegenerate) {
    const currentTime = millis();
    const regenerateInterval = 1000 / params.regenerateSpeed; // Convert speed to interval
    
    if (currentTime - lastRegenerateTime > regenerateInterval) {
      lastRegenerateTime = currentTime;
      redraw();
    }
  }
}

function mousePressed(){
  redraw();
}
