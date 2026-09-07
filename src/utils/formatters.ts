/**
 * Common formatting helpers for FreeCut
 */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatResolution(w?: number, h?: number): string {
  if (!w || !h) return 'Unknown';
  if (w === 3840 && h === 2160) return '4K UHD (3840×2160)';
  if (w === 1920 && h === 1080) return '1080p FHD (1920×1080)';
  if (w === 1280 && h === 720) return '720p HD (1280×720)';
  if (w === 1080 && h === 1920) return '9:16 Vertical (1080×1920)';
  return `${w}×${h}`;
}
