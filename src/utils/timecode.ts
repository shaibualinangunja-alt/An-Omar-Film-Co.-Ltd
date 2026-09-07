/**
 * Timecode conversion and formatting utilities (SMPTE format HH:MM:SS:FF)
 */

export function formatTimecode(totalSeconds: number, fps: number = 30): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;

  const totalFrames = Math.floor(totalSeconds * fps);
  const frames = totalFrames % fps;
  const wholeSeconds = Math.floor(totalSeconds);
  const seconds = wholeSeconds % 60;
  const minutes = Math.floor(wholeSeconds / 60) % 60;
  const hours = Math.floor(wholeSeconds / 3600);

  const pad = (num: number, size = 2) => String(num).padStart(size, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

export function formatDurationCompact(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
  const whole = Math.floor(totalSeconds);
  const s = whole % 60;
  const m = Math.floor(whole / 60) % 60;
  const h = Math.floor(whole / 3600);

  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

export function parseTimecode(tc: string, fps: number = 30): number {
  const parts = tc.split(':').map(Number);
  if (parts.length === 4) {
    const [h, m, s, f] = parts;
    return h * 3600 + m * 60 + s + f / fps;
  }
  if (parts.length === 3) {
    const [m, s, ms] = parts;
    return m * 60 + s + ms / 100;
  }
  return 0;
}
