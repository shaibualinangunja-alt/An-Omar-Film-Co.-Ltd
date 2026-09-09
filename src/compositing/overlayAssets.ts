/**
 * FreeCut Procedural Overlays Engine
 * Generates offline, deterministic, royalty-free creative visual overlay layers.
 * Supports Weather, Fire & Atmosphere, Love/Emotion, Light, Cinematic, and Celebration.
 */

import { BlendMode } from './types';

export type OverlayCategory =
  | 'weather'
  | 'fire'
  | 'love'
  | 'light'
  | 'cinematic'
  | 'celebration';

export interface OverlayPreset {
  id: string;
  name: string;
  category: OverlayCategory;
  description: string;
  icon: string;
  defaultBlendMode: BlendMode;
  defaultOpacity: number;
  renderCanvas: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    intensity?: number
  ) => void;
  getFFmpegFilter: (width: number, height: number, duration: number, fps: number) => string;
}

export const OVERLAY_PRESETS: OverlayPreset[] = [
  // ==========================================
  // 1. WEATHER
  // ==========================================
  {
    id: 'weather_snow',
    name: 'Snow',
    category: 'weather',
    description: 'Gentle falling snow flakes drifting in winter wind.',
    icon: '❄️',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.85,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const flakeCount = Math.floor(120 * intensity);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < flakeCount; i++) {
        const seed = (i * 9301 + 49297) % 233280;
        const seedX = (seed % 1000) / 1000;
        const speed = 40 + (i % 60) * 1.5;
        const size = 1.5 + (i % 4) * 0.8;
        const sway = Math.sin(time * 1.5 + i) * 20;

        const x = (seedX * width + sway + (time * 15)) % width;
        const y = (time * speed + (i * 37)) % height;
        const alpha = 0.4 + (i % 5) * 0.12;

        ctx.globalAlpha = Math.min(1.0, alpha * intensity);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=18:allf=t+u,threshold=180,format=rgba`,
  },
  {
    id: 'weather_rain',
    name: 'Rain',
    category: 'weather',
    description: 'Cinematic rain streaks falling across the frame.',
    icon: '🌧️',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.8,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const dropCount = Math.floor(160 * intensity);
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < dropCount; i++) {
        const seed = (i * 7919 + 104729) % 100000;
        const x = (seed / 100000) * width;
        const speed = 450 + (i % 80) * 5;
        const y = (time * speed + i * 23) % height;
        const len = 18 + (i % 15) * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - len * 0.25, y + len);
        ctx.stroke();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=15:allf=t+u,eq=contrast=2.5:brightness=-0.3,format=rgba`,
  },
  {
    id: 'weather_storm',
    name: 'Storm',
    category: 'weather',
    description: 'Heavy driving rain with intermittent dramatic lightning pulses.',
    icon: '⛈️',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.9,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      // Lightning flash
      const flash = Math.sin(time * 0.8) > 0.96 ? 0.35 : 0;
      if (flash > 0) {
        ctx.fillStyle = `rgba(220, 235, 255, ${flash * intensity})`;
        ctx.fillRect(0, 0, width, height);
      }
      // Rain streaks
      const dropCount = Math.floor(220 * intensity);
      ctx.strokeStyle = 'rgba(180, 210, 255, 0.7)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < dropCount; i++) {
        const seed = (i * 12345 + 6789) % 99991;
        const x = (seed / 99991) * width;
        const speed = 600 + (i % 100) * 6;
        const y = (time * speed + i * 31) % height;
        const len = 25 + (i % 20) * 2;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - len * 0.35, y + len);
        ctx.stroke();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=25:allf=t+u,eq=contrast=3.0:brightness=-0.2,format=rgba`,
  },
  {
    id: 'weather_fog',
    name: 'Fog',
    category: 'weather',
    description: 'Rolling soft volumetric mist drifting slowly.',
    icon: '🌫️',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.65,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const grad = ctx.createLinearGradient(0, height * 0.3, 0, height);
      const shift = Math.sin(time * 0.4) * 0.08;
      grad.addColorStop(0, 'rgba(180, 190, 205, 0)');
      grad.addColorStop(0.5 + shift, `rgba(190, 205, 220, ${0.35 * intensity})`);
      grad.addColorStop(1, `rgba(210, 225, 240, ${0.55 * intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=gray@0.35:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},boxblur=20:1,format=rgba`,
  },

  // ==========================================
  // 2. FIRE & ATMOSPHERE
  // ==========================================
  {
    id: 'fire_embers',
    name: 'Embers',
    category: 'fire',
    description: 'Warm glowing fire embers floating upward with heat distortion.',
    icon: '🔥',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.9,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const emberCount = Math.floor(70 * intensity);
      for (let i = 0; i < emberCount; i++) {
        const seed = (i * 4999 + 17389) % 54321;
        const baseX = (seed / 54321) * width;
        const speed = 60 + (i % 40) * 2;
        const y = height - ((time * speed + i * 47) % (height + 50));
        const sway = Math.sin(time * 2 + i) * 25;
        const x = (baseX + sway + width) % width;
        const radius = 2 + (i % 3) * 1.2;

        const radGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
        radGrad.addColorStop(0, 'rgba(255, 240, 150, 1)');
        radGrad.addColorStop(0.4, 'rgba(255, 120, 20, 0.8)');
        radGrad.addColorStop(1, 'rgba(200, 40, 0, 0)');

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=c0s=35:allf=t+u,colorchannelmixer=rr=1.8:rg=0.7:rb=0.1,eq=contrast=2.2,format=rgba`,
  },
  {
    id: 'fire_sparks',
    name: 'Sparks',
    category: 'fire',
    description: 'High-intensity electric and welding fire sparks showering down.',
    icon: '⚡',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.85,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const sparkCount = Math.floor(90 * intensity);
      ctx.strokeStyle = 'rgba(255, 210, 80, 0.9)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < sparkCount; i++) {
        const seed = (i * 8191 + 33333) % 77777;
        const x = (seed / 77777) * width;
        const speed = 350 + (i % 60) * 6;
        const y = (time * speed + i * 19) % height;
        const len = 10 + (i % 12);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (i % 2 === 0 ? len * 0.5 : -len * 0.5), y + len);
        ctx.stroke();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=20:allf=t+u,colorchannelmixer=rr=1.5:rg=1.2:rb=0.2,eq=contrast=2.5,format=rgba`,
  },
  {
    id: 'fire_smoke',
    name: 'Smoke',
    category: 'fire',
    description: 'Dense billowing smoke plumes rising from below.',
    icon: '💨',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.7,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const puffCount = 8;
      for (let i = 0; i < puffCount; i++) {
        const cx = (width * (i + 1)) / (puffCount + 1) + Math.sin(time + i) * 40;
        const cy = height - ((time * 40 + i * 80) % (height + 150));
        const r = 90 + (i % 3) * 40;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(180, 160, 150, ${0.35 * intensity})`);
        grad.addColorStop(0.7, `rgba(120, 110, 105, ${0.15 * intensity})`);
        grad.addColorStop(1, 'rgba(80, 75, 70, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=gray@0.3:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},boxblur=30:2,format=rgba`,
  },
  {
    id: 'fire_dust',
    name: 'Atmospheric Dust',
    category: 'fire',
    description: 'Golden sunlit dust particles suspended peacefully in the air.',
    icon: '✨',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.8,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const count = Math.floor(100 * intensity);
      for (let i = 0; i < count; i++) {
        const seed = (i * 3571 + 99991) % 65537;
        const bx = (seed / 65537) * width;
        const by = ((seed * 7) % 65537) / 65537 * height;
        const ox = Math.sin(time * 0.8 + i) * 15;
        const oy = Math.cos(time * 0.6 + i * 2) * 15;
        const x = (bx + ox + width) % width;
        const y = (by + oy + height) % height;
        const r = 1.0 + (i % 4) * 0.7;

        ctx.fillStyle = `rgba(255, 235, 190, ${0.45 * intensity})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=12:allf=t+u,colorchannelmixer=rr=1.3:rg=1.1:rb=0.8,eq=contrast=2.0,format=rgba`,
  },

  // ==========================================
  // 3. LOVE / EMOTION
  // ==========================================
  {
    id: 'love_hearts',
    name: 'Hearts',
    category: 'love',
    description: 'Romantic floating heart glyphs drifting gently upwards.',
    icon: '💖',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.85,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const heartCount = Math.floor(25 * intensity);
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < heartCount; i++) {
        const seed = (i * 6113 + 12345) % 43211;
        const bx = (seed / 43211) * width;
        const speed = 40 + (i % 20) * 2;
        const y = height - ((time * speed + i * 53) % (height + 60));
        const sway = Math.sin(time * 1.8 + i) * 20;
        const x = (bx + sway + width) % width;

        ctx.globalAlpha = 0.5 + Math.sin(time + i) * 0.3;
        ctx.fillText('❤️', x, y);
      }
      ctx.globalAlpha = 1.0;
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=16:allf=t+u,colorchannelmixer=rr=1.7:rg=0.4:rb=0.9,eq=contrast=2.4,format=rgba`,
  },
  {
    id: 'love_particles',
    name: 'Love Particles',
    category: 'love',
    description: 'Soft shimmering rose-gold particle haze.',
    icon: '💕',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.8,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const count = Math.floor(60 * intensity);
      for (let i = 0; i < count; i++) {
        const seed = (i * 2243 + 8888) % 55555;
        const x = ((seed / 55555) * width + Math.sin(time + i) * 15) % width;
        const y = height - ((time * 35 + i * 33) % (height + 40));
        const r = 2.5 + (i % 3) * 1.5;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
        grad.addColorStop(0, 'rgba(255, 180, 210, 0.9)');
        grad.addColorStop(1, 'rgba(255, 90, 140, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=pink@0.2:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=14:allf=t+u,format=rgba`,
  },

  // ==========================================
  // 4. LIGHT
  // ==========================================
  {
    id: 'light_leaks',
    name: 'Light Leaks',
    category: 'light',
    description: 'Organic warm amber and violet edge film light leaks.',
    icon: '🌅',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.75,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.7);
      const grad = ctx.createRadialGradient(
        width * 0.1,
        height * 0.1,
        0,
        width * 0.1,
        height * 0.1,
        width * 0.6
      );
      grad.addColorStop(0, `rgba(255, 150, 40, ${0.7 * pulse * intensity})`);
      grad.addColorStop(0.4, `rgba(255, 70, 90, ${0.4 * pulse * intensity})`);
      grad.addColorStop(1, 'rgba(120, 20, 180, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Second leak on bottom right
      const pulse2 = 0.5 + 0.5 * Math.cos(time * 0.9);
      const grad2 = ctx.createRadialGradient(
        width * 0.9,
        height * 0.85,
        0,
        width * 0.9,
        height * 0.85,
        width * 0.5
      );
      grad2.addColorStop(0, `rgba(255, 200, 60, ${0.6 * pulse2 * intensity})`);
      grad2.addColorStop(0.5, `rgba(255, 100, 40, ${0.3 * pulse2 * intensity})`);
      grad2.addColorStop(1, 'rgba(255, 50, 20, 0)');

      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=orange@0.3:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},vignette=angle=PI/4,format=rgba`,
  },
  {
    id: 'light_lens_flare',
    name: 'Lens Flare',
    category: 'light',
    description: 'Anamorphic horizontal streak and iridescent glass reflections.',
    icon: '🔆',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.8,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const cx = width * (0.3 + 0.4 * (0.5 + 0.5 * Math.sin(time * 0.5)));
      const cy = height * 0.35;

      // Anamorphic horizontal flare
      const hGrad = ctx.createLinearGradient(0, cy, width, cy);
      hGrad.addColorStop(0, 'rgba(80, 160, 255, 0)');
      hGrad.addColorStop(Math.max(0, cx / width - 0.2), `rgba(120, 200, 255, ${0.4 * intensity})`);
      hGrad.addColorStop(cx / width, `rgba(255, 255, 255, ${0.9 * intensity})`);
      hGrad.addColorStop(Math.min(1, cx / width + 0.2), `rgba(120, 200, 255, ${0.4 * intensity})`);
      hGrad.addColorStop(1, 'rgba(80, 160, 255, 0)');

      ctx.fillStyle = hGrad;
      ctx.fillRect(0, cy - 3, width, 6);

      // Core flare
      const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 140);
      radGrad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * intensity})`);
      radGrad.addColorStop(0.3, `rgba(120, 190, 255, ${0.45 * intensity})`);
      radGrad.addColorStop(1, 'rgba(20, 80, 200, 0)');

      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.fill();
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=cyan@0.25:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},vignette=angle=PI/3,format=rgba`,
  },
  {
    id: 'light_bokeh',
    name: 'Bokeh',
    category: 'light',
    description: 'Cinematic shallow depth of field out-of-focus light discs.',
    icon: '🔮',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.7,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const count = Math.floor(30 * intensity);
      for (let i = 0; i < count; i++) {
        const seed = (i * 7331 + 4567) % 88883;
        const bx = (seed / 88883) * width;
        const by = ((seed * 3) % 88883) / 88883 * height;
        const x = (bx + Math.sin(time * 0.5 + i) * 30 + width) % width;
        const y = (by + Math.cos(time * 0.4 + i) * 20 + height) % height;
        const r = 18 + (i % 6) * 14;

        ctx.strokeStyle = `rgba(255, 220, 150, ${0.3 * intensity})`;
        ctx.fillStyle = `rgba(255, 200, 120, ${0.12 * intensity})`;
        ctx.lineWidth = 2.0;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=yellow@0.2:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},boxblur=15:2,format=rgba`,
  },

  // ==========================================
  // 5. CINEMATIC
  // ==========================================
  {
    id: 'cinematic_film_grain',
    name: 'Film Grain (35mm)',
    category: 'cinematic',
    description: 'Organic 35mm optical emulsion film grain texture.',
    icon: '🎞️',
    defaultBlendMode: 'overlay',
    defaultOpacity: 0.65,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      // Fast procedural grain
      const grainImg = ctx.createImageData(128, 128);
      const data = grainImg.data;
      const seedTime = Math.floor(time * 24); // 24 fps grain change
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.floor(((Math.sin(i + seedTime * 997) * 10000) % 1 + 1) * 0.5 * 255);
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = Math.floor(55 * intensity);
      }

      // Draw grain pattern scaled
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = 128;
      patternCanvas.height = 128;
      patternCanvas.getContext('2d')?.putImageData(grainImg, 0, 0);

      const pattern = ctx.createPattern(patternCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=gray@0.5:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=18:allf=t+u,format=rgba`,
  },
  {
    id: 'cinematic_scratches',
    name: 'Film Scratches',
    category: 'cinematic',
    description: 'Vintage projector jitter scratches and dust hair fibers.',
    icon: '📽️',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.75,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      ctx.strokeStyle = `rgba(230, 230, 230, ${0.7 * intensity})`;
      ctx.lineWidth = 1;
      const scratchCount = Math.max(1, Math.floor(4 * intensity));
      for (let i = 0; i < scratchCount; i++) {
        // Vertical scratch jittering
        const frameIdx = Math.floor(time * 18 + i * 3);
        const x = (Math.sin(frameIdx * 31.7) * 0.5 + 0.5) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + (Math.sin(frameIdx) * 2), height);
        ctx.stroke();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=14:allf=t,eq=contrast=3.0,format=rgba`,
  },
  {
    id: 'cinematic_vignette',
    name: 'Vignette Texture',
    category: 'cinematic',
    description: 'Feathered dark cinematic lens falloff border.',
    icon: '⭕',
    defaultBlendMode: 'multiply',
    defaultOpacity: 0.8,
    renderCanvas: (ctx, width, height, _time, intensity = 1.0) => {
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, `rgba(0, 0, 0, ${0.85 * intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=white:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},vignette=angle=PI/3,format=rgba`,
  },

  // ==========================================
  // 6. CELEBRATION
  // ==========================================
  {
    id: 'celebration_confetti',
    name: 'Confetti',
    category: 'celebration',
    description: 'Festive multicolor paper confetti tumbling downwards.',
    icon: '🎉',
    defaultBlendMode: 'normal',
    defaultOpacity: 0.9,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
      const pieceCount = Math.floor(70 * intensity);
      for (let i = 0; i < pieceCount; i++) {
        const seed = (i * 9973 + 1234) % 65537;
        const x = ((seed / 65537) * width + Math.sin(time * 2 + i) * 30 + width) % width;
        const speed = 120 + (i % 40) * 3;
        const y = (time * speed + i * 43) % (height + 30);
        const rot = time * 4 + i;
        const w = 8 + (i % 4) * 2;
        const h = 5 + (i % 3) * 2;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=30:allf=t+u,colorchannelmixer=rr=1.5:gg=1.2:bb=1.4,eq=contrast=2.5,format=rgba`,
  },
  {
    id: 'celebration_sparkles',
    name: 'Sparkles',
    category: 'celebration',
    description: 'Shimmering 4-point golden star bursts twinkling and fading.',
    icon: '⭐',
    defaultBlendMode: 'screen',
    defaultOpacity: 0.85,
    renderCanvas: (ctx, width, height, time, intensity = 1.0) => {
      const starCount = Math.floor(35 * intensity);
      for (let i = 0; i < starCount; i++) {
        const seed = (i * 4391 + 555) % 43211;
        const x = (seed / 43211) * width;
        const y = ((seed * 5) % 43211) / 43211 * height;
        const phase = Math.sin(time * 3 + i * 2);
        if (phase > 0.2) {
          const r = (10 + (i % 8) * 2) * (phase - 0.2) * 1.25;
          ctx.strokeStyle = `rgba(255, 235, 140, ${phase * intensity})`;
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          ctx.moveTo(x - r, y);
          ctx.lineTo(x + r, y);
          ctx.moveTo(x, y - r);
          ctx.lineTo(x, y + r);
          ctx.stroke();
        }
      }
    },
    getFFmpegFilter: (w, h, d, fps) =>
      `color=c=black:s=${w}x${h}:r=${fps}:d=${d.toFixed(3)},noise=alls=22:allf=t+u,colorchannelmixer=rr=1.4:rg=1.3:rb=0.3,eq=contrast=2.8,format=rgba`,
  },
];

export function getOverlayPreset(id: string): OverlayPreset | undefined {
  return OVERLAY_PRESETS.find(p => p.id === id);
}
