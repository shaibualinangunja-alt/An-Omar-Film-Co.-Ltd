export type ExportPreset = 'youtube_1080p' | 'youtube_720p' | 'tiktok_9_16' | 'master_pro';

export interface ExportSettings {
  filename: string;
  outputPath: string;
  format: 'mp4' | 'mov' | 'webm';
  videoCodec: 'h264' | 'hevc' | 'vp9' | 'prores';
  audioCodec: 'aac' | 'mp3' | 'opus' | 'pcm_s16le';
  width: number;
  height: number;
  fps: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  useHardwareAcceleration?: boolean;
  proresProfile?: 'proxy' | 'lt' | 'standard' | 'hq' | '4444';
  qualityPreset?: 'fast' | 'medium' | 'slow' | 'crf';
  crf?: number;
}

export interface ExportProgress {
  status: 'idle' | 'preparing' | 'rendering' | 'completed' | 'error';
  percent: number;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  etaSeconds: number;
  errorMessage?: string;
}
