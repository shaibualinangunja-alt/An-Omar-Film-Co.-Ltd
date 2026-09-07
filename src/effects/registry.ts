/**
 * FreeCut Effect Registry
 * Centralized catalog of video effects with canvas preview application and FFmpeg filter compilation.
 */

import { EffectType, EffectDescriptor } from './types';
import { applyChromaKeyToCanvas } from '../compositing/chromaKey';

export class EffectRegistry {
  private static effects: Map<EffectType, EffectDescriptor> = new Map();

  static registerEffect(descriptor: EffectDescriptor): void {
    this.effects.set(descriptor.type, descriptor);
  }

  static getEffect(type: EffectType): EffectDescriptor | undefined {
    return this.effects.get(type);
  }

  static listEffects(): EffectDescriptor[] {
    return Array.from(this.effects.values());
  }
}

// 1. Blur
EffectRegistry.registerEffect({
  type: 'blur',
  name: 'Gaussian Blur',
  description: 'Softens and blurs high frequency image details.',
  category: 'blur',
  parameters: [
    {
      id: 'amount',
      name: 'Radius',
      type: 'number',
      min: 0,
      max: 50,
      step: 1,
      defaultValue: 10,
      unit: 'px',
      animatable: true,
    },
  ],
  defaultParameters: { amount: 10 },
  applyCanvas: (ctx, _w, _h, params) => {
    const amount = Number(params.amount ?? 10);
    if (amount > 0) {
      ctx.filter = (ctx.filter === 'none' ? '' : `${ctx.filter} `) + `blur(${amount}px)`;
    }
  },
  compileFFmpeg: (params) => {
    const amount = Math.max(1, Number(params.amount ?? 10));
    return `boxblur=${amount}:1`;
  },
});

// 2. Brightness
EffectRegistry.registerEffect({
  type: 'brightness',
  name: 'Brightness',
  description: 'Adjusts the overall luminance level of the clip.',
  category: 'color',
  parameters: [
    {
      id: 'amount',
      name: 'Brightness',
      type: 'number',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0,
      unit: '%',
      animatable: true,
    },
  ],
  defaultParameters: { amount: 0 },
  applyCanvas: (ctx, _w, _h, params) => {
    const amount = Number(params.amount ?? 0);
    const factor = Math.max(0, 1 + amount / 100);
    ctx.filter = (ctx.filter === 'none' ? '' : `${ctx.filter} `) + `brightness(${factor.toFixed(2)})`;
  },
  compileFFmpeg: (params) => {
    const amount = Number(params.amount ?? 0) / 100;
    return `eq=brightness=${amount.toFixed(2)}`;
  },
});

// 3. Contrast
EffectRegistry.registerEffect({
  type: 'contrast',
  name: 'Contrast',
  description: 'Expands or compresses the dynamic range between light and dark pixels.',
  category: 'color',
  parameters: [
    {
      id: 'amount',
      name: 'Contrast',
      type: 'number',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0,
      unit: '%',
      animatable: true,
    },
  ],
  defaultParameters: { amount: 0 },
  applyCanvas: (ctx, _w, _h, params) => {
    const amount = Number(params.amount ?? 0);
    const factor = Math.max(0, 1 + amount / 100);
    ctx.filter = (ctx.filter === 'none' ? '' : `${ctx.filter} `) + `contrast(${factor.toFixed(2)})`;
  },
  compileFFmpeg: (params) => {
    const factor = Math.max(0, 1 + Number(params.amount ?? 0) / 100);
    return `eq=contrast=${factor.toFixed(2)}`;
  },
});

// 4. Saturation
EffectRegistry.registerEffect({
  type: 'saturation',
  name: 'Saturation',
  description: 'Boosts or desaturates color vibrancy.',
  category: 'color',
  parameters: [
    {
      id: 'amount',
      name: 'Saturation',
      type: 'number',
      min: -100,
      max: 100,
      step: 1,
      defaultValue: 0,
      unit: '%',
      animatable: true,
    },
  ],
  defaultParameters: { amount: 0 },
  applyCanvas: (ctx, _w, _h, params) => {
    const amount = Number(params.amount ?? 0);
    const factor = Math.max(0, 1 + amount / 100);
    ctx.filter = (ctx.filter === 'none' ? '' : `${ctx.filter} `) + `saturate(${factor.toFixed(2)})`;
  },
  compileFFmpeg: (params) => {
    const factor = Math.max(0, 1 + Number(params.amount ?? 0) / 100);
    return `eq=saturation=${factor.toFixed(2)}`;
  },
});

// 5. Grayscale
EffectRegistry.registerEffect({
  type: 'grayscale',
  name: 'Monochrome Grayscale',
  description: 'Converts color imagery to black and white tonal values.',
  category: 'color',
  parameters: [
    {
      id: 'amount',
      name: 'Intensity',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 100,
      unit: '%',
      animatable: true,
    },
  ],
  defaultParameters: { amount: 100 },
  applyCanvas: (ctx, _w, _h, params) => {
    const amount = Number(params.amount ?? 100) / 100;
    ctx.filter = (ctx.filter === 'none' ? '' : `${ctx.filter} `) + `grayscale(${amount.toFixed(2)})`;
  },
  compileFFmpeg: (params) => {
    const saturation = Math.max(0, 1 - Number(params.amount ?? 100) / 100);
    return `hue=s=${saturation.toFixed(2)}`;
  },
});

// 6. Sharpen
EffectRegistry.registerEffect({
  type: 'sharpen',
  name: 'Edge Sharpen',
  description: 'Increases edge definition and local micro-contrast.',
  category: 'stylize',
  parameters: [
    {
      id: 'amount',
      name: 'Sharpness',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 30,
      unit: '%',
      animatable: true,
    },
  ],
  defaultParameters: { amount: 30 },
  applyCanvas: (ctx, _w, _h, params) => {
    const amount = Number(params.amount ?? 30);
    // Subtle contrast + brightness edge sharpening simulation on canvas 2D
    const contrastFactor = 1 + (amount / 100) * 0.4;
    ctx.filter = (ctx.filter === 'none' ? '' : `${ctx.filter} `) + `contrast(${contrastFactor.toFixed(2)})`;
  },
  compileFFmpeg: (params) => {
    const amount = Number(params.amount ?? 30) / 100;
    const lumaAmount = (0.5 + amount * 1.5).toFixed(2);
    return `unsharp=5:5:${lumaAmount}:5:5:0.0`;
  },
});

// 7. Vignette
EffectRegistry.registerEffect({
  type: 'vignette',
  name: 'Vignette',
  description: 'Darkens the outer perimeter of the frame to draw focus to center.',
  category: 'stylize',
  parameters: [
    {
      id: 'amount',
      name: 'Darkness',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 60,
      unit: '%',
      animatable: true,
    },
    {
      id: 'radius',
      name: 'Inner Radius',
      type: 'number',
      min: 10,
      max: 100,
      step: 1,
      defaultValue: 70,
      unit: '%',
      animatable: true,
    },
  ],
  defaultParameters: { amount: 60, radius: 70 },
  applyCanvas: (ctx, width, height, params) => {
    const amount = Number(params.amount ?? 60) / 100;
    const radiusPercent = Number(params.radius ?? 70) / 100;
    if (amount <= 0.01) return;

    ctx.save();
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    const innerRadius = outerRadius * (radiusPercent * 0.8);

    const gradient = ctx.createRadialGradient(
      centerX, centerY, innerRadius,
      centerX, centerY, outerRadius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${amount.toFixed(2)})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
  compileFFmpeg: (params) => {
    const amount = Number(params.amount ?? 60) / 100;
    const angle = (0.2 + amount * 0.4).toFixed(2);
    return `vignette=PI*${angle}`;
  },
});

// 8. Chroma Key
EffectRegistry.registerEffect({
  type: 'chromaKey',
  name: 'Chroma Key',
  description: 'Removes green/blue screen background color and makes it transparent.',
  category: 'stylize',
  parameters: [
    {
      id: 'keyColor',
      name: 'Key Color',
      type: 'color',
      defaultValue: '#00FF00',
    },
    {
      id: 'similarity',
      name: 'Similarity',
      type: 'number',
      min: 1,
      max: 100,
      step: 1,
      defaultValue: 25,
      unit: '%',
      animatable: true,
    },
    {
      id: 'smoothness',
      name: 'Smoothness',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 10,
      unit: '%',
      animatable: true,
    },
    {
      id: 'spill',
      name: 'Spill Suppression',
      type: 'number',
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 50,
      unit: '%',
      animatable: true,
    },
  ],
  defaultParameters: {
    keyColor: '#00FF00',
    similarity: 25,
    smoothness: 10,
    spill: 50,
  },
  applyCanvas: (ctx, width, height, params) => {
    applyChromaKeyToCanvas(ctx, width, height, {
      enabled: true,
      keyColor: String(params.keyColor || '#00FF00'),
      similarity: Number(params.similarity ?? 25) / 100,
      smoothness: Number(params.smoothness ?? 10) / 100,
      spillSuppression: Number(params.spill ?? 50) / 100,
      edgeSoftness: 2,
      invert: false,
    });
  },
  compileFFmpeg: (params) => {
    const keyColor = String(params.keyColor || '#00FF00').replace('#', '').toUpperCase();
    const similarity = (Number(params.similarity ?? 25) / 100).toFixed(3);
    const blend = (Number(params.smoothness ?? 10) / 100).toFixed(3);
    return `colorkey=0x${keyColor}:${similarity}:${blend}`;
  },
});
