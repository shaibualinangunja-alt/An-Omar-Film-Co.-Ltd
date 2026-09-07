/**
 * FreeCut Text Engine - Types & Schemas
 * Type-safe data structures for text elements, typography styles, and animation presets.
 */

export interface TextStroke {
  enabled: boolean;
  color: string;
  width: number; // in pixels
}

export interface TextShadow {
  enabled: boolean;
  color: string;
  blur: number;    // in pixels
  offsetX: number; // in pixels
  offsetY: number; // in pixels
}

export interface TextBackground {
  enabled: boolean;
  color: string;
  opacity: number;      // 0.0 to 1.0
  padding: number;      // in pixels
  borderRadius: number; // in pixels
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number; // in pixels
  fontWeight: 'normal' | 'bold' | '600' | '700' | '800' | '900';
  fontStyle: 'normal' | 'italic';
  color: string; // Hex color, e.g. #FFFFFF
  opacity: number; // 0.0 to 1.0
  textAlign: 'left' | 'center' | 'right';
  alignment?: 'left' | 'center' | 'right';
  letterSpacing: number; // in pixels
  lineSpacing: number; // line height multiplier, e.g. 1.2
  stroke: TextStroke;
  shadow: TextShadow;
  background: TextBackground;
}

export type TextAnimationType =
  | 'none'
  | 'fadeIn'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'zoomIn'
  | 'pop'
  | 'fadeOut'
  | 'zoomOut';

export interface TextAnimationPreset {
  type: TextAnimationType;
  duration: number; // in seconds
}

export interface TextConfig {
  content: string;
  style: TextStyle;
  animationPreset?: TextAnimationPreset;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 'bold',
  fontStyle: 'normal',
  color: '#FFFFFF',
  opacity: 1.0,
  textAlign: 'center',
  alignment: 'center',
  letterSpacing: 0,
  lineSpacing: 1.2,
  stroke: {
    enabled: false,
    color: '#000000',
    width: 2,
  },
  shadow: {
    enabled: false,
    color: 'rgba(0,0,0,0.8)',
    blur: 4,
    offsetX: 2,
    offsetY: 2,
  },
  background: {
    enabled: false,
    color: '#000000',
    opacity: 0.8,
    padding: 12,
    borderRadius: 6,
  },
};

export const DEFAULT_TEXT_CONFIG: TextConfig = {
  content: 'Type something...',
  style: DEFAULT_TEXT_STYLE,
};

export type TextAnimationPresetName = TextAnimationType;

export function createDefaultTextConfig(
  content: string = 'Type something...',
  customStyle?: Partial<TextStyle>
): TextConfig {
  return {
    content,
    style: {
      ...DEFAULT_TEXT_STYLE,
      ...(customStyle || {}),
      stroke: customStyle?.stroke ? { ...DEFAULT_TEXT_STYLE.stroke, ...customStyle.stroke } : DEFAULT_TEXT_STYLE.stroke,
      shadow: customStyle?.shadow ? { ...DEFAULT_TEXT_STYLE.shadow, ...customStyle.shadow } : DEFAULT_TEXT_STYLE.shadow,
      background: customStyle?.background ? { ...DEFAULT_TEXT_STYLE.background, ...customStyle.background } : DEFAULT_TEXT_STYLE.background,
    },
  };
}
