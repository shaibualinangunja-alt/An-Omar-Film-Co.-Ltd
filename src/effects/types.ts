/**
 * FreeCut Effect Engine - Data Models & Types
 * Defines type-safe effect schemas, parameter definitions, and effect instances.
 */

import { AnimationTrack } from '../animation/types';

export type EffectType =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'grayscale'
  | 'sharpen'
  | 'vignette'
  | 'chromaKey';

export interface EffectParameterSchema {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'color';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number | boolean | string;
  unit?: string;
  animatable?: boolean;
}

export interface EffectInstance {
  id: string;
  effectType: EffectType;
  enabled: boolean;
  parameters: Record<string, number | boolean | string>;
  animations?: Partial<Record<string, AnimationTrack<number>>>;
}

export interface EffectDescriptor {
  type: EffectType;
  name: string;
  description: string;
  category: 'color' | 'blur' | 'stylize';
  parameters: EffectParameterSchema[];
  defaultParameters: Record<string, number | boolean | string>;
  applyCanvas: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: Record<string, number | boolean | string>
  ) => void;
  compileFFmpeg: (params: Record<string, number | boolean | string>) => string;
}
