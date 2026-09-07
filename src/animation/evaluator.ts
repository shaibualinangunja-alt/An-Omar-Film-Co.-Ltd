/**
 * FreeCut Animation Evaluator
 * Centralized, pure, UI-independent evaluation engine for keyframe animation.
 */

import { ClipItem } from '../types/project';
import { AnimationTrack, EvaluatedClipState } from './types';

/**
 * Evaluates an individual animation track at a specific clip-relative time.
 * Supports 'linear' and 'hold' interpolation.
 * Clamps to first and last keyframe values outside keyframe bounds.
 */
export function evaluateAnimationTrack(
  track: AnimationTrack<number> | undefined,
  relativeTime: number,
  defaultValue: number
): number {
  if (!track || !track.keyframes || track.keyframes.length === 0) {
    return defaultValue;
  }

  const kfs = track.keyframes;

  // Single keyframe
  if (kfs.length === 1) {
    return kfs[0].value;
  }

  // Clamping before first keyframe
  if (relativeTime <= kfs[0].time) {
    return kfs[0].value;
  }

  // Clamping after last keyframe
  const lastKf = kfs[kfs.length - 1];
  if (relativeTime >= lastKf.time) {
    return lastKf.value;
  }

  // Binary search or linear scan for current interval: kfs[i].time <= relativeTime < kfs[i + 1].time
  let prev = kfs[0];
  let next = kfs[1];

  for (let i = 0; i < kfs.length - 1; i++) {
    if (relativeTime >= kfs[i].time && relativeTime <= kfs[i + 1].time) {
      prev = kfs[i];
      next = kfs[i + 1];
      break;
    }
  }

  // Hold interpolation
  if (prev.interpolation === 'hold') {
    return prev.value;
  }

  // Linear interpolation: a + (b - a) * progress
  const timeSpan = next.time - prev.time;
  if (timeSpan <= 0.00001) {
    return next.value;
  }

  const progress = (relativeTime - prev.time) / timeSpan;
  return prev.value + (next.value - prev.value) * progress;
}

/**
 * Evaluates all animatable properties for a given clip at relativeTime.
 * Merges keyframe evaluated values with clip's static transform and volume.
 */
export function evaluateClipAnimations(
  clip: ClipItem,
  relativeTime: number
): EvaluatedClipState {
  const animations = clip.animations;

  const defaultPosX = clip.transform?.positionX ?? 0;
  const defaultPosY = clip.transform?.positionY ?? 0;
  const defaultScale = clip.transform?.scale ?? 1;
  const defaultRotation = clip.transform?.rotation ?? 0;
  const defaultOpacity = clip.transform?.opacity ?? 1;
  const defaultVolume = clip.volume ?? 1;
  const defaultFontSize = clip.textConfig?.style?.fontSize ?? 48;
  const defaultLetterSpacing = clip.textConfig?.style?.letterSpacing ?? 0;
  const defaultBgOpacity = clip.textConfig?.style?.background?.opacity ?? 0.8;

  if (!animations) {
    const baseState: EvaluatedClipState = {
      positionX: defaultPosX,
      positionY: defaultPosY,
      scale: defaultScale,
      rotation: defaultRotation,
      opacity: defaultOpacity,
      volume: defaultVolume,
    };
    if (clip.textConfig) {
      baseState.fontSize = defaultFontSize;
      baseState.letterSpacing = defaultLetterSpacing;
      baseState.bgOpacity = defaultBgOpacity;
    }
    return baseState;
  }

  const evaluated: EvaluatedClipState = {
    positionX: evaluateAnimationTrack(animations.positionX, relativeTime, defaultPosX),
    positionY: evaluateAnimationTrack(animations.positionY, relativeTime, defaultPosY),
    scale: evaluateAnimationTrack(animations.scale, relativeTime, defaultScale),
    rotation: evaluateAnimationTrack(animations.rotation, relativeTime, defaultRotation),
    opacity: evaluateAnimationTrack(animations.opacity, relativeTime, defaultOpacity),
    volume: evaluateAnimationTrack(animations.volume, relativeTime, defaultVolume),
  };

  if (clip.textConfig) {
    evaluated.fontSize = evaluateAnimationTrack(animations.fontSize, relativeTime, defaultFontSize);
    evaluated.letterSpacing = evaluateAnimationTrack(animations.letterSpacing, relativeTime, defaultLetterSpacing);
    evaluated.bgOpacity = evaluateAnimationTrack(animations.bgOpacity, relativeTime, defaultBgOpacity);
  }

  return evaluated;
}
