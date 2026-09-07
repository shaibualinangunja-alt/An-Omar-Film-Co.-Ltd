/**
 * FreeCut Alpha 0.8 Professional Export Engine Types
 */

export type ExportContainer = 'mp4' | 'mov' | 'webm';
export type ExportVideoCodec = 'h264' | 'hevc' | 'vp9' | 'prores';
export type ExportAudioCodec = 'aac' | 'opus' | 'mp3' | 'pcm_s16le';
export type HardwareEncoderVendor = 'nvenc' | 'qsv' | 'amf' | 'd3d12va' | 'mediafoundation' | 'none';

export interface HardwareEncoderInfo {
  vendor: HardwareEncoderVendor;
  encoderName: string; // e.g. 'h264_nvenc', 'hevc_qsv', 'h264_amf', 'h264_mf'
  supportedCodecs: ExportVideoCodec[];
  isAvailable: boolean;
}

export interface ExportProfile {
  id: string;
  name: string;
  description: string;
  container: ExportContainer;
  videoCodec: ExportVideoCodec;
  audioCodec: ExportAudioCodec;
  width: number;
  height: number;
  fps: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  qualityPreset: 'fast' | 'medium' | 'slow' | 'crf';
  crf?: number;
  proresProfile?: 'proxy' | 'lt' | 'standard' | 'hq' | '4444';
  colorSpace?: string;
  colorRange?: 'full' | 'limited';
  useHardwareAcceleration: boolean;
}

export interface ExportQueueJob {
  id: string;
  name: string;
  profile: ExportProfile;
  outputPath: string;
  status: 'queued' | 'rendering' | 'completed' | 'error' | 'cancelled';
  percent: number;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  etaSeconds: number;
  errorMessage?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}
