/**
 * FreeCut Text Animation Presets
 * Generates frame-accurate keyframe animations into the existing Alpha 0.4 animation engine.
 */

import { ClipAnimations } from '../animation/types';
import { snapToFrame } from '../utils/timelineMath';
import { TextAnimationType } from './types';

export interface TextAnimationPresetDefinition {
  type: TextAnimationType;
  name: string;
  category: 'entrance' | 'exit';
  defaultDuration: number;
}

export const TEXT_ANIMATION_PRESETS: TextAnimationPresetDefinition[] = [
  { type: 'none', name: 'None (Static)', category: 'entrance', defaultDuration: 0 },
  // Entrance Presets
  { type: 'fadeIn', name: 'Fade In', category: 'entrance', defaultDuration: 0.5 },
  { type: 'slideUp', name: 'Slide Up', category: 'entrance', defaultDuration: 0.5 },
  { type: 'slideDown', name: 'Slide Down', category: 'entrance', defaultDuration: 0.5 },
  { type: 'slideLeft', name: 'Slide Left', category: 'entrance', defaultDuration: 0.5 },
  { type: 'slideRight', name: 'Slide Right', category: 'entrance', defaultDuration: 0.5 },
  { type: 'zoomIn', name: 'Zoom In', category: 'entrance', defaultDuration: 0.5 },
  { type: 'pop', name: 'Pop', category: 'entrance', defaultDuration: 0.4 },
  // Exit Presets
  { type: 'fadeOut', name: 'Fade Out', category: 'exit', defaultDuration: 0.5 },
  { type: 'zoomOut', name: 'Zoom Out', category: 'exit', defaultDuration: 0.5 },
];

/**
 * Builds keyframe animation tracks for a text clip based on a preset.
 * Modifies existing animation tracks or returns clean animation tracks.
 */
export function applyAnimationPresetToClip(
  existingAnimations: ClipAnimations | undefined,
  presetType: TextAnimationType,
  clipDuration: number,
  presetDuration: number = 0.5,
  fps: number = 30
): ClipAnimations {
  const safeDuration = snapToFrame(Math.min(presetDuration, clipDuration * 0.8), fps);
  const animations: ClipAnimations = { ...(existingAnimations || {}) };

  if (presetType === 'none') {
    // Clear preset-driven tracks while keeping custom tracks if needed
    delete animations.opacity;
    delete animations.positionX;
    delete animations.positionY;
    delete animations.scale;
    return animations;
  }

  const d = Math.max(1 / fps, safeDuration);

  switch (presetType) {
    case 'fadeIn': {
      animations.opacity = {
        property: 'opacity',
        keyframes: [
          { id: 'kf_fi_0', time: 0, value: 0, interpolation: 'linear' },
          { id: 'kf_fi_1', time: d, value: 1, interpolation: 'linear' },
        ],
      };
      break;
    }

    case 'slideUp': {
      animations.positionY = {
        property: 'positionY',
        keyframes: [
          { id: 'kf_su_0', time: 0, value: 120, interpolation: 'linear' },
          { id: 'kf_su_1', time: d, value: 0, interpolation: 'linear' },
        ],
      };
      animations.opacity = {
        property: 'opacity',
        keyframes: [
          { id: 'kf_su_o0', time: 0, value: 0, interpolation: 'linear' },
          { id: 'kf_su_o1', time: d, value: 1, interpolation: 'linear' },
        ],
      };
      break;
    }

    case 'slideDown': {
      animations.positionY = {
        property: 'positionY',
        keyframes: [
          { id: 'kf_sd_0', time: 0, value: -120, interpolation: 'linear' },
          { id: 'kf_sd_1', time: d, value: 0, interpolation: 'linear' },
        ],
      };
      animations.opacity = {
        property: 'opacity',
        keyframes: [
          { id: 'kf_sd_o0', time: 0, value: 0, interpolation: 'linear' },
          { id: 'kf_sd_o1', time: d, value: 1, interpolation: 'linear' },
        ],
      };
      break;
    }

    case 'slideLeft': {
      animations.positionX = {
        property: 'positionX',
        keyframes: [
          { id: 'kf_sl_0', time: 0, value: 200, interpolation: 'linear' },
          { id: 'kf_sl_1', time: d, value: 0, interpolation: 'linear' },
        ],
      };
      animations.opacity = {
        property: 'opacity',
        keyframes: [
          { id: 'kf_sl_o0', time: 0, value: 0, interpolation: 'linear' },
          { id: 'kf_sl_o1', time: d, value: 1, interpolation: 'linear' },
        ],
      };
      break;
    }

    case 'slideRight': {
      animations.positionX = {
        property: 'positionX',
        keyframes: [
          { id: 'kf_sr_0', time: 0, value: -200, interpolation: 'linear' },
          { id: 'kf_sr_1', time: d, value: 0, interpolation: 'linear' },
        ],
      };
      animations.opacity = {
        property: 'opacity',
        keyframes: [
          { id: 'kf_sr_o0', time: 0, value: 0, interpolation: 'linear' },
          { id: 'kf_sr_o1', time: d, value: 1, interpolation: 'linear' },
        ],
      };
      break;
    }

    case 'zoomIn': {
      animations.scale = {
        property: 'scale',
        keyframes: [
          { id: 'kf_zi_0', time: 0, value: 0.2, interpolation: 'linear' },
          { id: 'kf_zi_1', time: d, value: 1.0, interpolation: 'linear' },
        ],
      };
      animations.opacity = {
        property: 'opacity',
        keyframes: [
          { id: 'kf_zi_o0', time: 0, value: 0, interpolation: 'linear' },
          { id: 'kf_zi_o1', time: d, value: 1, interpolation: 'linear' },
        ],
      };
      break;
    }

    case 'pop': {
      const halfD = snapToFrame(d * 0.6, fps);
      animations.scale = {
        property: 'scale',
        keyframes: [
          { id: 'kf_pop_0', time: 0, value: 0, interpolation: 'linear' },
          { id: 'kf_pop_1', time: halfD, value: 1.18, interpolation: 'linear' },
          { id: 'kf_pop_2', time: d, value: 1.0, interpolation: 'linear' },
        ],
      };
      animations.opacity = {
        property: 'opacity',
        keyframes: [
          { id: 'kf_pop_o0', time: 0, value: 0, interpolation: 'linear' },
          { id: 'kf_pop_o1', time: halfD, value: 1, interpolation: 'linear' },
        ],
      };
      break;
    }

    case 'fadeOut': {
      const exitStart = snapToFrame(Math.max(0, clipDuration - d), fps);
      animations.opacity = {
        property: 'opacity',
        keyframes: [
          { id: 'kf_fo_0', time: exitStart, value: 1, interpolation: 'linear' },
          { id: 'kf_fo_1', time: clipDuration, value: 0, interpolation: 'linear' },
        ],
      };
      break;
    }

    case 'zoomOut': {
      const exitStart = snapToFrame(Math.max(0, clipDuration - d), fps);
      animations.scale = {
        property: 'scale',
        keyframes: [
          { id: 'kf_zo_0', time: exitStart, value: 1.0, interpolation: 'linear' },
          { id: 'kf_zo_1', time: clipDuration, value: 0.1, interpolation: 'linear' },
        ],
      };
      animations.opacity = {
        property: 'opacity',
        keyframes: [
          { id: 'kf_zo_o0', time: exitStart, value: 1, interpolation: 'linear' },
          { id: 'kf_zo_o1', time: clipDuration, value: 0, interpolation: 'linear' },
        ],
      };
      break;
    }

    default:
      break;
  }

  return animations;
}

export const applyPresetToAnimations = applyAnimationPresetToClip;
export const ANIMATION_PRESETS = TEXT_ANIMATION_PRESETS;
