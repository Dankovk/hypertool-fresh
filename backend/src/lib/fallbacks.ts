import type { FileMap } from "../types/studio.js";

export function createStubTransform(files: FileMap, prompt: string): FileMap {
  const nextFiles = { ...files };
  const indexHtml =
    nextFiles["/index.html"] ??
    `<!doctype html><html><head><meta charset="utf-8" /><title>p5 Sketch</title></head><body><script src="https://unpkg.com/p5@1.9.2/lib/p5.min.js"></script><script src="/sketch.js"></script></body></html>`;
  let sketch =
    nextFiles["/sketch.js"] ?? "function setup(){createCanvas(600,400);}function draw(){background('#0b0c10');}";

  if (/circle|orbit|ring/i.test(prompt)) {
    sketch =
      "function setup(){createCanvas(600,400);}function draw(){background('#0b0c10'); fill('#66fcf1'); noStroke(); circle(width/2,height/2,200);}";
  } else if (/noise|perlin|flow/i.test(prompt)) {
    sketch =
      "let t=0;function setup(){createCanvas(600,400);}function draw(){background('#0b0c10'); stroke('#66fcf1'); noFill(); beginShape(); for(let x=0;x<width;x+=4){const y=noise(x*0.01,t)*height; vertex(x,y);} endShape(); t+=0.01;}";
  }

  nextFiles["/index.html"] = indexHtml;
  nextFiles["/sketch.js"] = sketch;
  return nextFiles;
}
