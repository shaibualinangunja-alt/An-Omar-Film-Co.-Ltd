/**
 * FreeCut Alpha 0.8 Original Built-in Quick Looks
 * Original creative presets providing instant cinematic and professional aesthetics.
 */

import { QuickLookId, ColorGradeSettings, DEFAULT_COLOR_GRADE } from './types';

export interface QuickLookDescriptor {
  id: QuickLookId;
  name: string;
  description: string;
  previewColor: string; // Accent badge color
  grade: Partial<ColorGradeSettings>;
}

export class QuickLooksRegistry {
  private static looks: QuickLookDescriptor[] = [
    {
      id: 'none',
      name: 'None / Neutral',
      description: 'Original unaltered source color.',
      previewColor: '#64748b',
      grade: {},
    },
    {
      id: 'clean',
      name: 'FreeCut Clean',
      description: 'Clean commercial look with crisp neutral contrast and slight highlight clarity.',
      previewColor: '#0ea5e9',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.08,
          saturation: 1.05,
          highlights: -0.05,
          shadows: 0.05,
          whites: 0.04,
          blacks: -0.02,
        },
      },
    },
    {
      id: 'cinematic',
      name: 'Cinematic Teal & Gold',
      description: 'Modern widescreen aesthetic with rich warm skin highlights and deep cyan shadows.',
      previewColor: '#0d9488',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.15,
          saturation: 1.08,
          temperature: 8,
          highlights: -0.1,
          shadows: -0.05,
        },
        wheels: {
          lift: { r: -0.04, g: 0.02, b: 0.06, y: -0.02 }, // Teal/cyan shadows
          gamma: { r: 0.02, g: 0.01, b: -0.02, y: 0 },
          gain: { r: 0.08, g: 0.04, b: -0.04, y: 0.02 },  // Warm golden highlights
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    {
      id: 'warm',
      name: 'Golden Hour Warmth',
      description: 'Radiant sunset glow with rich amber warmth and softened contrast.',
      previewColor: '#f59e0b',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.04,
          temperature: 24,
          tint: 6,
          saturation: 1.12,
          highlights: 0.08,
        },
        wheels: {
          lift: { r: 0.02, g: 0.01, b: -0.02, y: 0 },
          gamma: { r: 0.04, g: 0.02, b: -0.03, y: 0 },
          gain: { r: 0.06, g: 0.03, b: -0.04, y: 0 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    {
      id: 'cool',
      name: 'Nordic Cool',
      description: 'Desaturated mood with crisp arctic blues and controlled midtones.',
      previewColor: '#38bdf8',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.06,
          temperature: -22,
          tint: -4,
          saturation: 0.88,
          shadows: 0.04,
        },
        wheels: {
          lift: { r: -0.03, g: 0.01, b: 0.05, y: 0 },
          gamma: { r: -0.02, g: 0.0, b: 0.04, y: 0 },
          gain: { r: -0.01, g: 0.0, b: 0.02, y: 0 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    {
      id: 'film',
      name: 'Vintage 35mm Film',
      description: 'Analog film emulation featuring lifted matte blacks and gentle organic roll-off.',
      previewColor: '#a855f7',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.12,
          saturation: 0.95,
          blacks: 0.08, // lifted matte blacks
          highlights: -0.12,
          whites: -0.05,
        },
        curves: {
          master: [
            { x: 0, y: 0.06 }, // lifted black toe
            { x: 0.25, y: 0.22 },
            { x: 0.75, y: 0.78 },
            { x: 1, y: 0.94 }, // soft shoulder
          ],
          red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          blue: [{ x: 0, y: 0.04 }, { x: 1, y: 0.96 }], // subtle blue lift
        },
      },
    },
    {
      id: 'high_contrast',
      name: 'Punchy Noir Contrast',
      description: 'High impact deep blacks and crisp highlights for bold, dramatic imagery.',
      previewColor: '#ef4444',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.32,
          saturation: 1.1,
          blacks: -0.12,
          whites: 0.1,
          highlights: 0.05,
          shadows: -0.08,
        },
      },
    },
    {
      id: 'soft',
      name: 'Velvet Dream Soft',
      description: 'Dreamy low-contrast portrait aesthetic with pastel skin tones and airy shadows.',
      previewColor: '#f472b6',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 0.88,
          saturation: 0.92,
          shadows: 0.12,
          highlights: -0.08,
          temperature: 4,
          tint: 4,
        },
      },
    },
    {
      id: 'natural',
      name: 'Vibrant Natural',
      description: 'Optimized true-to-life color enhancement with intelligent vibrance preservation.',
      previewColor: '#10b981',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.05,
          vibrance: 0.22,
          saturation: 1.04,
          highlights: -0.04,
          shadows: 0.06,
        },
      },
    },
  ];

  static listLooks(): QuickLookDescriptor[] {
    return this.looks;
  }

  static getLook(id: QuickLookId): QuickLookDescriptor {
    return this.looks.find(l => l.id === id) || this.looks[0];
  }

  /**
   * Applies the selected Quick Look to base grade settings, blending by intensity
   */
  static applyLookWithIntensity(
    base: ColorGradeSettings,
    lookId: QuickLookId,
    intensity: number = 1.0
  ): ColorGradeSettings {
    const descriptor = this.getLook(lookId);
    if (lookId === 'none' || intensity <= 0.01) {
      return {
        ...base,
        quickGrade: { ...base.quickGrade, lookId, intensity },
      };
    }

    const lookGrade = descriptor.grade;
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    // Blend basic parameters
    const mergedBasic = { ...base.basic };
    if (lookGrade.basic) {
      for (const key of Object.keys(lookGrade.basic) as (keyof typeof lookGrade.basic)[]) {
        const lookVal = lookGrade.basic[key] ?? DEFAULT_COLOR_GRADE.basic[key];
        const defaultVal = DEFAULT_COLOR_GRADE.basic[key];
        const delta = lookVal - defaultVal;
        (mergedBasic as any)[key] = defaultVal + delta * clampedIntensity;
      }
    }

    // Blend wheels
    const mergedWheels = { ...base.wheels };
    if (lookGrade.wheels) {
      for (const w of ['lift', 'gamma', 'gain', 'offset'] as const) {
        if (lookGrade.wheels[w]) {
          mergedWheels[w] = {
            r: lookGrade.wheels[w].r * clampedIntensity,
            g: lookGrade.wheels[w].g * clampedIntensity,
            b: lookGrade.wheels[w].b * clampedIntensity,
            y: lookGrade.wheels[w].y * clampedIntensity,
          };
        }
      }
    }

    return {
      ...base,
      quickGrade: {
        ...base.quickGrade,
        lookId,
        intensity: clampedIntensity,
      },
      basic: mergedBasic,
      wheels: mergedWheels,
      curves: lookGrade.curves && clampedIntensity > 0.5 ? lookGrade.curves : base.curves,
    };
  }
}
