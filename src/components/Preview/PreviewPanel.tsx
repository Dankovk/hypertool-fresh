import { IconDownload } from "@tabler/icons-react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import { config } from "@/config";
import { useRef, useState } from "react";
import type { ControlDefinitions } from "@/components/ControlPanel/ControlGenerator";

interface PreviewPanelProps {
  files: Record<string, string>;
  onDownload: () => void;
  onParameterChange?: (key: string, value: any) => void;
}

export function PreviewPanel({ files, onDownload, onParameterChange }: PreviewPanelProps) {
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [controlDefinitions, setControlDefinitions] = useState<ControlDefinitions>({});
  const previewRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromIframe = useRef(false);

  // Handle messages from iframe
  // useEffect(() => {
  //   const handleMessage = (message: IframeMessage) => {
  //     // Only log important messages to reduce console spam
  //     if (message.type === 'ready' || message.type === 'parameterChange' || message.type === 'error') {
  //       console.log('Received message from iframe:', message);
  //     }
  //
  //     switch (message.type) {
  //       case 'ready':
  //         setIsIframeReady(true);
  //         if (message.data?.controlDefinitions) {
  //           setControlDefinitions(message.data.controlDefinitions);
  //           console.log('Received control definitions:', message.data.controlDefinitions);
  //         }
  //         break;
  //
  //       case 'parameterChange':
  //         if (message.parameter && message.value !== undefined) {
  //           // Set flag to prevent sending message back
  //           isUpdatingFromIframe.current = true;
  //
  //           // Notify parent component about parameter change
  //           if (onParameterChange) {
  //             onParameterChange(message.parameter, message.value);
  //           }
  //
  //           // Reset flag after a short delay
  //           setTimeout(() => {
  //             isUpdatingFromIframe.current = false;
  //           }, 100);
  //         }
  //         break;
  //
  //       case 'error':
  //         console.error('Error from iframe:', message.data);
  //         break;
  //
  //       case 'log':
  //         console.log(`[Iframe ${message.data?.level}]:`, message.data?.message);
  //         break;
  //     }
  //   };
  //
  //   iframeCommunication.addMessageHandler(handleMessage);
  //
  //   return () => {
  //     iframeCommunication.removeMessageHandler(handleMessage);
  //   };
  // }, [onParameterChange]);useEffect(() => {
  //   const handleMessage = (message: IframeMessage) => {
  //     // Only log important messages to reduce console spam
  //     if (message.type === 'ready' || message.type === 'parameterChange' || message.type === 'error') {
  //       console.log('Received message from iframe:', message);
  //     }
  //
  //     switch (message.type) {
  //       case 'ready':
  //         setIsIframeReady(true);
  //         if (message.data?.controlDefinitions) {
  //           setControlDefinitions(message.data.controlDefinitions);
  //           console.log('Received control definitions:', message.data.controlDefinitions);
  //         }
  //         break;
  //
  //       case 'parameterChange':
  //         if (message.parameter && message.value !== undefined) {
  //           // Set flag to prevent sending message back
  //           isUpdatingFromIframe.current = true;
  //
  //           // Notify parent component about parameter change
  //           if (onParameterChange) {
  //             onParameterChange(message.parameter, message.value);
  //           }
  //
  //           // Reset flag after a short delay
  //           setTimeout(() => {
  //             isUpdatingFromIframe.current = false;
  //           }, 100);
  //         }
  //         break;
  //
  //       case 'error':
  //         console.error('Error from iframe:', message.data);
  //         break;
  //
  //       case 'log':
  //         console.log(`[Iframe ${message.data?.level}]:`, message.data?.message);
  //         break;
  //     }
  //   };
  //
  //   iframeCommunication.addMessageHandler(handleMessage);
  //
  //   return () => {
  //     iframeCommunication.removeMessageHandler(handleMessage);
  //   };
  // }, [onParameterChange]);

  // Set up iframe reference when Sandpack loads
  // useEffect(() => {
  //   // Reset iframe communication state when files change
  //   iframeCommunication.reset();
  //   setIsIframeReady(false);
  //   setControlDefinitions({});
  //
  //   let retryCount = 0;
  //   const maxRetries = 50; // 5 seconds max
  //   let isIframeSet = false; // Prevent multiple iframe settings
  //   let timeoutId: NodeJS.Timeout | null = null;
  //
  //   const checkForIframe = () => {
  //     if (isIframeSet) return; // Already set, don't retry
  //
  //     const iframe = previewRef.current?.querySelector('iframe');
  //     if (iframe) {
  //       // Check if iframe has a proper src (not just about:blank)
  //       if (iframe.src && iframe.src !== 'about:blank' && iframe.src.includes('sandpack')) {
  //         iframeCommunication.setIframe(iframe);
  //         console.log('Iframe reference set with src:', iframe.src);
  //         isIframeSet = true; // Mark as set
  //
  //         // Also listen for iframe load event with debounce
  //         let loadTimeout: NodeJS.Timeout | null = null;
  //         iframe.addEventListener('load', () => {
  //           if (loadTimeout) {
  //             clearTimeout(loadTimeout);
  //           }
  //           loadTimeout = setTimeout(() => {
  //             console.log('Iframe loaded, ready for communication');
  //           }, 100);
  //         });
  //         return; // Success, stop retrying
  //       } else {
  //         // Iframe exists but doesn't have proper src yet, retry
  //         if (retryCount % 10 === 0) { // Only log every 10th attempt to reduce spam
  //           console.log('Iframe found but src not ready yet:', iframe.src);
  //         }
  //       }
  //     }
  //
  //     // Retry logic
  //     retryCount++;
  //     if (retryCount < maxRetries) {
  //       timeoutId = setTimeout(checkForIframe, 100);
  //     } else {
  //       console.warn('Max retries reached for iframe detection');
  //     }
  //   };
  //
  //   checkForIframe();
  //
  //   // Cleanup timeout on unmount
  //   return () => {
  //     if (timeoutId) {
  //       clearTimeout(timeoutId);
  //     }
  //   };
  // }, [files]);

  // Send parameter changes to iframe (only when not updating from iframe)
  // const handleParameterChange = (key: string, value: any) => {
  //   if (isIframeReady && !isUpdatingFromIframe.current) {
  //     console.log(`Sending parameter change to iframe: ${key} = ${value}`);
  //     iframeCommunication.sendParameterChange(key, value);
  //   }
  // };

  if (!Object.keys(files).length) {
      return null;
  }

  return (
    <div className="flex h-full gap-4">
      {/* Main Preview Area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-brand">
        <div className="flex items-center justify-between border-b border-border bg-accent/5 px-5 py-4">
          <div className="text-lg font-semibold tracking-tight text-accent">
            Live Preview {isIframeReady && <span className="text-green-500">●</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary transition hover:bg-muted"
              onClick={onDownload}
            >
              <IconDownload size={18} /> Download
            </button>
          </div>
        </div>
        <div className="flex-1">
          <SandpackProvider

            theme={config.sandpack.theme}
            files={files}


            options={{
              recompileMode: "delayed",
                experimental_enableServiceWorker: true,
                // bundlerURL: "https://sandpack-bundler.codesandbox.io",
                recompileDelay: config.sandpack.recompileDelay,
            }}
            customSetup={{
                // entry: "index.html",
                environment: "parcel",


              dependencies: {
                "tweakpane": "4.0.5",

              },


            }}
          >
            <SandpackLayout className="sandpack-layout h-full w-full">
              <div ref={previewRef} className="sandpack-preview h-full w-full">
                <SandpackPreview showOpenInCodeSandbox={false} />
              </div>
            </SandpackLayout>
          </SandpackProvider>
        </div>
      </div>

      {/* Control Panel */}
      {/*  <ControlPanel*/}
      {/*    files={files}*/}
      {/*    onParameterChange={handleParameterChange}*/}
      {/*    isIframeReady={isIframeReady}*/}
      {/*    controlDefinitions={controlDefinitions}*/}
      {/*  />*/}
    </div>
  );
}
