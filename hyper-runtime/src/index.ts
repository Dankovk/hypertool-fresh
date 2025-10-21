export * as controls from "./controls/index";
export * as frame from "./frame/index";

export {
  HypertoolControls,
  createControlPanel,
  createControls,
  injectThemeVariables,
  studioTheme,
} from "./controls/index";

export type {
  ControlDefinitions,
  ControlDefinition,
  NumberControlDefinition,
  ColorControlDefinition,
  BooleanControlDefinition,
  StringControlDefinition,
  SelectControlDefinition,
  HypertoolControlsOptions,
  ControlPosition,
  ParameterValues,
  ControlChangeContext,
} from "./controls/types";

export {
  mountP5Sketch,
  runP5Sketch,
  startP5Sketch,
  mountThreeSketch,
  runThreeSketch,
  startThreeSketch,
} from "./frame/index";

export type {
  P5Instance,
  P5Handler,
  P5HandlerMap,
  MountOptions,
  MountResult,
  ControlType,
  BaseControlDefinition,
  NumberControlDefinition as FrameNumberControlDefinition,
  ColorControlDefinition as FrameColorControlDefinition,
  BooleanControlDefinition as FrameBooleanControlDefinition,
  StringControlDefinition as FrameStringControlDefinition,
  SelectControlDefinition as FrameSelectControlDefinition,
  ControlDefinition as FrameControlDefinition,
  ControlDefinitions as FrameControlDefinitions,
  ControlChangePayload,
  P5SketchContext,
  P5SketchHandler,
  P5SketchHandlers,
  ControlPanelOptions,
  RunP5SketchOptions,
  RunP5SketchResult,
  StartP5SketchOptions,
  ThreeInstance,
  ThreeContext,
  ThreeSketchContext,
  ThreeSketchHandler,
  ThreeLifecycleHandlers,
  MountThreeOptions,
  MountThreeResult,
  RunThreeSketchOptions,
  RunThreeSketchResult,
  StartThreeSketchOptions,
} from "./frame/index";
