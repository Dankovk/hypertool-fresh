import React, { useState, useEffect, useRef } from 'react';
import type { ExportWidgetProps } from '../types';
import '../styles/export-widget.css';

/**
 * ExportWidget - React component for capture/export functionality
 *
 * Provides buttons for capturing PNG images and recording videos
 * from the sandbox canvas element.
 */
export const ExportWidget: React.FC<ExportWidgetProps> = ({
  getContainer,
  position = 'top-left',
  filename = 'hyperframe-export',
  useCanvasCapture = true,
}) => {
  const [imageEnabled, setImageEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState<'default' | 'error' | 'success'>('default');
  const statusTimeoutRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // Update button states based on container availability
  useEffect(() => {
    // Check periodically if container and canvas are available
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

    // Initial check
    if (checkAvailability()) {
      return;
    }

    // If not available yet, poll for it
    const interval = setInterval(() => {
      if (checkAvailability()) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [getContainer, useCanvasCapture]);

  const showStatus = (message: string, tone: 'default' | 'error' | 'success' = 'default') => {
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }

    setStatus(message);
    setStatusTone(tone);

    if (message) {
      statusTimeoutRef.current = window.setTimeout(() => {
        setStatus('');
        setStatusTone('default');
        statusTimeoutRef.current = null;
      }, 4000);
    }
  };

  const handleImageCapture = async () => {
    try {
      // Find canvas in container
      const container = getContainer();
      if (!container) {
        throw new Error('Container not available.');
      }

      const canvas = container.querySelector('canvas');
      if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error('No canvas element available for capture.');
      }

      // Capture image
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
        showStatus('PNG exported', 'success');
      }
    } catch (error) {
      console.error('[ExportWidget] Failed to capture image:', error);
      showStatus((error as Error).message || 'Failed to capture image', 'error');
    }
  };

  const handleToggleRecording = async () => {
    if (recording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      // Find canvas in container
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

      // Detect best video format - try MP4 first, fallback to WebM
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
        // Fallback: try without specifying mimeType (let browser choose)
        format = { mimeType: '', extension: 'webm' };
      }

      console.log('[ExportWidget] Using video format:', format.mimeType || 'browser default');

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 5_000_000, // 5 Mbps - good quality without being too large
      };

      // Only set mimeType if we have one (some browsers work better without it)
      if (format.mimeType) {
        recorderOptions.mimeType = format.mimeType;
      }

      const recorder = new MediaRecorder(stream, recorderOptions);

      const chunks: Blob[] = [];

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) {
          chunks.push(event.data);
        }
      });

      recorder.addEventListener('stop', () => {
        // Use the actual mimeType from the recorder if available
        const mimeType = format.mimeType || recorder.mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: mimeType });

        console.log('[ExportWidget] Recording complete:', {
          size: blob.size,
          type: blob.type,
          chunks: chunks.length,
        });

        downloadBlob(blob, `${filename}.${format.extension}`);
        showStatus('Recording saved', 'success');
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        recorderRef.current = null;
      });

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      showStatus('Recording in progress…');
    } catch (error) {
      console.error('[ExportWidget] Failed to start recording:', error);
      showStatus((error as Error).message || 'Failed to record video', 'error');
      setRecording(false);
      recorderRef.current = null;
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) {
      console.warn('[ExportWidget] No active recorder to stop');
      return;
    }

    showStatus('Finishing recording…');
    recorderRef.current.stop();
    // The 'stop' event handler will handle the rest (download, cleanup, etc.)
  };

  const downloadBlob = (blob: Blob, filename: string) => {
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
  };

  const positionStyles = {
    'top-left': { top: '1rem', left: '1rem' },
    'top-right': { top: '1rem', right: '1rem' },
    'bottom-left': { bottom: '1rem', left: '1rem' },
    'bottom-right': { bottom: '1rem', right: '1rem' },
  };

  return (
    <div
      className="hyper-frame-export-widget"
      style={{
        position: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        borderRadius: '0.75rem',
        color: '#f8fafc',
        fontSize: '12px',
        lineHeight: '16px',
        zIndex: 2147483646,
        pointerEvents: 'auto',
        ...positionStyles[position],
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleImageCapture}
          disabled={!imageEnabled}
          style={{
            flex: '1 1 auto',
            padding: '0.35rem 0.6rem',
            border: '0',
            borderRadius: '0.5rem',
            cursor: imageEnabled ? 'pointer' : 'not-allowed',
            background: 'rgba(94, 234, 212, 0.2)',
            color: '#5eead4',
            fontWeight: '600',
            opacity: imageEnabled ? '1' : '0.6',
          }}
        >
          Capture PNG
        </button>

        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={!videoEnabled}
          style={{
            flex: '1 1 auto',
            padding: '0.35rem 0.6rem',
            border: '0',
            borderRadius: '0.5rem',
            cursor: videoEnabled ? 'pointer' : 'not-allowed',
            background: recording ? 'rgba(248, 113, 113, 0.25)' : 'rgba(129, 140, 248, 0.2)',
            color: recording ? '#fecaca' : '#a5b4fc',
            fontWeight: '600',
            opacity: videoEnabled ? '1' : '0.6',
          }}
        >
          {recording ? 'Stop Recording' : 'Record Video'}
        </button>
      </div>

      {status && (
        <span
          style={{
            display: 'block',
            color: statusTone === 'error' ? '#fca5a5' : statusTone === 'success' ? '#bbf7d0' : '#e2e8f0',
            opacity: '0.8',
            minHeight: '16px',
          }}
        >
          {status}
        </span>
      )}
    </div>
  );
};
