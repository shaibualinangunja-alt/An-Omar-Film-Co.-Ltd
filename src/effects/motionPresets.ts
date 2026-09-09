/**
 * FreeCut Motion & Camera Animation Presets
 * Generates frame-accurate keyframe tracks for scale, positionX, and positionY.
 */

import { AnimatableProperty, Keyframe } from '../animation/types';
import { generateKeyframeId } from '../animation/animationUtils';

export type MotionPresetId =
  | 'slow_zoom_in'
  | 'slow_zoom_out'
  | 'fast_zoom_in'
  | 'fast_zoom_out'
  | 'pan_left_right'
  | 'pan_right_left'
  | 'pan_top_bottom'
  | 'pan_bottom_top'
  | 'cinematic_push_in'
  | 'cinematic_pull_out'
  | 'ken_burns'
  | 'slow_push_pan'
  | 'slow_pull_pan';

export interface MotionPresetDefinition {
  id: MotionPresetId;
  name: string;
  category: 'zoom' | 'pan' | 'cinematic';
  description: string;
  icon: string;
  defaultIntensity: number; // 0.1 to 2.0, default 1.0
  generateTracks: (
    clipDuration: number,
    intensity?: number
  ) => Partial<Record<AnimatableProperty, Keyframe<number>[]>>;
}

export const MOTION_PRESETS: MotionPresetDefinition[] = [
  // --- ZOOM PRESETS ---
  {
    id: 'slow_zoom_in',
    name: 'Slow Zoom In',
    category: 'zoom',
    description: 'Subtle, gentle zoom inward for dramatic focus.',
    icon: '🔍',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      const targetScale = 1.0 + 0.18 * intensity;
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: targetScale, interpolation: 'linear' },
        ],
        positionX: [
          { id: generateKeyframeId(), time: 0, value: 0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 0, interpolation: 'linear' },
        ],
        positionY: [
          { id: generateKeyframeId(), time: 0, value: 0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 0, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'slow_zoom_out',
    name: 'Slow Zoom Out',
    category: 'zoom',
    description: 'Smooth outward zoom revealing surroundings.',
    icon: '🔎',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      const startScale = 1.0 + 0.22 * intensity;
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: startScale, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.0, interpolation: 'linear' },
        ],
        positionX: [
          { id: generateKeyframeId(), time: 0, value: 0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 0, interpolation: 'linear' },
        ],
        positionY: [
          { id: generateKeyframeId(), time: 0, value: 0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 0, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'fast_zoom_in',
    name: 'Fast Zoom In',
    category: 'zoom',
    description: 'High-energy punch inward for dynamic impact.',
    icon: '⚡',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      const targetScale = 1.0 + 0.45 * intensity;
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: targetScale, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'fast_zoom_out',
    name: 'Fast Zoom Out',
    category: 'zoom',
    description: 'Fast energetic pull outward.',
    icon: '💨',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      const startScale = 1.0 + 0.5 * intensity;
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: startScale, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.0, interpolation: 'linear' },
        ],
      };
    },
  },

  // --- PAN PRESETS ---
  {
    id: 'pan_left_right',
    name: 'Slow Pan Left → Right',
    category: 'pan',
    description: 'Smooth horizontal camera tracking from left to right.',
    icon: '➡️',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      const dist = 70 * intensity;
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.15, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.15, interpolation: 'linear' },
        ],
        positionX: [
          { id: generateKeyframeId(), time: 0, value: -dist, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: dist, interpolation: 'linear' },
        ],
        positionY: [
          { id: generateKeyframeId(), time: 0, value: 0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 0, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'pan_right_left',
    name: 'Slow Pan Right → Left',
    category: 'pan',
    description: 'Smooth horizontal camera tracking from right to left.',
    icon: '⬅️',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      const dist = 70 * intensity;
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.15, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.15, interpolation: 'linear' },
        ],
        positionX: [
          { id: generateKeyframeId(), time: 0, value: dist, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: -dist, interpolation: 'linear' },
        ],
        positionY: [
          { id: generateKeyframeId(), time: 0, value: 0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 0, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'pan_top_bottom',
    name: 'Slow Pan Top → Bottom',
    category: 'pan',
    description: 'Vertical tracking shot tilting downward.',
    icon: '⬇️',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      const dist = 50 * intensity;
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.15, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.15, interpolation: 'linear' },
        ],
        positionX: [
          { id: generateKeyframeId(), time: 0, value: 0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 0, interpolation: 'linear' },
        ],
        positionY: [
          { id: generateKeyframeId(), time: 0, value: -dist, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: dist, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'pan_bottom_top',
    name: 'Slow Pan Bottom → Top',
    category: 'pan',
    description: 'Vertical tracking shot tilting upward.',
    icon: '⬆️',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      const dist = 50 * intensity;
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.15, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.15, interpolation: 'linear' },
        ],
        positionX: [
          { id: generateKeyframeId(), time: 0, value: 0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 0, interpolation: 'linear' },
        ],
        positionY: [
          { id: generateKeyframeId(), time: 0, value: dist, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: -dist, interpolation: 'linear' },
        ],
      };
    },
  },

  // --- CINEMATIC PRESETS ---
  {
    id: 'cinematic_push_in',
    name: 'Cinematic Push In',
    category: 'cinematic',
    description: 'Slow push-in with gentle vertical tilt for dramatic weight.',
    icon: '🎬',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.0 + 0.2 * intensity, interpolation: 'linear' },
        ],
        positionY: [
          { id: generateKeyframeId(), time: 0, value: 0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: -25 * intensity, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'cinematic_pull_out',
    name: 'Cinematic Pull Out',
    category: 'cinematic',
    description: 'Slow pull-out from a character or object revealing scene.',
    icon: '🎥',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.0 + 0.25 * intensity, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.0, interpolation: 'linear' },
        ],
        positionY: [
          { id: generateKeyframeId(), time: 0, value: -25 * intensity, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 0, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'ken_burns',
    name: 'Ken Burns',
    category: 'cinematic',
    description: 'Classic documentary camera movement drifting diagonally with slow zoom.',
    icon: '📜',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.06, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.06 + 0.2 * intensity, interpolation: 'linear' },
        ],
        positionX: [
          { id: generateKeyframeId(), time: 0, value: -35 * intensity, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 35 * intensity, interpolation: 'linear' },
        ],
        positionY: [
          { id: generateKeyframeId(), time: 0, value: -18 * intensity, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 18 * intensity, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'slow_push_pan',
    name: 'Slow Push + Pan',
    category: 'cinematic',
    description: 'Simultaneous zoom-in and horizontal pan.',
    icon: '📐',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.0, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.0 + 0.22 * intensity, interpolation: 'linear' },
        ],
        positionX: [
          { id: generateKeyframeId(), time: 0, value: -45 * intensity, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 30 * intensity, interpolation: 'linear' },
        ],
      };
    },
  },
  {
    id: 'slow_pull_pan',
    name: 'Slow Pull + Pan',
    category: 'cinematic',
    description: 'Simultaneous zoom-out and horizontal pan.',
    icon: '🔭',
    defaultIntensity: 1.0,
    generateTracks: (clipDuration, intensity = 1.0) => {
      return {
        scale: [
          { id: generateKeyframeId(), time: 0, value: 1.0 + 0.24 * intensity, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: 1.0, interpolation: 'linear' },
        ],
        positionX: [
          { id: generateKeyframeId(), time: 0, value: 45 * intensity, interpolation: 'linear' },
          { id: generateKeyframeId(), time: clipDuration, value: -30 * intensity, interpolation: 'linear' },
        ],
      };
    },
  },
];

export function getMotionPreset(id: MotionPresetId): MotionPresetDefinition | undefined {
  return MOTION_PRESETS.find(p => p.id === id);
}

/**
 * Compiles keyframe animation tracks or static transforms into deterministic FFmpeg crop & scale expressions.
 */
export function compileMotionTransformToFFmpeg(
  clip: {
    duration: number;
    transform?: { scale?: number; positionX?: number; positionY?: number };
    animations?: import('../animation/types').ClipAnimations;
  },
  width: number,
  height: number,
  fps: number = 30
): string | null {
  const duration = Math.max(0.01, clip.duration || 1);
  const scaleTrack = clip.animations?.scale;
  const posXTrack = clip.animations?.positionX;
  const posYTrack = clip.animations?.positionY;

  const hasScaleAnim = scaleTrack && scaleTrack.keyframes.length > 0;
  const hasXAnim = posXTrack && posXTrack.keyframes.length > 0;
  const hasYAnim = posYTrack && posYTrack.keyframes.length > 0;

  const staticScale = clip.transform?.scale ?? 1.0;
  const staticX = clip.transform?.positionX ?? 0;
  const staticY = clip.transform?.positionY ?? 0;

  if (!hasScaleAnim && !hasXAnim && !hasYAnim) {
    if (Math.abs(staticScale - 1.0) < 0.005 && Math.abs(staticX) < 1 && Math.abs(staticY) < 1) {
      return null;
    }
  }

  // Determine start & end values
  const s0 = hasScaleAnim ? (scaleTrack!.keyframes[0]?.value ?? staticScale) : staticScale;
  const s1 = hasScaleAnim ? (scaleTrack!.keyframes[scaleTrack!.keyframes.length - 1]?.value ?? s0) : s0;

  const x0 = hasXAnim ? (posXTrack!.keyframes[0]?.value ?? staticX) : staticX;
  const x1 = hasXAnim ? (posXTrack!.keyframes[posXTrack!.keyframes.length - 1]?.value ?? x0) : x0;

  const y0 = hasYAnim ? (posYTrack!.keyframes[0]?.value ?? staticY) : staticY;
  const y1 = hasYAnim ? (posYTrack!.keyframes[posYTrack!.keyframes.length - 1]?.value ?? y0) : y0;

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const zExpr = Math.abs(s1 - s0) > 0.001
    ? `(${s0.toFixed(3)}+(${((s1 - s0)).toFixed(4)})*(on/${totalFrames}))`
    : `${s0.toFixed(3)}`;

  // Pan offsets in terms of input video dimensions
  const xNormSlope = (x1 - x0) / width;
  const xNormStart = x0 / width;
  const xOffset = Math.abs(x1 - x0) > 1
    ? `((${xNormStart.toFixed(4)}+(${xNormSlope.toFixed(4)})*(on/${totalFrames}))*iw)`
    : `${((x0 / width) * 100).toFixed(2)}*iw/100`;

  const yNormSlope = (y1 - y0) / height;
  const yNormStart = y0 / height;
  const yOffset = Math.abs(y1 - y0) > 1
    ? `((${yNormStart.toFixed(4)}+(${yNormSlope.toFixed(4)})*(on/${totalFrames}))*ih)`
    : `${((y0 / height) * 100).toFixed(2)}*ih/100`;

  const xExpr = `min(max(iw/2-(iw/zoom/2)-(${xOffset}),0),iw-(iw/zoom))`;
  const yExpr = `min(max(ih/2-(ih/zoom/2)-(${yOffset}),0),ih-(ih/zoom))`;

  return `zoompan=z='${zExpr}':d=1:x='${xExpr}':y='${yExpr}':s=${width}x${height}:fps=${fps}`;
}

export function applyMotionPresetToClip(
  clip: import('../types/project').ClipItem,
  preset: MotionPresetDefinition,
  intensity: number = 1.0
): import('../types/project').ClipItem {
  const generated = preset.generateTracks(clip.duration, intensity);
  const updated = { ...clip, animations: { ...(clip.animations || {}) } };
  for (const [prop, keyframes] of Object.entries(generated)) {
    if (keyframes) {
      updated.animations[prop as AnimatableProperty] = {
        property: prop as AnimatableProperty,
        keyframes,
      };
    }
  }
  return updated;
}

