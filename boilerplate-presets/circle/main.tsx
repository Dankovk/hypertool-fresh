import {setup, draw, mousePressed, keyPressed, controlDefinitions} from './sketch';

type ParameterValues<T extends Record<string, { value: unknown }>> = {
  [K in keyof T]: T[K]['value'];
};

type HyperWindow = Window & {
  hypertoolControls?: any;
  hyperFrame?: any;
};



type CircleParameters = ParameterValues<typeof controlDefinitions>;

let p5Instance: any = null;

function getHyperControls() {
  if (typeof window === 'undefined') {
    throw new Error('Hypertool controls library is not available');
  }
  const hyperWindow = window as HyperWindow;
  if (!hyperWindow.hypertoolControls) {
    throw new Error('Hypertool controls library is not available');
  }
  return hyperWindow.hypertoolControls;
}

function getHyperFrame() {
  if (typeof window === 'undefined') {
    throw new Error('HyperFrame library is not available');
  }
  const hyperWindow = window as HyperWindow;
  if (!hyperWindow.hyperFrame) {
    throw new Error('HyperFrame library is not available');
  }
  return hyperWindow.hyperFrame;
}

const controls = getHyperControls().createControlPanel(controlDefinitions, {
  title: 'Circle Controls',
  onChange: (values, { key }) => {
    if (!p5Instance) {
      return;
    }

    if (key === 'autoRegenerate') {
      values.autoRegenerate ? p5Instance.loop() : p5Instance.noLoop();
    }
  },
});

const params = controls.params as CircleParameters;



getHyperFrame().mountP5Sketch(
  {
    setup,
    draw,
    keyPressed,
    mousePressed,
  },
  {
    containerClassName: 'circle',
  }
);
