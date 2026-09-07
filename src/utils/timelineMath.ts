/**
 * Timeline Mathematics & Calculation Utilities
 * Centralized calculation of playhead -> source time, frame stepping, and snapping.
 */

export interface ClipTiming {
  startTime: number;
  duration: number;
  sourceStart: number;
  sourceDuration: number;
}

/**
 * Calculates the exact source media time given the project playhead time.
 * Concept: sourceTime = clip.sourceStart + (playheadTime - clip.startTime)
 * Clamped between clip.sourceStart and clip.sourceStart + clip.sourceDuration.
 */
export function calculateSourceTime(playheadTime: number, clip: ClipTiming): number {
  const relativeOffset = playheadTime - clip.startTime;
  const rawSourceTime = clip.sourceStart + relativeOffset;
  const maxSourceTime = clip.sourceStart + clip.sourceDuration;
  return Math.max(clip.sourceStart, Math.min(maxSourceTime, rawSourceTime));
}

/**
 * Checks whether a clip is active at the given project playhead time.
 */
export function isClipActiveAtTime(playheadTime: number, clip: { startTime: number; duration: number }): boolean {
  return playheadTime >= clip.startTime && playheadTime < (clip.startTime + clip.duration);
}

/**
 * Converts seconds to exact integer frame number based on fps.
 */
export function secondsToFrames(seconds: number, fps: number = 30): number {
  const safeFps = fps > 0 ? fps : 30;
  return Math.round(seconds * safeFps);
}

/**
 * Converts frame number to exact seconds based on fps.
 */
export function framesToSeconds(frames: number, fps: number = 30): number {
  const safeFps = fps > 0 ? fps : 30;
  return Math.max(0, frames) / safeFps;
}

/**
 * Snaps a time in seconds to the nearest exact frame boundary.
 */
export function snapToFrame(seconds: number, fps: number = 30): number {
  return framesToSeconds(secondsToFrames(seconds, fps), fps);
}

/**
 * Calculates frame-accurate step forward (+1) or backward (-1) without floating-point accumulation drift.
 */
export function stepFrameTime(currentTime: number, direction: 1 | -1, fps: number = 30): number {
  const safeFps = fps > 0 ? fps : 30;
  const currentFrame = secondsToFrames(currentTime, safeFps);
  const nextFrame = Math.max(0, currentFrame + direction);
  return framesToSeconds(nextFrame, safeFps);
}

/**
 * Calculates snap point for a given target time.
 * Snaps to: 0 (timeline start), playhead time, and edges of other clips.
 */
export function findSnapPoint(
  targetTime: number,
  clips: { id: string; startTime: number; duration: number }[],
  playheadTime: number,
  excludeClipId?: string,
  thresholdSeconds: number = 0.2
): number {
  let closestSnap = targetTime;
  let minDiff = thresholdSeconds;

  // 1. Snap to 0 (timeline start)
  if (Math.abs(targetTime) < minDiff) {
    closestSnap = 0;
    minDiff = Math.abs(targetTime);
  }

  // 2. Snap to current playhead
  const diffPlayhead = Math.abs(targetTime - playheadTime);
  if (diffPlayhead < minDiff) {
    closestSnap = playheadTime;
    minDiff = diffPlayhead;
  }

  // 3. Snap to edges of other clips (in and out points)
  for (const c of clips) {
    if (c.id === excludeClipId) continue;

    const diffStart = Math.abs(targetTime - c.startTime);
    if (diffStart < minDiff) {
      closestSnap = c.startTime;
      minDiff = diffStart;
    }

    const clipEnd = c.startTime + c.duration;
    const diffEnd = Math.abs(targetTime - clipEnd);
    if (diffEnd < minDiff) {
      closestSnap = clipEnd;
      minDiff = diffEnd;
    }
  }

  return closestSnap;
}
