/**
 * Timeline Operations Service
 * Pure, non-destructive domain functions performing timeline modifications on FreeCutProject.
 * Completely decouples editing logic from UI presentation components.
 */

import { FreeCutProject, ClipItem } from '../types/project';
import { snapToFrame } from '../utils/timelineMath';
import {
  cloneAnimationTracks,
  evaluateAnimationTrack,
  generateKeyframeId,
  AnimatableProperty,
  ClipAnimations,
} from '../animation';
import { cloneEffects } from '../effects';

export interface TimelineOperationResult {
  project: FreeCutProject;
  affectedClipIds: string[];
}

export class TimelineOperations {
  /**
   * Helper to check if a track is locked.
   */
  static isTrackLocked(project: FreeCutProject, trackId: string): boolean {
    const track = project.tracks.find(t => t.id === trackId);
    return track ? !!track.locked : false;
  }

  /**
   * Generates a stable unique clip ID.
   */
  static generateClipId(): string {
    return 'clip_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * 1. Normal Delete: Removes target clips without shifting subsequent clips (preserves gaps).
   * Respects track locking: clips on locked tracks are NOT deleted.
   */
  static deleteClips(project: FreeCutProject, clipIds: string[]): TimelineOperationResult {
    const idsToDelete = new Set(clipIds);
    const lockedTrackIds = new Set(project.tracks.filter(t => t.locked).map(t => t.id));

    const updatedClips = project.clips.filter(clip => {
      if (idsToDelete.has(clip.id)) {
        // If track is locked, reject deletion
        if (lockedTrackIds.has(clip.trackId)) {
          return true;
        }
        return false;
      }
      return true;
    });

    const updatedTransitions = project.transitions
      ? project.transitions.filter(tr => {
          const fromDeleted = idsToDelete.has(tr.fromClipId) && !lockedTrackIds.has(project.clips.find(c => c.id === tr.fromClipId)?.trackId || '');
          const toDeleted = idsToDelete.has(tr.toClipId) && !lockedTrackIds.has(project.clips.find(c => c.id === tr.toClipId)?.trackId || '');
          return !fromDeleted && !toDeleted;
        })
      : undefined;

    return {
      project: {
        ...project,
        clips: updatedClips,
        transitions: updatedTransitions,
        updatedAt: Date.now(),
      },
      affectedClipIds: clipIds.filter(id => {
        const c = project.clips.find(clip => clip.id === id);
        return c && !lockedTrackIds.has(c.trackId);
      }),
    };
  }

  /**
   * 2. Ripple Delete: Deletes target clips and closes the gaps on affected unlocked tracks
   * by shifting subsequent clips left by the deleted duration.
   */
  static rippleDeleteClips(project: FreeCutProject, clipIds: string[]): TimelineOperationResult {
    const fps = project.project.fps || 30;
    const idsToDelete = new Set(clipIds);
    const lockedTrackIds = new Set(project.tracks.filter(t => t.locked).map(t => t.id));

    // Group clips to delete by track
    const deletesByTrack = new Map<string, ClipItem[]>();
    for (const id of clipIds) {
      const clip = project.clips.find(c => c.id === id);
      if (clip && !lockedTrackIds.has(clip.trackId)) {
        const list = deletesByTrack.get(clip.trackId) || [];
        list.push(clip);
        deletesByTrack.set(clip.trackId, list);
      }
    }

    // Clone clips array excluding deleted items
    const remainingClips = project.clips
      .filter(c => !(idsToDelete.has(c.id) && !lockedTrackIds.has(c.trackId)))
      .map(c => ({ ...c }));

    // For each affected track, sort deleted clips descending by startTime to ripple correctly
    deletesByTrack.forEach((deletedOnTrack, trackId) => {
      // Sort deleted clips descending so shifts don't interfere
      deletedOnTrack.sort((a, b) => b.startTime - a.startTime);

      for (const delClip of deletedOnTrack) {
        const cutPoint = delClip.startTime;
        const shiftAmount = delClip.duration;

        // Shift every clip on this track that started at or after this deleted clip
        for (const clip of remainingClips) {
          if (clip.trackId === trackId && clip.startTime >= cutPoint) {
            clip.startTime = snapToFrame(Math.max(0, clip.startTime - shiftAmount), fps);
          }
        }
      }
    });

    const updatedTransitions = project.transitions
      ? project.transitions.filter(tr => {
          const fromDeleted = idsToDelete.has(tr.fromClipId) && !lockedTrackIds.has(project.clips.find(c => c.id === tr.fromClipId)?.trackId || '');
          const toDeleted = idsToDelete.has(tr.toClipId) && !lockedTrackIds.has(project.clips.find(c => c.id === tr.toClipId)?.trackId || '');
          return !fromDeleted && !toDeleted;
        })
      : undefined;

    return {
      project: {
        ...project,
        clips: remainingClips,
        transitions: updatedTransitions,
        updatedAt: Date.now(),
      },
      affectedClipIds: remainingClips.map(c => c.id),
    };
  }

  /**
   * 3. Insert Edit: Inserts a media clip onto a track at insertTime.
   * Shifts all clips on unlocked tracks starting at or after insertTime to the right by duration.
   */
  static insertClip(
    project: FreeCutProject,
    mediaId: string,
    trackId: string,
    insertTime: number
  ): TimelineOperationResult {
    const fps = project.project.fps || 30;
    if (this.isTrackLocked(project, trackId)) {
      return { project, affectedClipIds: [] };
    }

    const media = project.media.find(m => m.id === mediaId);
    if (!media) return { project, affectedClipIds: [] };

    const duration = snapToFrame(media.duration || 5, fps);
    const targetStartTime = snapToFrame(Math.max(0, insertTime), fps);
    const lockedTrackIds = new Set(project.tracks.filter(t => t.locked).map(t => t.id));

    // Shift subsequent clips on unlocked tracks
    const shiftedClips = project.clips.map(c => {
      if (!lockedTrackIds.has(c.trackId) && c.trackId === trackId && c.startTime >= targetStartTime) {
        return {
          ...c,
          startTime: snapToFrame(c.startTime + duration, fps),
        };
      }
      return { ...c };
    });

    // Create the new inserted clip
    const newClip: ClipItem = {
      id: this.generateClipId(),
      mediaId,
      trackId,
      startTime: targetStartTime,
      duration,
      sourceStart: 0,
      sourceDuration: duration,
      type: media.type,
      name: media.name,
      transform: {
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      volume: 1.0,
      muted: false,
    };

    shiftedClips.push(newClip);

    return {
      project: {
        ...project,
        clips: shiftedClips,
        updatedAt: Date.now(),
      },
      affectedClipIds: [newClip.id],
    };
  }

  /**
   * 4. Overwrite Edit: Places a clip on targetTrack from overwriteTime to overwriteTime + duration.
   * Removes or trims any intersecting regions of existing clips on that track without shifting unrelated media.
   */
  static overwriteClip(
    project: FreeCutProject,
    mediaId: string,
    trackId: string,
    overwriteTime: number
  ): TimelineOperationResult {
    const fps = project.project.fps || 30;
    if (this.isTrackLocked(project, trackId)) {
      return { project, affectedClipIds: [] };
    }

    const media = project.media.find(m => m.id === mediaId);
    if (!media) return { project, affectedClipIds: [] };

    const duration = snapToFrame(media.duration || 5, fps);
    const newStart = snapToFrame(Math.max(0, overwriteTime), fps);
    const newEnd = snapToFrame(newStart + duration, fps);

    const resultingClips: ClipItem[] = [];

    for (const clip of project.clips) {
      // Different track: untouched
      if (clip.trackId !== trackId) {
        resultingClips.push({ ...clip });
        continue;
      }

      const clipStart = clip.startTime;
      const clipEnd = clip.startTime + clip.duration;

      // Case A: No overlap
      if (clipEnd <= newStart || clipStart >= newEnd) {
        resultingClips.push({ ...clip });
      }
      // Case B: Completely covered by new clip -> removed
      else if (clipStart >= newStart && clipEnd <= newEnd) {
        // Skip (deleted)
      }
      // Case C: Overwrite splits clip in the middle
      else if (clipStart < newStart && clipEnd > newEnd) {
        // Left piece
        const leftDuration = snapToFrame(newStart - clipStart, fps);
        resultingClips.push({
          ...clip,
          duration: leftDuration,
          sourceDuration: leftDuration,
        });

        // Right piece
        const rightOffset = snapToFrame(newEnd - clipStart, fps);
        const rightDuration = snapToFrame(clipEnd - newEnd, fps);
        resultingClips.push({
          ...JSON.parse(JSON.stringify(clip)),
          id: this.generateClipId(),
          startTime: newEnd,
          duration: rightDuration,
          sourceStart: snapToFrame(clip.sourceStart + rightOffset, fps),
          sourceDuration: rightDuration,
        });
      }
      // Case D: Overlap at end of existing clip -> trim right
      else if (clipStart < newStart && clipEnd > newStart) {
        const leftDuration = snapToFrame(newStart - clipStart, fps);
        resultingClips.push({
          ...clip,
          duration: leftDuration,
          sourceDuration: leftDuration,
        });
      }
      // Case E: Overlap at start of existing clip -> trim left
      else if (clipStart < newEnd && clipEnd > newEnd) {
        const cutOffset = snapToFrame(newEnd - clipStart, fps);
        const rightDuration = snapToFrame(clipEnd - newEnd, fps);
        resultingClips.push({
          ...clip,
          startTime: newEnd,
          duration: rightDuration,
          sourceStart: snapToFrame(clip.sourceStart + cutOffset, fps),
          sourceDuration: rightDuration,
        });
      }
    }

    // Add new overwrite clip
    const newClip: ClipItem = {
      id: this.generateClipId(),
      mediaId,
      trackId,
      startTime: newStart,
      duration,
      sourceStart: 0,
      sourceDuration: duration,
      type: media.type,
      name: media.name,
      transform: {
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      volume: 1.0,
      muted: false,
    };

    resultingClips.push(newClip);

    return {
      project: {
        ...project,
        clips: resultingClips,
        updatedAt: Date.now(),
      },
      affectedClipIds: [newClip.id],
    };
  }

  /**
   * 5. Move Multiple Clips: Moves a selection of clips by deltaTime.
   * Respects locked tracks and prevents clips from moving before timeline start (0:00).
   */
  static moveClips(
    project: FreeCutProject,
    clipIds: string[],
    deltaTime: number
  ): TimelineOperationResult {
    const fps = project.project.fps || 30;
    const lockedTrackIds = new Set(project.tracks.filter(t => t.locked).map(t => t.id));
    const targetClips = project.clips.filter(c => clipIds.includes(c.id) && !lockedTrackIds.has(c.trackId));

    if (targetClips.length === 0) {
      return { project, affectedClipIds: [] };
    }

    // Prevent any selected clip from going < 0
    const minCurrentStart = Math.min(...targetClips.map(c => c.startTime));
    const effectiveDelta = deltaTime < -minCurrentStart ? -minCurrentStart : deltaTime;

    const movedClips = project.clips.map(c => {
      if (clipIds.includes(c.id) && !lockedTrackIds.has(c.trackId)) {
        return {
          ...c,
          startTime: snapToFrame(Math.max(0, c.startTime + effectiveDelta), fps),
        };
      }
      return { ...c };
    });

    return {
      project: {
        ...project,
        clips: movedClips,
        updatedAt: Date.now(),
      },
      affectedClipIds: targetClips.map(c => c.id),
    };
  }

  /**
   * 6. Non-Destructive Trim: Trims in-point (left) or out-point (right) within source bounds.
   */
  static trimClip(
    project: FreeCutProject,
    clipId: string,
    newStartTime: number,
    newDuration: number,
    newSourceStart: number
  ): TimelineOperationResult {
    const fps = project.project.fps || 30;
    const clip = project.clips.find(c => c.id === clipId);
    if (!clip || this.isTrackLocked(project, clip.trackId)) {
      return { project, affectedClipIds: [] };
    }

    const clampedDuration = Math.max(1 / fps, snapToFrame(newDuration, fps));
    const clampedStartTime = Math.max(0, snapToFrame(newStartTime, fps));
    const clampedSourceStart = Math.max(0, snapToFrame(newSourceStart, fps));

    const updatedClips = project.clips.map(c => {
      if (c.id === clipId) {
        const shiftDelta = snapToFrame(clampedSourceStart - c.sourceStart, fps);
        let updatedAnimations = c.animations;
        if (c.animations) {
          updatedAnimations = {};
          for (const prop of Object.keys(c.animations) as AnimatableProperty[]) {
            const track = c.animations[prop];
            if (track) {
              const shiftedKfs = track.keyframes
                .map(kf => ({
                  ...kf,
                  time: kf.time - shiftDelta,
                }))
                .filter(kf => kf.time >= -0.0001 && kf.time <= clampedDuration + 0.0001)
                .map(kf => ({
                  ...kf,
                  time: snapToFrame(Math.max(0, kf.time), fps),
                }));
              updatedAnimations[prop] = {
                property: track.property,
                keyframes: shiftedKfs,
              };
            }
          }
        }

        return {
          ...c,
          startTime: clampedStartTime,
          duration: clampedDuration,
          sourceStart: clampedSourceStart,
          animations: updatedAnimations,
        };
      }
      return { ...c };
    });

    return {
      project: {
        ...project,
        clips: updatedClips,
        updatedAt: Date.now(),
      },
      affectedClipIds: [clipId],
    };
  }

  /**
   * 7. Split Clips At Time: Splits target clips (or all unlocked clips intersecting time).
   */
  static splitClipsAtTime(
    project: FreeCutProject,
    targetClipIds: string[] | null,
    splitTime: number
  ): TimelineOperationResult {
    const fps = project.project.fps || 30;
    const time = snapToFrame(splitTime, fps);
    const lockedTrackIds = new Set(project.tracks.filter(t => t.locked).map(t => t.id));

    // Find candidate clips intersecting split time on unlocked tracks
    const candidates = project.clips.filter(c => {
      if (lockedTrackIds.has(c.trackId)) return false;
      if (targetClipIds && targetClipIds.length > 0 && !targetClipIds.includes(c.id)) return false;
      return time > c.startTime && time < (c.startTime + c.duration);
    });

    if (candidates.length === 0) {
      return { project, affectedClipIds: [] };
    }

    const candidateIds = new Set(candidates.map(c => c.id));
    const resultingClips: ClipItem[] = [];
    const newCreatedIds: string[] = [];

    for (const clip of project.clips) {
      if (!candidateIds.has(clip.id)) {
        resultingClips.push({ ...clip });
        continue;
      }

      const splitOffset = snapToFrame(time - clip.startTime, fps);
      const remainingDuration = snapToFrame(clip.duration - splitOffset, fps);

      let leftAnimations: ClipAnimations | undefined = undefined;
      let rightAnimations: ClipAnimations | undefined = undefined;

      if (clip.animations) {
        leftAnimations = {};
        rightAnimations = {};
        const props = Object.keys(clip.animations) as AnimatableProperty[];
        for (const prop of props) {
          const track = clip.animations[prop];
          if (!track || track.keyframes.length === 0) continue;

          const defaultVal = prop === 'scale' || prop === 'opacity' || prop === 'volume' ? 1 : 0;
          const evalValAtSplit = evaluateAnimationTrack(track, splitOffset, defaultVal);

          // Left keyframes: time <= splitOffset
          const leftKfs = track.keyframes
            .filter(k => k.time <= splitOffset + 0.0001)
            .map(k => ({ ...k }));

          const hasLeftEndKf = leftKfs.some(k => Math.abs(k.time - splitOffset) <= 0.0001);
          if (!hasLeftEndKf && track.keyframes.some(k => k.time > splitOffset)) {
            leftKfs.push({
              id: generateKeyframeId(),
              time: splitOffset,
              value: evalValAtSplit,
              interpolation: 'linear',
            });
          }
          leftKfs.sort((a, b) => a.time - b.time);

          // Right keyframes: time >= splitOffset, shifted by -splitOffset
          const rightKfs = track.keyframes
            .filter(k => k.time >= splitOffset - 0.0001)
            .map(k => ({
              ...k,
              id: generateKeyframeId(),
              time: snapToFrame(k.time - splitOffset, fps),
            }));

          const hasRightStartKf = rightKfs.some(k => Math.abs(k.time) <= 0.0001);
          if (!hasRightStartKf) {
            rightKfs.unshift({
              id: generateKeyframeId(),
              time: 0,
              value: evalValAtSplit,
              interpolation: 'linear',
            });
          }
          rightKfs.sort((a, b) => a.time - b.time);

          leftAnimations[prop] = {
            property: track.property,
            keyframes: leftKfs,
          };
          rightAnimations[prop] = {
            property: track.property,
            keyframes: rightKfs,
          };
        }
      }

      // Part 1
      resultingClips.push({
        ...clip,
        duration: splitOffset,
        sourceDuration: splitOffset,
        animations: leftAnimations,
        effects: cloneEffects(clip.effects),
      });

      // Part 2
      const secondClipId = this.generateClipId();
      newCreatedIds.push(secondClipId);
      resultingClips.push({
        ...JSON.parse(JSON.stringify(clip)),
        id: secondClipId,
        startTime: time,
        duration: remainingDuration,
        sourceStart: snapToFrame(clip.sourceStart + splitOffset, fps),
        sourceDuration: remainingDuration,
        animations: rightAnimations,
        effects: cloneEffects(clip.effects),
      });
    }

    return {
      project: {
        ...project,
        clips: resultingClips,
        updatedAt: Date.now(),
      },
      affectedClipIds: [...Array.from(candidateIds), ...newCreatedIds],
    };
  }

  /**
   * 8. Duplicate Clips: Clones target clips directly after the selection group.
   */
  static duplicateClips(project: FreeCutProject, clipIds: string[]): TimelineOperationResult {
    const fps = project.project.fps || 30;
    const lockedTrackIds = new Set(project.tracks.filter(t => t.locked).map(t => t.id));
    const targets = project.clips.filter(c => clipIds.includes(c.id) && !lockedTrackIds.has(c.trackId));

    if (targets.length === 0) return { project, affectedClipIds: [] };

    // Find total span offset to place duplicates directly after
    const maxEnd = Math.max(...targets.map(c => c.startTime + c.duration));
    const minStart = Math.min(...targets.map(c => c.startTime));
    const offset = snapToFrame(maxEnd - minStart + 0.2, fps);

    const duplicatedClips: ClipItem[] = targets.map(c => {
      const cloned = JSON.parse(JSON.stringify(c));
      return {
        ...cloned,
        id: this.generateClipId(),
        startTime: snapToFrame(c.startTime + offset, fps),
        animations: cloneAnimationTracks(c.animations),
        effects: cloneEffects(c.effects),
      };
    });

    return {
      project: {
        ...project,
        clips: [...project.clips, ...duplicatedClips],
        updatedAt: Date.now(),
      },
      affectedClipIds: duplicatedClips.map(c => c.id),
    };
  }

  /**
   * 9. Paste Clips: Pastes clipboard clips at targetTime.
   */
  static pasteClips(
    project: FreeCutProject,
    clipboard: ClipItem[],
    targetTime: number,
    targetTrackId?: string
  ): TimelineOperationResult {
    const fps = project.project.fps || 30;
    if (!clipboard || clipboard.length === 0) {
      return { project, affectedClipIds: [] };
    }

    const minClipStart = Math.min(...clipboard.map(c => c.startTime));
    const baseTargetTime = snapToFrame(Math.max(0, targetTime), fps);

    const pastedClips: ClipItem[] = clipboard.map(clip => {
      const relativeOffset = snapToFrame(clip.startTime - minClipStart, fps);
      // Map to target track if specified and compatible, otherwise keep original track
      let track = project.tracks.find(t => t.id === clip.trackId);
      if (targetTrackId) {
        const designated = project.tracks.find(t => t.id === targetTrackId);
        if (designated && (designated.type === clip.type || (clip.type === 'text' && designated.type === 'video'))) {
          track = designated;
        }
      }

      const assignedTrackId = (track && !track.locked) ? track.id : clip.trackId;

      return {
        ...JSON.parse(JSON.stringify(clip)),
        id: this.generateClipId(),
        trackId: assignedTrackId,
        startTime: snapToFrame(baseTargetTime + relativeOffset, fps),
        animations: cloneAnimationTracks(clip.animations),
        effects: cloneEffects(clip.effects),
      };
    });

    return {
      project: {
        ...project,
        clips: [...project.clips, ...pastedClips],
        updatedAt: Date.now(),
      },
      affectedClipIds: pastedClips.map(c => c.id),
    };
  }
}
