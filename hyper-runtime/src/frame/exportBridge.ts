import type {
  SandboxCaptureFn,
  SandboxCaptureResult,
  SandboxExportsApi,
  SandboxImageCaptureHandler,
  SandboxVideoCaptureHandler,
} from './types';

interface ExportBridgeOptions {
  container: HTMLElement;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  filename?: string;
}

interface NormalizedImageCapture {
  capture: SandboxCaptureFn;
  filename?: string;
  mimeType?: string;
}

interface NormalizedVideoCapture {
  requestStream: () => Promise<MediaStream> | MediaStream;
  filename?: string;
  mimeType?: string;
  bitsPerSecond?: number;
  timeSlice?: number;
}

export class ExportBridge {
  private container: HTMLElement;
  private position: ExportBridgeOptions['position'];
  private filename: string;
  private root: HTMLDivElement | null = null;
  private imageButton: HTMLButtonElement | null = null;
  private videoButton: HTMLButtonElement | null = null;
  private statusLabel: HTMLSpanElement | null = null;
  private statusTimeout: number | null = null;
  private userImageCapture: NormalizedImageCapture | null = null;
  private userVideoCapture: NormalizedVideoCapture | null = null;
  private defaultCanvasCaptureEnabled = false;
  private recording = false;
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private supportedVideoFormat: { mimeType: string; extension: string } | null = null;

  constructor(options: ExportBridgeOptions) {
    this.container = options.container;
    this.position = options.position;
    this.filename = options.filename ?? 'hyperframe-export';
    this.detectBestVideoFormat();
    this.mount();
  }

  /**
   * Detect the best supported video format for cross-browser compatibility
   * Priority: MP4/H.264 > WebM/VP9 > WebM/VP8
   */
  private detectBestVideoFormat() {
    if (typeof MediaRecorder === 'undefined') {
      this.supportedVideoFormat = null;
      return;
    }

    // Test formats in order of preference
    const formats = [
        { mimeType: 'video/mp4;codecs=h264', extension: 'mp4' },
      { mimeType: 'video/mp4', extension: 'mp4' },
      { mimeType: 'video/webm;codecs=h264', extension: 'webm' },
      { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
      { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
      { mimeType: 'video/webm', extension: 'webm' },
    ];

    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format.mimeType)) {
        this.supportedVideoFormat = format;
        console.log('[ExportBridge] Using video format:', format.mimeType);
        return;
      }
    }

    // Fallback to first supported format
    this.supportedVideoFormat = formats.find(f => MediaRecorder.isTypeSupported(f.mimeType)) || formats[formats.length - 1];
    console.warn('[ExportBridge] No preferred format supported, using fallback:', this.supportedVideoFormat.mimeType);
  }

  private mount() {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.createElement('div');
    root.className = 'hyper-frame-export-widget';
    root.dataset.hyperFrame = 'export-widget';
    Object.assign(root.style, {
      position: 'fixed',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
      // padding: '0.5rem 0.75rem',
      borderRadius: '0.75rem',
      // background: 'rgba(15, 23, 42, 0.85)',
      color: '#f8fafc',
      fontFamily: 'Roboto, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont',
      fontSize: '12px',
      lineHeight: '16px',
      // boxShadow: '0 20px 40px rgba(15, 23, 42, 0.3)',
      zIndex: '2147483646',
      pointerEvents: 'auto',
      // backdropFilter: 'blur(8px)',
    } as CSSStyleDeclaration);

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.flexDirection = 'row';
    controls.style.alignItems = 'center';
    controls.style.justifyContent = 'space-between';
    controls.style.gap = '0.5rem';

    const imageButton = document.createElement('button');
    imageButton.type = 'button';
    imageButton.textContent = 'Capture PNG';
    imageButton.style.flex = '1 1 auto';
    imageButton.style.padding = '0.35rem 0.6rem';
    imageButton.style.border = '0';
    imageButton.style.borderRadius = '0.5rem';
    imageButton.style.cursor = 'pointer';
    imageButton.style.background = 'rgba(94, 234, 212, 0.2)';
    imageButton.style.color = '#5eead4';
    imageButton.style.fontWeight = '600';

    const videoButton = document.createElement('button');
    videoButton.type = 'button';
    videoButton.textContent = 'Record Video';
    videoButton.style.flex = '1 1 auto';
    videoButton.style.padding = '0.35rem 0.6rem';
    videoButton.style.border = '0';
    videoButton.style.borderRadius = '0.5rem';
    videoButton.style.cursor = 'pointer';
    videoButton.style.background = 'rgba(129, 140, 248, 0.2)';
    videoButton.style.color = '#a5b4fc';
    videoButton.style.fontWeight = '600';

    imageButton.addEventListener('click', () => this.handleImageCapture(), { passive: true });
    videoButton.addEventListener('click', () => this.toggleRecording(), { passive: true });

    const status = document.createElement('span');
    status.style.display = 'block';
    status.style.color = '#e2e8f0';
    status.style.opacity = '0.8';
    status.style.minHeight = '16px';

    controls.appendChild(imageButton);
    controls.appendChild(videoButton);
    // root.appendChild(controls);
    // root.appendChild(status);

    this.root = root;
    this.imageButton = imageButton;
    this.videoButton = videoButton;
    this.statusLabel = status;

    this.applyPosition();
    document.body.appendChild(root);
    this.updateButtonStates();
  }

  private applyPosition() {
    if (!this.root) return;

    const position = this.position ?? 'top-left';
    const offsets: Record<string, Partial<CSSStyleDeclaration>> = {
      'bottom-right': { bottom: '1rem', right: '1rem', top: '', left: '' },
      'bottom-left': { bottom: '1rem', left: '1rem', top: '', right: '' },
      'top-right': { top: '1rem', right: '1rem', bottom: '', left: '' },
      'top-left': { top: '1rem', left: '1rem', bottom: '', right: '' },
    };

    const styles = offsets[position];
    Object.assign(this.root.style, styles);
  }

  private setStatus(message: string, tone: 'default' | 'error' | 'success' = 'default') {
    if (!this.statusLabel) return;

    if (this.statusTimeout) {
      window.clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }

    this.statusLabel.textContent = message;

    switch (tone) {
      case 'error':
        this.statusLabel.style.color = '#fca5a5';
        break;
      case 'success':
        this.statusLabel.style.color = '#bbf7d0';
        break;
      default:
        this.statusLabel.style.color = '#e2e8f0';
    }

    if (message) {
      this.statusTimeout = window.setTimeout(() => {
        if (this.statusLabel) {
          this.statusLabel.textContent = '';
          this.statusLabel.style.color = '#e2e8f0';
        }
        this.statusTimeout = null;
      }, 4000);
    }
  }

  private updateButtonStates() {
    if (this.imageButton) {
      this.imageButton.disabled = !this.getActiveImageCapture();
      this.imageButton.style.opacity = this.imageButton.disabled ? '0.6' : '1';
    }

    if (this.videoButton) {
      const hasVideo = Boolean(this.getActiveVideoCapture());
      this.videoButton.disabled = !hasVideo;
      this.videoButton.style.opacity = hasVideo ? '1' : '0.6';
    }
  }

  private normalizeImageCapture(
    handler: SandboxImageCaptureHandler | SandboxCaptureFn | null,
  ): NormalizedImageCapture | null {
    if (!handler) return null;

    if (typeof handler === 'function') {
      return { capture: handler };
    }

    return {
      capture: handler.capture,
      filename: handler.filename,
      mimeType: handler.mimeType,
    };
  }

  private normalizeVideoCapture(handler: SandboxVideoCaptureHandler | null): NormalizedVideoCapture | null {
    if (!handler) return null;

    return {
      requestStream: handler.requestStream,
      filename: handler.filename,
      mimeType: handler.mimeType,
      bitsPerSecond: handler.bitsPerSecond,
      timeSlice: handler.timeSlice,
    };
  }

  private getActiveImageCapture(): NormalizedImageCapture | null {
    if (this.userImageCapture) {
      return this.userImageCapture;
    }
    if (this.defaultCanvasCaptureEnabled) {
      return {
        capture: () => this.captureCanvasSnapshot(),
        filename: undefined,
        mimeType: 'image/png',
      };
    }
    return null;
  }

  private getActiveVideoCapture(): NormalizedVideoCapture | null {
    if (this.userVideoCapture) {
      return this.userVideoCapture;
    }
    if (this.defaultCanvasCaptureEnabled && this.supportedVideoFormat) {
      return {
        requestStream: () => this.captureCanvasStream(),
        filename: `${this.filename}.${this.supportedVideoFormat.extension}`,
        mimeType: this.supportedVideoFormat.mimeType,
        // High quality settings: 10 Mbps for 1080p, scales with resolution
        bitsPerSecond: 10_000_000,
        timeSlice: undefined, // Let browser optimize
      };
    }
    return null;
  }

  private async captureCanvasSnapshot(): Promise<SandboxCaptureResult> {
    const canvas = this.container.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('No canvas element available for capture.');
    }

    return new Promise<Blob | null>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas capture returned an empty blob.'));
        }
      });
    });
  }

  private async captureCanvasStream(): Promise<MediaStream> {
    const canvas = this.container.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('No canvas element available for recording.');
    }
    if (typeof canvas.captureStream !== 'function') {
      throw new Error('Canvas captureStream API is not supported in this browser.');
    }
    return canvas.captureStream(60);
  }

  private async handleImageCapture() {
    const handler = this.getActiveImageCapture();
    if (!handler) {
      this.setStatus('No capture handler available', 'error');
      return;
    }

    try {
      this.setBusy(true, 'image');
      const result = await handler.capture();
      const blob = await this.resolveCaptureResult(result, handler.mimeType ?? 'image/png');
      if (blob) {
        const filename = handler.filename ?? `${this.filename}.png`;
        this.downloadBlob(blob, filename);
        this.setStatus('PNG exported', 'success');
      }
    } catch (error) {
      console.error('[hyper-frame] Failed to capture image', error);
      this.setStatus((error as Error).message || 'Failed to capture image', 'error');
    } finally {
      this.setBusy(false, 'image');
    }
  }

  private async toggleRecording() {
    if (this.recording) {
      this.stopRecording();
      return;
    }

    const handler = this.getActiveVideoCapture();
    if (!handler) {
      this.setStatus('No recorder available', 'error');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      this.setStatus('MediaRecorder is not supported in this browser', 'error');
      return;
    }

    try {
      const stream = await handler.requestStream();
      if (!stream) {
        throw new Error('Recording stream is not available');
      }

      this.recordedChunks = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: handler.mimeType,
        videoBitsPerSecond: handler.bitsPerSecond,
      });

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) {
          this.recordedChunks.push(event.data);
        }
      });

      recorder.addEventListener('stop', () => {
        const blob = new Blob(this.recordedChunks, { type: handler.mimeType ?? 'video/webm' });
        const filename = handler.filename ?? `${this.filename}.${this.supportedVideoFormat?.extension ?? 'webm'}`;
        this.downloadBlob(blob, filename);
        this.setStatus('Recording saved', 'success');
        stream.getTracks().forEach((track) => track.stop());
        this.recording = false;
        this.updateRecordingUi();
      });

      recorder.start(handler.timeSlice);
      this.recorder = recorder;
      this.recording = true;
      this.setStatus('Recording in progress…');
      this.updateRecordingUi();
    } catch (error) {
      console.error('[hyper-frame] Failed to start recording', error);
      this.setStatus((error as Error).message || 'Failed to record video', 'error');
      this.recording = false;
      this.recorder = null;
      this.updateRecordingUi();
    }
  }

  private stopRecording() {
    if (!this.recorder) {
      return;
    }

    this.setStatus('Finishing recording…');
    this.recorder.stop();
    this.recorder = null;
    this.recording = false;
    this.updateRecordingUi();
  }

  private updateRecordingUi() {
    if (!this.videoButton) return;

    this.videoButton.textContent = this.recording ? 'Stop Recording' : 'Record Video';
    this.videoButton.style.background = this.recording ? 'rgba(248, 113, 113, 0.25)' : 'rgba(129, 140, 248, 0.2)';
    this.videoButton.style.color = this.recording ? '#fecaca' : '#a5b4fc';
  }

  private async resolveCaptureResult(result: SandboxCaptureResult, mimeType: string): Promise<Blob | null> {
    if (!result) {
      return null;
    }

    if (result instanceof Blob) {
      return result;
    }

    if (typeof result === 'string') {
      if (result.startsWith('data:')) {
        const response = await fetch(result);
        return await response.blob();
      }
      const response = await fetch(result);
      return await response.blob();
    }

    if (result instanceof HTMLCanvasElement) {
      return await new Promise<Blob | null>((resolve, reject) => {
        result.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas export failed.'));
          }
        }, mimeType);
      });
    }

    if (typeof OffscreenCanvas !== 'undefined' && result instanceof OffscreenCanvas) {
      const blob = await result.convertToBlob({ type: mimeType });
      return blob;
    }

    return null;
  }

  private downloadBlob(blob: Blob, filename: string) {
    if (typeof window === 'undefined') {
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  private setBusy(busy: boolean, mode: 'image' | 'video') {
    const button = mode === 'image' ? this.imageButton : this.videoButton;
    if (!button) return;
    button.disabled = busy;
    button.style.opacity = busy ? '0.6' : '1';
  }

  setFilename(filename: string) {
    this.filename = filename;
  }

  setVisible(visible: boolean) {
    if (!this.root) return;
    this.root.style.display = visible ? 'flex' : 'none';
  }

  registerImageCapture(handler: SandboxImageCaptureHandler | SandboxCaptureFn | null) {
    this.userImageCapture = this.normalizeImageCapture(handler);
    this.updateButtonStates();
  }

  registerVideoCapture(handler: SandboxVideoCaptureHandler | null) {
    this.userVideoCapture = this.normalizeVideoCapture(handler);
    this.updateButtonStates();
  }

  useDefaultCanvasCapture(enable: boolean = true) {
    this.defaultCanvasCaptureEnabled = enable;
    this.updateButtonStates();
  }

  getApi(): SandboxExportsApi {
    return {
      registerImageCapture: (handler) => this.registerImageCapture(handler),
      registerVideoCapture: (handler) => this.registerVideoCapture(handler),
      setFilename: (filename) => this.setFilename(filename),
      setVisible: (visible) => this.setVisible(visible),
      useDefaultCanvasCapture: (enable?: boolean) => this.useDefaultCanvasCapture(enable),
      destroy: () => this.destroy(),
    };
  }

  destroy() {
    if (this.statusTimeout) {
      window.clearTimeout(this.statusTimeout);
      this.statusTimeout = null;
    }

    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }

    this.root = null;
    this.imageButton = null;
    this.videoButton = null;
    this.statusLabel = null;
    this.recorder = null;
    this.recording = false;
    this.recordedChunks = [];
  }
}
