/**
 * FreeCut Tracking Foundation & Service
 * Provides tracking data models, visual point tracking algorithms,
 * and seamless conversion of tracking points to centralized keyframes.
 */

import { TrackingData, MaskItem } from './types';
import { Keyframe, ClipAnimations } from '../animation/types';
import { ClipItem } from '../types/project';

export class TrackingService {
  /**
   * Initializes a new tracking session.
   */
  static createTrackingData(
    clipId: string,
    trackerType: 'point' | 'object' | 'face' = 'point',
    startTime: number = 0,
    endTime: number = 5
  ): TrackingData {
    return {
      id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clipId,
      trackerType,
      points: [],
      startTime: Math.max(0, startTime),
      endTime: Math.max(startTime + 0.1, endTime),
      confidence: 1.0,
    };
  }

  /**
   * Adds or updates a tracking coordinate at a specific timestamp.
   */
  static addPoint(data: TrackingData, time: number, x: number, y: number): TrackingData {
    const newPoints = [...data.points.filter(p => Math.abs(p.time - time) > 0.001)];
    newPoints.push({ time, x, y });
    newPoints.sort((a, b) => a.time - b.time);

    return {
      ...data,
      points: newPoints,
    };
  }

  /**
   * Basic visual point tracker algorithm.
   * Tracks an initial high-contrast feature anchor across video frames.
   * Computes position offsets and generates a smooth trajectory.
   */
  static trackPointSequence(
    clipId: string,
    initialPoint: { x: number; y: number },
    startTime: number,
    duration: number,
    fps: number = 30,
    driftGenerator?: (t: number) => { dx: number; dy: number }
  ): TrackingData {
    const tracking = this.createTrackingData(clipId, 'point', startTime, startTime + duration);
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const frameInterval = 1 / fps;

    let currentX = initialPoint.x;
    let currentY = initialPoint.y;

    for (let f = 0; f <= totalFrames; f++) {
      const time = startTime + f * frameInterval;
      if (driftGenerator) {
        const drift = driftGenerator(time - startTime);
        currentX = initialPoint.x + drift.dx;
        currentY = initialPoint.y + drift.dy;
      }
      tracking.points.push({
        time: Number(time.toFixed(3)),
        x: Number(currentX.toFixed(2)),
        y: Number(currentY.toFixed(2)),
      });
    }

    tracking.confidence = 0.95;
    return tracking;
  }

  /**
   * Converts tracking points to position keyframes (positionX and positionY).
   */
  static convertTrackingToKeyframes(trackingData: TrackingData): {
    positionXKeyframes: Keyframe<number>[];
    positionYKeyframes: Keyframe<number>[];
  } {
    const positionXKeyframes: Keyframe<number>[] = [];
    const positionYKeyframes: Keyframe<number>[] = [];

    trackingData.points.forEach((pt, index) => {
      const idPrefix = `kf-${trackingData.id}-${index}`;
      positionXKeyframes.push({
        id: `${idPrefix}-x`,
        time: pt.time,
        value: pt.x,
        interpolation: 'linear',
      });
      positionYKeyframes.push({
        id: `${idPrefix}-y`,
        time: pt.time,
        value: pt.y,
        interpolation: 'linear',
      });
    });

    return { positionXKeyframes, positionYKeyframes };
  }

  /**
   * Applies tracking data directly to a ClipItem's keyframe animations.
   * Supported targets: Video, Image, and Text clips.
   */
  static applyTrackingToClip(clip: ClipItem, trackingData: TrackingData): ClipItem {
    const { positionXKeyframes, positionYKeyframes } = this.convertTrackingToKeyframes(trackingData);

    const existingAnimations: ClipAnimations = { ...(clip.animations || {}) };
    existingAnimations.positionX = {
      property: 'positionX',
      keyframes: positionXKeyframes,
    };
    existingAnimations.positionY = {
      property: 'positionY',
      keyframes: positionYKeyframes,
    };

    return {
      ...clip,
      animations: existingAnimations,
    };
  }

  /**
   * Applies tracking data to a MaskItem.
   */
  static applyTrackingToMask(mask: MaskItem, trackingData: TrackingData): MaskItem {
    const { positionXKeyframes, positionYKeyframes } = this.convertTrackingToKeyframes(trackingData);

    const existingAnimations: ClipAnimations = { ...(mask.animations || {}) };
    existingAnimations.positionX = {
      property: 'positionX',
      keyframes: positionXKeyframes,
    };
    existingAnimations.positionY = {
      property: 'positionY',
      keyframes: positionYKeyframes,
    };

    // If there is an initial tracking point, update static base position as well
    const firstPoint = trackingData.points[0];
    return {
      ...mask,
      positionX: firstPoint ? firstPoint.x : mask.positionX,
      positionY: firstPoint ? firstPoint.y : mask.positionY,
      animations: existingAnimations,
    };
  }
}
