
//this code is based on https://thecodingtrain.com/CodingChallenges/090-floyd-steinberg-dithering.html

import { createSandbox } from "./__hypertool__";
import { image } from "./image.ts";

const controlDefinitions: ControlDefinitions = {
  ditherSteps: {
    type: "number",
    label: "Dither Steps",
    value: 1,
    min: 1,
    max: 10,
    step: 1,
  } ,
  pixelsPerFrame: {
    type: "number",
    label: "Pixels Per Frame",
    value: 1,
    min: 1,
    max: 100,
    step: 1,
  },
};

createSandbox({
  controls: {
    definitions: controlDefinitions,
    options: {
      title: "Floyd-Steinberg Dithering",
    },
  },
  exportWidget: {
    filename: "dithering",
    useCanvasCapture: true,
    enabled: true,
  },
  setup: (context: SandboxContext) => initializeDithering(context),
}).catch((error) => {
  console.error("[dithering] Failed to initialise sandbox", error);
});

function initializeDithering(context: SandboxContext) {
  const { mount, params, environment } = context;

  // Create p5.js instance in instance mode
  const sketch = (p: any) => {
    let kitten: any;
    let index = 0;
    let W: number;
    let H: number;

    p.preload = () => {
      kitten = p.loadImage(image);
    };

    p.setup = () => {
      W = Math.min(mount.clientWidth, mount.clientHeight);
      H = W;
      let canvas = p.createCanvas(W, H);
      canvas.parent(mount);
      canvas.elt.style.width = "100%";
      canvas.elt.style.height = "100%";
      canvas.elt.style.display = "block";
      p.pixelDensity(1);
      p.noSmooth();
    };

    p.windowResized = () => {
      W = Math.min(mount.clientWidth, mount.clientHeight);
      H = W;
      p.resizeCanvas(W, H);
      // Reset dithering progress on resize
      index = 0;
    };

    p.draw = () => {
      const steps = params.ditherSteps ?? 1;
      const pixelsPerFrame = params.pixelsPerFrame ?? 1;

      for (let i = 0; i < pixelsPerFrame; i++) {
        makeDithered(kitten, steps, p);
      }
      p.image(kitten, 0, 0, W, H);
    };

    function imageIndex(img: any, x: number, y: number) {
      return 4 * (x + y * img.width);
    }

    function getColorAtindex(img: any, x: number, y: number) {
      let idx = imageIndex(img, x, y);
      let pix = img.pixels;
      let red = pix[idx];
      let green = pix[idx + 1];
      let blue = pix[idx + 2];
      let alpha = pix[idx + 3];
      return p.color(red, green, blue, alpha);
    }

    function setColorAtIndex(img: any, x: number, y: number, clr: any) {
      let idx = imageIndex(img, x, y);
      let pix = img.pixels;
      pix[idx] = p.red(clr);
      pix[idx + 1] = p.green(clr);
      pix[idx + 2] = p.blue(clr);
      pix[idx + 3] = p.alpha(clr);
    }

    function closestStep(max: number, steps: number, value: number) {
      return p.round(steps * value / 255) * p.floor(255 / steps);
    }

    function makeDithered(img: any, steps: number, p: any) {
      img.loadPixels();

      let x = index % img.width;
      let y = Math.floor(index / img.height);
      index++;
      if (index >= (img.width * img.height)) index = 0;

      let clr = getColorAtindex(img, x, y);
      let oldR = p.red(clr);
      let oldG = p.green(clr);
      let oldB = p.blue(clr);
      let newR = closestStep(255, steps, oldR);
      let newG = closestStep(255, steps, oldG);
      let newB = closestStep(255, steps, oldB);

      let newClr = p.color(newR, newG, newB);
      setColorAtIndex(img, x, y, newClr);

      let errR = oldR - newR;
      let errG = oldG - newG;
      let errB = oldB - newB;

      distributeError(img, x, y, errR, errG, errB);

      img.updatePixels();
    }

    function distributeError(img: any, x: number, y: number, errR: number, errG: number, errB: number) {
      addError(img, 7 / 16.0, x + 1, y, errR, errG, errB);
      addError(img, 3 / 16.0, x - 1, y + 1, errR, errG, errB);
      addError(img, 5 / 16.0, x, y + 1, errR, errG, errB);
      addError(img, 1 / 16.0, x + 1, y + 1, errR, errG, errB);
    }

    function addError(img: any, factor: number, x: number, y: number, errR: number, errG: number, errB: number) {
      if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
      let clr = getColorAtindex(img, x, y);
      let r = p.red(clr);
      let g = p.green(clr);
      let b = p.blue(clr);
      clr.setRed(r + errR * factor);
      clr.setGreen(g + errG * factor);
      clr.setBlue(b + errB * factor);

      setColorAtIndex(img, x, y, clr);
    }
  };

  // Create p5 instance
  const p5Instance = new (window as any).p5(sketch);

  // Register resize handler with hypertool environment
  const handleResize = () => {
    if (p5Instance.windowResized) {
      p5Instance.windowResized();
    }
  };

  environment.onResize(handleResize);

  // Return cleanup function
  return () => {
    p5Instance.remove();
  };
}