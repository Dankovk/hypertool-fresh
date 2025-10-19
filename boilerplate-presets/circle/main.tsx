import {
  controlDefinitions,
  setup,
  draw,
  mousePressed,
  keyPressed,
  handleControlChange,
} from './sketch';

type HyperFrameWindow = Window & {
  hyperFrame?: {
    p5?: {
      start?: (options: any) => Promise<any>;
    };
  };
};

function getP5Starter() {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  const hyperFrame = (window as HyperFrameWindow).hyperFrame;

  if (!hyperFrame || !hyperFrame.p5 || typeof hyperFrame.p5.start !== 'function') {
    throw new Error('HyperFrame p5 starter is not available');
  }

  return hyperFrame.p5.start;
}

getP5Starter()({
  controlDefinitions,
  handlers: {
    setup,
    draw,
    keyPressed,
    mousePressed,
  },
  controls: {
    title: 'Circle Controls',
    onChange: handleControlChange,
  },
  mount: {
    containerClassName: 'circle',
  },
}).catch((error: unknown) => {
  console.error('[circle] Failed to initialize p5 sketch:', error);
});
