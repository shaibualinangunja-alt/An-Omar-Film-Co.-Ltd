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
      id: 'natural',
      name: 'Natural Enhancement',
      description: 'Faithful skin tones with gentle contrast and subtle shadow recovery.',
      previewColor: '#10b981',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.04,
          saturation: 1.03,
          highlights: -0.04,
          shadows: 0.04,
          whites: 0.02,
          blacks: -0.01,
        },
      },
    },
    {
      id: 'clean',
      name: 'Clean Commercial',
      description: 'Crisp midtones and neutral clean clarity without highlight harshness.',
      previewColor: '#0ea5e9',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.06,
          saturation: 1.04,
          highlights: -0.05,
          shadows: 0.03,
          whites: 0.03,
          blacks: -0.02,
        },
      },
    },
    {
      id: 'cinematic_warm',
      name: 'Cinematic Warm',
      description: 'Gentle warm push in highlights with rich contrast and protected skin tones.',
      previewColor: '#f97316',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.08,
          temperature: 10,
          saturation: 1.04,
          highlights: -0.06,
          shadows: 0.02,
        },
        wheels: {
          lift: { r: 0.01, g: 0.0, b: -0.01, y: 0 },
          gamma: { r: 0.02, g: 0.01, b: -0.01, y: 0 },
          gain: { r: 0.04, g: 0.02, b: -0.02, y: 0.01 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    {
      id: 'cinematic_cool',
      name: 'Cinematic Cool',
      description: 'Controlled cool shadows with preserved skin luminescence and deep film blacks.',
      previewColor: '#38bdf8',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.07,
          temperature: -12,
          saturation: 0.96,
          highlights: -0.04,
          shadows: 0.03,
        },
        wheels: {
          lift: { r: -0.02, g: 0.0, b: 0.03, y: 0 },
          gamma: { r: -0.01, g: 0.0, b: 0.01, y: 0 },
          gain: { r: 0.01, g: 0.01, b: -0.01, y: 0 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    {
      id: 'soft_film',
      name: 'Soft Film',
      description: 'Gentle highlight roll-off and softly lifted blacks with organic tonal response.',
      previewColor: '#a855f7',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 0.98,
          saturation: 0.96,
          highlights: -0.10,
          shadows: 0.06,
          blacks: 0.03,
        },
      },
    },
    {
      id: 'moody_cinema',
      name: 'Moody Cinema',
      description: 'Atmospheric deep tones with protected skin details and rich shadow contrast.',
      previewColor: '#6366f1',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.10,
          brightness: -0.03,
          saturation: 0.94,
          highlights: -0.08,
          shadows: -0.04,
        },
        wheels: {
          lift: { r: -0.02, g: -0.01, b: 0.02, y: -0.01 },
          gamma: { r: 0.01, g: 0.0, b: -0.01, y: 0 },
          gain: { r: 0.02, g: 0.01, b: -0.01, y: 0 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    {
      id: 'golden_hour',
      name: 'Golden Hour',
      description: 'Radiant amber sunset glow with soft highlight bloom and warm ambiance.',
      previewColor: '#eab308',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.05,
          temperature: 16,
          tint: 4,
          saturation: 1.06,
          highlights: 0.02,
          shadows: 0.02,
        },
        wheels: {
          lift: { r: 0.02, g: 0.01, b: -0.02, y: 0 },
          gamma: { r: 0.03, g: 0.015, b: -0.02, y: 0 },
          gain: { r: 0.05, g: 0.025, b: -0.03, y: 0.01 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    {
      id: 'night_cinema',
      name: 'Night Cinema',
      description: 'Deep nocturnal blue shadow tones with crisp tungsten highlights.',
      previewColor: '#1e3a8a',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.08,
          brightness: -0.04,
          temperature: -16,
          saturation: 0.92,
          highlights: -0.06,
          shadows: 0.02,
        },
        wheels: {
          lift: { r: -0.03, g: -0.01, b: 0.04, y: 0 },
          gamma: { r: -0.01, g: 0.0, b: 0.02, y: 0 },
          gain: { r: 0.03, g: 0.02, b: -0.01, y: 0 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    {
      id: 'documentary',
      name: 'Documentary',
      description: 'Real-world dynamic range with subtle highlight recovery and lifelike skin tones.',
      previewColor: '#84cc16',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.02,
          saturation: 1.01,
          highlights: -0.06,
          shadows: 0.04,
          whites: 0.01,
          blacks: 0.01,
        },
      },
    },
    {
      id: 'teal_orange',
      name: 'Teal & Orange (Controlled)',
      description: 'Harmonious Hollywood split-toning with strict skin protection and gentle cyan shadows.',
      previewColor: '#06b6d4',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 1.09,
          temperature: 6,
          saturation: 1.04,
          highlights: -0.06,
          shadows: -0.02,
        },
        wheels: {
          lift: { r: -0.03, g: 0.01, b: 0.04, y: -0.01 }, // Subtle cyan/teal
          gamma: { r: 0.01, g: 0.0, b: -0.01, y: 0 },
          gain: { r: 0.04, g: 0.02, b: -0.03, y: 0.01 },  // Controlled warm amber
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    {
      id: 'vintage_film',
      name: 'Vintage Film (Controlled)',
      description: 'Nostalgic analog film response with softened contrast and creamy highlights.',
      previewColor: '#d97706',
      grade: {
        basic: {
          ...DEFAULT_COLOR_GRADE.basic,
          contrast: 0.98,
          temperature: 8,
          saturation: 0.94,
          highlights: -0.08,
          shadows: 0.05,
          blacks: 0.03,
        },
        wheels: {
          lift: { r: 0.02, g: 0.01, b: -0.01, y: 0.01 },
          gamma: { r: 0.01, g: 0.01, b: -0.01, y: 0 },
          gain: { r: 0.03, g: 0.02, b: -0.02, y: 0 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
        },
      },
    },
    // Aliases for backward compatibility
    {
      id: 'cinematic',
      name: 'Cinematic (Legacy)',
      description: 'Legacy cinematic look.',
      previewColor: '#0d9488',
      grade: {
        basic: { ...DEFAULT_COLOR_GRADE.basic, contrast: 1.08, saturation: 1.04 },
      },
    },
    {
      id: 'warm',
      name: 'Warm (Legacy)',
      description: 'Legacy warm look.',
      previewColor: '#f59e0b',
      grade: {
        basic: { ...DEFAULT_COLOR_GRADE.basic, temperature: 14, saturation: 1.05 },
      },
    },
    {
      id: 'cool',
      name: 'Cool (Legacy)',
      description: 'Legacy cool look.',
      previewColor: '#38bdf8',
      grade: {
        basic: { ...DEFAULT_COLOR_GRADE.basic, temperature: -14, saturation: 0.95 },
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

export const QUICK_LOOK_PRESETS = QuickLooksRegistry.listLooks();
export const getQuickLookPreset = (id: QuickLookId) => QuickLooksRegistry.getLook(id);

