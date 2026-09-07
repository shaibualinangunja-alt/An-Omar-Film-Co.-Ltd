/**
 * FreeCut Transition Registry
 * Centralized, extensible catalog of all video transitions with canvas preview rendering and FFmpeg compilation.
 */

import {
  TransitionType,
  TransitionDescriptor,
} from './types';

export class TransitionRegistry {
  private static transitions: Map<TransitionType, TransitionDescriptor> = new Map();

  static registerTransition(descriptor: TransitionDescriptor): void {
    this.transitions.set(descriptor.type, descriptor);
  }

  static getTransition(type: TransitionType): TransitionDescriptor | undefined {
    return this.transitions.get(type);
  }

  static listTransitions(): TransitionDescriptor[] {
    return Array.from(this.transitions.values());
  }
}

// --- Helper Functions for Canvas Rendering ---

function drawCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement | null,
  width: number,
  height: number,
  alpha = 1,
  dx = 0,
  dy = 0,
  scale = 1,
  rotation = 0
) {
  if (!canvas) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  if (dx !== 0 || dy !== 0 || scale !== 1 || rotation !== 0) {
    ctx.translate(width / 2 + dx, height / 2 + dy);
    if (rotation !== 0) ctx.rotate(rotation);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.drawImage(canvas, -width / 2, -height / 2, width, height);
  } else {
    ctx.drawImage(canvas, 0, 0, width, height);
  }
  ctx.restore();
}

// 1. Cut
TransitionRegistry.registerTransition({
  type: 'cut',
  name: 'Cut',
  description: 'Instant hard cut between adjacent clips.',
  defaultDuration: 0.1,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    if (progress < 0.5) {
      drawCanvas(ctx, fromCanvas, width, height, 1);
    } else {
      drawCanvas(ctx, toCanvas, width, height, 1);
    }
  },
  compileFFmpeg: (from, to, out, offset) => {
    return `[${from}][${to}]xfade=transition=fade:duration=0.001:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 2. Fade
TransitionRegistry.registerTransition({
  type: 'fade',
  name: 'Fade',
  description: 'Fades out the outgoing clip to black then fades in the incoming clip.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    if (progress < 0.5) {
      const alpha = 1 - progress * 2;
      drawCanvas(ctx, fromCanvas, width, height, alpha);
    } else {
      const alpha = (progress - 0.5) * 2;
      drawCanvas(ctx, toCanvas, width, height, alpha);
    }
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=fadeblack:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 3. Cross Dissolve
TransitionRegistry.registerTransition({
  type: 'crossDissolve',
  name: 'Cross Dissolve',
  description: 'Classic smooth dissolve blending from outgoing to incoming clip simultaneously.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    drawCanvas(ctx, fromCanvas, width, height, 1 - progress);
    drawCanvas(ctx, toCanvas, width, height, progress);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=dissolve:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 4. Dip to Black
TransitionRegistry.registerTransition({
  type: 'dipToBlack',
  name: 'Dip to Black',
  description: 'Dips the scene to pure black at the midpoint of the transition.',
  defaultDuration: 1.0,
  defaultParameters: { color: '#000000' },
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    if (progress < 0.5) {
      drawCanvas(ctx, fromCanvas, width, height, 1 - progress * 2);
    } else {
      drawCanvas(ctx, toCanvas, width, height, (progress - 0.5) * 2);
    }
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=fadeblack:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 5. Dip to White
TransitionRegistry.registerTransition({
  type: 'dipToWhite',
  name: 'Dip to White',
  description: 'Dips the scene to pure white at the midpoint of the transition.',
  defaultDuration: 1.0,
  defaultParameters: { color: '#ffffff' },
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    if (progress < 0.5) {
      drawCanvas(ctx, fromCanvas, width, height, 1 - progress * 2);
    } else {
      drawCanvas(ctx, toCanvas, width, height, (progress - 0.5) * 2);
    }
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=fadewhite:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 6. Slide Left
TransitionRegistry.registerTransition({
  type: 'slideLeft',
  name: 'Slide Left',
  description: 'Incoming clip slides in from the right edge over the outgoing clip.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    drawCanvas(ctx, fromCanvas, width, height, 1);
    const dx = width * (1 - progress);
    drawCanvas(ctx, toCanvas, width, height, 1, dx, 0);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=slideleft:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 7. Slide Right
TransitionRegistry.registerTransition({
  type: 'slideRight',
  name: 'Slide Right',
  description: 'Incoming clip slides in from the left edge over the outgoing clip.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    drawCanvas(ctx, fromCanvas, width, height, 1);
    const dx = -width * (1 - progress);
    drawCanvas(ctx, toCanvas, width, height, 1, dx, 0);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=slideright:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 8. Slide Up
TransitionRegistry.registerTransition({
  type: 'slideUp',
  name: 'Slide Up',
  description: 'Incoming clip slides in from the bottom edge over the outgoing clip.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    drawCanvas(ctx, fromCanvas, width, height, 1);
    const dy = height * (1 - progress);
    drawCanvas(ctx, toCanvas, width, height, 1, 0, dy);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=slideup:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 9. Slide Down
TransitionRegistry.registerTransition({
  type: 'slideDown',
  name: 'Slide Down',
  description: 'Incoming clip slides in from the top edge over the outgoing clip.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    drawCanvas(ctx, fromCanvas, width, height, 1);
    const dy = -height * (1 - progress);
    drawCanvas(ctx, toCanvas, width, height, 1, 0, dy);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=slidedown:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 10. Push Left
TransitionRegistry.registerTransition({
  type: 'pushLeft',
  name: 'Push Left',
  description: 'Incoming clip enters from the right, pushing the outgoing clip off the left edge.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    const fromDx = -width * progress;
    const toDx = width * (1 - progress);
    drawCanvas(ctx, fromCanvas, width, height, 1, fromDx, 0);
    drawCanvas(ctx, toCanvas, width, height, 1, toDx, 0);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=slideleft:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 11. Push Right
TransitionRegistry.registerTransition({
  type: 'pushRight',
  name: 'Push Right',
  description: 'Incoming clip enters from the left, pushing the outgoing clip off the right edge.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    const fromDx = width * progress;
    const toDx = -width * (1 - progress);
    drawCanvas(ctx, fromCanvas, width, height, 1, fromDx, 0);
    drawCanvas(ctx, toCanvas, width, height, 1, toDx, 0);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=slideright:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 12. Push Up
TransitionRegistry.registerTransition({
  type: 'pushUp',
  name: 'Push Up',
  description: 'Incoming clip enters from the bottom, pushing the outgoing clip off the top edge.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    const fromDy = -height * progress;
    const toDy = height * (1 - progress);
    drawCanvas(ctx, fromCanvas, width, height, 1, 0, fromDy);
    drawCanvas(ctx, toCanvas, width, height, 1, 0, toDy);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=slideup:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 13. Push Down
TransitionRegistry.registerTransition({
  type: 'pushDown',
  name: 'Push Down',
  description: 'Incoming clip enters from the top, pushing the outgoing clip off the bottom edge.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    const fromDy = height * progress;
    const toDy = -height * (1 - progress);
    drawCanvas(ctx, fromCanvas, width, height, 1, 0, fromDy);
    drawCanvas(ctx, toCanvas, width, height, 1, 0, toDy);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=slidedown:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 14. Zoom In
TransitionRegistry.registerTransition({
  type: 'zoomIn',
  name: 'Zoom In',
  description: 'Outgoing clip zooms in dynamically while the incoming clip reveals smoothly.',
  defaultDuration: 1.0,
  defaultParameters: { zoomAmount: 1.5 },
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    const fromScale = 1.0 + progress * 0.8;
    drawCanvas(ctx, fromCanvas, width, height, 1 - progress, 0, 0, fromScale);
    const toScale = 0.7 + progress * 0.3;
    drawCanvas(ctx, toCanvas, width, height, progress, 0, 0, toScale);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=zoomin:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 15. Zoom Out
TransitionRegistry.registerTransition({
  type: 'zoomOut',
  name: 'Zoom Out',
  description: 'Outgoing clip zooms backward revealing the incoming full scene.',
  defaultDuration: 1.0,
  defaultParameters: { zoomAmount: 1.5 },
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    const fromScale = 1.0 - progress * 0.4;
    drawCanvas(ctx, fromCanvas, width, height, 1 - progress, 0, 0, fromScale);
    const toScale = 1.4 - progress * 0.4;
    drawCanvas(ctx, toCanvas, width, height, progress, 0, 0, toScale);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=rectcrop:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 16. Blur
TransitionRegistry.registerTransition({
  type: 'blur',
  name: 'Blur',
  description: 'Defocuses the outgoing clip into a heavy motion blur then focuses the incoming clip.',
  defaultDuration: 1.0,
  defaultParameters: { blurAmount: 20 },
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height, parameters }) => {
    const maxBlur = (parameters?.blurAmount as number) || 20;
    const blurPx = Math.sin(progress * Math.PI) * maxBlur;

    ctx.save();
    if (blurPx > 0.5) ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
    drawCanvas(ctx, fromCanvas, width, height, 1 - progress);
    drawCanvas(ctx, toCanvas, width, height, progress);
    ctx.restore();
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=dissolve:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 17. Flash
TransitionRegistry.registerTransition({
  type: 'flash',
  name: 'Flash',
  description: 'High-intensity white flash spike at the transition cut point.',
  defaultDuration: 0.6,
  defaultParameters: { intensity: 1.0 },
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    const flashIntensity = Math.sin(progress * Math.PI);
    if (progress < 0.5) {
      drawCanvas(ctx, fromCanvas, width, height, 1);
    } else {
      drawCanvas(ctx, toCanvas, width, height, 1);
    }
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = Math.min(1, flashIntensity * 1.2);
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=fadewhite:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});

// 18. Spin
TransitionRegistry.registerTransition({
  type: 'spin',
  name: 'Spin',
  description: 'Rotational 360-degree spin transition between outgoing and incoming scenes.',
  defaultDuration: 1.0,
  defaultParameters: {},
  renderPreview: (ctx, { fromCanvas, toCanvas, progress, width, height }) => {
    const fromAngle = progress * Math.PI;
    const fromScale = Math.max(0.01, 1 - progress);
    drawCanvas(ctx, fromCanvas, width, height, 1 - progress, 0, 0, fromScale, fromAngle);

    const toAngle = -(1 - progress) * Math.PI;
    const toScale = Math.max(0.01, progress);
    drawCanvas(ctx, toCanvas, width, height, progress, 0, 0, toScale, toAngle);
  },
  compileFFmpeg: (from, to, out, offset, duration) => {
    return `[${from}][${to}]xfade=transition=radial:duration=${duration.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`;
  },
});
