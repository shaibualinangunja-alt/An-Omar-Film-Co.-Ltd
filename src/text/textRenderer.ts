/**
 * FreeCut Dedicated Text Renderer
 * Handles high-precision canvas layout, multiline wrapping, typography styling, background box, stroke, and shadow.
 */

import { TextConfig, TextStyle } from './types';
import { EvaluatedClipState } from '../animation/types';

export interface TextLayoutLine {
  text: string;
  width: number;
}

export interface TextLayoutResult {
  lines: TextLayoutLine[];
  totalWidth: number;
  totalHeight: number;
  lineHeight: number;
}

export class TextRenderer {
  /**
   * Measures and layouts multiline text with auto-wrapping against canvas constraints.
   */
  static layoutText(
    ctx: CanvasRenderingContext2D,
    content: string,
    style: TextStyle,
    maxWidth: number
  ): TextLayoutResult {
    const fontSize = Math.max(8, style.fontSize);
    const fontSpec = `${style.fontStyle} ${style.fontWeight} ${fontSize}px "${style.fontFamily}", sans-serif`;
    ctx.font = fontSpec;

    const rawParagraphs = content.split('\n');
    const lines: TextLayoutLine[] = [];
    const usableMaxWidth = Math.max(100, maxWidth - 80);

    for (const paragraph of rawParagraphs) {
      if (!paragraph) {
        lines.push({ text: '', width: 0 });
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width + (testLine.length - 1) * style.letterSpacing;

        if (testWidth > usableMaxWidth && currentLine) {
          const lineMetrics = ctx.measureText(currentLine);
          lines.push({
            text: currentLine,
            width: lineMetrics.width + (currentLine.length - 1) * style.letterSpacing,
          });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        const lineMetrics = ctx.measureText(currentLine);
        lines.push({
          text: currentLine,
          width: lineMetrics.width + (currentLine.length - 1) * style.letterSpacing,
        });
      }
    }

    const lineHeight = fontSize * (style.lineSpacing || 1.2);
    const totalHeight = lines.length * lineHeight;
    const totalWidth = lines.reduce((max, l) => Math.max(max, l.width), 0);

    return { lines, totalWidth, totalHeight, lineHeight };
  }

  /**
   * Draws a rounded rectangle path on the canvas.
   */
  private static drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Renders styled text into a canvas rendering context.
   */
  static renderText(
    ctx: CanvasRenderingContext2D,
    config: TextConfig,
    transform: EvaluatedClipState,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!config || !config.content) return;

    const style = config.style;
    const fontSize = transform.fontSize !== undefined ? transform.fontSize : style.fontSize;
    const effectiveStyle: TextStyle = { ...style, fontSize };

    ctx.save();

    // 1. Apply global transform and clip keyframe animation
    const centerX = canvasWidth / 2 + transform.positionX;
    const centerY = canvasHeight / 2 + transform.positionY;

    ctx.translate(centerX, centerY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scale, transform.scale);
    ctx.globalAlpha = Math.max(0, Math.min(1, transform.opacity * style.opacity));

    // 2. Measure and layout lines
    const layout = this.layoutText(ctx, config.content, effectiveStyle, canvasWidth);
    const { lines, totalWidth, totalHeight, lineHeight } = layout;

    // 3. Render Background Box if enabled
    if (style.background?.enabled) {
      const pad = style.background.padding || 12;
      const bgX = -totalWidth / 2 - pad;
      const bgY = -totalHeight / 2 - pad;
      const bgW = totalWidth + pad * 2;
      const bgH = totalHeight + pad * 2;
      const bgOpacity = transform.bgOpacity !== undefined ? transform.bgOpacity : style.background.opacity;

      ctx.save();
      ctx.fillStyle = style.background.color || '#000000';
      ctx.globalAlpha = ctx.globalAlpha * Math.max(0, Math.min(1, bgOpacity));
      this.drawRoundedRect(ctx, bgX, bgY, bgW, bgH, style.background.borderRadius || 6);
      ctx.fill();
      ctx.restore();
    }

    // 4. Set font typography
    const fontSpec = `${style.fontStyle} ${style.fontWeight} ${fontSize}px "${style.fontFamily}", sans-serif`;
    ctx.font = fontSpec;
    ctx.textBaseline = 'middle';

    const startY = -totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineY = startY + i * lineHeight;

      let lineX = 0;
      if (style.textAlign === 'left') {
        lineX = -totalWidth / 2;
        ctx.textAlign = 'left';
      } else if (style.textAlign === 'right') {
        lineX = totalWidth / 2;
        ctx.textAlign = 'right';
      } else {
        lineX = 0;
        ctx.textAlign = 'center';
      }

      // 5. Draw Shadow if enabled
      if (style.shadow?.enabled) {
        ctx.save();
        ctx.shadowColor = style.shadow.color || 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = style.shadow.blur || 4;
        ctx.shadowOffsetX = style.shadow.offsetX || 2;
        ctx.shadowOffsetY = style.shadow.offsetY || 2;
        ctx.fillStyle = style.color;
        ctx.fillText(line.text, lineX, lineY);
        ctx.restore();
      }

      // 6. Draw Stroke if enabled
      if (style.stroke?.enabled && style.stroke.width > 0) {
        ctx.save();
        ctx.strokeStyle = style.stroke.color || '#000000';
        ctx.lineWidth = style.stroke.width;
        ctx.lineJoin = 'round';
        ctx.strokeText(line.text, lineX, lineY);
        ctx.restore();
      }

      // 7. Draw Fill Text
      ctx.fillStyle = style.color || '#FFFFFF';
      ctx.fillText(line.text, lineX, lineY);
    }

    ctx.restore();
  }

  /**
   * Renders a manual caption item on the canvas (typically lower-third centered).
   */
  static renderCaption(
    ctx: CanvasRenderingContext2D,
    caption: { text: string; style?: Partial<TextStyle> },
    canvasWidth: number,
    canvasHeight: number
  ): void {
    if (!caption || !caption.text) return;

    const baseStyle: TextStyle = {
      fontFamily: 'Inter',
      fontSize: 32,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#FFFFFF',
      opacity: 1,
      textAlign: 'center',
      alignment: 'center',
      letterSpacing: 0,
      lineSpacing: 1.2,
      stroke: { enabled: true, color: '#000000', width: 3 },
      shadow: { enabled: true, color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 2, offsetY: 2 },
      background: { enabled: true, color: '#000000', opacity: 0.6, padding: 8, borderRadius: 4 },
      ...(caption.style || {}),
    };

    ctx.save();
    // Default caption position: lower third (85% down from top)
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight * 0.86;

    ctx.translate(centerX, centerY);

    const layout = this.layoutText(ctx, caption.text, baseStyle, canvasWidth * 0.85);
    const { lines, totalWidth, totalHeight, lineHeight } = layout;

    // Background box
    if (baseStyle.background?.enabled) {
      const pad = baseStyle.background.padding || 8;
      const bgX = -totalWidth / 2 - pad;
      const bgY = -totalHeight / 2 - pad;
      const bgW = totalWidth + pad * 2;
      const bgH = totalHeight + pad * 2;

      ctx.save();
      ctx.fillStyle = baseStyle.background.color || '#000000';
      ctx.globalAlpha = Math.max(0, Math.min(1, baseStyle.background.opacity || 0.6));
      this.drawRoundedRect(ctx, bgX, bgY, bgW, bgH, baseStyle.background.borderRadius || 4);
      ctx.fill();
      ctx.restore();
    }

    // Font specs
    ctx.font = `${baseStyle.fontStyle} ${baseStyle.fontWeight} ${baseStyle.fontSize}px "${baseStyle.fontFamily}", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const startY = -totalHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineY = startY + i * lineHeight;

      if (baseStyle.shadow?.enabled) {
        ctx.save();
        ctx.shadowColor = baseStyle.shadow.color || 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = baseStyle.shadow.blur || 4;
        ctx.shadowOffsetX = baseStyle.shadow.offsetX || 2;
        ctx.shadowOffsetY = baseStyle.shadow.offsetY || 2;
        ctx.fillStyle = baseStyle.color;
        ctx.fillText(line.text, 0, lineY);
        ctx.restore();
      }

      if (baseStyle.stroke?.enabled && baseStyle.stroke.width > 0) {
        ctx.save();
        ctx.strokeStyle = baseStyle.stroke.color || '#000000';
        ctx.lineWidth = baseStyle.stroke.width;
        ctx.lineJoin = 'round';
        ctx.strokeText(line.text, 0, lineY);
        ctx.restore();
      }

      ctx.fillStyle = baseStyle.color || '#FFFFFF';
      ctx.fillText(line.text, 0, lineY);
    }

    ctx.restore();
  }

  /**
   * Renders standard broadcast safe area overlays (Title Safe 80%, Action Safe 90%).
   */
  static renderSafeAreas(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    ctx.save();

    // 1. Action Safe: 90% (5% margin on all sides)
    const actionMarginX = canvasWidth * 0.05;
    const actionMarginY = canvasHeight * 0.05;
    const actionW = canvasWidth * 0.9;
    const actionH = canvasHeight * 0.9;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)'; // Cyan
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(actionMarginX, actionMarginY, actionW, actionH);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.setLineDash([]);
    ctx.fillText('ACTION SAFE (90%)', actionMarginX + 6, actionMarginY + 6);

    // 2. Title Safe: 80% (10% margin on all sides)
    const titleMarginX = canvasWidth * 0.1;
    const titleMarginY = canvasHeight * 0.1;
    const titleW = canvasWidth * 0.8;
    const titleH = canvasHeight * 0.8;

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)'; // Amber
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(titleMarginX, titleMarginY, titleW, titleH);

    ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
    ctx.fillText('TITLE SAFE (80%)', titleMarginX + 6, titleMarginY + 6);

    // 3. Center Crosshair
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy);
    ctx.lineTo(cx + 15, cy);
    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx, cy + 15);
    ctx.stroke();

    ctx.restore();
  }
}

