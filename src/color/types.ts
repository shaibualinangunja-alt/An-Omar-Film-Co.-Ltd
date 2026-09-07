/**
 * FreeCut Alpha 0.8 Color Management & Grading Types
 */

export type StandardColorSpace =
  | 'rec709'
  | 'srgb'
  | 'rec601'
  | 'rec2020'
  | 'rec2100_pq'
  | 'rec2100_hlg'
  | 'sony_slog3'
  | 'canon_clog'
  | 'panasonic_vlog'
  | 'arri_logc'
  | 'apple_log'
  | 'dji_dlog'
  | 'fuji_flog'
  | 'bmd_gen5';

export type WorkingColorSpace = 'rec709' | 'rec2020' | 'acescg' | 'linear';
export type OutputColorSpace = 'rec709' | 'srgb' | 'rec2020' | 'rec2100_pq' | 'rec2100_hlg';
export type ColorRange = 'full' | 'limited';

export interface ColorSpaceDescriptor {
  id: StandardColorSpace;
  name: string;
  category: 'sdr' | 'hdr' | 'log' | 'wide_gamut';
  gamma: string;
  primaries: string;
  isHdr: boolean;
  isLog: boolean;
  description: string;
}

export interface CurvePoint {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
}

export interface ColorCurves {
  master: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export interface ColorWheelValue {
  r: number; // -1.0 to 1.0
  g: number; // -1.0 to 1.0
  b: number; // -1.0 to 1.0
  y: number; // -1.0 to 1.0 (Luma/Master)
}

export interface ColorWheels {
  lift: ColorWheelValue;   // Shadows
  gamma: ColorWheelValue;  // Midtones
  gain: ColorWheelValue;   // Highlights
  offset: ColorWheelValue; // Global offset
}

export interface HSLQualifier {
  enabled: boolean;
  hueCenter: number; // 0 to 360 degrees
  hueWidth: number;  // 10 to 180 degrees
  satMin: number;    // 0.0 to 1.0
  satMax: number;    // 0.0 to 1.0
  lumMin: number;    // 0.0 to 1.0
  lumMax: number;    // 0.0 to 1.0
  softness: number;  // 0.0 to 1.0
  hueShift: number;  // -180 to +180
  satShift: number;  // -1.0 to +1.0
  lumShift: number;  // -1.0 to +1.0
}

export interface LUTSettings {
  enabled: boolean;
  lutPath: string;
  name: string;
  intensity: number; // 0.0 to 1.0
  size3d?: number;
}

export type QuickLookId =
  | 'none'
  | 'clean'
  | 'cinematic'
  | 'warm'
  | 'cool'
  | 'film'
  | 'high_contrast'
  | 'soft'
  | 'natural';

export interface QuickGradeSettings {
  lookId: QuickLookId;
  intensity: number; // 0.0 to 1.0
  autoExposureApplied: boolean;
  autoWhiteBalanceApplied: boolean;
  autoContrastApplied: boolean;
}

export interface BasicGradeSettings {
  exposure: number;   // -5.0 to +5.0 EV stops (0 = neutral)
  contrast: number;   // 0.5 to 2.0 (1.0 = neutral)
  pivot: number;      // 0.0 to 1.0 (0.435 = neutral)
  temperature: number;// -100 to +100 (0 = neutral)
  tint: number;       // -100 to +100 (0 = neutral)
  saturation: number; // 0.0 to 2.0 (1.0 = neutral)
  vibrance: number;   // -1.0 to +1.0 (0 = neutral)
  highlights: number; // -1.0 to +1.0 (0 = neutral)
  shadows: number;    // -1.0 to +1.0 (0 = neutral)
  whites: number;     // -1.0 to +1.0 (0 = neutral)
  blacks: number;     // -1.0 to +1.0 (0 = neutral)
  hue: number;        // -180 to +180 (0 = neutral)
}

export interface ColorGradeSettings {
  enabled: boolean;
  quickGrade: QuickGradeSettings;
  basic: BasicGradeSettings;
  wheels: ColorWheels;
  curves: ColorCurves;
  hsl: HSLQualifier;
  lut: LUTSettings;
}

export interface ColorManagementSettings {
  inputColorSpace: StandardColorSpace;
  workingColorSpace: WorkingColorSpace;
  outputColorSpace: OutputColorSpace;
  colorRange: ColorRange;
  autoDetect: boolean;
}

export const DEFAULT_COLOR_CURVES: ColorCurves = {
  master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
};

export const DEFAULT_COLOR_WHEELS: ColorWheels = {
  lift: { r: 0, g: 0, b: 0, y: 0 },
  gamma: { r: 0, g: 0, b: 0, y: 0 },
  gain: { r: 0, g: 0, b: 0, y: 0 },
  offset: { r: 0, g: 0, b: 0, y: 0 },
};

export const DEFAULT_BASIC_GRADE: BasicGradeSettings = {
  exposure: 0,
  contrast: 1.0,
  pivot: 0.435,
  temperature: 0,
  tint: 0,
  saturation: 1.0,
  vibrance: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  hue: 0,
};

export const DEFAULT_HSL_QUALIFIER: HSLQualifier = {
  enabled: false,
  hueCenter: 45, // Skin/warm default
  hueWidth: 30,
  satMin: 0.15,
  satMax: 0.85,
  lumMin: 0.15,
  lumMax: 0.85,
  softness: 0.2,
  hueShift: 0,
  satShift: 0,
  lumShift: 0,
};

export const DEFAULT_COLOR_GRADE: ColorGradeSettings = {
  enabled: true,
  quickGrade: {
    lookId: 'none',
    intensity: 1.0,
    autoExposureApplied: false,
    autoWhiteBalanceApplied: false,
    autoContrastApplied: false,
  },
  basic: DEFAULT_BASIC_GRADE,
  wheels: DEFAULT_COLOR_WHEELS,
  curves: DEFAULT_COLOR_CURVES,
  hsl: DEFAULT_HSL_QUALIFIER,
  lut: {
    enabled: false,
    lutPath: '',
    name: 'None',
    intensity: 1.0,
  },
};

export const DEFAULT_COLOR_MANAGEMENT: ColorManagementSettings = {
  inputColorSpace: 'rec709',
  workingColorSpace: 'rec709',
  outputColorSpace: 'rec709',
  colorRange: 'limited',
  autoDetect: true,
};
