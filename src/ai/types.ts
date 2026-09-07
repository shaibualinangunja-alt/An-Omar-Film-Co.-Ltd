
// Model Registry Types
export type AiTaskType = 'speech-to-text' | 'segmentation' | 'classification' | 'vision';

export interface AiModel {
  id: string;
  name: string;
  version: string;
  task: AiTaskType;
  path: string; // HuggingFace repo or local path
  sizeBytes: number;
  format: 'onnx' | 'tflite' | 'gguf';
  runtime: 'transformers.js' | 'custom';
  cpuSupport: boolean;
  gpuSupport: boolean;
  license: string;
  isDownloaded: boolean;
  downloadProgress?: number;
}

// Capability Detection Types
export interface AiCapabilities {
  webGpuAvailable: boolean;
  webGlAvailable: boolean;
  cpuCores: number;
  memoryLimitMb: number;
  preferredBackend: 'webgpu' | 'wasm' | 'webgl';
  deviceString?: string;
}

// Job Queue Types
export type AiJobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type AiJobType = 'transcription' | 'silence-detection' | 'scene-detection' | 'beat-detection' | 'audio-cleanup' | 'background-removal';

export interface AiJob {
  id: string;
  type: AiJobType;
  modelId?: string;
  mediaId: string;
  status: AiJobStatus;
  progress: number; // 0 to 1
  elapsedTimeMs: number;
  estimatedRemainingTimeMs?: number;
  result?: any;
  error?: string;
  cancelCallback?: () => void;
  createdAt: number;
}

// AI Analysis Results
export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  words?: TranscriptWord[];
}

export interface Transcript {
  segments: TranscriptSegment[];
  language: string;
}

export interface SilenceRegion {
  start: number;
  end: number;
  duration: number;
}

export type SceneMarkerType = 'hard-cut' | 'fade' | 'dissolve';

export interface SceneMarker {
  timestamp: number; // seconds
  strength: number; // 0 to 1
  type: SceneMarkerType;
}

export interface BeatMarker {
  timestamp: number;
  confidence: number;
}

// Editor Action Commands (The bridge between AI and Project Store)
export interface AiEditorAction {
  type: string;
  payload: any;
}

export interface ApplySilenceRemovalPayload {
  trackId: string;
  clipId: string;
  silenceRegions: SilenceRegion[];
  paddingBefore: number;
  paddingAfter: number;
}

export interface AddCaptionTrackPayload {
  transcript: Transcript;
  trackName: string;
  maxCharsPerLine: number;
}

export interface AudioCleanupSettings {
  reduceNoise: boolean;
  enhanceSpeech?: boolean;
  removeHum?: boolean;
}

export interface AudioCleanupResult {
  settings: AudioCleanupSettings;
  originalPath: string;
  processedPath: string;
  algorithm: string;
  duration?: number;
  sampleRate?: number;
  channels?: number;
  outputSize?: number;
  appliedAt?: string;
}
