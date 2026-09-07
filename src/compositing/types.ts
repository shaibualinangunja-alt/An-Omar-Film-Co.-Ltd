/**
 * FreeCut Compositing Engine - Data Contracts & Types
 * Defines models for the deterministic render pipeline, Chroma Key, Masks,
 * Blend Modes, Crop, Flip, and Tracking Foundation.
 */

import { ClipAnimations } from '../animation/types';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'softLight'
  | 'hardLight'
  | 'darken'
  | 'lighten'
  | 'difference'
  | 'add';

export interface CropSettings {
  left: number;   // 0.0 to 1.0 (or px)
  right: number;  // 0.0 to 1.0
  top: number;    // 0.0 to 1.0
  bottom: number; // 0.0 to 1.0
}

export interface FlipSettings {
  horizontal: boolean;
  vertical: boolean;
}

export interface ChromaKeySettings {
  enabled: boolean;
  keyColor: string;          // Hex color e.g. '#00FF00'
  similarity: number;        // 0.01 to 1.0 (default ~0.25)
  smoothness: number;        // 0.0 to 1.0 (default ~0.10)
  spillSuppression: number;  // 0.0 to 1.0 (default ~0.50)
  edgeSoftness: number;      // 0 to 20 px
  invert: boolean;
}

export type MaskType = 'rectangle' | 'ellipse' | 'linear' | 'image';

export interface MaskItem {
  id: string;
  type: MaskType;
  enabled: boolean;
  inverted: boolean;
  positionX: number; // offset from center in px
  positionY: number;
  width: number;     // px
  height: number;    // px
  rotation: number;  // degrees
  feather: number;   // 0 to 100 px
  opacity: number;   // 0.0 to 1.0
  parameters?: Record<string, number | boolean | string>;
  animations?: ClipAnimations;
  imageUrl?: string;
  blendMode?: BlendMode;
}

export interface TrackingPoint {
  time: number; // clip-relative timestamp in seconds
  x: number;    // normalized 0..1 or pixel X coordinate
  y: number;    // normalized 0..1 or pixel Y coordinate
}

export interface TrackingData {
  id: string;
  clipId: string;
  trackerType: 'point' | 'object' | 'face';
  points: TrackingPoint[];
  startTime: number;
  endTime: number;
  confidence?: number;
}

export interface RenderContext {
  currentTime: number;
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
}

export const DEFAULT_CROP_SETTINGS: CropSettings = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

export const DEFAULT_FLIP_SETTINGS: FlipSettings = {
  horizontal: false,
  vertical: false,
};

export const DEFAULT_CHROMA_KEY_SETTINGS: ChromaKeySettings = {
  enabled: false,
  keyColor: '#00FF00',
  similarity: 0.25,
  smoothness: 0.10,
  spillSuppression: 0.50,
  edgeSoftness: 2,
  invert: false,
};

export function createDefaultMask(type: MaskType, width: number = 300, height: number = 200): MaskItem {
  return {
    id: `mask-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    enabled: true,
    inverted: false,
    positionX: 0,
    positionY: 0,
    width,
    height,
    rotation: 0,
    feather: 10,
    opacity: 1.0,
  };
}
