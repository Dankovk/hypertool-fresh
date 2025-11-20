import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';

interface CanvasContextValue {
  // Canvas dimensions (actual render size the user wants)
  canvasWidth: number;
  canvasHeight: number;
  
  // Maximum constraints based on viewport
  maxCanvasWidth: number;
  maxCanvasHeight: number;
  
  // Scale factor (how much the canvas is scaled to fit viewport if too large)
  scale: number;
  
  isFittedToScreen: boolean;
  
  // Recording state
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  
  // Canvas size setters
  setCanvasWidth: (width: number) => void;
  setCanvasHeight: (height: number) => void;
  setCanvasSize: (width: number, height: number) => void;
  
  // Set aspect ratio and maximize to container
  setAspectRatio: (aspectWidth: number, aspectHeight: number) => void;
  
  // Sync with actual canvas element dimensions
  syncWithCanvas: (canvasElement: HTMLCanvasElement) => void;
  
  fitToScreen: () => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

interface CanvasProviderProps {
  children: ReactNode;
}

// Calculate available viewport space
const calculateAvailableSpace = () => {
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight;
  
  return {
    width: Math.max(100, Math.round(availableWidth)),
    height: Math.max(100, Math.round(availableHeight))
  };
};

/**
 * CanvasProvider - Manages canvas/container sizing state with scaling support
 * 
 * Features:
 * - Canvas size: The actual render dimensions (can be larger than viewport)
 * - Auto-scaling: Canvas is scaled down to fit viewport if too large
 * - Display container matches the scaled canvas size
 */
export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const initialDimensions = useMemo(() => {
    const space = calculateAvailableSpace();
    const dpr = window.devicePixelRatio || 1;
    const maxWidth = Math.round(space.width * dpr);
    const maxHeight = Math.round(space.height * dpr);
    return {
      canvasWidth: Math.max(100, Math.round(maxWidth * 0.9)),
      canvasHeight: Math.max(100, Math.round(maxHeight * 0.9)),
      maxWidth,
      maxHeight,
    };
  }, []);
  
  // Canvas dimensions (actual render size)
  const [canvasWidth, setCanvasWidthState] = useState(initialDimensions.canvasWidth);
  const [canvasHeight, setCanvasHeightState] = useState(initialDimensions.canvasHeight);
  
  // Maximum constraints based on viewport
  const [maxCanvasWidth, setMaxCanvasWidth] = useState(initialDimensions.maxWidth);
  const [maxCanvasHeight, setMaxCanvasHeight] = useState(initialDimensions.maxHeight);
  
  const [isFittedToScreen, setIsFittedToScreen] = useState(false);
  
  // Recording state - blocks canvas resizing when true
  const [isRecording, setIsRecording] = useState(false);
  
  // Track aspect ratio to maintain it on resize (null = free form)
  const [aspectRatio, setAspectRatioState] = useState<number | null>(null);
  
  // Remember previous state before fitting to screen
  const [previousState, setPreviousState] = useState<{ width: number; height: number } | null>(null);

  // Calculate scale factor - scale down if canvas is larger than viewport
  const scale = useMemo(() => {
    const dpr = window.devicePixelRatio || 1;
    const displayCanvasWidth = canvasWidth / dpr;
    const displayCanvasHeight = canvasHeight / dpr;

    if (displayCanvasWidth === 0 || displayCanvasHeight === 0) {
      return 1;
    }

    const availableWidth = maxCanvasWidth / dpr;
    const availableHeight = maxCanvasHeight / dpr;

    const scaleX = availableWidth / displayCanvasWidth;
    const scaleY = availableHeight / displayCanvasHeight;
    return Math.min(scaleX, scaleY, 1); // Never scale up, only down
  }, [canvasWidth, canvasHeight, maxCanvasWidth, maxCanvasHeight]);

  // Handle window resize - update max constraints
  useEffect(() => {
    const handleResize = () => {
      const space = calculateAvailableSpace();
      const dpr = window.devicePixelRatio || 1;
      const newMaxWidth = Math.round(space.width * dpr);
      const newMaxHeight = Math.round(space.height * dpr);
      
      setMaxCanvasWidth(newMaxWidth);
      setMaxCanvasHeight(newMaxHeight);
      
      // If fitted to screen, update canvas dimensions
      if (isFittedToScreen) {
        setCanvasWidthState(newMaxWidth);
        setCanvasHeightState(newMaxHeight);
      }
      // If aspect ratio is set, recalculate dimensions to maintain ratio
      else if (aspectRatio !== null) {
        let newWidth: number;
        let newHeight: number;
        
        if (newMaxWidth / newMaxHeight > aspectRatio) {
          // Container is wider than aspect ratio - constrain by height
          newHeight = newMaxHeight;
          newWidth = Math.round(newHeight * aspectRatio);
        } else {
          // Container is taller than aspect ratio - constrain by width
          newWidth = newMaxWidth;
          newHeight = Math.round(newWidth / aspectRatio);
        }
        
        setCanvasWidthState(newWidth);
        setCanvasHeightState(newHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFittedToScreen, aspectRatio]);

  const setCanvasWidth = useCallback((w: number) => {
    const clampedWidth = Math.max(100, Math.round(w)); // Round to integer
    setCanvasWidthState(clampedWidth);
    setIsFittedToScreen(false);
    setAspectRatioState(null); // Clear aspect ratio when manually setting dimensions
  }, []);

  const setCanvasHeight = useCallback((h: number) => {
    const clampedHeight = Math.max(100, Math.round(h)); // Round to integer
    setCanvasHeightState(clampedHeight);
    setIsFittedToScreen(false);
    setAspectRatioState(null); // Clear aspect ratio when manually setting dimensions
  }, []);

  const setCanvasSize = useCallback((w: number, h: number) => {
    const clampedWidth = Math.max(100, Math.round(w)); // Round to integer
    const clampedHeight = Math.max(100, Math.round(h)); // Round to integer
    setCanvasWidthState(clampedWidth);
    setCanvasHeightState(clampedHeight);
    setIsFittedToScreen(false);
    setAspectRatioState(null); // Clear aspect ratio when manually setting dimensions
  }, []);

  const setAspectRatio = useCallback((aspectWidth: number, aspectHeight: number) => {
    const space = calculateAvailableSpace();
    const dpr = window.devicePixelRatio || 1;
    
    // Calculate maximum size that fits in viewport with given aspect ratio
    const ratio = aspectWidth / aspectHeight;
    const maxWidth = Math.round(space.width * dpr);
    const maxHeight = Math.round(space.height * dpr);
    
    let newWidth: number;
    let newHeight: number;
    
    // Fit to container while maintaining aspect ratio
    if (maxWidth / maxHeight > ratio) {
      // Container is wider than aspect ratio - constrain by height
      newHeight = maxHeight;
      newWidth = Math.round(newHeight * ratio);
    } else {
      // Container is taller than aspect ratio - constrain by width
      newWidth = maxWidth;
      newHeight = Math.round(newWidth / ratio);
    }
    
    setCanvasWidthState(newWidth);
    setCanvasHeightState(newHeight);
    setAspectRatioState(ratio); // Store ratio for window resize
    setIsFittedToScreen(false);
  }, []);

  const syncWithCanvas = useCallback((canvasElement: HTMLCanvasElement) => {
    // Read actual canvas dimensions (including devicePixelRatio)
    const actualWidth = canvasElement.width;
    const actualHeight = canvasElement.height;
    
    if (actualWidth > 0 && actualHeight > 0) {
      console.log('[CanvasContext] Syncing with actual canvas:', { 
        actual: { width: actualWidth, height: actualHeight },
        current: { width: canvasWidth, height: canvasHeight }
      });
      
      setCanvasWidthState(actualWidth);
      setCanvasHeightState(actualHeight);
      setIsFittedToScreen(false);
      setAspectRatioState(null); // Clear aspect ratio when syncing
    }
  }, [canvasWidth, canvasHeight]);

  const fitToScreen = useCallback(() => {
    if (isFittedToScreen && previousState) {
      // Toggle back to previous state
      setCanvasWidthState(previousState.width);
      setCanvasHeightState(previousState.height);
      setIsFittedToScreen(false);
      setPreviousState(null);
    } else {
      // Save current state and fit to screen
      setPreviousState({ width: canvasWidth, height: canvasHeight });
      const space = calculateAvailableSpace();
      const dpr = window.devicePixelRatio || 1;
      const newWidth = Math.round(space.width * dpr);
      const newHeight = Math.round(space.height * dpr);
      setCanvasWidthState(newWidth);
      setCanvasHeightState(newHeight);
      setAspectRatioState(null); // Clear aspect ratio when fitting to screen
      setIsFittedToScreen(true);
    }
  }, [isFittedToScreen, previousState, canvasWidth, canvasHeight]);

  const value: CanvasContextValue = {
    canvasWidth,
    canvasHeight,
    maxCanvasWidth,
    maxCanvasHeight,
    scale,
    isFittedToScreen,
    isRecording,
    setIsRecording,
    setCanvasWidth,
    setCanvasHeight,
    setCanvasSize,
    setAspectRatio,
    syncWithCanvas,
    fitToScreen,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
};

/**
 * useCanvas - Hook to access canvas context
 * 
 * @throws Error if used outside CanvasProvider
 */
export const useCanvas = (): CanvasContextValue => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};
