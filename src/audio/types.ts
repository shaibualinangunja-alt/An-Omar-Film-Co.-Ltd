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

export interface AudioDenoiseSettings {
  enabled: boolean;
  amount: number; // 0 to 100%
  highpass: boolean; // 80Hz rumble cut
}

export interface AudioVoiceSettings {
  enabled: boolean;
  clarity: number; // 0 to 100%
  enhance: boolean; // presence + mild vocal compression
}

export interface AudioEqBand {
  freq: number; // Hz
  gain: number; // dB (-15 to +15)
  q: number; // Q factor (0.5 to 4.0)
}

export interface AudioEqSettings {
  enabled: boolean;
  low: AudioEqBand;     // 80 Hz
  lowMid: AudioEqBand;  // 300 Hz
  mid: AudioEqBand;     // 1000 Hz
  highMid: AudioEqBand; // 3500 Hz
  high: AudioEqBand;    // 10000 Hz
}

export interface AudioReverbSettings {
  enabled: boolean;
  preset?: 'small_room' | 'room' | 'hall' | 'large_hall';
  roomSize: number; // 0 to 100
  decay: number;    // 0 to 100
  wetDry: number;   // 0 to 100 (wet percentage)
  preDelay: number; // ms 0 to 100
}

export interface AudioSeparationSettings {
  mode: 'all' | 'vocals' | 'instrumental' | 'dialogue' | 'background';
  status?: 'idle' | 'processing' | 'ready' | 'error';
  progress?: number;
}

export interface ClipAudioEffects {
  denoise?: AudioDenoiseSettings;
  voice?: AudioVoiceSettings;
  eq?: AudioEqSettings;
  reverb?: AudioReverbSettings;
  separation?: AudioSeparationSettings;
}

export const DEFAULT_CLIP_AUDIO_EFFECTS: ClipAudioEffects = {
  denoise: { enabled: false, amount: 50, highpass: true },
  voice: { enabled: false, clarity: 50, enhance: false },
  eq: {
    enabled: false,
    low: { freq: 80, gain: 0, q: 1.0 },
    lowMid: { freq: 300, gain: 0, q: 1.0 },
    mid: { freq: 1000, gain: 0, q: 1.0 },
    highMid: { freq: 3500, gain: 0, q: 1.0 },
    high: { freq: 10000, gain: 0, q: 1.0 },
  },
  reverb: {
    enabled: false,
    preset: 'room',
    roomSize: 40,
    decay: 35,
    wetDry: 25,
    preDelay: 20,
  },
  separation: {
    mode: 'all',
    status: 'idle',
  },
};
