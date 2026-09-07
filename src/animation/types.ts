/**
 * FreeCut Animation Engine - Data Models
 * Supports non-destructive, clip-relative keyframe animation for video and audio properties.
 */

export type KeyframeInterpolation = 'linear' | 'hold';

export interface Keyframe<T = number> {
  id: string;
  time: number; // clip-relative seconds [0, clip.duration]
  value: T;
  interpolation: KeyframeInterpolation;
}

export type AnimatableProperty =
  | 'positionX'
  | 'positionY'
  | 'scale'
  | 'rotation'
  | 'opacity'
  | 'volume'
  | 'fontSize'
  | 'letterSpacing'
  | 'bgOpacity';

export interface AnimationTrack<T = number> {
  property: AnimatableProperty;
  keyframes: Keyframe<T>[];
}

export type ClipAnimations = Partial<Record<AnimatableProperty, AnimationTrack<number>>>;

export interface EvaluatedClipState {
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  opacity: number;
  volume: number;
  fontSize?: number;
  letterSpacing?: number;
  bgOpacity?: number;
}
