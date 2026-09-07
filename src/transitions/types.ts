/**
 * FreeCut Transition Engine - Data Models & Types
 * Defines type-safe transition schemas, parameters, and render descriptors.
 */

export type TransitionType =
  | 'cut'
  | 'fade'
  | 'crossDissolve'
  | 'dipToBlack'
  | 'dipToWhite'
  | 'slideLeft'
  | 'slideRight'
  | 'slideUp'
  | 'slideDown'
  | 'pushLeft'
  | 'pushRight'
  | 'pushUp'
  | 'pushDown'
  | 'zoomIn'
  | 'zoomOut'
  | 'blur'
  | 'flash'
  | 'spin';

export interface TransitionParameters {
  softness?: number; // 0 to 1
  direction?: 'left' | 'right' | 'up' | 'down';
  intensity?: number; // 0 to 1
  color?: string; // Hex color for dip / flash
  blurAmount?: number; // 0 to 100
  zoomAmount?: number; // 1 to 5
  [key: string]: unknown;
}

export type TransitionEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export interface TransitionItem {
  id: string;
  type: TransitionType;
  duration: number; // Duration in seconds (snapped to frame boundaries)
  fromClipId: string;
  toClipId: string;
  trackId: string;
  parameters?: TransitionParameters;
  easing?: TransitionEasing;
  enabled: boolean;
}

export interface TransitionRenderContext {
  fromCanvas: HTMLCanvasElement | null;
  toCanvas: HTMLCanvasElement | null;
  progress: number; // 0.0 to 1.0
  width: number;
  height: number;
  parameters?: TransitionParameters;
}

export type TransitionPreviewRenderer = (
  ctx: CanvasRenderingContext2D,
  context: TransitionRenderContext
) => void;

export type TransitionFFmpegCompiler = (
  fromStream: string,
  toStream: string,
  outStream: string,
  offset: number,
  duration: number,
  params?: TransitionParameters
) => string;

export interface TransitionDescriptor {
  type: TransitionType;
  name: string;
  description: string;
  defaultDuration: number;
  defaultParameters: TransitionParameters;
  renderPreview: TransitionPreviewRenderer;
  compileFFmpeg: TransitionFFmpegCompiler;
}
