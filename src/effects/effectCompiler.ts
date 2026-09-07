/**
 * FreeCut Effect Compiler
 * Evaluates keyframed effect parameters and compiles effect stacks into canvas filters and FFmpeg filter chains.
 */

import { EffectInstance } from './types';
import { EffectRegistry } from './registry';
import { evaluateAnimationTrack } from '../animation/evaluator';
import { cloneAnimationTracks } from '../animation/animationUtils';

export function generateEffectId(): string {
  return 'ef_' + Math.random().toString(36).substring(2, 11);
}

/**
 * Deep clones an effect stack with regenerated effect and keyframe IDs.
 */
export function cloneEffects(effects?: EffectInstance[]): EffectInstance[] | undefined {
  if (!effects) return undefined;

  return effects.map(ef => ({
    id: generateEffectId(),
    effectType: ef.effectType,
    enabled: ef.enabled,
    parameters: { ...ef.parameters },
    animations: cloneAnimationTracks(ef.animations as any) as any,
  }));
}

/**
 * Evaluates all parameter values for an effect instance at a given clip-relative playhead time.
 * If a parameter contains keyframes, evaluates through the keyframe engine.
 */
export function evaluateEffectParameters(
  effect: EffectInstance,
  relativeTime: number
): Record<string, number | boolean | string> {
  const evaluated: Record<string, number | boolean | string> = {};
  const descriptor = EffectRegistry.getEffect(effect.effectType);
  const defaults = descriptor?.defaultParameters || {};

  for (const [key, staticVal] of Object.entries({ ...defaults, ...effect.parameters })) {
    const track = effect.animations?.[key];
    if (track && track.keyframes && track.keyframes.length > 0 && typeof staticVal === 'number') {
      evaluated[key] = evaluateAnimationTrack(track, relativeTime, staticVal);
    } else {
      evaluated[key] = staticVal;
    }
  }

  return evaluated;
}

/**
 * Computes a combined CSS filter string for canvas 2D based on active effects (blur, brightness, etc.).
 */
export function getCanvasFilterString(
  effects: EffectInstance[] | undefined,
  relativeTime: number
): string {
  if (!effects || effects.length === 0) return 'none';

  const filterParts: string[] = [];

  for (const effect of effects) {
    if (!effect.enabled) continue;
    const params = evaluateEffectParameters(effect, relativeTime);

    switch (effect.effectType) {
      case 'blur': {
        const amount = Number(params.amount ?? 10);
        if (amount > 0) filterParts.push(`blur(${amount}px)`);
        break;
      }
      case 'brightness': {
        const amount = Number(params.amount ?? 0);
        const factor = Math.max(0, 1 + amount / 100);
        filterParts.push(`brightness(${factor.toFixed(2)})`);
        break;
      }
      case 'contrast': {
        const amount = Number(params.amount ?? 0);
        const factor = Math.max(0, 1 + amount / 100);
        filterParts.push(`contrast(${factor.toFixed(2)})`);
        break;
      }
      case 'saturation': {
        const amount = Number(params.amount ?? 0);
        const factor = Math.max(0, 1 + amount / 100);
        filterParts.push(`saturate(${factor.toFixed(2)})`);
        break;
      }
      case 'grayscale': {
        const amount = Number(params.amount ?? 100) / 100;
        filterParts.push(`grayscale(${amount.toFixed(2)})`);
        break;
      }
      case 'sharpen': {
        const amount = Number(params.amount ?? 30);
        const contrastFactor = 1 + (amount / 100) * 0.4;
        filterParts.push(`contrast(${contrastFactor.toFixed(2)})`);
        break;
      }
      default:
        break;
    }
  }

  return filterParts.length > 0 ? filterParts.join(' ') : 'none';
}

/**
 * Applies post-draw canvas effects like vignette that require overlays.
 */
export function applyPostEffectsToCanvas(
  ctx: CanvasRenderingContext2D,
  effects: EffectInstance[] | undefined,
  width: number,
  height: number,
  relativeTime: number
): void {
  if (!effects || effects.length === 0) return;

  for (const effect of effects) {
    if (!effect.enabled) continue;
    if (effect.effectType === 'vignette') {
      const descriptor = EffectRegistry.getEffect('vignette');
      if (descriptor) {
        const params = evaluateEffectParameters(effect, relativeTime);
        descriptor.applyCanvas(ctx, width, height, params);
      }
    }
  }
}

/**
 * Applies a clip's active effect stack onto a 2D canvas context in deterministic order.
 */
export function applyEffectStackToCanvas(
  ctx: CanvasRenderingContext2D,
  effects: EffectInstance[] | undefined,
  width: number,
  height: number,
  relativeTime: number
): void {
  if (!effects || effects.length === 0) return;

  for (const effect of effects) {
    if (!effect.enabled) continue;
    const descriptor = EffectRegistry.getEffect(effect.effectType);
    if (!descriptor) continue;

    const evalParams = evaluateEffectParameters(effect, relativeTime);
    descriptor.applyCanvas(ctx, width, height, evalParams);
  }
}

/**
 * Compiles a clip's active effect stack into an FFmpeg video filter chain.
 */
export function compileEffectsToFFmpeg(effects: EffectInstance[] | undefined): string[] {
  if (!effects || effects.length === 0) return [];

  const filterStrings: string[] = [];

  for (const effect of effects) {
    if (!effect.enabled) continue;
    const descriptor = EffectRegistry.getEffect(effect.effectType);
    if (!descriptor) continue;

    // Use default/base parameters for static export compilation
    const filter = descriptor.compileFFmpeg(effect.parameters);
    if (filter) {
      filterStrings.push(filter);
    }
  }

  return filterStrings;
}
