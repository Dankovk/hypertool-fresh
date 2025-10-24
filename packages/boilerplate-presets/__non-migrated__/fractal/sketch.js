// Control parameters - these will be controlled by Tweakpane
let params = {
  backgroundColor: '#0b0c10',
  strokeColor: '#66fcf1',
  strokeWeight: 2,
  minAngle: 15,
  maxAngle: 45,
  minLength: 50,
  maxLength: 150,
  lengthReduction: 0.67,
  minBranchLength: 4,
  autoRegenerate: false,
  regenerateSpeed: 1.0
};

function setup(){
  createCanvas(600, 400);
  angleMode(DEGREES);
  
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
            title: "Fractal Tree Controls",
          });
          
          // Add bindings for each parameter
          pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
          });
          
          pane.addBinding(params, 'strokeColor', {
            label: 'Stroke Color'
          });
          
          pane.addBinding(params, 'strokeWeight', {
            min: 0.5,
            max: 10,
            step: 0.5,
            label: 'Stroke Weight'
          });
          
          pane.addBinding(params, 'minAngle', {
            min: 5,
            max: 90,
            step: 1,
            label: 'Min Angle'
          });
          
          pane.addBinding(params, 'maxAngle', {
            min: 5,
            max: 90,
            step: 1,
            label: 'Max Angle'
          });
          
          pane.addBinding(params, 'minLength', {
            min: 10,
            max: 200,
            step: 5,
            label: 'Min Length'
          });
          
          pane.addBinding(params, 'maxLength', {
            min: 10,
            max: 300,
            step: 5,
            label: 'Max Length'
          });
          
          pane.addBinding(params, 'lengthReduction', {
            min: 0.1,
            max: 0.9,
            step: 0.01,
            label: 'Length Reduction'
          });
          
          pane.addBinding(params, 'minBranchLength', {
            min: 1,
            max: 20,
            step: 1,
            label: 'Min Branch Length'
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
          
          pane.addBinding(params, 'strokeColor', {
            label: 'Stroke Color'
          });
          
          pane.addBinding(params, 'strokeWeight', {
            min: 0.5,
            max: 10,
            step: 0.5,
            label: 'Stroke Weight'
          });
          
          pane.addBinding(params, 'minAngle', {
            min: 5,
            max: 90,
            step: 1,
            label: 'Min Angle'
          });
          
          pane.addBinding(params, 'maxAngle', {
            min: 5,
            max: 90,
            step: 1,
            label: 'Max Angle'
          });
          
          pane.addBinding(params, 'minLength', {
            min: 10,
            max: 200,
            step: 5,
            label: 'Min Length'
          });
          
          pane.addBinding(params, 'maxLength', {
            min: 10,
            max: 300,
            step: 5,
            label: 'Max Length'
          });
          
          pane.addBinding(params, 'lengthReduction', {
            min: 0.1,
            max: 0.9,
            step: 0.01,
            label: 'Length Reduction'
          });
          
          pane.addBinding(params, 'minBranchLength', {
            min: 1,
            max: 20,
            step: 1,
            label: 'Min Branch Length'
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

  stroke(params.strokeColor);
  strokeWeight(params.strokeWeight);

  translate(width/2, height);

  const angle = map(mouseX, 0, width, params.minAngle, params.maxAngle);
  const len = map(mouseY, 0, height, params.minLength, params.maxLength);

  branch(len, angle);
  
  // Auto-regeneration logic
  if (params.autoRegenerate) {
    const currentTime = millis();
    const regenerateInterval = 1000 / params.regenerateSpeed;
    
    if (currentTime - lastRegenerateTime > regenerateInterval) {
      lastRegenerateTime = currentTime;
      redraw();
    }
  }
}

function branch(len, angle){
  line(0, 0, 0, -len);
  translate(0, -len);

  if(len > params.minBranchLength){
    push();
    rotate(angle);
    branch(len * params.lengthReduction, angle);
    pop();

    push();
    rotate(-angle);
    branch(len * params.lengthReduction, angle);
    pop();
  }
}

function mousePressed(){
  redraw();
}
