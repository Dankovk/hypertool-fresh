import type { ExportWidgetHandle, ExportWidgetOptions, HyperFrameExportProvider } from './types';
interface ExportBridgeInitOptions {
    container: HTMLElement;
    options?: ExportWidgetOptions;
    provider?: HyperFrameExportProvider | null;
}
export declare class ExportBridge {
    private provider;
    private container;
    private widget;
    private imageButton;
    private videoButton;
    private options;
    private recording;
    private mediaRecorder;
    private recordingChunks;
    private restorePosition;
    init({ container, options, provider }: ExportBridgeInitOptions): ExportWidgetHandle;
    setProvider(provider: HyperFrameExportProvider | null): void;
    destroy(): void;
    private mountWidget;
    private createButton;
    private readonly handleImageClick;
    private readonly handleVideoClick;
    private captureImage;
    private startRecording;
    private stopRecording;
    private captureFromCanvas;
    private findCanvas;
    private teardownMediaRecorder;
    private updateButtons;
}
export {};
//# sourceMappingURL=exportBridge.d.ts.map