/**
 * FreeCut Alpha 0.8 Professional Audio Engine Types
 */

export interface ClipAudioSettings {
  volume: number;          // 0.0 to 2.0 (1.0 = 100% unity gain)
  muted: boolean;
  pan: number;             // -1.0 (full left) to +1.0 (full right), 0 = center
  audioEnabled: boolean;   // enable/disable audio on audio/video clips
  fadeInDuration: number;  // fade in duration in seconds (0 = no fade)
  fadeOutDuration: number; // fade out duration in seconds (0 = no fade)
  audioOffset?: number;    // source-relative audio sync offset in seconds
}

export interface AudioTrackSettings {
  id: string;
  name: string;
  order: number;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  volume: number;          // track master volume 0.0 to 2.0
  pan: number;             // -1.0 to +1.0
  targeted?: boolean;
}

export interface AudioMeterData {
  leftRms: number;         // 0.0 to 1.0
  rightRms: number;        // 0.0 to 1.0
  leftPeakDb: number;      // -Infinity to +6 dBFS
  rightPeakDb: number;     // -Infinity to +6 dBFS
  leftPeakHold: number;    // Peak hold level
  rightPeakHold: number;
  isClipping: boolean;     // true if peak >= 0 dBFS
}

export interface AudioWaveformChannel {
  min: number[];
  max: number[];
}

export interface AudioWaveformData {
  mediaId: string;
  channels: AudioWaveformChannel[];
  sampleRate: number;
  duration: number;
  samplesPerPixel?: number;
}

export interface AudioCrossfade {
  id: string;
  fromClipId: string;
  toClipId: string;
  duration: number; // crossfade duration in seconds
  curve: 'tri' | 'qsin' | 'esin' | 'hsin' | 'log' | 'par' | 'qua' | 'cub' | 'squ' | 'cbr';
}

export const DEFAULT_CLIP_AUDIO: ClipAudioSettings = {
  volume: 1.0,
  muted: false,
  pan: 0.0,
  audioEnabled: true,
  fadeInDuration: 0.0,
  fadeOutDuration: 0.0,
};
