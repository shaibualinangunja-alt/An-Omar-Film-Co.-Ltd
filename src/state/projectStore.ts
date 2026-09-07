import { useState, useEffect, useRef } from 'react';
import { FreeCutProject, ClipItem, MediaAsset, TransformSettings } from '../types/project';
import { ProjectService } from '../services/projectService';
import { MediaService } from '../services/mediaService';
import { HistoryManager, HistoryCommand } from './historyManager';
import { stepFrameTime, snapToFrame } from '../utils/timelineMath';
import { TimelineOperations } from '../services/timelineOperations';
import {
  AnimatableProperty,
  Keyframe,
  evaluateClipAnimations,
  findKeyframeAtTime,
  findNearestKeyframeTimes,
  generateKeyframeId,
} from '../animation';
import {
  TransitionType,
  TransitionItem,
  TransitionParameters,
  TransitionRegistry,
  validateTransition,
  generateTransitionId,
} from '../transitions';
import {
  EffectType,
  EffectInstance,
  EffectRegistry,
  generateEffectId,
} from '../effects';
import {
  TextStyle,
  TextConfig,
  TextAnimationPresetName,
  createDefaultTextConfig,
  applyPresetToAnimations,
} from '../text';
import {
  CaptionItem,
  createCaptionTrack,
  createCaptionItem,
  cloneCaptionItem,
} from '../captions';
import {
  CropSettings,
  FlipSettings,
  BlendMode,
  ChromaKeySettings,
  MaskItem,
  MaskType,
  createDefaultMask,
  TrackingData,
  TrackingService,
  DEFAULT_CHROMA_KEY_SETTINGS,
} from '../compositing';
import { ClipAudioSettings } from '../audio/types';
import {
  ColorGradeSettings,
  ColorManagementSettings,
  BasicGradeSettings,
  ColorWheels,
  ColorCurves,
  HSLQualifier,
  LUTSettings,
  QuickLookId,
  DEFAULT_COLOR_GRADE,
  DEFAULT_COLOR_MANAGEMENT,
} from '../color/types';
import { QuickLooksRegistry } from '../color/quickLooks';
import { AutoColorEngine, AutoAnalysisResult } from '../color/autoColor';

export interface EditorState {
  project: FreeCutProject;
  selectedClipIds: string[];
  selectedClipId: string | null; // Primary selection for backwards compatibility
  selectedTransitionId: string | null;
  selectedCaptionId: string | null;
  selectedCaptionTrackId: string | null;
  showSafeAreas: boolean;
  clipboard: ClipItem[];
  currentTime: number;
  isPlaying: boolean;
  timelineZoom: number; // px per second
  snappingEnabled: boolean;
  activeMediaTab: 'all' | 'video' | 'audio' | 'image';
  isExportModalOpen: boolean;
  isProjectSettingsOpen: boolean;
  isMediaEngineModalOpen: boolean;
  isAiModelManagerModalOpen: boolean;
  isRelinkModalOpen: boolean;
  statusMessage: string;
}

class ProjectStore {
  private state: EditorState;
  private listeners: Set<() => void> = new Set();
  private history = new HistoryManager<FreeCutProject>();
  private playTimer: any = null;
  private playRafId: number | null = null;
  private playStartTime: number = 0;
  private playStartProjectTime: number = 0;
  private cachedMaxDuration: number = 5;

  constructor() {
    this.state = {
      project: ProjectService.createDefaultProject('Untitled Project'),
      selectedClipIds: [],
      selectedClipId: null,
      selectedTransitionId: null,
      selectedCaptionId: null,
      selectedCaptionTrackId: null,
      showSafeAreas: false,
      clipboard: [],
      currentTime: 0,
      isPlaying: false,
      timelineZoom: 45,
      snappingEnabled: true,
      activeMediaTab: 'all',
      isExportModalOpen: false,
      isProjectSettingsOpen: false,
      isMediaEngineModalOpen: false,
      isAiModelManagerModalOpen: false,
      isRelinkModalOpen: false,
      statusMessage: 'Ready',
    };
  }

  getState(): EditorState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  setState(updater: Partial<EditorState> | ((prev: EditorState) => EditorState)) {
    if (typeof updater === 'function') {
      this.state = updater(this.state);
    } else {
      this.state = { ...this.state, ...updater };
    }
    this.notify();
  }

  // --- History & Project Modification ---

  executeProjectMutation(name: string, mutate: (proj: FreeCutProject) => FreeCutProject) {
    const oldProject = this.state.project;
    const newProject = mutate(JSON.parse(JSON.stringify(oldProject)));

    const command: HistoryCommand<FreeCutProject> = {
      name,
      undo: () => oldProject,
      redo: () => newProject,
    };

    this.history.push(command);
    this.setState({
      project: newProject,
      statusMessage: `Applied: ${name}`,
    });
    this.updateCachedMaxDuration();
  }

  undo() {
    const res = this.history.undo(this.state.project);
    if (res) {
      // Reconcile selection with available clips
      const currentClipIds = new Set(res.newState.clips.map(c => c.id));
      const survivingSelected = this.state.selectedClipIds.filter(id => currentClipIds.has(id));
      this.setState({
        project: res.newState,
        selectedClipIds: survivingSelected,
        selectedClipId: survivingSelected[0] || null,
        statusMessage: `Undone: ${res.commandName}`,
      });
    }
  }

  redo() {
    const res = this.history.redo(this.state.project);
    if (res) {
      const currentClipIds = new Set(res.newState.clips.map(c => c.id));
      const survivingSelected = this.state.selectedClipIds.filter(id => currentClipIds.has(id));
      this.setState({
        project: res.newState,
        selectedClipIds: survivingSelected,
        selectedClipId: survivingSelected[0] || null,
        statusMessage: `Redone: ${res.commandName}`,
      });
    }
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  // --- Project Management ---

  setProject(project: FreeCutProject) {
    this.stopPlaybackLoop();
    this.history.clear();
    this.setState({
      project,
      selectedClipIds: [],
      selectedClipId: null,
      currentTime: 0,
      isPlaying: false,
      statusMessage: `Project loaded: ${project.project.name}`,
    });
    this.updateCachedMaxDuration();
  }

  // --- Media Assets ---

  addMedia(asset: MediaAsset) {
    this.executeProjectMutation(`Import ${asset.name}`, (proj) => {
      proj.media.push(asset);
      return proj;
    });
  }

  removeMedia(mediaId: string) {
    this.executeProjectMutation('Remove Media', (proj) => {
      proj.media = proj.media.filter(m => m.id !== mediaId);
      proj.clips = proj.clips.filter(c => c.mediaId !== mediaId);
      return proj;
    });
    this.clearSelection();
  }

  // --- Missing Media Relinking ---

  findMissingMedia(): MediaAsset[] {
    return this.state.project.media.filter(m => m.isMissing);
  }

  async relinkMedia(
    mediaId: string,
    newPathOrFile: string | File
  ): Promise<{ success: boolean; error?: string }> {
    const asset = this.state.project.media.find(m => m.id === mediaId);
    if (!asset) {
      return { success: false, error: 'Media asset not found in project' };
    }

    try {
      let probed: MediaAsset;
      if (typeof newPathOrFile === 'string') {
        probed = await MediaService.probeLocalFile(newPathOrFile);
      } else {
        probed = await MediaService.probeMediaFile(newPathOrFile);
      }

      // Conservative validation:
      // 1. MediaType compatibility
      if (probed.type !== asset.type) {
        return {
          success: false,
          error: `Incompatible media type: expected "${asset.type}", got "${probed.type}"`,
        };
      }

      // 2. Minimum duration check if clips depend on it
      const dependentClips = this.state.project.clips.filter(c => c.mediaId === mediaId);
      if (dependentClips.length > 0 && probed.duration < 0.1) {
        return {
          success: false,
          error: 'Replacement file duration is invalid (<0.1s)',
        };
      }

      // 3. Update asset in project while preserving clip references on timeline
      const newPath = typeof newPathOrFile === 'string' ? newPathOrFile : probed.path;
      this.executeProjectMutation(`Relink ${asset.name}`, (proj) => {
        const target = proj.media.find(m => m.id === mediaId);
        if (target) {
          target.path = newPath;
          target.size = probed.size;
          target.duration = probed.duration;
          target.width = probed.width ?? target.width;
          target.height = probed.height ?? target.height;
          target.fps = probed.fps ?? target.fps;
          target.codec = probed.codec ?? target.codec;
          target.audioChannels = probed.audioChannels ?? target.audioChannels;
          target.sampleRate = probed.sampleRate ?? target.sampleRate;
          target.thumbnailUrl = probed.thumbnailUrl || target.thumbnailUrl;
          target.isMissing = false;
        }
        return proj;
      });

      this.setState({ statusMessage: `Relinked ${asset.name} successfully` });
      return { success: true };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Validation error: ${errorMsg}` };
    }
  }

  async batchRelinkMedia(
    matches: Array<{ mediaId: string; newPathOrFile: string | File }>
  ): Promise<{
    matchedCount: number;
    failedCount: number;
    errors: Array<{ mediaId: string; error: string }>;
  }> {
    const errors: Array<{ mediaId: string; error: string }> = [];
    const validUpdates: Array<{ mediaId: string; newPath: string; probed: MediaAsset }> = [];

    for (const match of matches) {
      const asset = this.state.project.media.find(m => m.id === match.mediaId);
      if (!asset) {
        errors.push({ mediaId: match.mediaId, error: 'Asset not found' });
        continue;
      }

      try {
        let probed: MediaAsset;
        if (typeof match.newPathOrFile === 'string') {
          probed = await MediaService.probeLocalFile(match.newPathOrFile);
        } else {
          probed = await MediaService.probeMediaFile(match.newPathOrFile);
        }

        // Conservative checks
        if (probed.type !== asset.type) {
          errors.push({
            mediaId: match.mediaId,
            error: `Incompatible media type: expected "${asset.type}", got "${probed.type}"`,
          });
          continue;
        }

        const dependentClips = this.state.project.clips.filter(c => c.mediaId === match.mediaId);
        if (dependentClips.length > 0 && probed.duration < 0.1) {
          errors.push({
            mediaId: match.mediaId,
            error: 'Replacement file duration is invalid (<0.1s)',
          });
          continue;
        }

        validUpdates.push({
          mediaId: match.mediaId,
          newPath: typeof match.newPathOrFile === 'string' ? match.newPathOrFile : probed.path,
          probed,
        });
      } catch (err: unknown) {
        errors.push({
          mediaId: match.mediaId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (validUpdates.length > 0) {
      this.executeProjectMutation(`Batch Relink (${validUpdates.length} files)`, (proj) => {
        for (const update of validUpdates) {
          const target = proj.media.find(m => m.id === update.mediaId);
          if (target) {
            target.path = update.newPath;
            target.size = update.probed.size;
            target.duration = update.probed.duration;
            target.width = update.probed.width ?? target.width;
            target.height = update.probed.height ?? target.height;
            target.fps = update.probed.fps ?? target.fps;
            target.codec = update.probed.codec ?? target.codec;
            target.audioChannels = update.probed.audioChannels ?? target.audioChannels;
            target.sampleRate = update.probed.sampleRate ?? target.sampleRate;
            target.thumbnailUrl = update.probed.thumbnailUrl || target.thumbnailUrl;
            target.isMissing = false;
          }
        }
        return proj;
      });

      this.setState({
        statusMessage: `Batch relinked ${validUpdates.length} file(s)`,
      });
    }

    return {
      matchedCount: validUpdates.length,
      failedCount: errors.length,
      errors,
    };
  }

  // --- Selection Management ---

  selectClip(clipId: string | null, multi: boolean = false, range: boolean = false) {
    if (!clipId) {
      this.setState({ selectedClipIds: [], selectedClipId: null });
      return;
    }

    if (multi) {
      // Toggle clip in selection
      let newSelection = [...this.state.selectedClipIds];
      if (newSelection.includes(clipId)) {
        newSelection = newSelection.filter(id => id !== clipId);
      } else {
        newSelection.push(clipId);
      }
      this.setState({
        selectedClipIds: newSelection,
        selectedClipId: newSelection[newSelection.length - 1] || null,
      });
      return;
    }

    if (range && this.state.selectedClipId) {
      // Range select clips between previous primary and clicked clip
      const allClips = this.state.project.clips;
      const idxA = allClips.findIndex(c => c.id === this.state.selectedClipId);
      const idxB = allClips.findIndex(c => c.id === clipId);
      if (idxA !== -1 && idxB !== -1) {
        const startIdx = Math.min(idxA, idxB);
        const endIdx = Math.max(idxA, idxB);
        const rangeIds = allClips.slice(startIdx, endIdx + 1).map(c => c.id);
        this.setState({
          selectedClipIds: Array.from(new Set([...this.state.selectedClipIds, ...rangeIds])),
          selectedClipId: clipId,
        });
        return;
      }
    }

    // Normal single selection
    this.setState({
      selectedClipIds: [clipId],
      selectedClipId: clipId,
      selectedCaptionId: null,
      selectedCaptionTrackId: null,
    });
  }

  selectAllClips() {
    const allIds = this.state.project.clips.map(c => c.id);
    this.setState({
      selectedClipIds: allIds,
      selectedClipId: allIds[0] || null,
      selectedCaptionId: null,
      selectedCaptionTrackId: null,
    });
  }

  clearSelection() {
    this.setState({
      selectedClipIds: [],
      selectedClipId: null,
      selectedCaptionId: null,
      selectedCaptionTrackId: null,
    });
  }

  // --- Track Targeting & Visibility ---

  toggleTrackLock(trackId: string) {
    this.executeProjectMutation('Toggle Track Lock', proj => {
      const t = proj.tracks.find(track => track.id === trackId);
      if (t) t.locked = !t.locked;
      return proj;
    });
  }

  toggleTrackMute(trackId: string) {
    this.executeProjectMutation('Toggle Track Mute', proj => {
      const t = proj.tracks.find(track => track.id === trackId);
      if (t) t.muted = !t.muted;
      return proj;
    });
  }

  toggleTrackVisibility(trackId: string) {
    this.executeProjectMutation('Toggle Track Visibility', proj => {
      const t = proj.tracks.find(track => track.id === trackId);
      if (t) t.visible = t.visible === false ? true : false;
      return proj;
    });
  }

  setTrackTargeted(trackId: string) {
    this.executeProjectMutation('Set Track Target', proj => {
      const clicked = proj.tracks.find(t => t.id === trackId);
      if (!clicked) return proj;
      // Exclusive target per track type (video / audio)
      proj.tracks.forEach(t => {
        if (t.type === clicked.type) {
          t.targeted = t.id === trackId ? !t.targeted : false;
        }
      });
      return proj;
    });
  }

  // --- Professional Timeline Editing Engine Operations ---

  addClipToTimeline(mediaId: string, trackId: string, startTime: number) {
    if (TimelineOperations.isTrackLocked(this.state.project, trackId)) {
      this.setState({ statusMessage: 'Cannot add clip: Track is locked' });
      return;
    }

    const media = this.state.project.media.find(m => m.id === mediaId);
    if (!media) return;

    const fps = this.state.project.project.fps || 30;
    const duration = snapToFrame(media.duration || 5, fps);
    const newClip: ClipItem = {
      id: TimelineOperations.generateClipId(),
      mediaId,
      trackId,
      startTime: snapToFrame(Math.max(0, startTime), fps),
      duration,
      sourceStart: 0,
      sourceDuration: duration,
      type: media.type,
      name: media.name,
      transform: {
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      volume: 1.0,
      muted: false,
    };

    this.executeProjectMutation(`Add Clip: ${media.name}`, proj => {
      proj.clips.push(newClip);
      return proj;
    });

    this.selectClip(newClip.id);
  }

  // --- Text Engine Operations ---

  addTextClip(
    trackId?: string,
    startTime?: number,
    content: string = 'Type something...',
    customStyle?: Partial<TextStyle>
  ) {
    const proj = this.state.project;
    const fps = proj.project.fps || 30;

    let targetTrack = trackId ? proj.tracks.find(t => t.id === trackId && !t.locked) : undefined;
    if (!targetTrack) {
      targetTrack = proj.tracks.find(t => t.type === 'video' && t.targeted && !t.locked);
    }
    if (!targetTrack) {
      targetTrack = proj.tracks.find(t => t.type === 'video' && !t.locked);
    }
    if (!targetTrack) {
      this.setState({ statusMessage: 'Cannot add text: No unlocked video track available' });
      return;
    }

    const start = snapToFrame(startTime !== undefined ? Math.max(0, startTime) : this.state.currentTime, fps);
    const duration = snapToFrame(5, fps);

    const newClip: ClipItem = {
      id: TimelineOperations.generateClipId(),
      mediaId: '',
      trackId: targetTrack.id,
      startTime: start,
      duration,
      sourceStart: 0,
      sourceDuration: duration,
      type: 'text',
      name: content.length > 20 ? content.slice(0, 17) + '...' : content,
      transform: {
        positionX: 0,
        positionY: 0,
        scale: 1,
        rotation: 0,
        opacity: 1,
      },
      volume: 1.0,
      muted: false,
      textConfig: createDefaultTextConfig(content, customStyle),
    };

    this.executeProjectMutation(`Add Text: ${newClip.name}`, p => {
      p.clips.push(newClip);
      return p;
    });

    this.selectClip(newClip.id);
  }

  updateTextConfig(clipId: string, updates: Partial<TextConfig> | ((prev: TextConfig) => TextConfig)) {
    this.executeProjectMutation('Update Text Style', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (clip && clip.textConfig) {
        if (typeof updates === 'function') {
          clip.textConfig = updates(clip.textConfig);
        } else {
          clip.textConfig = {
            ...clip.textConfig,
            ...updates,
            style: {
              ...clip.textConfig.style,
              ...(updates.style || {}),
              stroke: updates.style?.stroke ? { ...clip.textConfig.style.stroke, ...updates.style.stroke } : clip.textConfig.style.stroke,
              shadow: updates.style?.shadow ? { ...clip.textConfig.style.shadow, ...updates.style.shadow } : clip.textConfig.style.shadow,
              background: updates.style?.background ? { ...clip.textConfig.style.background, ...updates.style.background } : clip.textConfig.style.background,
            },
          };
        }
        if (clip.textConfig.content) {
          clip.name = clip.textConfig.content.length > 20 ? clip.textConfig.content.slice(0, 17) + '...' : clip.textConfig.content;
        }
      }
      return proj;
    });
  }

  applyTextAnimationPreset(clipId: string, presetName: TextAnimationPresetName, duration: number = 0.5) {
    const fps = this.state.project.project.fps || 30;
    this.executeProjectMutation(`Apply Preset: ${presetName}`, proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (clip) {
        clip.animations = applyPresetToAnimations(clip.animations, presetName, clip.duration, duration, fps);
      }
      return proj;
    });
  }

  // --- Caption Foundation Operations ---

  selectCaptionItem(trackId: string | null, captionId: string | null) {
    this.setState({
      selectedCaptionId: captionId,
      selectedCaptionTrackId: trackId,
      selectedClipId: null,
      selectedClipIds: [],
      selectedTransitionId: null,
    });
  }

  addCaptionTrack(name?: string) {
    this.executeProjectMutation('Add Caption Track', proj => {
      if (!proj.captionTracks) {
        proj.captionTracks = [];
      }
      const trackName = name || `Captions ${proj.captionTracks.length + 1}`;
      proj.captionTracks.push(createCaptionTrack(trackName));
      return proj;
    });
  }

  addCaptionItem(trackId?: string, startTime?: number, duration: number = 3, text: string = 'New caption...') {
    const fps = this.state.project.project.fps || 30;
    const start = snapToFrame(startTime !== undefined ? Math.max(0, startTime) : this.state.currentTime, fps);
    const dur = snapToFrame(Math.max(0.5, duration), fps);

    let createdId: string | null = null;
    let targetTrackId = trackId;

    this.executeProjectMutation('Add Caption', proj => {
      if (!proj.captionTracks || proj.captionTracks.length === 0) {
        proj.captionTracks = [createCaptionTrack('Captions 1')];
      }
      let track = proj.captionTracks.find(t => t.id === targetTrackId);
      if (!track) {
        track = proj.captionTracks[0];
      }
      targetTrackId = track.id;
      const item = createCaptionItem(start, dur, text);
      createdId = item.id;
      track.items.push(item);
      track.items.sort((a, b) => a.startTime - b.startTime);
      return proj;
    });

    if (createdId && targetTrackId) {
      this.selectCaptionItem(targetTrackId, createdId);
    }
  }

  updateCaptionItem(trackId: string, captionId: string, updates: Partial<CaptionItem>) {
    this.executeProjectMutation('Update Caption', proj => {
      if (!proj.captionTracks) return proj;
      const track = proj.captionTracks.find(t => t.id === trackId);
      if (!track) return proj;
      const item = track.items.find(i => i.id === captionId);
      if (!item) return proj;

      if (updates.startTime !== undefined) item.startTime = Math.max(0, updates.startTime);
      if (updates.endTime !== undefined) item.endTime = Math.max(item.startTime + 0.1, updates.endTime);
      if (updates.text !== undefined) item.text = updates.text;
      if (updates.style !== undefined) {
        item.style = {
          ...(item.style || {}),
          ...updates.style,
          stroke: updates.style.stroke ? { ...(item.style?.stroke || {}), ...updates.style.stroke } : item.style?.stroke,
          shadow: updates.style.shadow ? { ...(item.style?.shadow || {}), ...updates.style.shadow } : item.style?.shadow,
          background: updates.style.background ? { ...(item.style?.background || {}), ...updates.style.background } : item.style?.background,
        };
      }
      track.items.sort((a, b) => a.startTime - b.startTime);
      return proj;
    });
  }

  deleteCaptionItem(trackId: string, captionId: string) {
    this.executeProjectMutation('Delete Caption', proj => {
      if (!proj.captionTracks) return proj;
      const track = proj.captionTracks.find(t => t.id === trackId);
      if (!track) return proj;
      track.items = track.items.filter(i => i.id !== captionId);
      return proj;
    });
    if (this.state.selectedCaptionId === captionId) {
      this.setState({ selectedCaptionId: null, selectedCaptionTrackId: null });
    }
  }

  duplicateCaptionItem(trackId: string, captionId: string) {
    let newId: string | null = null;
    this.executeProjectMutation('Duplicate Caption', proj => {
      if (!proj.captionTracks) return proj;
      const track = proj.captionTracks.find(t => t.id === trackId);
      if (!track) return proj;
      const item = track.items.find(i => i.id === captionId);
      if (!item) return proj;

      const duration = item.endTime - item.startTime;
      const newItem = cloneCaptionItem(item, true);
      newItem.startTime = item.endTime;
      newItem.endTime = newItem.startTime + duration;
      newId = newItem.id;
      track.items.push(newItem);
      track.items.sort((a, b) => a.startTime - b.startTime);
      return proj;
    });
    if (newId) {
      this.selectCaptionItem(trackId, newId);
    }
  }

  toggleSafeAreas() {
    this.setState({ showSafeAreas: !this.state.showSafeAreas });
  }

  deleteSelectedClips() {
    const ids = this.state.selectedClipIds;
    if (ids.length === 0) return;

    this.executeProjectMutation(`Delete ${ids.length} Clip(s)`, proj => {
      const res = TimelineOperations.deleteClips(proj, ids);
      return res.project;
    });

    this.clearSelection();
  }

  // Backwards-compatible alias
  deleteSelectedClip() {
    this.deleteSelectedClips();
  }

  rippleDeleteSelectedClips() {
    const ids = this.state.selectedClipIds;
    if (ids.length === 0) return;

    this.executeProjectMutation(`Ripple Delete ${ids.length} Clip(s)`, proj => {
      const res = TimelineOperations.rippleDeleteClips(proj, ids);
      return res.project;
    });

    this.clearSelection();
  }

  insertAtPlayhead(mediaId: string, trackId?: string) {
    const targetTrack = trackId || 
      this.state.project.tracks.find(t => t.targeted && t.type === 'video')?.id || 
      this.state.project.tracks.find(t => t.type === 'video')?.id || 'track_v1';

    this.executeProjectMutation('Insert Clip', proj => {
      const res = TimelineOperations.insertClip(proj, mediaId, targetTrack, this.state.currentTime);
      return res.project;
    });
  }

  overwriteAtPlayhead(mediaId: string, trackId?: string) {
    const targetTrack = trackId || 
      this.state.project.tracks.find(t => t.targeted && t.type === 'video')?.id || 
      this.state.project.tracks.find(t => t.type === 'video')?.id || 'track_v1';

    this.executeProjectMutation('Overwrite Clip', proj => {
      const res = TimelineOperations.overwriteClip(proj, mediaId, targetTrack, this.state.currentTime);
      return res.project;
    });
  }

  moveClips(clipIds: string[], deltaTime: number) {
    this.executeProjectMutation('Move Clips', proj => {
      const res = TimelineOperations.moveClips(proj, clipIds, deltaTime);
      return res.project;
    });
  }

  trimClip(clipId: string, newStartTime: number, newDuration: number, newSourceStart: number) {
    this.executeProjectMutation('Trim Clip', proj => {
      const res = TimelineOperations.trimClip(proj, clipId, newStartTime, newDuration, newSourceStart);
      return res.project;
    });
  }

  splitClipAtPlayhead() {
    const time = this.state.currentTime;
    const targetIds = this.state.selectedClipIds.length > 0 ? this.state.selectedClipIds : null;

    this.executeProjectMutation('Split Clip', proj => {
      const res = TimelineOperations.splitClipsAtTime(proj, targetIds, time);
      return res.project;
    });
  }

  // --- Clipboard & Duplication ---

  copySelection() {
    const selected = this.state.project.clips.filter(c => this.state.selectedClipIds.includes(c.id));
    if (selected.length > 0) {
      this.setState({
        clipboard: JSON.parse(JSON.stringify(selected)),
        statusMessage: `Copied ${selected.length} clip(s)`,
      });
    }
  }

  cutSelection() {
    this.copySelection();
    this.deleteSelectedClips();
    this.setState({ statusMessage: `Cut ${this.state.clipboard.length} clip(s)` });
  }

  pasteClipboard() {
    if (this.state.clipboard.length === 0) return;

    const targetedTrack = this.state.project.tracks.find(t => t.targeted)?.id;

    this.executeProjectMutation(`Paste ${this.state.clipboard.length} Clip(s)`, proj => {
      const res = TimelineOperations.pasteClips(proj, this.state.clipboard, this.state.currentTime, targetedTrack);
      return res.project;
    });
  }

  duplicateSelection() {
    const ids = this.state.selectedClipIds;
    if (ids.length === 0) return;

    this.executeProjectMutation(`Duplicate ${ids.length} Clip(s)`, proj => {
      const res = TimelineOperations.duplicateClips(proj, ids);
      return res.project;
    });
  }

  updateClipTransform(clipId: string, transform: Partial<TransformSettings>) {
    const fps = this.state.project.project.fps || 30;
    this.executeProjectMutation('Update Transform', (proj) => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (clip) {
        clip.transform = { ...clip.transform, ...transform };

        // If animated tracks exist for modified properties, update or insert keyframe at current playhead
        const relativeTime = snapToFrame(
          Math.max(0, Math.min(clip.duration, this.state.currentTime - clip.startTime)),
          fps
        );
        const threshold = 0.5 / fps + 0.0001;

        for (const [key, val] of Object.entries(transform)) {
          const prop = key as AnimatableProperty;
          const track = clip.animations?.[prop];
          if (track && track.keyframes.length > 0 && typeof val === 'number') {
            const existingKf = track.keyframes.find(k => Math.abs(k.time - relativeTime) <= threshold);
            if (existingKf) {
              existingKf.value = val;
            } else {
              track.keyframes.push({
                id: generateKeyframeId(),
                time: relativeTime,
                value: val,
                interpolation: 'linear',
              });
              track.keyframes.sort((a, b) => a.time - b.time);
            }
          }
        }
      }
      return proj;
    });
  }

  updateClipVolume(clipId: string, volume: number) {
    const fps = this.state.project.project.fps || 30;
    this.executeProjectMutation('Update Volume', (proj) => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (clip) {
        clip.volume = volume;

        const relativeTime = snapToFrame(
          Math.max(0, Math.min(clip.duration, this.state.currentTime - clip.startTime)),
          fps
        );
        const threshold = 0.5 / fps + 0.0001;

        const track = clip.animations?.volume;
        if (track && track.keyframes.length > 0) {
          const existingKf = track.keyframes.find(k => Math.abs(k.time - relativeTime) <= threshold);
          if (existingKf) {
            existingKf.value = volume;
          } else {
            track.keyframes.push({
              id: generateKeyframeId(),
              time: relativeTime,
              value: volume,
              interpolation: 'linear',
            });
            track.keyframes.sort((a, b) => a.time - b.time);
          }
        }
      }
      return proj;
    });
  }

  // --- Keyframe Animation Engine ---

  toggleKeyframe(clipId: string, property: AnimatableProperty, customValue?: number) {
    const fps = this.state.project.project.fps || 30;
    const clip = this.state.project.clips.find(c => c.id === clipId);
    if (!clip) return;

    const relativeTime = snapToFrame(
      Math.max(0, Math.min(clip.duration, this.state.currentTime - clip.startTime)),
      fps
    );

    const existingTrack = clip.animations?.[property];
    const existingKf = findKeyframeAtTime(existingTrack, relativeTime, fps);

    if (existingKf) {
      // Remove keyframe
      this.executeProjectMutation(`Remove Keyframe (${property})`, proj => {
        const targetClip = proj.clips.find(c => c.id === clipId);
        if (!targetClip || !targetClip.animations) return proj;

        const track = targetClip.animations[property];
        if (track) {
          track.keyframes = track.keyframes.filter(k => k.id !== existingKf.id);
          if (track.keyframes.length === 0) {
            delete targetClip.animations[property];
          }
        }
        return proj;
      });
    } else {
      // Add keyframe
      let val = customValue;
      if (val === undefined) {
        const evalState = evaluateClipAnimations(clip, relativeTime);
        val = evalState[property];
      }

      this.executeProjectMutation(`Add Keyframe (${property})`, proj => {
        const targetClip = proj.clips.find(c => c.id === clipId);
        if (!targetClip) return proj;

        if (!targetClip.animations) targetClip.animations = {};
        let track = targetClip.animations[property];
        if (!track) {
          track = { property, keyframes: [] };
          targetClip.animations[property] = track;
        }

        const newKf: Keyframe<number> = {
          id: generateKeyframeId(),
          time: relativeTime,
          value: val!,
          interpolation: 'linear',
        };

        const threshold = 0.5 / fps + 0.0001;
        track.keyframes = track.keyframes.filter(k => Math.abs(k.time - relativeTime) > threshold);
        track.keyframes.push(newKf);
        track.keyframes.sort((a, b) => a.time - b.time);

        return proj;
      });
    }
  }

  setKeyframeValue(clipId: string, property: AnimatableProperty, value: number) {
    const fps = this.state.project.project.fps || 30;
    const clip = this.state.project.clips.find(c => c.id === clipId);
    if (!clip) return;

    const relativeTime = snapToFrame(
      Math.max(0, Math.min(clip.duration, this.state.currentTime - clip.startTime)),
      fps
    );

    this.executeProjectMutation(`Set Keyframe (${property})`, proj => {
      const targetClip = proj.clips.find(c => c.id === clipId);
      if (!targetClip) return proj;

      if (!targetClip.animations) targetClip.animations = {};
      let track = targetClip.animations[property];
      if (!track) {
        track = { property, keyframes: [] };
        targetClip.animations[property] = track;
      }

      const threshold = 0.5 / fps + 0.0001;
      const existingIdx = track.keyframes.findIndex(k => Math.abs(k.time - relativeTime) <= threshold);

      if (existingIdx !== -1) {
        track.keyframes[existingIdx].value = value;
      } else {
        track.keyframes.push({
          id: generateKeyframeId(),
          time: relativeTime,
          value,
          interpolation: 'linear',
        });
        track.keyframes.sort((a, b) => a.time - b.time);
      }

      return proj;
    });
  }

  removeKeyframe(clipId: string, property: AnimatableProperty, keyframeId: string) {
    this.executeProjectMutation(`Delete Keyframe (${property})`, proj => {
      const targetClip = proj.clips.find(c => c.id === clipId);
      if (!targetClip || !targetClip.animations) return proj;

      const track = targetClip.animations[property];
      if (track) {
        track.keyframes = track.keyframes.filter(k => k.id !== keyframeId);
        if (track.keyframes.length === 0) {
          delete targetClip.animations[property];
        }
      }
      return proj;
    });
  }

  moveKeyframe(clipId: string, property: AnimatableProperty, keyframeId: string, newRelativeTime: number) {
    const fps = this.state.project.project.fps || 30;
    this.executeProjectMutation(`Move Keyframe (${property})`, proj => {
      const targetClip = proj.clips.find(c => c.id === clipId);
      if (!targetClip || !targetClip.animations) return proj;

      const track = targetClip.animations[property];
      if (!track) return proj;

      const kf = track.keyframes.find(k => k.id === keyframeId);
      if (!kf) return proj;

      const clampedTime = snapToFrame(Math.max(0, Math.min(targetClip.duration, newRelativeTime)), fps);
      kf.time = clampedTime;
      track.keyframes.sort((a, b) => a.time - b.time);

      return proj;
    });
  }

  jumpToPrevKeyframe(clipId: string, property?: AnimatableProperty) {
    const fps = this.state.project.project.fps || 30;
    const clip = this.state.project.clips.find(c => c.id === clipId);
    if (!clip) return;

    const relativeTime = this.state.currentTime - clip.startTime;
    const { prev } = findNearestKeyframeTimes(clip, relativeTime, fps, property);
    if (prev !== null) {
      this.setCurrentTime(snapToFrame(clip.startTime + prev, fps));
    }
  }

  jumpToNextKeyframe(clipId: string, property?: AnimatableProperty) {
    const fps = this.state.project.project.fps || 30;
    const clip = this.state.project.clips.find(c => c.id === clipId);
    if (!clip) return;

    const relativeTime = this.state.currentTime - clip.startTime;
    const { next } = findNearestKeyframeTimes(clip, relativeTime, fps, property);
    if (next !== null) {
      this.setCurrentTime(snapToFrame(clip.startTime + next, fps));
    }
  }

  // --- Transition Engine ---

  selectTransition(transitionId: string | null) {
    this.setState({
      selectedTransitionId: transitionId,
      // If selecting a transition, deselect clips so inspector clearly displays transition
      ...(transitionId ? { selectedClipIds: [], selectedClipId: null } : {}),
    });
  }

  addTransition(
    type: TransitionType,
    fromClipId: string,
    toClipId: string,
    requestedDuration = 1.0,
    parameters?: TransitionParameters
  ): boolean {
    const fps = this.state.project.project.fps || 30;
    const fromClip = this.state.project.clips.find(c => c.id === fromClipId);
    const toClip = this.state.project.clips.find(c => c.id === toClipId);

    const validation = validateTransition(fromClip, toClip, requestedDuration, fps);
    if (!validation.valid || !fromClip || !toClip) {
      this.setState({ statusMessage: validation.error || 'Failed to add transition' });
      return false;
    }

    const descriptor = TransitionRegistry.getTransition(type);
    const params = parameters || descriptor?.defaultParameters || {};
    const newTransitionId = generateTransitionId();

    this.executeProjectMutation(`Add Transition (${descriptor?.name || type})`, proj => {
      if (!proj.transitions) proj.transitions = [];

      // Replace any existing transition between these two clips
      proj.transitions = proj.transitions.filter(
        t => !(t.fromClipId === fromClipId && t.toClipId === toClipId)
      );

      const newTr: TransitionItem = {
        id: newTransitionId,
        type,
        duration: validation.clampedDuration,
        fromClipId,
        toClipId,
        trackId: fromClip.trackId,
        parameters: { ...params },
        enabled: true,
      };

      proj.transitions.push(newTr);
      return proj;
    });

    this.selectTransition(newTransitionId);
    return true;
  }

  removeTransition(transitionId: string) {
    this.executeProjectMutation('Remove Transition', proj => {
      if (!proj.transitions) return proj;
      proj.transitions = proj.transitions.filter(t => t.id !== transitionId);
      return proj;
    });

    if (this.state.selectedTransitionId === transitionId) {
      this.selectTransition(null);
    }
  }

  updateTransitionDuration(transitionId: string, duration: number) {
    const fps = this.state.project.project.fps || 30;
    this.executeProjectMutation('Update Transition Duration', proj => {
      if (!proj.transitions) return proj;
      const tr = proj.transitions.find(t => t.id === transitionId);
      if (!tr) return proj;

      const fromClip = proj.clips.find(c => c.id === tr.fromClipId);
      const toClip = proj.clips.find(c => c.id === tr.toClipId);
      const validation = validateTransition(fromClip, toClip, duration, fps);
      if (validation.valid) {
        tr.duration = validation.clampedDuration;
      }
      return proj;
    });
  }

  updateTransitionParameters(transitionId: string, parameters: Partial<TransitionParameters>) {
    this.executeProjectMutation('Update Transition Parameters', proj => {
      if (!proj.transitions) return proj;
      const tr = proj.transitions.find(t => t.id === transitionId);
      if (tr) {
        tr.parameters = { ...tr.parameters, ...parameters };
      }
      return proj;
    });
  }

  toggleTransitionEnabled(transitionId: string) {
    this.executeProjectMutation('Toggle Transition', proj => {
      if (!proj.transitions) return proj;
      const tr = proj.transitions.find(t => t.id === transitionId);
      if (tr) {
        tr.enabled = !tr.enabled;
      }
      return proj;
    });
  }

  // --- Effect Engine ---

  addEffect(clipId: string, effectType: EffectType) {
    const descriptor = EffectRegistry.getEffect(effectType);
    if (!descriptor) return;

    const newEffect: EffectInstance = {
      id: generateEffectId(),
      effectType,
      enabled: true,
      parameters: { ...descriptor.defaultParameters },
    };

    this.executeProjectMutation(`Add Effect (${descriptor.name})`, proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (clip) {
        if (!clip.effects) clip.effects = [];
        clip.effects.push(newEffect);
      }
      return proj;
    });
  }

  removeEffect(clipId: string, effectId: string) {
    this.executeProjectMutation('Remove Effect', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (clip && clip.effects) {
        clip.effects = clip.effects.filter(ef => ef.id !== effectId);
      }
      return proj;
    });
  }

  toggleEffectEnabled(clipId: string, effectId: string) {
    this.executeProjectMutation('Toggle Effect', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (clip && clip.effects) {
        const ef = clip.effects.find(e => e.id === effectId);
        if (ef) ef.enabled = !ef.enabled;
      }
      return proj;
    });
  }

  updateEffectParameter(
    clipId: string,
    effectId: string,
    paramName: string,
    value: number | boolean | string
  ) {
    const fps = this.state.project.project.fps || 30;
    this.executeProjectMutation('Update Effect Parameter', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip || !clip.effects) return proj;
      const ef = clip.effects.find(e => e.id === effectId);
      if (!ef) return proj;

      ef.parameters[paramName] = value;

      // If animated track exists for this parameter, update or add keyframe at current playhead
      if (typeof value === 'number' && ef.animations?.[paramName]?.keyframes?.length) {
        const relativeTime = snapToFrame(
          Math.max(0, Math.min(clip.duration, this.state.currentTime - clip.startTime)),
          fps
        );
        const threshold = 0.5 / fps + 0.0001;
        const track = ef.animations[paramName]!;
        const existing = track.keyframes.find(k => Math.abs(k.time - relativeTime) <= threshold);
        if (existing) {
          existing.value = value;
        } else {
          track.keyframes.push({
            id: generateKeyframeId(),
            time: relativeTime,
            value,
            interpolation: 'linear',
          });
          track.keyframes.sort((a, b) => a.time - b.time);
        }
      }
      return proj;
    });
  }

  reorderEffects(clipId: string, fromIndex: number, toIndex: number) {
    this.executeProjectMutation('Reorder Effects', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (
        clip &&
        clip.effects &&
        fromIndex >= 0 &&
        toIndex >= 0 &&
        fromIndex < clip.effects.length &&
        toIndex < clip.effects.length
      ) {
        const [moved] = clip.effects.splice(fromIndex, 1);
        clip.effects.splice(toIndex, 0, moved);
      }
      return proj;
    });
  }

  toggleEffectKeyframe(clipId: string, effectId: string, paramName: string, customValue?: number) {
    const fps = this.state.project.project.fps || 30;
    const clip = this.state.project.clips.find(c => c.id === clipId);
    if (!clip || !clip.effects) return;
    const ef = clip.effects.find(e => e.id === effectId);
    if (!ef) return;

    const relativeTime = snapToFrame(
      Math.max(0, Math.min(clip.duration, this.state.currentTime - clip.startTime)),
      fps
    );

    const track = ef.animations?.[paramName];
    const threshold = 0.5 / fps + 0.0001;
    const existing = track?.keyframes?.find(k => Math.abs(k.time - relativeTime) <= threshold);

    if (existing) {
      this.executeProjectMutation(`Remove Keyframe (${paramName})`, proj => {
        const targetClip = proj.clips.find(c => c.id === clipId);
        const targetEf = targetClip?.effects?.find(e => e.id === effectId);
        if (targetEf?.animations?.[paramName]) {
          targetEf.animations[paramName]!.keyframes = targetEf.animations[paramName]!.keyframes.filter(
            k => k.id !== existing.id
          );
          if (targetEf.animations[paramName]!.keyframes.length === 0) {
            delete targetEf.animations[paramName];
          }
        }
        return proj;
      });
    } else {
      const val = customValue !== undefined ? customValue : Number(ef.parameters[paramName] ?? 0);
      this.executeProjectMutation(`Add Keyframe (${paramName})`, proj => {
        const targetClip = proj.clips.find(c => c.id === clipId);
        const targetEf = targetClip?.effects?.find(e => e.id === effectId);
        if (!targetEf) return proj;

        if (!targetEf.animations) targetEf.animations = {};
        if (!targetEf.animations[paramName]) {
          targetEf.animations[paramName] = {
            property: paramName as any,
            keyframes: [],
          };
        }

        const newKf: Keyframe<number> = {
          id: generateKeyframeId(),
          time: relativeTime,
          value: val,
          interpolation: 'linear',
        };

        targetEf.animations[paramName]!.keyframes = targetEf.animations[paramName]!.keyframes.filter(
          k => Math.abs(k.time - relativeTime) > threshold
        );
        targetEf.animations[paramName]!.keyframes.push(newKf);
        targetEf.animations[paramName]!.keyframes.sort((a, b) => a.time - b.time);
        return proj;
      });
    }
  }

  // --- Playback Engine ---

  private updateCachedMaxDuration() {
    const clipEnds = this.state.project.clips.map(c => c.startTime + c.duration);
    const captionEnds = (this.state.project.captionTracks || []).flatMap(t => t.items.map(i => i.endTime));
    this.cachedMaxDuration = Math.max(5, ...clipEnds, ...captionEnds);
  }

  private stopPlaybackLoop() {
    if (this.playRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.playRafId);
      this.playRafId = null;
    }
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      clearTimeout(this.playTimer);
      this.playTimer = null;
    }
  }

  private startPlaybackLoop() {
    this.stopPlaybackLoop();
    this.updateCachedMaxDuration();

    this.playStartTime = performance.now();
    this.playStartProjectTime = this.state.currentTime;

    // If starting at or beyond max duration, loop back to start
    if (this.playStartProjectTime >= this.cachedMaxDuration) {
      this.playStartProjectTime = 0;
      this.setState({ currentTime: 0 });
    }

    const fps = this.state.project.project.fps || 30;
    const frameIntervalMs = 1000 / fps;

    const onTick = () => {
      if (!this.state.isPlaying) return;

      const now = performance.now();
      // True wall-clock elapsed time delta in seconds (0% drift)
      const elapsedSec = (now - this.playStartTime) / 1000;
      const nextTime = this.playStartProjectTime + elapsedSec;

      if (nextTime >= this.cachedMaxDuration) {
        this.stopPlaybackLoop();
        this.setState({ currentTime: this.cachedMaxDuration, isPlaying: false });
        return;
      }

      this.setState({ currentTime: nextTime });
      scheduleNext();
    };

    const scheduleNext = () => {
      if (!this.state.isPlaying) return;
      if (typeof requestAnimationFrame !== 'undefined') {
        this.playRafId = requestAnimationFrame(onTick);
      } else {
        // High-precision fallback for Node/testing environments
        this.playTimer = setTimeout(onTick, Math.max(1, Math.round(frameIntervalMs)));
      }
    };

    scheduleNext();
  }

  setCurrentTime(seconds: number) {
    const clamped = Math.max(0, seconds);
    if (this.state.isPlaying) {
      this.playStartTime = performance.now();
      this.playStartProjectTime = clamped;
    }
    this.setState({ currentTime: clamped });
  }

  stepFrames(direction: 1 | -1) {
    const fps = this.state.project.project.fps || 30;
    const nextTime = stepFrameTime(this.state.currentTime, direction, fps);
    this.setCurrentTime(nextTime);
  }

  togglePlayPause() {
    const isPlaying = !this.state.isPlaying;
    if (isPlaying) {
      this.setState({ isPlaying: true });
      this.startPlaybackLoop();
    } else {
      if (this.state.isPlaying && this.playStartTime > 0) {
        const now = performance.now();
        const elapsedSec = (now - this.playStartTime) / 1000;
        const finalTime = Math.min(this.cachedMaxDuration, this.playStartProjectTime + elapsedSec);
        this.stopPlaybackLoop();
        this.setState({ currentTime: finalTime, isPlaying: false });
      } else {
        this.stopPlaybackLoop();
        this.setState({ isPlaying: false });
      }
    }
  }

  jumpToStart() {
    this.setCurrentTime(0);
  }

  jumpToEnd() {
    this.updateCachedMaxDuration();
    this.setCurrentTime(this.cachedMaxDuration);
  }

  // ====================================================
  // ALPHA 0.7 COMPOSITING ENGINE ACTIONS
  // ====================================================

  updateClipCrop(clipId: string, cropUpdates: Partial<CropSettings>) {
    this.executeProjectMutation('Update Crop', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      clip.crop = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        ...(clip.crop || {}),
        ...cropUpdates,
      };
      return proj;
    });
  }

  updateClipFlip(clipId: string, flipUpdates: Partial<FlipSettings>) {
    this.executeProjectMutation('Update Flip', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      clip.flip = {
        horizontal: false,
        vertical: false,
        ...(clip.flip || {}),
        ...flipUpdates,
      };
      return proj;
    });
  }

  updateClipBlendMode(clipId: string, blendMode: BlendMode) {
    this.executeProjectMutation(`Set Blend Mode (${blendMode})`, proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      clip.blendMode = blendMode;
      return proj;
    });
  }

  updateClipChromaKey(clipId: string, chromaKeyUpdates: Partial<ChromaKeySettings>) {
    this.executeProjectMutation('Update Chroma Key', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      clip.chromaKey = {
        ...DEFAULT_CHROMA_KEY_SETTINGS,
        ...(clip.chromaKey || {}),
        ...chromaKeyUpdates,
      };
      return proj;
    });
  }

  addClipMask(clipId: string, type: MaskType) {
    this.executeProjectMutation(`Add Mask (${type})`, proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      if (!clip.masks) clip.masks = [];
      const mask = createDefaultMask(type);
      clip.masks.push(mask);
      return proj;
    });
  }

  updateClipMask(clipId: string, maskId: string, updates: Partial<MaskItem>) {
    this.executeProjectMutation('Update Mask', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip || !clip.masks) return proj;
      const mask = clip.masks.find(m => m.id === maskId);
      if (!mask) return proj;
      Object.assign(mask, updates);
      return proj;
    });
  }

  removeClipMask(clipId: string, maskId: string) {
    this.executeProjectMutation('Remove Mask', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip || !clip.masks) return proj;
      clip.masks = clip.masks.filter(m => m.id !== maskId);
      return proj;
    });
  }

  addTrackingData(clipId: string, trackingData: TrackingData) {
    this.executeProjectMutation('Add Tracking Data', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      if (!clip.trackingData) clip.trackingData = [];
      clip.trackingData.push(trackingData);
      return proj;
    });
  }

  applyTrackingToClip(trackingData: TrackingData, targetClipId: string) {
    this.executeProjectMutation('Apply Tracking to Keyframes', proj => {
      const clip = proj.clips.find(c => c.id === targetClipId);
      if (!clip) return proj;
      const updated = TrackingService.applyTrackingToClip(clip, trackingData);
      Object.assign(clip, updated);
      return proj;
    });
  }

  // --- Audio Engine Operations ---

  updateClipAudio(clipId: string, settings: Partial<ClipAudioSettings>) {
    this.executeProjectMutation('Update Clip Audio', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      if (settings.volume !== undefined) clip.volume = settings.volume;
      if (settings.muted !== undefined) clip.muted = settings.muted;
      if (settings.pan !== undefined) (clip as any).pan = settings.pan;
      if (settings.audioEnabled !== undefined) (clip as any).audioEnabled = settings.audioEnabled;
      if (settings.fadeInDuration !== undefined) (clip as any).fadeInDuration = settings.fadeInDuration;
      if (settings.fadeOutDuration !== undefined) (clip as any).fadeOutDuration = settings.fadeOutDuration;
      return proj;
    });
  }

  toggleTrackSolo(trackId: string) {
    this.executeProjectMutation('Toggle Track Solo', proj => {
      const t = proj.tracks.find(track => track.id === trackId);
      if (t) t.solo = !t.solo;
      return proj;
    });
  }

  updateTrackAudio(trackId: string, settings: { volume?: number; pan?: number }) {
    this.executeProjectMutation('Update Track Audio', proj => {
      const t = proj.tracks.find(track => track.id === trackId);
      if (t) {
        if (settings.volume !== undefined) (t as any).volume = settings.volume;
        if (settings.pan !== undefined) (t as any).pan = settings.pan;
      }
      return proj;
    });
  }

  // --- Color Management & Color Grading Operations ---

  updateClipColorGrade(clipId: string, gradeUpdates: Partial<ColorGradeSettings>) {
    this.executeProjectMutation('Update Color Grade', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      clip.colorGrade = {
        ...(clip.colorGrade || DEFAULT_COLOR_GRADE),
        ...gradeUpdates,
      };
      return proj;
    });
  }

  updateClipBasicGrade(clipId: string, basicUpdates: Partial<BasicGradeSettings>) {
    this.executeProjectMutation('Update Basic Grade', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      const currentGrade = clip.colorGrade || DEFAULT_COLOR_GRADE;
      clip.colorGrade = {
        ...currentGrade,
        basic: {
          ...currentGrade.basic,
          ...basicUpdates,
        },
      };
      return proj;
    });
  }

  updateClipColorWheels(clipId: string, wheelsUpdates: Partial<ColorWheels>) {
    this.executeProjectMutation('Update Color Wheels', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      const currentGrade = clip.colorGrade || DEFAULT_COLOR_GRADE;
      clip.colorGrade = {
        ...currentGrade,
        wheels: {
          ...currentGrade.wheels,
          ...wheelsUpdates,
        },
      };
      return proj;
    });
  }

  updateClipCurves(clipId: string, curvesUpdates: Partial<ColorCurves>) {
    this.executeProjectMutation('Update Curves', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      const currentGrade = clip.colorGrade || DEFAULT_COLOR_GRADE;
      clip.colorGrade = {
        ...currentGrade,
        curves: {
          ...currentGrade.curves,
          ...curvesUpdates,
        },
      };
      return proj;
    });
  }

  updateClipHslQualifier(clipId: string, hslUpdates: Partial<HSLQualifier>) {
    this.executeProjectMutation('Update HSL Qualifier', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      const currentGrade = clip.colorGrade || DEFAULT_COLOR_GRADE;
      clip.colorGrade = {
        ...currentGrade,
        hsl: {
          ...currentGrade.hsl,
          ...hslUpdates,
        },
      };
      return proj;
    });
  }

  updateClipLut(clipId: string, lutUpdates: Partial<LUTSettings>) {
    this.executeProjectMutation('Update LUT', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      const currentGrade = clip.colorGrade || DEFAULT_COLOR_GRADE;
      clip.colorGrade = {
        ...currentGrade,
        lut: {
          ...currentGrade.lut,
          ...lutUpdates,
        },
      };
      return proj;
    });
  }

  applyQuickLook(clipId: string, lookId: QuickLookId, intensity: number = 1.0) {
    this.executeProjectMutation(`Apply Look: ${lookId}`, proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      const currentGrade = clip.colorGrade || DEFAULT_COLOR_GRADE;
      clip.colorGrade = QuickLooksRegistry.applyLookWithIntensity(currentGrade, lookId, intensity);
      return proj;
    });
  }

  applyAutoColor(clipId: string, analysis?: AutoAnalysisResult) {
    this.executeProjectMutation('Apply Auto Color', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      const currentGrade = clip.colorGrade || DEFAULT_COLOR_GRADE;
      const effectiveAnalysis = analysis || {
        recommendedExposure: 0.25,
        recommendedContrast: 1.08,
        recommendedTemperature: 6,
        recommendedTint: 2,
        recommendedSaturation: 1.05,
      };
      const newBasic = AutoColorEngine.applyAutoCorrections(currentGrade.basic, effectiveAnalysis);
      clip.colorGrade = {
        ...currentGrade,
        basic: newBasic,
        quickGrade: {
          ...currentGrade.quickGrade,
          autoExposureApplied: true,
          autoWhiteBalanceApplied: true,
          autoContrastApplied: true,
        },
      };
      return proj;
    });
  }

  resetClipColor(clipId: string) {
    this.executeProjectMutation('Reset Color Grade', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      clip.colorGrade = { ...DEFAULT_COLOR_GRADE };
      return proj;
    });
  }

  updateClipColorManagement(clipId: string, mgmtUpdates: Partial<ColorManagementSettings>) {
    this.executeProjectMutation('Update Clip Color Space', proj => {
      const clip = proj.clips.find(c => c.id === clipId);
      if (!clip) return proj;
      clip.colorManagement = {
        ...(clip.colorManagement || DEFAULT_COLOR_MANAGEMENT),
        ...mgmtUpdates,
      };
      return proj;
    });
  }

  updateProjectColorManagement(mgmtUpdates: Partial<ColorManagementSettings>) {
    this.executeProjectMutation('Update Project Color Space', proj => {
      proj.project.colorManagement = {
        ...(proj.project.colorManagement || DEFAULT_COLOR_MANAGEMENT),
        ...mgmtUpdates,
      };
      return proj;
    });
  }

  setTimelineZoom(zoom: number) {
    this.setState({ timelineZoom: Math.min(200, Math.max(10, zoom)) });
  }

  // --- AI Actions ---
  
  applySilenceRemoval(clipId: string, regions: import('../ai/types').SilenceRegion[]) {
    // In full implementation, this calls TimelineOperations to split the clip and remove silent sections
    this.executeProjectMutation('AI Silence Removal', proj => {
       const clip = proj.clips.find(c => c.id === clipId);
       if (clip) {
          // Marking for timeline operation
          (clip as any).silenceRegions = regions;
       }
       return proj;
    });
  }

  addCaptionTrackFromTranscript(transcript: import('../ai/types').Transcript, trackName: string = 'AI Captions') {
    this.executeProjectMutation('AI Generate Captions', proj => {
      const trackId = `caption_track_${Date.now()}`;
      if (!proj.captionTracks) proj.captionTracks = [];
      proj.captionTracks.push({
        id: trackId,
        name: trackName,
        visible: true,
        locked: false,
        height: 80,
        items: transcript.segments.map((seg, idx) => ({
          id: `caption_${Date.now()}_${idx}`,
          startTime: seg.start,
          endTime: seg.end,
          text: seg.text
        }))
      });

      return proj;
    });
  }

  addSceneMarkers(markers: import('../ai/types').SceneMarker[]) {
    this.executeProjectMutation('AI Scene Detection', proj => {
      proj.sceneMarkers = markers;
      return proj;
    });
  }

  addBeatMarkers(markers: import('../ai/types').BeatMarker[]) {
    this.executeProjectMutation('AI Beat Detection', proj => {
      proj.beatMarkers = markers;
      return proj;
    });
  }

  toggleSnapping() {
    this.setState({ snappingEnabled: !this.state.snappingEnabled });
  }
}

export const projectStore = new ProjectStore();

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  const keysA = Object.keys(a as object) as (keyof T)[];
  const keysB = Object.keys(b as object) as (keyof T)[];
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is((a as any)[key], (b as any)[key])) {
      return false;
    }
  }
  return true;
}

export function useProjectStore<T = EditorState>(
  selector?: (state: EditorState) => T,
  equalityFn?: (a: T, b: T) => boolean
): [T, ProjectStore] {
  const select = selector || ((s: EditorState) => s as unknown as T);
  const eq = selector ? (equalityFn || shallowEqual) : Object.is;

  const [selectedState, setSelectedState] = useState<T>(() => select(projectStore.getState()));
  const lastSelectedRef = useRef<T>(selectedState);
  lastSelectedRef.current = selectedState;

  useEffect(() => {
    return projectStore.subscribe(() => {
      const nextSelected = select(projectStore.getState());
      if (!eq(lastSelectedRef.current, nextSelected)) {
        lastSelectedRef.current = nextSelected;
        setSelectedState(nextSelected);
      }
    });
  }, [select, eq]);

  return [selectedState, projectStore];
}

export function useProjectStoreActions(): ProjectStore {
  return projectStore;
}
