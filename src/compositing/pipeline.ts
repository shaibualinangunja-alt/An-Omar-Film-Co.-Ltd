/**
 * FreeCut Deterministic Compositing Pipeline
 * Executes the standardized multi-stage video frame compositing pipeline:
 * Source -> Crop/Flip -> Chroma Key -> Effects Stack -> Mask -> Blend Mode -> Transform -> Opacity -> Destination
 */

import { ClipItem } from '../types/project';
import { EvaluatedClipState } from '../animation/types';
import { applyChromaKeyToCanvas } from './chromaKey';
import { applyMaskToCanvas } from './maskRenderer';
import { getCanvasCompositeOperation } from './blendModes';
import { getCanvasFilterString, applyPostEffectsToCanvas } from '../effects';
import { GradingEngine } from '../color/gradingEngine';

let offscreenClipBuffer: HTMLCanvasElement | null = null;

function getOffscreenClipBuffer(width: number, height: number): HTMLCanvasElement {
  if (!offscreenClipBuffer) {
    offscreenClipBuffer = document.createElement('canvas');
  }
  if (offscreenClipBuffer.width !== width || offscreenClipBuffer.height !== height) {
    offscreenClipBuffer.width = width;
    offscreenClipBuffer.height = height;
  }
  return offscreenClipBuffer;
}

export class CompositingPipeline {
  /**
   * Executes the deterministic render pipeline for an individual visual clip
   * and composites the result onto the destination canvas context.
   */
  static renderClip(
    destinationCtx: CanvasRenderingContext2D,
    sourceElement: HTMLVideoElement | HTMLImageElement,
    clip: ClipItem,
    evalState: EvaluatedClipState,
    relativeTime: number,
    projectWidth: number,
    projectHeight: number
  ): void {
    const clipCanvas = getOffscreenClipBuffer(projectWidth, projectHeight);
    const clipCtx = clipCanvas.getContext('2d');
    if (!clipCtx) return;

    // Reset offscreen buffer
    clipCtx.save();
    clipCtx.clearRect(0, 0, projectWidth, projectHeight);
    clipCtx.filter = 'none';
    clipCtx.globalCompositeOperation = 'source-over';
    clipCtx.globalAlpha = 1.0;

    // ----------------------------------------------------
    // STAGE 1 & 2: SOURCE FRAME + CROP & FLIP
    // ----------------------------------------------------
    clipCtx.save();

    // Handle Crop
    const crop = clip.crop || { left: 0, right: 0, top: 0, bottom: 0 };
    const cropL = Math.max(0, Math.min(1, crop.left));
    const cropR = Math.max(0, Math.min(1, crop.right));
    const cropT = Math.max(0, Math.min(1, crop.top));
    const cropB = Math.max(0, Math.min(1, crop.bottom));

    const cropPxLeft = cropL * projectWidth;
    const cropPxRight = cropR * projectWidth;
    const cropPxTop = cropT * projectHeight;
    const cropPxBottom = cropB * projectHeight;

    const visibleW = Math.max(1, projectWidth - cropPxLeft - cropPxRight);
    const visibleH = Math.max(1, projectHeight - cropPxTop - cropPxBottom);

    if (cropL > 0 || cropR > 0 || cropT > 0 || cropB > 0) {
      clipCtx.beginPath();
      clipCtx.rect(cropPxLeft, cropPxTop, visibleW, visibleH);
      clipCtx.clip();
    }

    // Handle Flip
    const flip = clip.flip || { horizontal: false, vertical: false };
    if (flip.horizontal || flip.vertical) {
      clipCtx.translate(projectWidth / 2, projectHeight / 2);
      clipCtx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
      clipCtx.translate(-projectWidth / 2, -projectHeight / 2);
    }

    // Clip visual effect filters (Blur, Brightness, Contrast, etc.)
    const filterStr = getCanvasFilterString(clip.effects, relativeTime);
    if (filterStr !== 'none') {
      clipCtx.filter = filterStr;
    }

    // Draw raw source frame
    clipCtx.drawImage(sourceElement, 0, 0, projectWidth, projectHeight);
    clipCtx.filter = 'none';

    // Post-draw effects (e.g. Vignette)
    applyPostEffectsToCanvas(clipCtx, clip.effects, projectWidth, projectHeight, relativeTime);
    clipCtx.restore();

    // ----------------------------------------------------
    // STAGE 3: CHROMA KEY
    // ----------------------------------------------------
    if (clip.chromaKey?.enabled) {
      applyChromaKeyToCanvas(clipCtx, projectWidth, projectHeight, clip.chromaKey);
    }

    // ----------------------------------------------------
    // STAGE 4: MASKS
    // ----------------------------------------------------
    if (clip.masks && clip.masks.length > 0) {
      for (const mask of clip.masks) {
        if (mask.enabled) {
          applyMaskToCanvas(clipCtx, projectWidth, projectHeight, mask);
        }
      }
    }

    clipCtx.restore();

    // ----------------------------------------------------
    // STAGE 4.5: COLOR PIPELINE (Grading, Wheels, Curves, LUT)
    // ----------------------------------------------------
    if (clip.colorGrade && clip.colorGrade.enabled) {
      GradingEngine.applyGradingToCanvas(clipCanvas, clip.colorGrade);
    }

    // ----------------------------------------------------
    // STAGE 5, 6, 7: BLEND MODE, TRANSFORM, OPACITY -> DESTINATION
    // ----------------------------------------------------
    destinationCtx.save();

    // Blend mode
    destinationCtx.globalCompositeOperation = getCanvasCompositeOperation(clip.blendMode);

    // 2D Transform
    const centerX = projectWidth / 2 + evalState.positionX;
    const centerY = projectHeight / 2 + evalState.positionY;

    destinationCtx.translate(centerX, centerY);
    if (evalState.rotation !== 0) {
      destinationCtx.rotate((evalState.rotation * Math.PI) / 180);
    }
    destinationCtx.scale(evalState.scale, evalState.scale);
    destinationCtx.globalAlpha = Math.max(0, Math.min(1, evalState.opacity));

    // Draw processed clip buffer centered
    destinationCtx.drawImage(
      clipCanvas,
      -projectWidth / 2,
      -projectHeight / 2,
      projectWidth,
      projectHeight
    );

    destinationCtx.restore();
  }
}
