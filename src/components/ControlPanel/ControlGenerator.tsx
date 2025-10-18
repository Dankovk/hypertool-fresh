"use client";

import { useEffect, useRef } from "react";

export interface ControlDefinition {
  type: 'color' | 'number' | 'boolean';
  label: string;
  value: any;
  min?: number;
  max?: number;
  step?: number;
}

export interface ControlDefinitions {
  [key: string]: ControlDefinition;
}

interface ControlGeneratorProps {
  controlDefinitions: ControlDefinitions;
  onParameterChange: (key: string, value: any) => void;
  isIframeReady: boolean;
}
