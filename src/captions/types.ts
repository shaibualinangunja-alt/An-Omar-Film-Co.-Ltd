/**
 * FreeCut Caption Engine - Data Models
 * Supports manual caption tracks, caption items, timecode alignment, and styling.
 */

import { TextStyle } from '../text/types';

export interface CaptionItem {
  id: string;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  style?: Partial<TextStyle>;
}

export interface CaptionTrack {
  id: string;
  name: string;
  items: CaptionItem[];
  visible?: boolean;
  locked?: boolean;
  height: number;
}
