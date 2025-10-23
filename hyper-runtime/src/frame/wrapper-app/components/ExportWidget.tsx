import { useState, useEffect, useRef, useCallback } from 'react';

interface ExportWidgetProps {
  getContainer: () => HTMLElement | null;
  filename?: string;
  useCanvasCapture?: boolean;
  onImageEnabledChange: (enabled: boolean) => void;
  onVideoEnabledChange: (enabled: boolean) => void;
  onRecordingChange: (recording: boolean) => void;
}

/**
 * ExportWidget - Export controls UI and logic component
 * 
 * This component manages:
 * - UI: Screenshot, recording, and download buttons
 * - Logic: Capturing PNG images, recording videos, downloading files
 * - State: Canvas availability detection and all capture/recording state
 */
export const ExportWidget: React.FC<ExportWidgetProps> = ({
  getContainer,
  filename = 'hyperframe-export',
  useCanvasCapture = true,
  onImageEnabledChange,
  onVideoEnabledChange,
  onRecordingChange,
}) => {
  const [imageEnabled, setImageEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Update button states based on container availability
  useEffect(() => {
    const checkAvailability = () => {
      const container = getContainer();
      if (container && useCanvasCapture) {
        const canvas = container.querySelector('canvas');
        if (canvas) {
          setImageEnabled(true);
          setVideoEnabled(true);
          return true;
        }
      }
      return false;
    };

    if (checkAvailability()) {
      return;
    }

    const interval = setInterval(() => {
      if (checkAvailability()) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [getContainer, useCanvasCapture]);

  // Notify parent when states change
  useEffect(() => {
    onImageEnabledChange(imageEnabled);
  }, [imageEnabled, onImageEnabledChange]);

  useEffect(() => {
    onVideoEnabledChange(videoEnabled);
  }, [videoEnabled, onVideoEnabledChange]);

  useEffect(() => {
    onRecordingChange(recording);
  }, [recording, onRecordingChange]);

  const downloadBlob = useCallback((blob: Blob, filename: string) => {
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
  }, []);


  const handleCapturePNG = useCallback(async () => {
    try {
      const container = getContainer();
      if (!container) {
        throw new Error('Container not available.');
      }

      const canvas = container.querySelector('canvas');
      if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('No canvas element available for capture.');
      }

      const blob = await new Promise<Blob | null>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas capture returned an empty blob.'));
          }
        });
      });

      if (blob) {
        downloadBlob(blob, `${filename}.png`);
        console.log('PNG captured');
      }
    } catch (error) {
      console.error('[ExportWidget] Failed to capture image:', error);
    }
  }, [getContainer, filename, downloadBlob]);

  const stopRecording = useCallback(() => {
    if (!recorderRef.current) {
      console.warn('[ExportWidget] No active recorder to stop');
      return;
    }

    console.log('Stopping recording');
    recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const container = getContainer();
      if (!container) {
        throw new Error('Container not available.');
      }

      const canvas = container.querySelector('canvas');
      if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('No canvas element available for recording.');
      }

      if (typeof canvas.captureStream !== 'function') {
        throw new Error('Canvas captureStream API is not supported in this browser.');
      }

      const stream = canvas.captureStream(60);

      const formats = [
        { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
        { mimeType: 'video/mp4;codecs=h264', extension: 'mp4' },
        { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
        { mimeType: 'video/mp4', extension: 'mp4' },
        { mimeType: 'video/webm;codecs=h264', extension: 'webm' },
        { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
        { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
        { mimeType: 'video/webm', extension: 'webm' },
      ];

      let format = formats.find(f => MediaRecorder.isTypeSupported(f.mimeType));

      if (!format) {
        format = { mimeType: '', extension: 'webm' };
      }

      console.log('[ExportWidget] Using video format:', format.mimeType || 'browser default');

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 5_000_000,
      };

      if (format.mimeType) {
        recorderOptions.mimeType = format.mimeType;
      }

      const recorder = new MediaRecorder(stream, recorderOptions);
      const chunks: Blob[] = [];
      recordedChunksRef.current = chunks;

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener('stop', () => {
        const mimeType = format.mimeType || recorder.mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: mimeType });

        console.log('[ExportWidget] Recording complete:', {
          size: blob.size,
          type: blob.type,
          chunks: chunks.length,
        });

        downloadBlob(blob, `${filename}.${format.extension}`);
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        recorderRef.current = null;
        recordedChunksRef.current = [];
      });

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('[ExportWidget] Failed to start recording:', error);
      setRecording(false);
      recorderRef.current = null;
    }
  }, [getContainer, filename, downloadBlob]);

  const handleToggleRecording = useCallback(async () => {
    if (recording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [recording, stopRecording, startRecording]);

  // Handle download directly by sending message to parent
  const handleDownload = useCallback(() => {
    window.parent.postMessage({
      type: 'HYPERTOOL_DOWNLOAD_CODE',
      source: 'hypertool-iframe'
    }, '*');
  }, []);

  return (
    <div className="export-widget-container absolute top-0 left-0 py-2 px-2 z-[9999]">
      <div className="flex items-center gap-4">
        {/* Export buttons */}
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-sm text-text transition hover:bg-muted/80 whitespace-nowrap ${
            !imageEnabled ? 'opacity-60 cursor-not-allowed' : ''
          }`}
          onClick={handleCapturePNG}
          disabled={!imageEnabled}
          title="Screenshot"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
            <circle cx="12" cy="13" r="3"></circle>
          </svg>
          <span>Screenshot</span>
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-lg border transition hover:bg-muted/80 whitespace-nowrap px-2 py-1 text-sm ${
            recording
              ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : 'bg-background text-text border-border'
          } ${!videoEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={handleToggleRecording}
          disabled={!videoEnabled}
          title={recording ? 'Stop Recording' : 'Record Video'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m22 8-6 4 6 4V8Z"></path>
            <rect x="2" y="6" width="14" height="12" rx="2" ry="2"></rect>
          </svg>
          <span>{recording ? 'Stop' : 'Rec'}</span>
        </button>

        {/* Download Code Button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1 text-sm text-text transition hover:bg-muted/80 whitespace-nowrap"
          onClick={handleDownload}
          title="Download Code"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>Code</span>
        </button>
      </div>
    </div>
  );
};

