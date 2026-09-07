/**
 * FreeCut Alpha 0.8 Deterministic Auto Color & Tone Analyzer
 * Analyzes frame pixel histograms to calculate conservative corrections
 * for Auto Exposure, Auto White Balance, and Auto Contrast.
 */

import { BasicGradeSettings } from './types';

export interface AutoAnalysisResult {
  recommendedExposure: number;   // EV stops (-2 to +2)
  recommendedContrast: number;   // 0.8 to 1.3
  recommendedTemperature: number;// -50 to +50
  recommendedTint: number;       // -30 to +30
  recommendedSaturation: number; // 0.8 to 1.2
}

export class AutoColorEngine {
  /**
   * Analyzes an ImageData buffer and returns deterministic recommended grade settings.
   */
  static analyzeFrame(imageData: ImageData): AutoAnalysisResult {
    const data = imageData.data;
    const totalPixels = imageData.width * imageData.height;
    if (totalPixels === 0) {
      return {
        recommendedExposure: 0,
        recommendedContrast: 1.0,
        recommendedTemperature: 0,
        recommendedTint: 0,
        recommendedSaturation: 1.0,
      };
    }

    // Subsample up to 20,000 pixels for fast analysis
    const step = Math.max(1, Math.floor(totalPixels / 20000));
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let sampleCount = 0;

    const lumaHistogram = new Uint32Array(256);

    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      rSum += r;
      gSum += g;
      bSum += b;

      // Rec.709 Luma
      const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      lumaHistogram[Math.min(255, y)]++;
      sampleCount++;
    }

    const rAvg = rSum / sampleCount;
    const gAvg = gSum / sampleCount;
    const bAvg = bSum / sampleCount;
    const meanLuma = 0.2126 * rAvg + 0.7152 * gAvg + 0.0722 * bAvg;

    // 1. Exposure: target midtone luminance around 110-128 (in 0-255 sRGB)
    let recommendedExposure = 0;
    if (meanLuma > 10 && meanLuma < 245) {
      const targetLuma = 118;
      const ratio = targetLuma / meanLuma;
      // Convert ratio to log2 EV stops, conservative dampening by 0.5
      recommendedExposure = Math.max(-2.0, Math.min(2.0, Math.log2(ratio) * 0.5));
    }

    // 2. White balance: calculate temperature (R vs B) and tint (G vs (R+B)/2)
    const rbAvg = (rAvg + bAvg) / 2;
    // Positive temperature warms (boosts R / reduces B), negative cools
    const tempDelta = (bAvg - rAvg) / 255;
    const recommendedTemperature = Math.max(-40, Math.min(40, Math.round(tempDelta * 80)));

    const tintDelta = (rbAvg - gAvg) / 255;
    const recommendedTint = Math.max(-30, Math.min(30, Math.round(tintDelta * 60)));

    // 3. Contrast: analyze 1st and 99th percentiles
    let countSoFar = 0;
    let p1 = 0;
    let p99 = 255;
    const p1Threshold = sampleCount * 0.01;
    const p99Threshold = sampleCount * 0.99;

    for (let i = 0; i < 256; i++) {
      countSoFar += lumaHistogram[i];
      if (p1 === 0 && countSoFar >= p1Threshold) {
        p1 = i;
      }
      if (countSoFar >= p99Threshold) {
        p99 = i;
        break;
      }
    }

    const currentSpread = Math.max(20, p99 - p1);
    const targetSpread = 220;
    const contrastRatio = targetSpread / currentSpread;
    const recommendedContrast = Math.max(0.85, Math.min(1.35, 1.0 + (contrastRatio - 1.0) * 0.4));

    return {
      recommendedExposure: Number(recommendedExposure.toFixed(2)),
      recommendedContrast: Number(recommendedContrast.toFixed(2)),
      recommendedTemperature,
      recommendedTint,
      recommendedSaturation: 1.0,
    };
  }

  /**
   * Applies auto correction to an existing basic grade settings object
   */
  static applyAutoCorrections(
    current: BasicGradeSettings,
    analysis: AutoAnalysisResult,
    options: { exposure?: boolean; wb?: boolean; contrast?: boolean } = { exposure: true, wb: true, contrast: true }
  ): BasicGradeSettings {
    return {
      ...current,
      exposure: options.exposure ? current.exposure + analysis.recommendedExposure : current.exposure,
      temperature: options.wb ? current.temperature + analysis.recommendedTemperature : current.temperature,
      tint: options.wb ? current.tint + analysis.recommendedTint : current.tint,
      contrast: options.contrast ? Number((current.contrast * analysis.recommendedContrast).toFixed(2)) : current.contrast,
    };
  }
}
