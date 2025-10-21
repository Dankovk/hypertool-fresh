import type { SandboxCaptureFn, SandboxExportsApi, SandboxImageCaptureHandler, SandboxVideoCaptureHandler } from './types';
interface ExportBridgeOptions {
    container: HTMLElement;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    filename?: string;
}
export declare class ExportBridge {
    private container;
    private position;
    private filename;
    private root;
    private imageButton;
    private videoButton;
    private statusLabel;
    private statusTimeout;
    private userImageCapture;
    private userVideoCapture;
    private defaultCanvasCaptureEnabled;
    private recording;
    private recorder;
    private recordedChunks;
    constructor(options: ExportBridgeOptions);
    private mount;
    private applyPosition;
    private setStatus;
    private updateButtonStates;
    private normalizeImageCapture;
    private normalizeVideoCapture;
    private getActiveImageCapture;
    private getActiveVideoCapture;
    private captureCanvasSnapshot;
    private captureCanvasStream;
    private handleImageCapture;
    private toggleRecording;
    private stopRecording;
    private updateRecordingUi;
    private resolveCaptureResult;
    private downloadBlob;
    private setBusy;
    setFilename(filename: string): void;
    setVisible(visible: boolean): void;
    registerImageCapture(handler: SandboxImageCaptureHandler | SandboxCaptureFn | null): void;
    registerVideoCapture(handler: SandboxVideoCaptureHandler | null): void;
    useDefaultCanvasCapture(enable?: boolean): void;
    getApi(): SandboxExportsApi;
    destroy(): void;
}
export {};
//# sourceMappingURL=exportBridge.d.ts.map