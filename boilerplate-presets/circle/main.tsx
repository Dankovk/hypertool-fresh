import "./tweakpane-styles.css";
import React, {memo} from 'react';

import { createRoot } from 'react-dom/client';
import { ReactP5Wrapper } from "@p5-wrapper/react";
import {Pane} from 'tweakpane';



let params = {
    background: '#0b0c10',
    strokeColor: '#66fcf1',
    radius: 120,
    amplitude: 8,
    animationSpeed: 0.05,
    strokeWeight: 2,
    autoRegenerate: false,
    regenerateSpeed: 1.0
};
let isUpdatingFromExternal = false;

// Flag to prevent sending multiple ready messages
let hasSentReadyMessage = false;

// Reset flags when page loads (for development)
window.addEventListener('beforeunload', () => {
    hasSentReadyMessage = false;
});

// Control definitions for external control panel
const controlDefinitions = {
    background: {
        type: 'color',
        label: 'Background',
        value: params.background
    },
    strokeColor: {
        type: 'color',
        label: 'Stroke',
        value: params.strokeColor
    },
    radius: {
        type: 'number',
        label: 'Radius Base',
        min: 10,
        max: 300,
        step: 1,
        value: params.radius
    },
    amplitude: {
        type: 'number',
        label: 'Animation Amplitude',
        min: 0,
        max: 50,
        step: 1,
        value: params.amplitude
    },
    animationSpeed: {
        type: 'number',
        label: 'Animation Speed',
        min: 0.001,
        max: 0.5,
        step: 0.001,
        value: params.animationSpeed
    },
    strokeWeight: {
        type: 'number',
        label: 'Stroke Weight',
        min: 0.5,
        max: 10,
        step: 0.5,
        value: params.strokeWeight
    },
    autoRegenerate: {
        type: 'boolean',
        label: 'Auto Regenerate',
        value: params.autoRegenerate
    },
    regenerateSpeed: {
        type: 'number',
        label: 'Regenerate Speed',
        min: 0.1,
        max: 5.0,
        step: 0.1,
        value: params.regenerateSpeed
    }
};

// Communication with parent window
function sendMessageToParent(type, data = {}) {
    if (window.parent && window.parent !== window) {
        // Try to send to parent origin first, then fallback to wildcard
        try {
            // Get parent origin from document.referrer or try common origins
            const ancestorOrigins = window.location.ancestorOrigins ? window.location.ancestorOrigins : [];
            const parentOrigin = ancestorOrigins[0] ||
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
            message: 'Circle sketch is ready and communicating!'
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

function setup(p5){
    p5.createCanvas(window.innerWidth, window.innerHeight);

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
                        title: "Circle Controls",
                    });

                    // Store pane globally for external updates
                    window.pane = pane;
                    console.log({pane, Pane})
                    // Add bindings for each parameter with change handlers
                    const backgroundBinding = pane.addBinding(params, 'background', { label: 'Background' });
                    backgroundBinding.on('change', (ev) => sendParameterChange('background', ev.value));

                    const strokeColorBinding = pane.addBinding(params, 'strokeColor', { label: 'Stroke' });
                    strokeColorBinding.on('change', (ev) => sendParameterChange('strokeColor', ev.value));

                    const radiusBinding = pane.addBinding(params, 'radius', {
                        label: 'Radius Base',
                        min: 10,
                        max: 300,
                        step: 1
                    });
                    radiusBinding.on('change', (ev) => sendParameterChange('radius', ev.value));

                    const amplitudeBinding = pane.addBinding(params, 'amplitude', {
                        label: 'Animation Amplitude',
                        min: 0,
                        max: 50,
                        step: 1
                    });
                    amplitudeBinding.on('change', (ev) => sendParameterChange('amplitude', ev.value));

                    const animationSpeedBinding = pane.addBinding(params, 'animationSpeed', {
                        label: 'Animation Speed',
                        min: 0.001,
                        max: 0.5,
                        step: 0.001
                    });
                    animationSpeedBinding.on('change', (ev) => sendParameterChange('animationSpeed', ev.value));

                    const strokeWeightBinding = pane.addBinding(params, 'strokeWeight', {
                        min: 0.5,
                        max: 10,
                        step: 0.5,
                        label: 'Stroke Weight'
                    });
                    strokeWeightBinding.on('change', (ev) => sendParameterChange('strokeWeight', ev.value));

                    const autoRegenerateBinding = pane.addBinding(params, 'autoRegenerate', {
                        label: 'Auto Regenerate'
                    });
                    autoRegenerateBinding.on('change', (ev) => {
                        sendParameterChange('autoRegenerate', ev.value);
                        if (ev.value) {
                            p5.loop();
                        } else {
                            p5.noLoop();
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
                    const pane = new Pane();

                    // Add bindings for each parameter with change handlers
                    const backgroundBindingFallback = pane.addBinding(params, 'background', { label: 'Background' });
                    backgroundBindingFallback.on('change', (ev) => sendParameterChange('background', ev.value));

                    const strokeColorBindingFallback = pane.addBinding(params, 'strokeColor', { label: 'Stroke' });
                    strokeColorBindingFallback.on('change', (ev) => sendParameterChange('strokeColor', ev.value));

                    const radiusBindingFallback = pane.addBinding(params, 'radius', {
                        label: 'Radius Base',
                        min: 10,
                        max: 300,
                        step: 1
                    });
                    radiusBindingFallback.on('change', (ev) => sendParameterChange('radius', ev.value));

                    const amplitudeBindingFallback = pane.addBinding(params, 'amplitude', {
                        label: 'Animation Amplitude',
                        min: 0,
                        max: 50,
                        step: 1
                    });
                    amplitudeBindingFallback.on('change', (ev) => sendParameterChange('amplitude', ev.value));

                    const animationSpeedBindingFallback = pane.addBinding(params, 'animationSpeed', {
                        label: 'Animation Speed',
                        min: 0.001,
                        max: 0.5,
                        step: 0.001
                    });
                    animationSpeedBindingFallback.on('change', (ev) => sendParameterChange('animationSpeed', ev.value));

                    const strokeWeightBindingFallback = pane.addBinding(params, 'strokeWeight', {
                        min: 0.5,
                        max: 10,
                        step: 0.5,
                        label: 'Stroke Weight'
                    });
                    strokeWeightBindingFallback.on('change', (ev) => sendParameterChange('strokeWeight', ev.value));

                    const autoRegenerateBindingFallback = pane.addBinding(params, 'autoRegenerate', {
                        label: 'Auto Regenerate'
                    });
                    autoRegenerateBindingFallback.on('change', (ev) => {
                        sendParameterChange('autoRegenerate', ev.value);
                        if (ev.value) {
                            p5.loop();
                        } else {
                            p5.noLoop();
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

function draw(p5){
    p5.background(params.background);
    p5.stroke(params.strokeColor);
    p5.strokeWeight(params.strokeWeight);
    p5.noFill();
    const r = params.radius + params.amplitude * p5.sin(p5.frameCount * params.animationSpeed);
    p5.circle(p5.width/2, p5.height/2, r*2);

    // Auto-regeneration logic
    if (params.autoRegenerate) {
        const currentTime = p5.millis();
        const regenerateInterval = 1000 / params.regenerateSpeed;

        if (currentTime - lastRegenerateTime > regenerateInterval) {
            lastRegenerateTime = currentTime;
            p5.redraw();
        }
    }
}

function mousePressed(p5){
    p5.redraw();

    // Send a test message when mouse is pressed
    sendMessageToParent('log', {
        level: 'info',
        message: `Mouse pressed! Current radius: ${params.radius}`
    });
}

// Add keyboard shortcuts for testing
function keyPressed(p5) {
    if (p5.key === 't' || p5.key === 'T') {
        // Send test message
        sendMessageToParent('log', {
            level: 'info',
            message: 'Test message triggered by key press!'
        });
    } else if (p5.key === 'r' || p5.key === 'R') {
        // Send parameter change test
        const newRadius = Math.random() * 200 + 50;
        params.radius = newRadius;
        sendParameterChange('radius', newRadius);
    }
}






const App = memo(() => {
    const sketch = (p5) => {

// console.log("SCRIPT LOADED", createCanvas)
        p5.setup = () => setup(p5)
        p5.draw = () => draw(p5)
        p5.keyPressed = () => keyPressed(p5)
        p5.mousePressed = () => mousePressed(p5)

    }
    return<ReactP5Wrapper sketch={sketch} />



});

const domNode = document.createElement('div');
domNode.classList.add('circle');
document.body.appendChild(domNode);
const root = createRoot(domNode);
root.render(<App/>)

