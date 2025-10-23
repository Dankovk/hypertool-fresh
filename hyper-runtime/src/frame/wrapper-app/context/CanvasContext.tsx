import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';

interface CanvasContextValue {
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
  isFittedToScreen: boolean;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  fitToScreen: () => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

interface CanvasProviderProps {
  children: ReactNode;
}

// Calculate available viewport space
const calculateAvailableSpace = () => {
  // Use full window size since widgets are absolutely positioned
  // and don't take up layout space
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight;
  
  return {
    width: Math.max(100, Math.round(availableWidth)),
    height: Math.max(100, Math.round(availableHeight))
  };
};

/**
 * CanvasProvider - Manages canvas/container sizing state
 * 
 * Provides context for:
 * - Canvas dimensions (width, height) - initially fills entire container
 * - Maximum constraints (maxWidth, maxHeight) - based on window size
 * - Fit to screen state - tracks if canvas is fitted to full container
 * - Methods to update dimensions
 */
export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  // Initialize with full available space (fills entire container)
  const initialSpace = useMemo(() => calculateAvailableSpace(), []);
  
  const [width, setWidthState] = useState(initialSpace.width);
  const [height, setHeightState] = useState(initialSpace.height);
  const [maxWidth, setMaxWidth] = useState(initialSpace.width);
  const [maxHeight, setMaxHeight] = useState(initialSpace.height);
  const [isFittedToScreen, setIsFittedToScreen] = useState(true); // Initially fitted

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const space = calculateAvailableSpace();
      setMaxWidth(space.width);
      setMaxHeight(space.height);

      // If fitted to screen, update dimensions
      if (isFittedToScreen) {
        setWidthState(space.width);
        setHeightState(space.height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFittedToScreen]);

  const setWidth = useCallback((w: number) => {
    const clampedWidth = Math.max(100, Math.min(w, maxWidth));
    setWidthState(clampedWidth);
    setIsFittedToScreen(false);
  }, [maxWidth]);

  const setHeight = useCallback((h: number) => {
    const clampedHeight = Math.max(100, Math.min(h, maxHeight));
    setHeightState(clampedHeight);
    setIsFittedToScreen(false);
  }, [maxHeight]);

  const fitToScreen = useCallback(() => {
    const space = calculateAvailableSpace();
    setWidthState(space.width);
    setHeightState(space.height);
    setIsFittedToScreen(true);
  }, []);

  const value: CanvasContextValue = {
    width,
    height,
    maxWidth,
    maxHeight,
    isFittedToScreen,
    setWidth,
    setHeight,
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
