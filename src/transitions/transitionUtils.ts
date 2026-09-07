/**
 * FreeCut Transition Utilities
 * Centralized calculation of transition timing, overlap windows, duration validation, and frame snapping.
 */

import { ClipItem } from '../types/project';
import { TransitionItem } from './types';
import { snapToFrame } from '../utils/timelineMath';

export function generateTransitionId(): string {
  return 'tr_' + Math.random().toString(36).substring(2, 11);
}

export interface TransitionTiming {
  cutPoint: number;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Calculates the exact timeline start and end boundary for a transition centered on an edit point.
 */
export function getTransitionTiming(
  transition: TransitionItem,
  fromClip: ClipItem,
  toClip: ClipItem,
  fps: number = 30
): TransitionTiming {
  // Cut point is the end of fromClip / start of toClip
  const cutPoint = snapToFrame(fromClip.startTime + fromClip.duration, fps);
  const halfDuration = transition.duration / 2;
  const startTime = snapToFrame(Math.max(fromClip.startTime, cutPoint - halfDuration), fps);
  const endTime = snapToFrame(Math.min(toClip.startTime + toClip.duration, cutPoint + halfDuration), fps);
  const duration = snapToFrame(Math.max(1 / fps, endTime - startTime), fps);

  return { cutPoint, startTime, endTime, duration };
}

/**
 * Evaluates transition progress [0.0, 1.0] for a playhead time.
 * Returns null if the playhead is outside the active transition window.
 */
export function getTransitionProgress(
  transition: TransitionItem,
  fromClip: ClipItem,
  toClip: ClipItem,
  time: number,
  fps: number = 30
): number | null {
  if (!transition.enabled) return null;

  const { startTime, endTime, duration } = getTransitionTiming(transition, fromClip, toClip, fps);
  if (time < startTime || time > endTime) {
    return null;
  }

  const rawProgress = (time - startTime) / duration;
  const clamped = Math.max(0, Math.min(1, rawProgress));

  if (transition.easing === 'easeIn') {
    return clamped * clamped;
  } else if (transition.easing === 'easeOut') {
    return clamped * (2 - clamped);
  } else if (transition.easing === 'easeInOut') {
    return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
  }

  return clamped;
}

/**
 * Validates whether two clips can accept a transition and calculates maximum safe duration.
 */
export function validateTransition(
  fromClip: ClipItem | undefined,
  toClip: ClipItem | undefined,
  requestedDuration: number,
  fps: number = 30
): { valid: boolean; error?: string; clampedDuration: number; cutPoint: number } {
  if (!fromClip || !toClip) {
    return { valid: false, error: 'Both outgoing and incoming clips are required.', clampedDuration: 0, cutPoint: 0 };
  }

  if (fromClip.trackId !== toClip.trackId) {
    return { valid: false, error: 'Transitions can only connect clips on the same track.', clampedDuration: 0, cutPoint: 0 };
  }

  const cutPoint = snapToFrame(fromClip.startTime + fromClip.duration, fps);
  const gap = Math.abs(toClip.startTime - cutPoint);
  if (gap > 0.08) {
    return { valid: false, error: 'Clips must be adjacent or abutting on the timeline.', clampedDuration: 0, cutPoint: 0 };
  }

  // Maximum transition duration cannot exceed twice the shorter clip duration
  const maxAllowed = snapToFrame(Math.min(fromClip.duration, toClip.duration) * 0.95, fps);
  const minDuration = 1 / fps;
  const clampedDuration = Math.max(minDuration, Math.min(requestedDuration, maxAllowed));

  return {
    valid: true,
    clampedDuration: snapToFrame(clampedDuration, fps),
    cutPoint,
  };
}

/**
 * Finds if a transition is actively rendering at the current playhead time on a given track.
 */
export function findActiveTransitionAtTime(
  transitions: TransitionItem[] | undefined,
  clips: ClipItem[],
  trackId: string,
  time: number,
  fps: number = 30
): { transition: TransitionItem; fromClip: ClipItem; toClip: ClipItem; progress: number } | null {
  if (!transitions || transitions.length === 0) return null;

  for (const tr of transitions) {
    if (!tr.enabled || tr.trackId !== trackId) continue;

    const fromClip = clips.find(c => c.id === tr.fromClipId);
    const toClip = clips.find(c => c.id === tr.toClipId);
    if (!fromClip || !toClip) continue;

    const progress = getTransitionProgress(tr, fromClip, toClip, time, fps);
    if (progress !== null) {
      return { transition: tr, fromClip, toClip, progress };
    }
  }

  return null;
}
