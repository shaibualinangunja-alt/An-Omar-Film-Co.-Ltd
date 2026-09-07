/**
 * FreeCut Animation Utilities
 * Helpers for keyframe creation, timing, cloning, navigation, and frame snapping.
 */

import { ClipAnimations, AnimationTrack, Keyframe, AnimatableProperty } from './types';
import { ClipItem } from '../types/project';
import { snapToFrame } from '../utils/timelineMath';

export function generateKeyframeId(): string {
  return 'kf_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Deep clones animation tracks, generating fresh IDs for all keyframes.
 * Ensures duplicated or pasted clips have independent animation state.
 */
export function cloneAnimationTracks(animations?: ClipAnimations): ClipAnimations | undefined {
  if (!animations) return undefined;

  const cloned: ClipAnimations = {};
  const properties = Object.keys(animations) as AnimatableProperty[];

  for (const prop of properties) {
    const track = animations[prop];
    if (track) {
      cloned[prop] = {
        property: track.property,
        keyframes: track.keyframes.map(kf => ({
          ...kf,
          id: generateKeyframeId(),
        })),
      };
    }
  }

  return cloned;
}

/**
 * Checks if a keyframe exists on the given track within a frame-precision threshold.
 */
export function findKeyframeAtTime(
  track: AnimationTrack<number> | undefined,
  relativeTime: number,
  fps: number = 30
): Keyframe<number> | undefined {
  if (!track || !track.keyframes) return undefined;
  const threshold = 0.5 / fps + 0.0001;
  return track.keyframes.find(kf => Math.abs(kf.time - relativeTime) <= threshold);
}

/**
 * Finds the previous and next keyframe times relative to current clip time.
 * Can search a specific property track or all animation tracks on the clip.
 */
export function findNearestKeyframeTimes(
  clip: ClipItem,
  relativeTime: number,
  fps: number = 30,
  targetProperty?: AnimatableProperty
): { prev: number | null; next: number | null } {
  if (!clip.animations) return { prev: null, next: null };

  const threshold = 0.5 / fps + 0.0001;
  const allTimes = new Set<number>();

  const tracksToInspect: AnimationTrack<number>[] = [];
  if (targetProperty) {
    const trk = clip.animations[targetProperty];
    if (trk) tracksToInspect.push(trk);
  } else {
    for (const key of Object.keys(clip.animations) as AnimatableProperty[]) {
      const trk = clip.animations[key];
      if (trk) tracksToInspect.push(trk);
    }
  }

  for (const track of tracksToInspect) {
    for (const kf of track.keyframes) {
      allTimes.add(snapToFrame(kf.time, fps));
    }
  }

  const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);
  let prev: number | null = null;
  let next: number | null = null;

  for (const t of sortedTimes) {
    if (t < relativeTime - threshold) {
      prev = t;
    } else if (t > relativeTime + threshold && next === null) {
      next = t;
    }
  }

  return { prev, next };
}
