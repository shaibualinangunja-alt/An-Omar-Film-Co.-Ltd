/**
 * FreeCut Project Schema v0.1
 * Follows the non-destructive data-driven NLE project model.
 */

export type MediaType = 'video' | 'audio' | 'image' | 'text';

export interface MediaAsset {
  id: string;
  name: string;
  path: string;
  type: MediaType;
  size: number;
  duration: number; // in seconds
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  audioChannels?: number;
  sampleRate?: number;
  thumbnailUrl?: string;
  isMissing?: boolean;
  createdAt: number;
}

export interface TransformSettings {
  positionX: number; // offset in px or %
  positionY: number;
  scale: number;     // 1.0 = 100%
  rotation: number;  // degrees -180 to 180
  opacity: number;   // 0.0 to 1.0
}

export interface ClipItem {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number;      // timeline start in seconds
  duration: number;       // timeline duration in seconds
  sourceStart: number;    // in-point in source media (seconds)
  sourceDuration: number; // original span
  type: MediaType;
  transform: TransformSettings;
  volume: number;         // 0.0 to 2.0 (1.0 = 100%)
  muted: boolean;
  pan?: number;            // -1.0 to 1.0 (0 = center)
  audioEnabled?: boolean;  // audio toggle for audio/video clips
  fadeInDuration?: number; // audio fade in (seconds)
  fadeOutDuration?: number;// audio fade out (seconds)
  aiAudioCleanup?: any;    // alpha 0.9 audio cleanup settings
  name: string;
  color?: string;
  animations?: import('../animation/types').ClipAnimations;
  effects?: import('../effects/types').EffectInstance[];
  textConfig?: import('../text/types').TextConfig;
  crop?: import('../compositing/types').CropSettings;
  flip?: import('../compositing/types').FlipSettings;
  chromaKey?: import('../compositing/types').ChromaKeySettings;
  masks?: import('../compositing/types').MaskItem[];
  blendMode?: import('../compositing/types').BlendMode;
  trackingData?: import('../compositing/types').TrackingData[];
  colorGrade?: import('../color/types').ColorGradeSettings;
  colorManagement?: import('../color/types').ColorManagementSettings;
}

export type TrackType = 'video' | 'audio';

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  order: number; // 0 is top-most
  muted: boolean;
  locked: boolean;
  solo: boolean;
  pan?: number;
  volume?: number;
  visible?: boolean;
  targeted?: boolean;
  height: number;
}

export interface ProjectSettings {
  name: string;
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
  audioSampleRate: number;
  colorManagement?: import('../color/types').ColorManagementSettings;
  aiSettings?: {
    offlineMode: boolean;
    defaultModel: string;
  };
}

export interface FreeCutProject {
  version: "0.1";
  project: ProjectSettings;
  media: MediaAsset[];
  tracks: TimelineTrack[];
  clips: ClipItem[];
  transitions?: import('../transitions/types').TransitionItem[];
  captionTracks?: import('../captions/types').CaptionTrack[];
  exportProfiles?: import('../export/types').ExportProfile[];
  sceneMarkers?: import('../ai/types').SceneMarker[];
  beatMarkers?: import('../ai/types').BeatMarker[];
  settings: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

