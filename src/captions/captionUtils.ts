/**
 * FreeCut Caption Engine - Utilities & Helpers
 */

import { CaptionItem, CaptionTrack } from './types';
import { TextStyle, DEFAULT_TEXT_STYLE } from '../text/types';

export const DEFAULT_CAPTION_STYLE: TextStyle = {
  ...DEFAULT_TEXT_STYLE,
  fontSize: 32,
  fontWeight: 'bold',
  alignment: 'center',
  stroke: {
    enabled: true,
    color: '#000000',
    width: 3,
  },
  shadow: {
    enabled: true,
    color: '#000000',
    blur: 4,
    offsetX: 2,
    offsetY: 2,
  },
  background: {
    enabled: true,
    color: '#000000',
    opacity: 0.5,
    padding: 8,
    borderRadius: 4,
  },
};

export function createCaptionItem(
  startTime: number,
  duration: number = 3,
  text: string = 'New caption...',
  style?: Partial<TextStyle>
): CaptionItem {
  return {
    id: `caption-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startTime: Math.max(0, startTime),
    endTime: Math.max(0, startTime) + Math.max(0.2, duration),
    text,
    style: style ? { ...DEFAULT_CAPTION_STYLE, ...style } : { ...DEFAULT_CAPTION_STYLE },
  };
}

export function createCaptionTrack(name: string = 'Captions 1'): CaptionTrack {
  return {
    id: `track-cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    items: [],
    visible: true,
    locked: false,
    height: 48,
  };
}

/**
 * Find all active caption items at a given playhead time across all visible caption tracks.
 */
export function findActiveCaptions(tracks: CaptionTrack[], currentTime: number): { track: CaptionTrack; item: CaptionItem }[] {
  const active: { track: CaptionTrack; item: CaptionItem }[] = [];
  for (const track of tracks) {
    if (track.visible === false) continue;
    for (const item of track.items) {
      if (currentTime >= item.startTime && currentTime < item.endTime) {
        active.push({ track, item });
      }
    }
  }
  return active;
}

/**
 * Sort caption items chronologically by startTime.
 */
export function sortCaptionItems(items: CaptionItem[]): CaptionItem[] {
  return [...items].sort((a, b) => a.startTime - b.startTime);
}

/**
 * Deep clone a caption item with an optional new ID.
 */
export function cloneCaptionItem(item: CaptionItem, newId: boolean = true): CaptionItem {
  return {
    id: newId ? `caption-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` : item.id,
    startTime: item.startTime,
    endTime: item.endTime,
    text: item.text,
    style: item.style ? JSON.parse(JSON.stringify(item.style)) : undefined,
  };
}
