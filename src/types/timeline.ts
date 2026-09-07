import { ClipItem } from './project';

export interface TimelineSelection {
  selectedClipIds: string[];
  selectedTrackId?: string;
}

export interface PlayheadState {
  currentTime: number; // in seconds
  isPlaying: boolean;
  loop: boolean;
}

export interface TimelineViewState {
  zoom: number;       // pixels per second (e.g. 50px = 1s)
  scrollLeft: number;
  snappingEnabled: boolean;
  snapThresholdPx: number;
}

export interface SplitResult {
  firstClip: ClipItem;
  secondClip: ClipItem;
}
