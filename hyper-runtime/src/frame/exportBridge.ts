import type {
  ExportWidgetHandle,
  ExportWidgetOptions,
  ExportWidgetPosition,
  HyperFrameExportProvider,
} from './types';

interface ExportBridgeInitOptions {
  container: HTMLElement;
  options?: ExportWidgetOptions;
  provider?: HyperFrameExportProvider | null;
}

interface DownloadOptions {
  blob: Blob;
  fileName: string;
}

interface ResolvedExportOptions {
  position: ExportWidgetPosition;
  image: {
    enabled: boolean;
    fileName: string;
  };
  video: {
    enabled: boolean;
    fileName: string;
    mimeType: string;
    bitsPerSecond: number;
    frameRate: number;
  };
  autoDownload: boolean;
}

const DEFAULT_EXPORT_OPTIONS: ResolvedExportOptions = {
  position: 'bottom-right',
  image: {
    enabled: true,
    fileName: 'hyperframe-capture.png',
  },
  video: {
    enabled: true,
    fileName: 'hyperframe-recording.webm',
    mimeType: 'video/webm',
    bitsPerSecond: 4_000_000,
    frameRate: 60,
  },
  autoDownload: true,
};

export class ExportBridge {
  private provider: HyperFrameExportProvider | null = null;
  private container: HTMLElement | null = null;
  private widget: HTMLDivElement | null = null;
  private imageButton: HTMLButtonElement | null = null;
  private videoButton: HTMLButtonElement | null = null;
  private options: ResolvedExportOptions = DEFAULT_EXPORT_OPTIONS;
  private recording = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordingChunks: BlobPart[] = [];
  private restorePosition: string | null = null;

  init({ container, options, provider }: ExportBridgeInitOptions): ExportWidgetHandle {
    this.container = container;
    this.options = mergeOptions(options);
    this.provider = provider ?? null;
    this.mountWidget();
    this.updateButtons();

    return {
      captureImage: () => this.captureImage(),
      startRecording: () => this.startRecording(),
      stopRecording: () => this.stopRecording(),
      isRecording: () => this.recording,
      destroy: () => this.destroy(),
    };
  }

  setProvider(provider: HyperFrameExportProvider | null) {
    this.provider = provider;
    this.updateButtons();
  }

  destroy() {
    this.videoButton?.removeEventListener('click', this.handleVideoClick);
    this.imageButton?.removeEventListener('click', this.handleImageClick);

    if (this.widget && this.widget.parentElement) {
      this.widget.parentElement.removeChild(this.widget);
    }

    if (this.container && this.restorePosition !== null) {
      this.container.style.position = this.restorePosition;
    }

    this.widget = null;
    this.imageButton = null;
    this.videoButton = null;
    this.container = null;
    this.restorePosition = null;
    this.provider = null;
    this.recording = false;
    this.teardownMediaRecorder();
  }

  private mountWidget() {
    if (!this.container) {
      return;
    }

    const currentPosition = window.getComputedStyle(this.container).position;
    if (currentPosition === 'static') {
      this.restorePosition = this.container.style.position;
      this.container.style.position = 'relative';
    }

    this.widget = document.createElement('div');
    this.widget.className = 'hyperframe-export-widget';
    Object.assign(this.widget.style, {
      position: 'absolute',
      zIndex: '2147483646',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px',
      borderRadius: '12px',
      background: 'rgba(17, 24, 39, 0.75)',
      backdropFilter: 'blur(12px)',
      color: 'white',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '12px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
      pointerEvents: 'auto',
    } as CSSStyleDeclaration);

    const { x, y } = resolvePosition(this.options.position);
    Object.assign(this.widget.style, x);
    Object.assign(this.widget.style, y);

    this.imageButton = this.createButton('Capture PNG');
    this.imageButton.addEventListener('click', this.handleImageClick);
    this.widget.appendChild(this.imageButton);

    this.videoButton = this.createButton('Start Recording');
    this.videoButton.addEventListener('click', this.handleVideoClick);
    this.widget.appendChild(this.videoButton);

    this.container.appendChild(this.widget);
  }

  private createButton(label: string) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    Object.assign(button.style, {
      appearance: 'none',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      padding: '8px 12px',
      background: 'rgba(255, 255, 255, 0.12)',
      color: 'white',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'background 120ms ease, border 120ms ease, transform 120ms ease',
    });
    button.onmouseenter = () => {
      button.style.background = 'rgba(255, 255, 255, 0.2)';
      button.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    };
    button.onmouseleave = () => {
      button.style.background = 'rgba(255, 255, 255, 0.12)';
      button.style.border = '1px solid rgba(255, 255, 255, 0.2)';
      button.style.transform = 'none';
    };
    button.onmousedown = () => {
      button.style.transform = 'scale(0.97)';
    };
    button.onmouseup = () => {
      button.style.transform = 'none';
    };
    return button;
  }

  private readonly handleImageClick = async () => {
    const blob = await this.captureImage();
    if (blob && this.options.autoDownload) {
      downloadBlob({ blob, fileName: this.options.image.fileName });
    }
  };

  private readonly handleVideoClick = async () => {
    if (this.recording) {
      const blob = await this.stopRecording();
      if (blob && this.options.autoDownload) {
        downloadBlob({ blob, fileName: this.options.video.fileName });
      }
      return;
    }

    await this.startRecording();
  };

  private async captureImage(): Promise<Blob | null> {
    if (!this.options.image.enabled) {
      return null;
    }

    if (this.provider?.captureFrame) {
      const result = await this.provider.captureFrame();
      return normalizeCaptureResult(result);
    }

    return this.captureFromCanvas();
  }

  private async startRecording(): Promise<Blob | null> {
    if (!this.options.video.enabled) {
      return null;
    }

    if (this.recording) {
      return null;
    }

    if (this.provider?.startRecording) {
      await this.provider.startRecording({
        mimeType: this.options.video.mimeType,
        bitsPerSecond: this.options.video.bitsPerSecond,
        frameRate: this.options.video.frameRate,
      });
      this.recording = true;
      this.updateButtons();
      return null;
    }

    const canvas = this.findCanvas();
    if (!canvas || typeof (canvas as any).captureStream !== 'function') {
      console.warn('[hyper-frame] Unable to start recording: canvas captureStream not available.');
      return null;
    }

    const stream = (canvas as HTMLCanvasElement).captureStream(this.options.video.frameRate);
    try {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.options.video.mimeType,
        videoBitsPerSecond: this.options.video.bitsPerSecond,
      });
    } catch (error) {
      console.warn('[hyper-frame] Unable to create MediaRecorder:', error);
      return null;
    }

    this.recordingChunks = [];

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.recordingChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.recording = false;
      this.updateButtons();
    };

    this.mediaRecorder.start();
    this.recording = true;
    this.updateButtons();
    return null;
  }

  private async stopRecording(): Promise<Blob | null> {
    if (!this.recording) {
      return null;
    }

    if (this.provider?.stopRecording) {
      const result = await this.provider.stopRecording();
      this.recording = this.provider.isRecording?.() ?? false;
      this.updateButtons();
      return result ? normalizeCaptureResult(result) : null;
    }

    if (!this.mediaRecorder) {
      return null;
    }

    const recorder = this.mediaRecorder;
    const promise = new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(this.recordingChunks, { type: this.options.video.mimeType });
        this.recording = false;
        this.teardownMediaRecorder();
        this.updateButtons();
        resolve(blob);
      };
    });

    recorder.stop();
    return promise;
  }

  private captureFromCanvas(): Blob | null {
    const canvas = this.findCanvas();
    if (!canvas) {
      console.warn('[hyper-frame] No canvas element found for PNG capture.');
      return null;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      return dataUrlToBlob(dataUrl);
    } catch (error) {
      console.warn('[hyper-frame] Failed to capture canvas frame:', error);
      return null;
    }
  }

  private findCanvas(): HTMLCanvasElement | null {
    if (!this.container) {
      return null;
    }
    return this.container.querySelector('canvas');
  }

  private teardownMediaRecorder() {
    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder = null;
    }
    this.recordingChunks = [];
  }

  private updateButtons() {
    const hasImageCapability = this.options.image.enabled && (this.provider?.captureFrame || this.findCanvas());
    if (this.imageButton) {
      this.imageButton.disabled = !hasImageCapability;
      this.imageButton.style.opacity = hasImageCapability ? '1' : '0.5';
      this.imageButton.style.cursor = hasImageCapability ? 'pointer' : 'not-allowed';
    }

    const hasRecordingCapability =
      this.options.video.enabled &&
      (this.provider?.startRecording || (this.findCanvas() && typeof MediaRecorder !== 'undefined'));

    if (this.videoButton) {
      this.videoButton.disabled = !hasRecordingCapability;
      this.videoButton.textContent = this.recording ? 'Stop Recording' : 'Start Recording';
      this.videoButton.style.opacity = hasRecordingCapability ? '1' : '0.5';
      this.videoButton.style.cursor = hasRecordingCapability ? 'pointer' : 'not-allowed';
    }
  }
}

function mergeOptions(options?: ExportWidgetOptions): ResolvedExportOptions {
  return {
    position: options?.position ?? DEFAULT_EXPORT_OPTIONS.position,
    image: {
      enabled: options?.image?.enabled ?? DEFAULT_EXPORT_OPTIONS.image.enabled,
      fileName: options?.image?.fileName ?? DEFAULT_EXPORT_OPTIONS.image.fileName,
    },
    video: {
      enabled: options?.video?.enabled ?? DEFAULT_EXPORT_OPTIONS.video.enabled,
      fileName: options?.video?.fileName ?? DEFAULT_EXPORT_OPTIONS.video.fileName,
      mimeType: options?.video?.mimeType ?? DEFAULT_EXPORT_OPTIONS.video.mimeType,
      bitsPerSecond: options?.video?.bitsPerSecond ?? DEFAULT_EXPORT_OPTIONS.video.bitsPerSecond,
      frameRate: options?.video?.frameRate ?? DEFAULT_EXPORT_OPTIONS.video.frameRate,
    },
    autoDownload: options?.autoDownload ?? DEFAULT_EXPORT_OPTIONS.autoDownload,
  };
}

function normalizeCaptureResult(result: Blob | string): Blob {
  if (result instanceof Blob) {
    return result;
  }

  if (typeof result === 'string') {
    if (result.startsWith('data:')) {
      return dataUrlToBlob(result);
    }

    return new Blob([result], { type: 'text/plain' });
  }

  throw new Error('[hyper-frame] Unsupported capture result type.');
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(data);
  const length = binary.length;
  const buffer = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }
  return new Blob([buffer], { type: mimeType });
}

function downloadBlob({ blob, fileName }: DownloadOptions) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function resolvePosition(position: ExportWidgetPosition) {
  switch (position) {
    case 'top-left':
      return { x: { left: '16px' }, y: { top: '16px' } };
    case 'top-right':
      return { x: { right: '16px' }, y: { top: '16px' } };
    case 'bottom-left':
      return { x: { left: '16px' }, y: { bottom: '16px' } };
    case 'bottom-right':
    default:
      return { x: { right: '16px' }, y: { bottom: '16px' } };
  }
}
