/**
 * FreeCut Chroma Key Engine
 * Provides real-time pixel-level chroma keying for Program Monitor preview
 * and generates native FFmpeg colorkey filter commands for video export.
 */

import { ChromaKeySettings, DEFAULT_CHROMA_KEY_SETTINGS } from './types';

export function parseHexToRGB(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Applies Chroma Key to an HTML5 2D Canvas context.
 * Computes color distance, feathering smoothness falloff, spill suppression, and inversion.
 */
export function applyChromaKeyToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ChromaKeySettings = DEFAULT_CHROMA_KEY_SETTINGS
): void {
  if (!settings.enabled) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const [kr, kg, kb] = parseHexToRGB(settings.keyColor);

  // Normalize key color to 0..1
  const nkr = kr / 255;
  const nkg = kg / 255;
  const nkb = kb / 255;

  const similarity = Math.max(0.001, settings.similarity);
  const smoothness = Math.max(0.001, settings.smoothness);
  const spill = Math.max(0, Math.min(1, settings.spillSuppression));
  const invert = settings.invert;

  const len = data.length;
  for (let i = 0; i < len; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const a = data[i + 3] / 255;

    if (a <= 0) continue;

    // Euclidean color distance in RGB space [0, sqrt(3)] -> normalized to [0, 1]
    const dr = r - nkr;
    const dg = g - nkg;
    const db = b - nkb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db) / 1.73205;

    let maskAlpha = 1.0;
    if (dist <= similarity) {
      maskAlpha = 0.0;
    } else if (dist < similarity + smoothness) {
      // Smooth Hermite interpolation between 0 and 1
      const t = (dist - similarity) / smoothness;
      maskAlpha = t * t * (3 - 2 * t);
    } else {
      maskAlpha = 1.0;
    }

    if (invert) {
      maskAlpha = 1.0 - maskAlpha;
    }

    // Spill suppression: desaturate key color if dominant on edges
    if (spill > 0 && maskAlpha > 0 && maskAlpha < 1) {
      if (nkg > nkr && nkg > nkb) {
        // Green spill
        const avg = (r + b) / 2;
        if (g > avg) {
          data[i + 1] = Math.round((g * (1 - spill) + avg * spill) * 255);
        }
      } else if (nkb > nkr && nkb > nkg) {
        // Blue spill
        const avg = (r + g) / 2;
        if (b > avg) {
          data[i + 2] = Math.round((b * (1 - spill) + avg * spill) * 255);
        }
      }
    }

    data[i + 3] = Math.round(a * maskAlpha * 255);
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Compiles Chroma Key into FFmpeg colorkey/chromakey video filter syntax.
 */
export function compileChromaKeyToFFmpeg(settings: ChromaKeySettings): string {
  if (!settings.enabled) return '';
  const cleanHex = settings.keyColor.replace('#', '').toUpperCase();
  const similarity = Math.max(0.01, Math.min(1.0, settings.similarity));
  const blend = Math.max(0.0, Math.min(1.0, settings.smoothness));

  // FFmpeg colorkey operates on RGB color hex
  return `colorkey=0x${cleanHex}:${similarity.toFixed(3)}:${blend.toFixed(3)}`;
}
