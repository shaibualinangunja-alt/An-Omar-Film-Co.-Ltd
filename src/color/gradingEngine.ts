/**
 * FreeCut Alpha 0.8 Deterministic Canvas Color Grading Engine
 * Real-time pixel processing pipeline:
 * Input -> Basic (Exposure/WB/Contrast/Vibrance) -> Wheels (Lift/Gamma/Gain) -> Curves -> HSL Qualifier -> LUT
 */

import {
  ColorGradeSettings,
  CurvePoint,
  HSLQualifier,
} from './types';
import { LUTService, Parsed3DLUT } from './lutService';

export class GradingEngine {
  private static parsedLutCache = new Map<string, Parsed3DLUT>();

  /**
   * Applies the complete color grading pipeline to an HTMLCanvasElement
   */
  static applyGradingToCanvas(
    canvas: HTMLCanvasElement,
    settings: ColorGradeSettings | undefined
  ): void {
    if (!settings || !settings.enabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    this.processImageData(imageData, settings);
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Process ImageData in-place through all grading stages
   */
  static processImageData(imageData: ImageData, settings: ColorGradeSettings): void {
    const data = imageData.data;
    const len = data.length;

    const basic = settings.basic;
    const wheels = settings.wheels;
    const curves = settings.curves;
    const hsl = settings.hsl;
    const lut = settings.lut;

    // Precalculate curve lookup tables (0..255) for O(1) pixel processing
    const masterLut = this.buildCurveLut(curves.master);
    const redLut = this.buildCurveLut(curves.red);
    const greenLut = this.buildCurveLut(curves.green);
    const blueLut = this.buildCurveLut(curves.blue);

    // Exposure multiplier: 2^exposure
    const expMult = Math.pow(2, basic.exposure);

    // Temp & Tint offsets
    const tempR = 1.0 + (basic.temperature / 100) * 0.3;
    const tempB = 1.0 - (basic.temperature / 100) * 0.3;
    const tintG = 1.0 - (basic.tint / 100) * 0.2;
    const tintM = 1.0 + (basic.tint / 100) * 0.15; // R & B boost

    // Contrast & Pivot
    const contrast = basic.contrast;
    const pivot = basic.pivot;

    // Saturation & Vibrance
    const sat = basic.saturation;
    const vib = basic.vibrance;

    // Highlights & Shadows
    const high = basic.highlights;
    const shad = basic.shadows;
    const whites = basic.whites;
    const blacks = basic.blacks;

    // Color Wheels weights
    const hasWheels =
      wheels.lift.r !== 0 || wheels.lift.g !== 0 || wheels.lift.b !== 0 || wheels.lift.y !== 0 ||
      wheels.gamma.r !== 0 || wheels.gamma.g !== 0 || wheels.gamma.b !== 0 || wheels.gamma.y !== 0 ||
      wheels.gain.r !== 0 || wheels.gain.g !== 0 || wheels.gain.b !== 0 || wheels.gain.y !== 0 ||
      wheels.offset.r !== 0 || wheels.offset.g !== 0 || wheels.offset.b !== 0 || wheels.offset.y !== 0;

    // LUT lookup
    let parsedLut: Parsed3DLUT | null = null;
    if (lut.enabled && lut.lutPath && lut.intensity > 0) {
      parsedLut = this.parsedLutCache.get(lut.lutPath) || null;
    }

    for (let i = 0; i < len; i += 4) {
      let r = data[i] / 255.0;
      let g = data[i + 1] / 255.0;
      let b = data[i + 2] / 255.0;

      // ----------------------------------------------------
      // 1. BASIC GRADING: Exposure, Temp/Tint
      // ----------------------------------------------------
      if (expMult !== 1.0) {
        r *= expMult;
        g *= expMult;
        b *= expMult;
      }

      if (basic.temperature !== 0 || basic.tint !== 0) {
        r *= tempR * tintM;
        g *= tintG;
        b *= tempB * tintM;
      }

      // Tonal: Highlights & Shadows & Whites & Blacks
      let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      if (shad !== 0 || high !== 0 || whites !== 0 || blacks !== 0) {
        const shadowFactor = Math.max(0, 1.0 - luma * 2.0); // peaks at 0, goes to 0 at 0.5
        const highlightFactor = Math.max(0, (luma - 0.5) * 2.0); // 0 at 0.5, peaks at 1.0
        const blackFactor = Math.max(0, 1.0 - luma * 5.0);
        const whiteFactor = Math.max(0, (luma - 0.8) * 5.0);

        const tonalShift =
          shad * shadowFactor * 0.3 +
          high * highlightFactor * 0.3 +
          blacks * blackFactor * 0.25 +
          whites * whiteFactor * 0.25;

        r += tonalShift;
        g += tonalShift;
        b += tonalShift;
      }

      // Contrast & Pivot
      if (contrast !== 1.0) {
        r = (r - pivot) * contrast + pivot;
        g = (g - pivot) * contrast + pivot;
        b = (b - pivot) * contrast + pivot;
      }

      // Saturation & Vibrance
      luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const maxC = Math.max(r, Math.max(g, b));
      const minC = Math.min(r, Math.min(g, b));
      const pixelSat = maxC > 0.001 ? (maxC - minC) / maxC : 0;

      let effectiveSat = sat;
      if (vib !== 0) {
        // Boost low-sat colors more than high-sat colors
        const vibFactor = 1.0 + vib * (1.0 - pixelSat);
        effectiveSat *= Math.max(0, vibFactor);
      }

      if (effectiveSat !== 1.0) {
        r = luma + (r - luma) * effectiveSat;
        g = luma + (g - luma) * effectiveSat;
        b = luma + (b - luma) * effectiveSat;
      }

      // ----------------------------------------------------
      // 2. COLOR WHEELS (Lift, Gamma, Gain, Offset)
      // ----------------------------------------------------
      if (hasWheels) {
        luma = Math.max(0, Math.min(1, 0.2126 * r + 0.7152 * g + 0.0722 * b));
        const liftWeight = Math.max(0, 1.0 - luma);
        const gainWeight = luma;
        const gammaWeight = 4.0 * luma * (1.0 - luma); // Bell curve peaking at 0.5

        const rWheel =
          (wheels.lift.r + wheels.lift.y) * liftWeight +
          (wheels.gamma.r + wheels.gamma.y) * gammaWeight +
          (wheels.gain.r + wheels.gain.y) * gainWeight +
          (wheels.offset.r + wheels.offset.y);

        const gWheel =
          (wheels.lift.g + wheels.lift.y) * liftWeight +
          (wheels.gamma.g + wheels.gamma.y) * gammaWeight +
          (wheels.gain.g + wheels.gain.y) * gainWeight +
          (wheels.offset.g + wheels.offset.y);

        const bWheel =
          (wheels.lift.b + wheels.lift.y) * liftWeight +
          (wheels.gamma.b + wheels.gamma.y) * gammaWeight +
          (wheels.gain.b + wheels.gain.y) * gainWeight +
          (wheels.offset.b + wheels.offset.y);

        r += rWheel * 0.4;
        g += gWheel * 0.4;
        b += bWheel * 0.4;
      }

      // ----------------------------------------------------
      // 3. CURVES (Master, Red, Green, Blue)
      // ----------------------------------------------------
      const rIdx = Math.max(0, Math.min(255, Math.round(r * 255)));
      const gIdx = Math.max(0, Math.min(255, Math.round(g * 255)));
      const bIdx = Math.max(0, Math.min(255, Math.round(b * 255)));

      // Apply master then channel curves
      r = redLut[masterLut[rIdx]];
      g = greenLut[masterLut[gIdx]];
      b = blueLut[masterLut[bIdx]];

      // ----------------------------------------------------
      // 4. HSL SECONDARY QUALIFIER
      // ----------------------------------------------------
      if (hsl && hsl.enabled) {
        const [h, s, l] = this.rgbToHsl(r, g, b);
        const mask = this.evaluateHslMask(h, s, l, hsl);
        if (mask > 0.01) {
          let newH = (h + hsl.hueShift * mask + 360) % 360;
          let newS = Math.max(0, Math.min(1, s + hsl.satShift * mask));
          let newL = Math.max(0, Math.min(1, l + hsl.lumShift * mask));
          const [qr, qg, qb] = this.hslToRgb(newH, newS, newL);
          r = r * (1 - mask) + qr * mask;
          g = g * (1 - mask) + qg * mask;
          b = b * (1 - mask) + qb * mask;
        }
      }

      // ----------------------------------------------------
      // 5. 3D LUT
      // ----------------------------------------------------
      if (parsedLut) {
        const [lr, lg, lb] = LUTService.apply3DLUT(parsedLut, r, g, b, lut.intensity);
        r = lr;
        g = lg;
        b = lb;
      }

      data[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round(b * 255)));
    }
  }

  /**
   * Builds a 256-entry lookup table for a spline curve
   */
  static buildCurveLut(points: CurvePoint[]): Uint8Array {
    const lut = new Uint8Array(256);
    if (!points || points.length === 0) {
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }

    // Sort control points by x
    const sorted = [...points].sort((a, b) => a.x - b.x);

    for (let i = 0; i < 256; i++) {
      const x = i / 255.0;

      if (x <= sorted[0].x) {
        lut[i] = Math.max(0, Math.min(255, Math.round(sorted[0].y * 255)));
        continue;
      }
      if (x >= sorted[sorted.length - 1].x) {
        lut[i] = Math.max(0, Math.min(255, Math.round(sorted[sorted.length - 1].y * 255)));
        continue;
      }

      // Find segment [p0, p1]
      let idx = 0;
      while (idx < sorted.length - 1 && sorted[idx + 1].x < x) {
        idx++;
      }

      const p0 = sorted[idx];
      const p1 = sorted[idx + 1];
      const span = p1.x - p0.x;
      const t = span > 0 ? (x - p0.x) / span : 0;

      // Smooth Hermite interpolation
      const smoothT = t * t * (3 - 2 * t);
      const y = p0.y + (p1.y - p0.y) * smoothT;

      lut[i] = Math.max(0, Math.min(255, Math.round(y * 255)));
    }

    return lut;
  }

  static cacheParsedLut(path: string, lut: Parsed3DLUT): void {
    this.parsedLutCache.set(path, lut);
  }

  static rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }

    return [h, s, l];
  }

  static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, (h / 360) + 1 / 3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, (h / 360) - 1 / 3);
    }

    return [r, g, b];
  }

  private static evaluateHslMask(h: number, s: number, l: number, q: HSLQualifier): number {
    // Hue difference on circle
    let hueDiff = Math.abs(h - q.hueCenter);
    if (hueDiff > 180) hueDiff = 360 - hueDiff;

    const halfWidth = q.hueWidth / 2;
    const softnessHue = (q.softness * 30);

    let hMask = 0;
    if (hueDiff <= halfWidth) {
      hMask = 1.0;
    } else if (hueDiff <= halfWidth + softnessHue) {
      hMask = 1.0 - (hueDiff - halfWidth) / softnessHue;
    } else {
      return 0;
    }

    // Saturation mask
    const softSat = q.softness * 0.2;
    let sMask = 0;
    if (s >= q.satMin && s <= q.satMax) {
      sMask = 1.0;
    } else if (s < q.satMin && s >= q.satMin - softSat) {
      sMask = (s - (q.satMin - softSat)) / softSat;
    } else if (s > q.satMax && s <= q.satMax + softSat) {
      sMask = 1.0 - (s - q.satMax) / softSat;
    } else {
      return 0;
    }

    // Luminance mask
    const softLum = q.softness * 0.2;
    let lMask = 0;
    if (l >= q.lumMin && l <= q.lumMax) {
      lMask = 1.0;
    } else if (l < q.lumMin && l >= q.lumMin - softLum) {
      lMask = (l - (q.lumMin - softLum)) / softLum;
    } else if (l > q.lumMax && l <= q.lumMax + softLum) {
      lMask = 1.0 - (l - q.lumMax) / softLum;
    } else {
      return 0;
    }

    return hMask * sMask * lMask;
  }
}
