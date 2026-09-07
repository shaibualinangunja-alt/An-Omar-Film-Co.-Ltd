/**
 * FreeCut Text Compiler for FFmpeg
 * Compiles Text Clips and Captions into robust, frame-accurate FFmpeg drawtext video filter strings.
 */

import { TextStyle } from './types';

/**
 * Escapes characters for FFmpeg drawtext filter syntax.
 * Single quotes, colons, percent signs, and backslashes must be escaped.
 */
export function escapeFFmpegText(text: string): string {
  const str = String(text ?? '');
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%')
    .replace(/\r?\n/g, '\\\n');
}

/**
 * Converts a hex color (#RRGGBB or #RGB) into an FFmpeg color string.
 */
export function formatFFmpegColor(colorStr: string, opacity: number = 1.0): string {
  if (!colorStr) return `white@${opacity.toFixed(2)}`;
  
  const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbaMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbaMatch[3], 10).toString(16).padStart(2, '0');
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) * opacity : opacity;
    return `0x${r}${g}${b}@${Math.max(0, Math.min(1, a)).toFixed(2)}`;
  }

  const cleanHex = colorStr.replace('#', '');
  return `0x${cleanHex}@${Math.max(0, Math.min(1, opacity)).toFixed(2)}`;
}

/**
 * Compiles a text clip or caption item into an FFmpeg drawtext filter string.
 */
export function compileTextToFFmpegDrawtext(
  content: string,
  style: TextStyle,
  startTime: number,
  duration: number,
  positionX: number = 0,
  positionY: number = 0
): string {
  const escapedText = escapeFFmpegText(content);
  const endTime = startTime + duration;
  const parts: string[] = [];

  parts.push(`text='${escapedText}'`);
  parts.push(`fontsize=${Math.max(10, Math.round(style.fontSize))}`);
  parts.push(`fontcolor=${formatFFmpegColor(style.color, style.opacity)}`);

  // Font family
  if (style.fontFamily) {
    parts.push(`font='${style.fontFamily}'`);
  }

  // Position calculation (centered by default, adjusted by alignment and position offset)
  let xExpr = `(w-text_w)/2`;
  if (style.textAlign === 'left') {
    xExpr = `(w-text_w)*0.1`;
  } else if (style.textAlign === 'right') {
    xExpr = `(w-text_w)*0.9`;
  }
  if (positionX !== 0) {
    xExpr += positionX > 0 ? `+${Math.round(positionX)}` : `-${Math.abs(Math.round(positionX))}`;
  }
  parts.push(`x=${xExpr}`);

  let yExpr = `(h-text_h)/2`;
  if (positionY !== 0) {
    yExpr += positionY > 0 ? `+${Math.round(positionY)}` : `-${Math.abs(Math.round(positionY))}`;
  }
  parts.push(`y=${yExpr}`);

  // Stroke / Border
  if (style.stroke?.enabled && style.stroke.width > 0) {
    parts.push(`borderw=${Math.round(style.stroke.width)}`);
    parts.push(`bordercolor=${formatFFmpegColor(style.stroke.color)}`);
  }

  // Shadow
  if (style.shadow?.enabled) {
    parts.push(`shadowcolor=${formatFFmpegColor(style.shadow.color)}`);
    parts.push(`shadowx=${Math.round(style.shadow.offsetX || 2)}`);
    parts.push(`shadowy=${Math.round(style.shadow.offsetY || 2)}`);
  }

  // Background Box
  if (style.background?.enabled) {
    parts.push(`box=1`);
    parts.push(`boxcolor=${formatFFmpegColor(style.background.color, style.background.opacity)}`);
    parts.push(`boxborderw=${Math.round(style.background.padding || 10)}`);
  }

  // Time-based visibility window
  parts.push(`enable='between(t,${startTime.toFixed(3)},${endTime.toFixed(3)})'`);

  return `drawtext=${parts.join(':')}`;
}
