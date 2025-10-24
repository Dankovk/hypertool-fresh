// Control parameters - these will be controlled by Tweakpane
let params = {
  backgroundColor: '#0b0c10',
  canvasWidth: 600,
  canvasHeight: 400,
  frameRate: 60,
  autoRedraw: false,
  redrawSpeed: 1.0
};

function setup(){
  createCanvas(params.canvasWidth, params.canvasHeight);
  frameRate(params.frameRate);
  
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
            title: "Canvas Controls",
          });
          
          // Add bindings for each parameter
          pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
          });
          
          pane.addBinding(params, 'canvasWidth', {
            min: 200,
            max: 1200,
            step: 50,
            label: 'Canvas Width'
          });
          
          pane.addBinding(params, 'canvasHeight', {
            min: 200,
            max: 800,
            step: 50,
            label: 'Canvas Height'
          });
          
          pane.addBinding(params, 'frameRate', {
            min: 1,
            max: 120,
            step: 1,
            label: 'Frame Rate'
          });
          
          const autoRedrawBinding = pane.addBinding(params, 'autoRedraw', {
            label: 'Auto Redraw'
          });
          
          pane.addBinding(params, 'redrawSpeed', {
            min: 0.1,
            max: 5.0,
            step: 0.1,
            label: 'Redraw Speed'
          });
          
          // Add event listeners
          autoRedrawBinding.on('change', (ev) => {
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
          
          pane.addBinding(params, 'canvasWidth', {
            min: 200,
            max: 1200,
            step: 50,
            label: 'Canvas Width'
          });
          
          pane.addBinding(params, 'canvasHeight', {
            min: 200,
            max: 800,
            step: 50,
            label: 'Canvas Height'
          });
          
          pane.addBinding(params, 'frameRate', {
            min: 1,
            max: 120,
            step: 1,
            label: 'Frame Rate'
          });
          
          const autoRedrawBindingFallback = pane.addBinding(params, 'autoRedraw', {
            label: 'Auto Redraw'
          });
          
          pane.addBinding(params, 'redrawSpeed', {
            min: 0.1,
            max: 5.0,
            step: 0.1,
            label: 'Redraw Speed'
          });
          
          // Add event listeners
          autoRedrawBindingFallback.on('change', (ev) => {
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

function draw(){
  // Use params.backgroundColor for background
  background(params.backgroundColor);
  
  // Auto-redraw logic
  if (params.autoRedraw) {
    const currentTime = millis();
    const redrawInterval = 1000 / params.redrawSpeed;
    
    if (currentTime - lastRedrawTime > redrawInterval) {
      lastRedrawTime = currentTime;
      redraw();
    }
  }
}

// Auto-redraw functionality
let lastRedrawTime = 0;

function mousePressed(){
  redraw();
}
