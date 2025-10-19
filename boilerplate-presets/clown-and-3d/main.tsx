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

function waitForStarter(maxAttempts = 600): Promise<(options: any) => Promise<any>> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not available'));
      return;
    }

    let attempts = 0;

    function tick() {
      attempts += 1;

      const hyperFrame = (window as HyperFrameWindow).hyperFrame;
      if (hyperFrame && hyperFrame.p5 && typeof hyperFrame.p5.start === 'function') {
        resolve(hyperFrame.p5.start);
        return;
      }

      if (attempts >= maxAttempts) {
        reject(new Error('Timed out waiting for HyperFrame p5 starter'));
        return;
      }

      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(tick);
      } else {
        setTimeout(tick, 16);
      }
    }

    tick();
  });
}

waitForStarter()
  .then((start) => start({
    controlDefinitions,
    handlers: {
      setup,
      draw,
      keyPressed,
      mousePressed,
    },
    controls: {
      title: 'Circle, Triangle & Clown Controls',
      onChange: handleControlChange,
    },
    mount: {
      containerClassName: 'circle',
    },
  }))
  .catch((error: unknown) => {
    console.error('[circle] Failed to initialize p5 sketch:', error);
  });
