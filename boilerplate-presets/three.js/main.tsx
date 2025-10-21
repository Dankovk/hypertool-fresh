// Import Three.js and OrbitControls
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Expose Three.js and OrbitControls on window for Hyper Runtime
(window as any).THREE = THREE;
(window as any).OrbitControls = OrbitControls;

// Import Hyper Runtime and sketch
import { startThreeSketch } from "./__hypertool__/runtime/index.js";
import { controlDefinitions, sketchConfig, setup, animate, resize, dispose } from "./sketch.js";

// Start the Three.js sketch with Hyper Runtime
startThreeSketch({
    ...sketchConfig,
    handlers: {
        setup,
        animate,
        resize,
        dispose,
    },
}).catch((error) => {
    console.error("Failed to start Three.js sketch:", error);

    // Display error to user
    document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #0b0c10;
      color: #c5c6c7;
      font-family: system-ui, sans-serif;
      padding: 20px;
    ">
      <div style="
        max-width: 500px;
        padding: 30px;
        background: rgba(197, 198, 199, 0.1);
        border-radius: 8px;
        border: 1px solid rgba(197, 198, 199, 0.2);
      ">
        <h1 style="color: #ff6b6b; margin-bottom: 16px;">
          Failed to Initialize Three.js
        </h1>
        <p style="line-height: 1.6; margin-bottom: 12px;">
          ${error.message}
        </p>
        <p style="font-size: 14px; opacity: 0.8;">
          Make sure Three.js and the Hyper Runtime library are properly loaded.
        </p>
      </div>
    </div>
  `;
});
