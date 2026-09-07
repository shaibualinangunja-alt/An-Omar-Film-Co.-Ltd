/**
 * FreeCut Mask Engine
 * Handles rendering, clipping, and feathering for Rectangle, Ellipse, and Linear masks
 * in HTML5 Canvas and compiles them to FFmpeg geq filter graphs.
 */

import { MaskItem } from './types';

let maskCanvasBuffer: HTMLCanvasElement | null = null;

function getMaskCanvasBuffer(width: number, height: number): HTMLCanvasElement {
  if (!maskCanvasBuffer) {
    maskCanvasBuffer = document.createElement('canvas');
  }
  if (maskCanvasBuffer.width !== width || maskCanvasBuffer.height !== height) {
    maskCanvasBuffer.width = width;
    maskCanvasBuffer.height = height;
  }
  return maskCanvasBuffer;
}

/**
 * Applies a single mask or multiple masks onto a target canvas context.
 * Uses offscreen alpha mask compositing with 'destination-in' / 'destination-out'.
 */
export function applyMaskToCanvas(
  targetCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mask: MaskItem
): void {
  if (!mask.enabled) return;

  const maskCanvas = getMaskCanvasBuffer(width, height);
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return;

  maskCtx.save();
  maskCtx.clearRect(0, 0, width, height);

  const centerX = width / 2 + mask.positionX;
  const centerY = height / 2 + mask.positionY;

  // If inverted, base mask is fully opaque and shape cuts holes
  if (mask.inverted) {
    maskCtx.fillStyle = '#FFFFFF';
    maskCtx.fillRect(0, 0, width, height);
    maskCtx.globalCompositeOperation = 'destination-out';
  } else {
    maskCtx.globalCompositeOperation = 'source-over';
  }

  // Feather blur
  if (mask.feather > 0) {
    maskCtx.filter = `blur(${mask.feather}px)`;
  } else {
    maskCtx.filter = 'none';
  }

  maskCtx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, mask.opacity))})`;
  maskCtx.save();
  maskCtx.translate(centerX, centerY);
  if (mask.rotation !== 0) {
    maskCtx.rotate((mask.rotation * Math.PI) / 180);
  }

  if (mask.type === 'rectangle') {
    maskCtx.fillRect(-mask.width / 2, -mask.height / 2, mask.width, mask.height);
  } else if (mask.type === 'ellipse') {
    maskCtx.beginPath();
    maskCtx.ellipse(0, 0, Math.max(1, mask.width / 2), Math.max(1, mask.height / 2), 0, 0, Math.PI * 2);
    maskCtx.fill();
  } else if (mask.type === 'linear') {
    // Linear split gradient
    const grad = maskCtx.createLinearGradient(0, -mask.height / 2, 0, mask.height / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    maskCtx.fillStyle = grad;
    maskCtx.fillRect(-mask.width / 2, -mask.height / 2, mask.width, mask.height);
  } else if (mask.type === 'image' && mask.imageUrl) {
    // Raster / Subject AI Mask
    const mw = mask.width > 0 ? mask.width : width;
    const mh = mask.height > 0 ? mask.height : height;
    if (typeof Image !== 'undefined') {
      const imgElem = (mask as any)._cachedImg || new Image();
      (mask as any)._cachedImg = imgElem;
      if (imgElem.src !== mask.imageUrl) {
        imgElem.crossOrigin = 'anonymous';
        imgElem.src = mask.imageUrl;
      }
      if (imgElem.complete && imgElem.naturalWidth > 0) {
        maskCtx.drawImage(imgElem, -mw / 2, -mh / 2, mw, mh);
      }
    }
  }

  maskCtx.restore();
  maskCtx.restore();

  // Apply the generated mask buffer onto target canvas
  targetCtx.save();
  targetCtx.globalCompositeOperation = 'destination-in';
  targetCtx.drawImage(maskCanvas, 0, 0);
  targetCtx.restore();
}

/**
 * Compiles a mask into an FFmpeg geq filter string.
 */
export function compileMaskToFFmpeg(mask: MaskItem, width: number, height: number): string {
  if (!mask.enabled) return '';

  const cx = Math.round(width / 2 + mask.positionX);
  const cy = Math.round(height / 2 + mask.positionY);
  const w = Math.max(1, Math.round(mask.width));
  const h = Math.max(1, Math.round(mask.height));
  const rx = Math.max(1, Math.round(w / 2));
  const ry = Math.max(1, Math.round(h / 2));

  const x1 = Math.round(cx - rx);
  const x2 = Math.round(cx + rx);
  const y1 = Math.round(cy - ry);
  const y2 = Math.round(cy + ry);

  const innerAlpha = Math.round(Math.max(0, Math.min(1, mask.opacity)) * 255);
  const outerAlpha = 0;

  const inVal = mask.inverted ? outerAlpha : innerAlpha;
  const outVal = mask.inverted ? innerAlpha : outerAlpha;

  if (mask.type === 'rectangle') {
    return `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(between(X,${x1},${x2})*between(Y,${y1},${y2}),${inVal},${outVal})'`;
  } else if (mask.type === 'ellipse') {
    return `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(pow((X-${cx})/${rx},2)+pow((Y-${cy})/${ry},2),1),${inVal},${outVal})'`;
  } else if (mask.type === 'linear') {
    return `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(Y,${cy}),${inVal},${outVal})'`;
  } else {
    // Image / raster mask: merged via alphamerge in FFmpegService
    return '';
  }
}
