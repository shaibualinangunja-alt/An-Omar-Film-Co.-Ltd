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
 * High-performance implementation:
 * - Integer squared Euclidean distance (eliminates Math.sqrt for 95%+ of pixels)
 * - Zero allocation in hot path
 * - Spill suppression for green/blue screen
 * - Edge softness & Hermite transition falloff
 * - Exception safe (guards against canvas taint)
 */
export function applyChromaKeyToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ChromaKeySettings = DEFAULT_CHROMA_KEY_SETTINGS
): void {
  if (!settings || !settings.enabled) return;
  if (width <= 0 || height <= 0) return;

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const [kr, kg, kb] = parseHexToRGB(settings.keyColor || '#00FF00');

    const maxDist = 255 * 1.7320508; // sqrt(3 * 255^2) ~= 441.67
    const similarity = Math.max(0.001, Math.min(1.0, settings.similarity ?? 0.25));
    const smoothness = Math.max(0.001, Math.min(1.0, settings.smoothness ?? 0.10));
    const spill = Math.max(0, Math.min(1.0, settings.spillSuppression ?? 0.5));
    const invert = !!settings.invert;

    const simDist = similarity * maxDist;
    const outerDist = (similarity + smoothness) * maxDist;
    const simSq = simDist * simDist;
    const outerSq = outerDist * outerDist;
    const invSmooth = 1.0 / (outerDist - simDist);

    const isGreenKey = kg > kr && kg > kb;
    const isBlueKey = kb > kr && kb > kg;

    const len = data.length;
    for (let i = 0; i < len; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - kr;
      const dg = g - kg;
      const db = b - kb;
      const dSq = dr * dr + dg * dg + db * db;

      if (dSq <= simSq) {
        data[i + 3] = invert ? a : 0;
        continue;
      }

      if (dSq >= outerSq) {
        if (invert) data[i + 3] = 0;
        continue;
      }

      // Transition feathering zone: Hermite interpolation
      const dist = Math.sqrt(dSq);
      const t = (dist - simDist) * invSmooth;
      const maskAlpha = t * t * (3 - 2 * t);
      const finalAlpha = invert ? (1.0 - maskAlpha) : maskAlpha;

      // Spill suppression on transition edges
      if (spill > 0 && maskAlpha > 0 && maskAlpha < 1.0) {
        if (isGreenKey) {
          const avg = (r + b) >> 1;
          if (g > avg) {
            data[i + 1] = Math.round(g * (1 - spill) + avg * spill);
          }
        } else if (isBlueKey) {
          const avg = (r + g) >> 1;
          if (b > avg) {
            data[i + 2] = Math.round(b * (1 - spill) + avg * spill);
          }
        }
      }

      data[i + 3] = Math.round(a * finalAlpha);
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('[ChromaKey] Preview processing caught exception:', err);
  }
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

export function evaluateChromaKeyPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  keyColor: { r: number; g: number; b: number },
  similarity: number = 0.25,
  smoothness: number = 0.10,
  spill: number = 0.5,
  invert: boolean = false
): { r: number; g: number; b: number; a: number } {
  const maxDist = 255 * 1.7320508;
  const simDist = similarity * maxDist;
  const outerDist = (similarity + smoothness) * maxDist;
  const simSq = simDist * simDist;
  const outerSq = outerDist * outerDist;
  const invSmooth = 1.0 / (outerDist - simDist);

  const dr = r - keyColor.r;
  const dg = g - keyColor.g;
  const db = b - keyColor.b;
  const dSq = dr * dr + dg * dg + db * db;

  if (dSq <= simSq) {
    return { r, g, b, a: invert ? a : 0 };
  }
  if (dSq >= outerSq) {
    return { r, g, b, a: invert ? 0 : a };
  }

  const dist = Math.sqrt(dSq);
  const t = (dist - simDist) * invSmooth;
  const maskAlpha = t * t * (3 - 2 * t);
  const finalAlpha = invert ? (1.0 - maskAlpha) : maskAlpha;

  let outG = g;
  let outB = b;
  const isGreenKey = keyColor.g > keyColor.r && keyColor.g > keyColor.b;
  const isBlueKey = keyColor.b > keyColor.r && keyColor.b > keyColor.g;

  if (spill > 0 && maskAlpha > 0 && maskAlpha < 1.0) {
    if (isGreenKey) {
      const avg = (r + b) >> 1;
      if (g > avg) outG = Math.round(g * (1 - spill) + avg * spill);
    } else if (isBlueKey) {
      const avg = (r + g) >> 1;
      if (b > avg) outB = Math.round(b * (1 - spill) + avg * spill);
    }
  }

  return { r, g: outG, b: outB, a: Math.round(a * finalAlpha) };
}

