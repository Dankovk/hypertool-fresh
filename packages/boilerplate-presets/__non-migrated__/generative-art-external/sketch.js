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

// Control definitions for external control panel
const controlDefinitions = {
  gridSize: {
    type: 'number',
    label: 'Grid Size',
    value: params.gridSize,
    min: 10,
    max: 100,
    step: 5
  },
  strokeWeight: {
    type: 'number',
    label: 'Stroke Weight',
    value: params.strokeWeight,
    min: 0.5,
    max: 10,
    step: 0.5
  },
  diagonalProbability: {
    type: 'number',
    label: 'Diagonal Probability',
    value: params.diagonalProbability,
    min: 0,
    max: 1,
    step: 0.1
  },
  color1: {
    type: 'color',
    label: 'Primary Color',
    value: params.color1
  },
  color2: {
    type: 'color',
    label: 'Secondary Color',
    value: params.color2
  },
  backgroundColor: {
    type: 'color',
    label: 'Background Color',
    value: params.backgroundColor
  },
  autoRegenerate: {
    type: 'boolean',
    label: 'Auto Regenerate',
    value: params.autoRegenerate
  },
  regenerateSpeed: {
    type: 'number',
    label: 'Regenerate Speed',
    value: params.regenerateSpeed,
    min: 0.1,
    max: 5.0,
    step: 0.1
  }
};

// Flag to prevent sending messages when updating from external controls
let isUpdatingFromExternal = false;

// Flag to prevent sending multiple ready messages
let hasSentReadyMessage = false;

// Reset flags when page loads (for development)
window.addEventListener('beforeunload', () => {
  hasSentReadyMessage = false;
});

// Communication with parent window
function sendMessageToParent(type, data = {}) {
  if (window.parent && window.parent !== window) {
    try {
      // Get parent origin from document.referrer or try common origins
      const parentOrigin = window.location.ancestorOrigins?.[0] || 
                          (document.referrer ? new URL(document.referrer).origin : null) ||
                          'http://localhost:3000'; // fallback for localhost
      
      console.log('Sending message to parent:', { type, data, parentOrigin });
      
      window.parent.postMessage({
        type,
        data,
        timestamp: Date.now()
      }, parentOrigin);
    } catch (error) {
      console.log('Failed to send to specific origin, trying wildcard:', error);
      // Fallback to wildcard (less secure but works for development)
      window.parent.postMessage({
        type,
        data,
        timestamp: Date.now()
      }, '*');
    }
  }
}

// Send parameter change to parent (only when not updating from external)
function sendParameterChange(parameter, value) {
  if (!isUpdatingFromExternal) {
    sendMessageToParent('parameterChange', {
      parameter,
      value
    });
  }
}

// Send ready message with current parameters and control definitions
function sendReadyMessage() {
  if (hasSentReadyMessage) {
    console.log('Ready message already sent, skipping');
    return;
  }
  
  hasSentReadyMessage = true;
  console.log('Sending ready message with parameters and controls:', params, controlDefinitions);
  sendMessageToParent('ready', {
    parameters: { ...params },
    controlDefinitions: { ...controlDefinitions }
  });
  
  // Send a test message to verify communication
  setTimeout(() => {
    sendMessageToParent('log', {
      level: 'info',
      message: 'Project is ready and communicating!'
    });
  }, 1000);
}

// Send error message to parent
function sendErrorMessage(error) {
  sendMessageToParent('error', {
    message: error.message,
    stack: error.stack
  });
}

// Listen for messages from parent
window.addEventListener('message', (event) => {
  const message = event.data;
  
  if (message.type === 'parameterChange' && message.parameter && message.value !== undefined) {
    // Update parameter if it exists
    if (params.hasOwnProperty(message.parameter)) {
      // Set flag to prevent sending message back
      isUpdatingFromExternal = true;
      params[message.parameter] = message.value;
      console.log(`Parameter ${message.parameter} updated from external to:`, message.value);
      
      // Update internal Tweakpane if it exists
      if (window.pane && window.pane.refresh) {
        window.pane.refresh();
      }
      
      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingFromExternal = false;
      }, 100);
    }
  }
});

function setup(){
  createCanvas(600, 400);
  // Start with noLoop, will be enabled if autoRegenerate is true
  noLoop();
  
  // Initialize Tweakpane controls after a short delay to ensure it's loaded
  setTimeout(() => {
    if (typeof Pane !== 'undefined') {
      try {
        // Find the ControlPanel container (if using external control panel)
        const controlContainer = document.querySelector('.tweakpane-container');
        
        if (controlContainer) {
          // Create pane and attach to ControlPanel container
          const pane = new Pane({
            container: controlContainer,
            title: "Generative Art Controls",
          });
          
          // Store pane globally for external updates
          window.pane = pane;
          
          // Add bindings for each parameter with change handlers
          const gridSizeBinding = pane.addBinding(params, 'gridSize', {
            min: 10,
            max: 100,
            step: 5,
            label: 'Grid Size'
          });
          gridSizeBinding.on('change', (ev) => sendParameterChange('gridSize', ev.value));
          
          const strokeWeightBinding = pane.addBinding(params, 'strokeWeight', {
            min: 0.5,
            max: 10,
            step: 0.5,
            label: 'Stroke Weight'
          });
          strokeWeightBinding.on('change', (ev) => sendParameterChange('strokeWeight', ev.value));
          
          const diagonalProbabilityBinding = pane.addBinding(params, 'diagonalProbability', {
            min: 0,
            max: 1,
            step: 0.1,
            label: 'Diagonal Probability'
          });
          diagonalProbabilityBinding.on('change', (ev) => sendParameterChange('diagonalProbability', ev.value));
          
          const color1Binding = pane.addBinding(params, 'color1', {
            label: 'Primary Color'
          });
          color1Binding.on('change', (ev) => sendParameterChange('color1', ev.value));
          
          const color2Binding = pane.addBinding(params, 'color2', {
            label: 'Secondary Color'
          });
          color2Binding.on('change', (ev) => sendParameterChange('color2', ev.value));
          
          const backgroundColorBinding = pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
          });
          backgroundColorBinding.on('change', (ev) => sendParameterChange('backgroundColor', ev.value));
          
          const autoRegenerateBinding = pane.addBinding(params, 'autoRegenerate', {
            label: 'Auto Regenerate'
          });
          autoRegenerateBinding.on('change', (ev) => {
            sendParameterChange('autoRegenerate', ev.value);
            if (ev.value) {
              loop();
            } else {
              noLoop();
            }
          });
          
          const regenerateSpeedBinding = pane.addBinding(params, 'regenerateSpeed', {
            min: 0.1,
            max: 5.0,
            step: 0.1,
            label: 'Regenerate Speed'
          });
          regenerateSpeedBinding.on('change', (ev) => sendParameterChange('regenerateSpeed', ev.value));
          
          // Send ready message after setup
          sendReadyMessage();
        } else {
          // Fallback: create standalone pane
          const pane = new Pane({
            title: "Generative Art Controls",
          });
          
          // Store pane globally for external updates
          window.pane = pane;
          
          // Add bindings for each parameter with change handlers
          const gridSizeBindingFallback = pane.addBinding(params, 'gridSize', {
            min: 10,
            max: 100,
            step: 5,
            label: 'Grid Size'
          });
          gridSizeBindingFallback.on('change', (ev) => sendParameterChange('gridSize', ev.value));
          
          const strokeWeightBindingFallback = pane.addBinding(params, 'strokeWeight', {
            min: 0.5,
            max: 10,
            step: 0.5,
            label: 'Stroke Weight'
          });
          strokeWeightBindingFallback.on('change', (ev) => sendParameterChange('strokeWeight', ev.value));
          
          const diagonalProbabilityBindingFallback = pane.addBinding(params, 'diagonalProbability', {
            min: 0,
            max: 1,
            step: 0.1,
            label: 'Diagonal Probability'
          });
          diagonalProbabilityBindingFallback.on('change', (ev) => sendParameterChange('diagonalProbability', ev.value));
          
          const color1BindingFallback = pane.addBinding(params, 'color1', {
            label: 'Primary Color'
          });
          color1BindingFallback.on('change', (ev) => sendParameterChange('color1', ev.value));
          
          const color2BindingFallback = pane.addBinding(params, 'color2', {
            label: 'Secondary Color'
          });
          color2BindingFallback.on('change', (ev) => sendParameterChange('color2', ev.value));
          
          const backgroundColorBindingFallback = pane.addBinding(params, 'backgroundColor', {
            label: 'Background Color'
          });
          backgroundColorBindingFallback.on('change', (ev) => sendParameterChange('backgroundColor', ev.value));
          
          const autoRegenerateBindingFallback = pane.addBinding(params, 'autoRegenerate', {
            label: 'Auto Regenerate'
          });
          autoRegenerateBindingFallback.on('change', (ev) => {
            sendParameterChange('autoRegenerate', ev.value);
            if (ev.value) {
              loop();
            } else {
              noLoop();
            }
          });
          
          const regenerateSpeedBindingFallback = pane.addBinding(params, 'regenerateSpeed', {
            min: 0.1,
            max: 5.0,
            step: 0.1,
            label: 'Regenerate Speed'
          });
          regenerateSpeedBindingFallback.on('change', (ev) => sendParameterChange('regenerateSpeed', ev.value));
          
          // Send ready message after setup
          sendReadyMessage();
        }
      } catch (error) {
        console.error('Error initializing Tweakpane:', error);
        sendErrorMessage(error);
        // Still send ready message even if Tweakpane fails
        sendReadyMessage();
      }
    } else {
      console.log('Tweakpane not available');
      // Send ready message even without Tweakpane
      sendReadyMessage();
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
  
  // Send a test message when mouse is pressed
  sendMessageToParent('log', {
    level: 'info',
    message: `Mouse pressed! Current state: ${JSON.stringify(params)}`
  });
}

function keyPressed() {
  if (key === 't' || key === 'T') {
    // Send test message
    sendMessageToParent('log', {
      level: 'info',
      message: 'Test message triggered by key press!'
    });
  } else if (key === 'r' || key === 'R') {
    // Send parameter change test
    const randomValue = Math.random() * 100;
    params.gridSize = randomValue;
    sendParameterChange('gridSize', randomValue);
  }
}
