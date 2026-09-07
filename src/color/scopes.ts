/**
 * FreeCut Alpha 0.8 Professional Color Scopes Engine
 * Derives genuine real-time scopes directly from preview frame pixel data:
 * - Luma / RGB Waveform (0 - 100 IRE)
 * - RGB Parade (Red, Green, Blue columns)
 * - Vectorscope (Cb / Cr polar plot with 103° Skin-Tone indicator line)
 * - 256-bin RGB & Luma Histogram
 */

export type WaveformMode = 'luma' | 'rgb';

export class ScopesEngine {
  /**
   * Renders 256-bin Histogram from source ImageData
   */
  static renderHistogram(sourceData: ImageData, targetCanvas: HTMLCanvasElement): void {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const w = targetCanvas.width;
    const h = targetCanvas.height;

    // Clear background
    ctx.fillStyle = '#090b0e';
    ctx.fillRect(0, 0, w, h);

    const rBins = new Uint32Array(256);
    const gBins = new Uint32Array(256);
    const bBins = new Uint32Array(256);
    const lumaBins = new Uint32Array(256);

    const data = sourceData.data;
    const step = Math.max(1, Math.floor(data.length / (4 * 40000))); // Sample up to 40k pixels

    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

      rBins[r]++;
      gBins[g]++;
      bBins[b]++;
      lumaBins[Math.min(255, y)]++;
    }

    let maxBin = 1;
    for (let i = 0; i < 256; i++) {
      if (rBins[i] > maxBin) maxBin = rBins[i];
      if (gBins[i] > maxBin) maxBin = gBins[i];
      if (bBins[i] > maxBin) maxBin = bBins[i];
      if (lumaBins[i] > maxBin) maxBin = lumaBins[i];
    }

    // Grid lines (0%, 25%, 50%, 75%, 100%)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (const pct of [0.25, 0.5, 0.75]) {
      const x = pct * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Draw channels with additive blending
    ctx.globalCompositeOperation = 'screen';

    const drawChannel = (bins: Uint32Array, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * w;
        const normalized = bins[i] / maxBin;
        const barH = normalized * (h - 8);
        ctx.lineTo(x, h - barH);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    };

    drawChannel(rBins, 'rgba(239, 68, 68, 0.6)');
    drawChannel(gBins, 'rgba(34, 197, 94, 0.6)');
    drawChannel(bBins, 'rgba(59, 130, 246, 0.6)');

    // Luma outline
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * w;
      const barH = (lumaBins[i] / maxBin) * (h - 8);
      if (i === 0) ctx.moveTo(x, h - barH);
      else ctx.lineTo(x, h - barH);
    }
    ctx.stroke();
  }

  /**
   * Renders Waveform scope (Luma or RGB overlay)
   */
  static renderWaveform(sourceData: ImageData, targetCanvas: HTMLCanvasElement, mode: WaveformMode = 'luma'): void {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const w = targetCanvas.width;
    const h = targetCanvas.height;

    ctx.fillStyle = '#090b0e';
    ctx.fillRect(0, 0, w, h);

    // IRE Reference Grid lines (0, 20, 40, 60, 80, 100)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.font = '9px monospace';
    ctx.fillStyle = '#64748b';

    for (let ire = 0; ire <= 100; ire += 20) {
      const y = h - (ire / 100) * (h - 16) - 8;
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.fillText(`${ire}`, 4, y + 3);
    }

    const sw = sourceData.width;
    const sh = sourceData.height;
    const sData = sourceData.data;

    const colStep = Math.max(1, Math.floor(sw / (w - 28)));
    const rowStep = Math.max(1, Math.floor(sh / 150));

    const plotW = w - 28;
    const plotH = h - 16;
    const plotLeft = 24;
    const plotTop = 8;

    if (mode === 'luma') {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.15)'; // Cyan phosphor
      for (let x = 0; x < sw; x += colStep) {
        const destX = plotLeft + (x / sw) * plotW;
        for (let y = 0; y < sh; y += rowStep) {
          const idx = (y * sw + x) * 4;
          const r = sData[idx];
          const g = sData[idx + 1];
          const b = sData[idx + 2];
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          const destY = plotTop + plotH - (luma / 255.0) * plotH;
          ctx.fillRect(destX, destY, 1.2, 1.2);
        }
      }
    } else {
      // RGB Overlay
      ctx.globalCompositeOperation = 'screen';
      for (let x = 0; x < sw; x += colStep) {
        const destX = plotLeft + (x / sw) * plotW;
        for (let y = 0; y < sh; y += rowStep) {
          const idx = (y * sw + x) * 4;
          const r = sData[idx];
          const g = sData[idx + 1];
          const b = sData[idx + 2];

          const ry = plotTop + plotH - (r / 255.0) * plotH;
          const gy = plotTop + plotH - (g / 255.0) * plotH;
          const by = plotTop + plotH - (b / 255.0) * plotH;

          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.fillRect(destX, ry, 1.2, 1.2);

          ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
          ctx.fillRect(destX, gy, 1.2, 1.2);

          ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.fillRect(destX, by, 1.2, 1.2);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * Renders RGB Parade (Red, Green, Blue side-by-side columns)
   */
  static renderParade(sourceData: ImageData, targetCanvas: HTMLCanvasElement): void {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const w = targetCanvas.width;
    const h = targetCanvas.height;

    ctx.fillStyle = '#090b0e';
    ctx.fillRect(0, 0, w, h);

    const sectionW = (w - 12) / 3;
    const plotH = h - 16;
    const plotTop = 8;

    // Background division lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, plotTop, sectionW, plotH);
    ctx.strokeRect(4 + sectionW + 2, plotTop, sectionW, plotH);
    ctx.strokeRect(4 + (sectionW + 2) * 2, plotTop, sectionW, plotH);

    // Section Labels
    ctx.font = '10px bold sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('RED', 8, plotTop + 12);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('GREEN', 8 + sectionW + 2, plotTop + 12);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('BLUE', 8 + (sectionW + 2) * 2, plotTop + 12);

    const sw = sourceData.width;
    const sh = sourceData.height;
    const sData = sourceData.data;

    const colStep = Math.max(1, Math.floor(sw / (sectionW - 4)));
    const rowStep = Math.max(1, Math.floor(sh / 150));

    for (let x = 0; x < sw; x += colStep) {
      const relX = (x / sw) * (sectionW - 4);
      const rx = 6 + relX;
      const gx = 8 + sectionW + relX;
      const bx = 10 + sectionW * 2 + relX;

      for (let y = 0; y < sh; y += rowStep) {
        const idx = (y * sw + x) * 4;
        const r = sData[idx];
        const g = sData[idx + 1];
        const b = sData[idx + 2];

        const ry = plotTop + plotH - (r / 255.0) * plotH;
        const gy = plotTop + plotH - (g / 255.0) * plotH;
        const by = plotTop + plotH - (b / 255.0) * plotH;

        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(rx, ry, 1.2, 1.2);

        ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
        ctx.fillRect(gx, gy, 1.2, 1.2);

        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        ctx.fillRect(bx, by, 1.2, 1.2);
      }
    }
  }

  /**
   * Renders Vectorscope with Cb/Cr coordinates and 103° Skin-Tone line
   */
  static renderVectorscope(sourceData: ImageData, targetCanvas: HTMLCanvasElement): void {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const w = targetCanvas.width;
    const h = targetCanvas.height;

    ctx.fillStyle = '#090b0e';
    ctx.fillRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Draw Graticule
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Concentric circles (25%, 50%, 75%, 100% saturation)
    for (const rPct of [0.25, 0.5, 0.75, 1.0]) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * rPct, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Axes
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Skin Tone Reference Line (Angle ~103° from positive X axis / roughly 10 o'clock)
    // 103 degrees in standard polar coords: theta = (103 * PI) / 180
    const skinAngle = (103 * Math.PI) / 180;
    const skinCos = -Math.cos(skinAngle); // Screen Y inverted
    const skinSin = -Math.sin(skinAngle);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'; // Amber guide
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + radius * skinCos, centerY + radius * skinSin);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '8px monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('SKIN', centerX + (radius + 4) * skinCos - 10, centerY + (radius + 4) * skinSin);

    // Color Targets (R, Mg, B, Cy, G, Yl) at 75% saturation
    const targets = [
      { label: 'R', u: 0.615 * 0.75, v: -0.515 * 0.75 },
      { label: 'Mg', u: 0.468 * 0.75, v: 0.415 * 0.75 },
      { label: 'B', u: -0.147 * 0.75, v: 0.436 * 0.75 },
      { label: 'Cy', u: -0.615 * 0.75, v: 0.515 * 0.75 },
      { label: 'G', u: -0.468 * 0.75, v: -0.415 * 0.75 },
      { label: 'Yl', u: 0.147 * 0.75, v: -0.436 * 0.75 },
    ];

    ctx.strokeStyle = '#475569';
    ctx.fillStyle = '#94a3b8';
    targets.forEach(t => {
      const tx = centerX + t.v * radius * 1.5;
      const ty = centerY - t.u * radius * 1.5;
      ctx.strokeRect(tx - 3, ty - 3, 6, 6);
      ctx.fillText(t.label, tx + 5, ty + 3);
    });

    // Plot pixels
    const sData = sourceData.data;
    const totalPixels = sourceData.width * sourceData.height;
    const step = Math.max(1, Math.floor(totalPixels / 15000));

    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)'; // Sky blue trace

    for (let i = 0; i < sData.length; i += step * 4) {
      const r = sData[i] / 255.0;
      const g = sData[i + 1] / 255.0;
      const b = sData[i + 2] / 255.0;

      // YUV / YCbCr derivation
      const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
      const v = 0.615 * r - 0.51499 * g - 0.10001 * b;

      const px = centerX + v * radius * 1.5;
      const py = centerY - u * radius * 1.5;

      if (px >= 0 && px < w && py >= 0 && py < h) {
        ctx.fillRect(px, py, 1.2, 1.2);
      }
    }
  }
}
