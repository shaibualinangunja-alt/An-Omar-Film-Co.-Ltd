/**
 * FreeCut Blend Mode Engine
 * Maps standard blend modes to HTML5 Canvas 2D operations and FFmpeg blend filter modes.
 */

import { BlendMode } from './types';

export interface BlendModeInfo {
  id: BlendMode;
  name: string;
  canvasOperation: GlobalCompositeOperation;
  ffmpegMode: string;
  description: string;
}

export const BLEND_MODES: Record<BlendMode, BlendModeInfo> = {
  normal: {
    id: 'normal',
    name: 'Normal',
    canvasOperation: 'source-over',
    ffmpegMode: 'normal',
    description: 'Standard alpha compositing over underlying media.',
  },
  multiply: {
    id: 'multiply',
    name: 'Multiply',
    canvasOperation: 'multiply',
    ffmpegMode: 'multiply',
    description: 'Multiplies luminance; darkens image, white is invisible.',
  },
  screen: {
    id: 'screen',
    name: 'Screen',
    canvasOperation: 'screen',
    ffmpegMode: 'screen',
    description: 'Inverts, multiplies, and inverts; lightens image, black is invisible.',
  },
  overlay: {
    id: 'overlay',
    name: 'Overlay',
    canvasOperation: 'overlay',
    ffmpegMode: 'overlay',
    description: 'Combines Multiply and Screen based on base layer brightness.',
  },
  softLight: {
    id: 'softLight',
    name: 'Soft Light',
    canvasOperation: 'soft-light',
    ffmpegMode: 'softlight',
    description: 'Subtle contrast boost similar to a diffused spotlight.',
  },
  hardLight: {
    id: 'hardLight',
    name: 'Hard Light',
    canvasOperation: 'hard-light',
    ffmpegMode: 'hardlight',
    description: 'Combines Multiply and Screen based on top layer brightness.',
  },
  darken: {
    id: 'darken',
    name: 'Darken',
    canvasOperation: 'darken',
    ffmpegMode: 'darken',
    description: 'Retains the darkest pixels of either layer.',
  },
  lighten: {
    id: 'lighten',
    name: 'Lighten',
    canvasOperation: 'lighten',
    ffmpegMode: 'lighten',
    description: 'Retains the brightest pixels of either layer.',
  },
  difference: {
    id: 'difference',
    name: 'Difference',
    canvasOperation: 'difference',
    ffmpegMode: 'difference',
    description: 'Subtracts pixel values from each other to highlight variance.',
  },
  add: {
    id: 'add',
    name: 'Add (Lighter)',
    canvasOperation: 'lighter',
    ffmpegMode: 'addition',
    description: 'Sums color values together; creates vivid glow and light blooms.',
  },
};

export function getBlendModeInfo(mode?: BlendMode): BlendModeInfo {
  return BLEND_MODES[mode || 'normal'] || BLEND_MODES.normal;
}

export function getCanvasCompositeOperation(mode?: BlendMode): GlobalCompositeOperation {
  return getBlendModeInfo(mode).canvasOperation;
}

export function getFFmpegBlendMode(mode?: BlendMode): string {
  return getBlendModeInfo(mode).ffmpegMode;
}

export function listBlendModes(): BlendModeInfo[] {
  return Object.values(BLEND_MODES);
}
