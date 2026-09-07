/**
 * Media Engine Status & FFprobe Native Probe Types
 */

export interface MediaEngineStatus {
  ffmpegAvailable: boolean;
  ffmpegPath: string;
  ffmpegVersion: string;
  ffprobeAvailable: boolean;
  ffprobePath: string;
  ffprobeVersion: string;
}

export interface NativeProbeStream {
  index: number;
  codec_name?: string;
  codec_type?: 'video' | 'audio' | 'subtitle';
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  duration?: string;
  bit_rate?: string;
  channels?: number;
  sample_rate?: string;
}

export interface NativeProbeFormat {
  filename?: string;
  nb_streams?: number;
  format_name?: string;
  format_long_name?: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
}

export interface NativeProbeResult {
  streams: NativeProbeStream[];
  format: NativeProbeFormat;
}

export interface ExtractedMediaMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  videoCodec?: string;
  audioCodec?: string;
  audioChannels?: number;
  sampleRate?: number;
  size: number;
  formatName?: string;
}
