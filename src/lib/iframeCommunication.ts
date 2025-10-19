'use client'
// Types for iframe communication

import {AddEventListenerOptions} from "undici-types/patch";

const windowObj = typeof window === 'undefined' ? {

addEventListener: () => {

},
} : window

export interface IframeMessage {
  type: 'parameterChange' | 'ready' | 'error' | 'log';
  data?: any;
  parameter?: string;
  value?: any;
}

export interface ParameterChangeMessage extends IframeMessage {
  type: 'parameterChange';
  parameter: string;
  value: any;
}

export interface ReadyMessage extends IframeMessage {
  type: 'ready';
  data: {
    parameters: Record<string, any>;
    controlDefinitions?: Record<string, any>;
  };
}

export interface ErrorMessage extends IframeMessage {
  type: 'error';
  data: {
    message: string;
    stack?: string;
  };
}

export interface LogMessage extends IframeMessage {
  type: 'log';
  data: {
    level: 'log' | 'warn' | 'error' | 'info';
    message: string;
  };
}

// Message handler type
export type MessageHandler = (message: IframeMessage) => void;

// Iframe communication manager
export class IframeCommunication {
  private iframe: HTMLIFrameElement | null = null;
  private messageHandlers: MessageHandler[] = [];
  private isReady = false;
  private sandpackOrigin: string | null = null;
  private lastReadyMessage: any = null;
  private messageCache = new Set<string>();

  constructor() {
    this.setupMessageListener();
  }

  // Set the iframe reference
  setIframe(iframe: HTMLIFrameElement) {
    // Prevent setting the same iframe multiple times
    if (this.iframe === iframe) {
      return;
    }
    
    this.iframe = iframe;
    
    // Extract origin from iframe src if available
    if (iframe.src) {
      try {
        const url = new URL(iframe.src);
        this.sandpackOrigin = url.origin;
        console.log('Sandpack origin detected:', this.sandpackOrigin);
      } catch (error) {
        console.log('Could not extract origin from iframe src:', error);
        // Set default Sandpack origin for fallback
        this.sandpackOrigin = 'https://preview.sandpack-static-server.codesandbox.io';
      }
    } else {
      console.log('Iframe src not available yet, using default Sandpack origin');
      // Set default Sandpack origin for fallback
      this.sandpackOrigin = 'https://preview.sandpack-static-server.codesandbox.io';
    }
  }

  // Add message handler
  addMessageHandler(handler: MessageHandler) {
    this.messageHandlers.push(handler);
  }

  // Remove message handler
  removeMessageHandler(handler: MessageHandler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  // Send message to iframe
  sendMessage(message: IframeMessage) {
    if (this.iframe && this.iframe.contentWindow) {
      if (this.sandpackOrigin) {
        this.iframe.contentWindow.postMessage(message, this.sandpackOrigin);
      } else {
        // Fallback: try with wildcard origin
        console.log('Sending message with wildcard origin as fallback');
        this.iframe.contentWindow.postMessage(message, '*');
      }
    }
  }

  // Send parameter change to iframe
  sendParameterChange(parameter: string, value: any) {
    this.sendMessage({
      type: 'parameterChange',
      parameter,
      value
    });
  }

  // Setup message listener for incoming messages
  private setupMessageListener() {


      windowObj.addEventListener('message', (event) => {
      // Allow messages from Sandpack origin and localhost
      const allowedOrigins = [
          windowObj.location.origin,
        'https://2718a0e15ae4f00-preview.sandpack-static-server.codesandbox.io',
        'https://preview.sandpack-static-server.codesandbox.io',
        'http://localhost:3000',
        'http://localhost:3030',
        'https://localhost:3000',
        'https://localhost:3030'
      ];
      
      // Also allow messages from any sandpack domain
      const isSandpackOrigin = event.origin.includes('sandpack') || event.origin.includes('codesandbox');
      
      if (!allowedOrigins.includes(event.origin) && !isSandpackOrigin) {
        console.log('Message from disallowed origin:', event.origin);
        return;
      }

      const message = event.data as any; // Use any to handle different message types
      
      // Filter out irrelevant messages to reduce console spam
      if (message.type === 'console' || message.target === 'metamask-inpage' || message.wappalyzer) {
        return; // Skip console, metamask, and wappalyzer messages
      }
      
      // Create a unique key for message deduplication
      const messageKey = `${message.type}_${message.timestamp || Date.now()}_${JSON.stringify(message.data || {})}`;
      
      // Skip duplicate messages
      if (this.messageCache.has(messageKey)) {
        return;
      }
      
      // Add to cache (limit cache size to prevent memory leaks)
      this.messageCache.add(messageKey);
      if (this.messageCache.size > 100) {
        const firstKey = this.messageCache.values().next().value;
        this.messageCache.delete(firstKey);
      }
      
      console.log('Received message from iframe:', message, 'Origin:', event.origin);
      
      // Handle ready message with deduplication
      if (message.type === 'ready') {
        // Check if this is a duplicate ready message
        if (this.lastReadyMessage && 
            this.lastReadyMessage.timestamp && 
            message.timestamp && 
            Math.abs(message.timestamp - this.lastReadyMessage.timestamp) < 1000) {
          console.log('Duplicate ready message detected, skipping');
          return;
        }
        
        this.lastReadyMessage = message;
        this.isReady = true;
      }

      // Notify all handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    });
  }

  // Check if iframe is ready
  get ready() {
    return this.isReady;
  }

  // Reset state (useful when files change)
  reset() {
    this.isReady = false;
    this.lastReadyMessage = null;
    this.messageCache.clear();
  }

  // Wait for iframe to be ready
  waitForReady(timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isReady) {
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve(false);
      }, timeout);

      const handler: MessageHandler = (message) => {
        if (message.type === 'ready') {
          clearTimeout(timeoutId);
          this.removeMessageHandler(handler);
          resolve(true);
        }
      };

      this.addMessageHandler(handler);
    });
  }
}

// Global instance
// export const iframeCommunication = new IframeCommunication();
