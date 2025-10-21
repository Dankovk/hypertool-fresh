import type { HyperFrameAdapter, P5Instance, P5SketchHandlers } from '../types';
type P5Constructor = new (sketch: (p5: P5Instance) => void, node?: HTMLElement) => P5Instance;
declare global {
    interface Window {
        p5?: P5Constructor;
    }
}
export declare const p5Adapter: HyperFrameAdapter<P5SketchHandlers>;
export {};
//# sourceMappingURL=p5.d.ts.map