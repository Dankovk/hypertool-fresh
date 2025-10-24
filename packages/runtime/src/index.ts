/**
 * @hypertool/runtime
 *
 * Unified runtime that includes both frame and controls libraries
 * Auto-initializes window APIs when loaded in browser
 */

// ============================================================================
// Imports
// ============================================================================

// Controls - implementation and types
import {
  HypertoolControls,
  createControlPanel,
  createControls,
  injectThemeVariables,
  studioTheme,
} from "./controls/index";

// Frame - implementation and types
import {
  runtime,
  mirrorCss,
  createSandbox,
  configureRuntime,
} from "./frame/index";

// ============================================================================
// Controls Exports
// ============================================================================

export {
  HypertoolControls,
  createControlPanel,
  createControls,
  injectThemeVariables,
  studioTheme,
};

export type {
  // Control definition types
  ControlType,
  BaseControlDefinition,
  ControlDefinition,
  ControlDefinitions,
  NumberControlDefinition,
  ColorControlDefinition,
  BooleanControlDefinition,
  StringControlDefinition,
  SelectControlDefinition,

  // Options and configuration
  HypertoolControlsOptions,
  ControlPosition,

  // Runtime types
  ParameterValues,
  ControlChangeContext,
} from "./controls/types";

// ============================================================================
// Frame Exports
// ============================================================================

export {
  runtime,

  mirrorCss,
  createSandbox,
  configureRuntime,
};

export type {
  // Core runtime types
  HyperFrameRuntimeConfig,
  HyperFrameRuntimeApi,
  HyperFrameSandboxOptions,
  HyperFrameSandboxHandle,

  // Sandbox types
  SandboxContext,
  SandboxEnvironment,
  SandboxControlsHandle,
  SandboxExportsApi,
  SandboxCaptureFn,
  SandboxCaptureResult,
  SandboxImageCaptureHandler,
  SandboxVideoCaptureHandler,
  SandboxControlChangeHandler,

  // Control panel types (used by frame)
  ControlChangePayload,
  ControlPanelOptions,

  // Mount types
  MountOptions,
  MountResult,


} from "./frame/types";

// ============================================================================
// Auto-initialization for browser environment
// ============================================================================

if (typeof window !== 'undefined') {
  // Setup window.hypertoolControls
  (window as any).hypertoolControls = {
    createControls,
    createControlPanel,
    HypertoolControls,
    injectThemeVariables,
    studioTheme,
  };

  // Setup window.hyperFrame
  const existing = (window as any).hyperFrame || {};
  (window as any).hyperFrame = {
    ...existing,
    version: 'universal',
    runtime,
    createSandbox,
    mirrorCss,
  };

  // Setup message handlers for capture functionality
  setupCaptureHandlers();
}

function setupCaptureHandlers() {
  if (typeof window === 'undefined') {
    return;
  }

  let recordingState = {
    isRecording: false,
    recorder: null as MediaRecorder | null,
    recordedChunks: [] as Blob[],
  };

  window.addEventListener('message', (event) => {
    if (event.data?.source !== 'hypertool-main') return;

    const { type } = event.data;

    switch (type) {
      case 'HYPERTOOL_CAPTURE_PNG':
        handleCapturePNG();
        break;
      case 'HYPERTOOL_START_RECORDING':
        handleStartRecording();
        break;
      case 'HYPERTOOL_STOP_RECORDING':
        handleStopRecording();
        break;
    }
  });

  function handleCapturePNG() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.toBlob((blob) => {
        if (blob) {
          window.parent.postMessage(
            {
              type: 'HYPERTOOL_CAPTURE_RESPONSE',
              data: {
                blob: blob,
                filename: 'hypertool-capture.png',
              },
            },
            '*'
          );
        }
      }, 'image/png');
    } else {
      console.warn('No canvas found for capture');
    }
  }

  function handleStartRecording() {
    console.log('Starting recording...');
    const canvas = document.querySelector('canvas');
    if (canvas && typeof canvas.captureStream === 'function') {
      const stream = canvas.captureStream(60);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      recordingState.recordedChunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingState.recordedChunks.push(event.data);
          console.log('Recording data available:', event.data.size, 'bytes');
        }
      };

      recorder.onstop = () => {
        console.log('Recording stopped, processing...');
        const blob = new Blob(recordingState.recordedChunks, { type: 'video/webm' });
        console.log('Recording blob size:', blob.size, 'bytes');
        window.parent.postMessage(
          {
            type: 'HYPERTOOL_RECORDING_RESPONSE',
            data: {
              blob: blob,
              filename: 'hypertool-recording.webm',
            },
          },
          '*'
        );
        recordingState.isRecording = false;
        recordingState.recorder = null;
      };

      recorder.start();
      recordingState.recorder = recorder;
      recordingState.isRecording = true;
      console.log('Recording started successfully');
    } else {
      console.warn('Canvas not found or captureStream not supported');
    }
  }

  function handleStopRecording() {
    console.log('Stopping recording...');
    if (recordingState.recorder) {
      recordingState.recorder.stop();
      // Send immediate stop confirmation
      window.parent.postMessage(
        {
          type: 'HYPERTOOL_RECORDING_STOPPED',
          data: {},
        },
        '*'
      );
      console.log('Stop recording message sent');
    } else {
      console.warn('No active recorder to stop');
    }
  }
}
