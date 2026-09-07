import React, { useRef } from 'react';
import { 
  Scissors, 
  Trash2, 
  Magnet, 
  ZoomIn, 
  ZoomOut, 
  Clock,
  Copy,
  ClipboardPaste,
  CopyPlus,
  ArrowLeftToLine,
  Shuffle,
  Type,
  Subtitles
} from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { TimeRuler } from './TimeRuler';
import { TrackHeader } from './TrackHeader';
import { TimelineClip } from './TimelineClip';
import { CaptionTrackHeader, CaptionTrackLane } from './CaptionLane';
import { Playhead } from './Playhead';
import { formatTimecode } from '../../utils/timecode';
import { findSnapPoint } from '../../utils/timelineMath';
import { TransitionRegistry } from '../../transitions';

const TimelineTimecodeDisplay: React.FC<{ fps?: number }> = ({ fps = 30 }) => {
  const [currentTime] = useProjectStore(s => s.currentTime);
  return (
    <span className="font-bold text-gray-200">
      {formatTimecode(currentTime, fps)}
    </span>
  );
};

export const TimelinePanel: React.FC = () => {
  const [state, store] = useProjectStore(s => ({
    project: s.project,
    selectedClipIds: s.selectedClipIds,
    selectedTransitionId: s.selectedTransitionId,
    timelineZoom: s.timelineZoom,
    snappingEnabled: s.snappingEnabled,
    clipboard: s.clipboard,
  }));
  const timelineContentRef = useRef<HTMLDivElement>(null);
  const lanesContainerRef = useRef<HTMLDivElement>(null);
  const trackHeadersRef = useRef<HTMLDivElement>(null);

  const zoom = state.timelineZoom;
  const tracks = state.project.tracks;
  const captionTracks = state.project.captionTracks || [];
  const totalCaptionsHeight = captionTracks.reduce((acc, t) => acc + (t.height || 36), 0);
  const totalTracksHeight = tracks.reduce((acc, t) => acc + t.height, 0) + totalCaptionsHeight;

  // Total project duration
  const totalDuration = Math.max(
    30,
    ...state.project.clips.map(c => c.startTime + c.duration),
    ...captionTracks.flatMap(t => t.items.map(i => i.endTime))
  );

  const totalWidth = Math.max(1200, totalDuration * zoom + 400);

  const handleEmptyAreaClick = (e: React.MouseEvent) => {
    // Only deselect if clicking the background, not children
    if (e.target === e.currentTarget || e.target === lanesContainerRef.current) {
      store.clearSelection();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (trackHeadersRef.current) {
      trackHeadersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleLanesDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleLanesDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const mediaId = e.dataTransfer.getData('application/freecut-media-id');
    if (!mediaId) return;

    const media = state.project.media.find(m => m.id === mediaId);
    if (!media) return;

    const container = lanesContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;

    let targetTrack = tracks[0];
    let currentY = 0;
    for (const t of tracks) {
      if (dropY >= currentY && dropY < currentY + t.height) {
        targetTrack = t;
        break;
      }
      currentY += t.height;
    }

    // Match media type to compatible track if misaligned
    if (media.type === 'audio' && targetTrack.type !== 'audio') {
      const audioTrack = tracks.find(t => t.type === 'audio' && !t.locked);
      if (audioTrack) targetTrack = audioTrack;
    } else if (media.type === 'video' && targetTrack.type !== 'video') {
      const videoTrack = tracks.find(t => t.type === 'video' && !t.locked);
      if (videoTrack) targetTrack = videoTrack;
    }

    let dropTime = Math.max(0, dropX / zoom);
    if (state.snappingEnabled) {
      dropTime = findSnapPoint(dropTime, state.project.clips, store.getState().currentTime, undefined, 12 / zoom);
    }

    store.addClipToTimeline(mediaId, targetTrack.id, dropTime);
  };

  const hasSelection = state.selectedClipIds.length > 0;

  // Determine whether a transition can be added to current selection
  const canAddTransition = (() => {
    if (state.selectedClipIds.length === 2) {
      const c1 = state.project.clips.find(c => c.id === state.selectedClipIds[0]);
      const c2 = state.project.clips.find(c => c.id === state.selectedClipIds[1]);
      if (c1 && c2 && c1.trackId === c2.trackId) {
        const [first, second] = c1.startTime <= c2.startTime ? [c1, c2] : [c2, c1];
        const gap = Math.abs(second.startTime - (first.startTime + first.duration));
        return gap < 0.15;
      }
    } else if (state.selectedClipIds.length === 1) {
      const c = state.project.clips.find(c => c.id === state.selectedClipIds[0]);
      if (!c) return false;
      const next = state.project.clips.find(
        other => other.trackId === c.trackId && Math.abs(other.startTime - (c.startTime + c.duration)) < 0.15
      );
      return !!next;
    }
    return false;
  })();

  const handleAddTransition = () => {
    if (state.selectedClipIds.length === 2) {
      const c1 = state.project.clips.find(c => c.id === state.selectedClipIds[0])!;
      const c2 = state.project.clips.find(c => c.id === state.selectedClipIds[1])!;
      const [from, to] = c1.startTime <= c2.startTime ? [c1, c2] : [c2, c1];
      store.addTransition('crossDissolve', from.id, to.id, 1.0);
    } else if (state.selectedClipIds.length === 1) {
      const c = state.project.clips.find(c => c.id === state.selectedClipIds[0])!;
      const next = state.project.clips.find(
        other => other.trackId === c.trackId && Math.abs(other.startTime - (c.startTime + c.duration)) < 0.15
      );
      if (next) {
        store.addTransition('crossDissolve', c.id, next.id, 1.0);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-freecut-darkest border-t border-freecut-border select-none">
      {/* Timeline Toolbar */}
      <div className="h-9 px-3 bg-freecut-darker border-b border-freecut-border flex items-center justify-between text-xs">
        {/* Left Editing Tools */}
        <div className="flex items-center space-x-1.5">
          {/* Split */}
          <button
            title="Split Clip at Playhead (S)"
            onClick={() => store.splitClipAtPlayhead()}
            className="flex items-center space-x-1 px-2.5 py-1 bg-freecut-panel hover:bg-freecut-elevated text-gray-200 hover:text-amber-400 rounded border border-freecut-border transition-colors text-[11px]"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Split (S)</span>
          </button>

          {/* Normal Delete */}
          <button
            title="Delete Selected Clip(s) (Del) - Preserves Gaps"
            disabled={!hasSelection}
            onClick={() => store.deleteSelectedClips()}
            className="flex items-center space-x-1 px-2.5 py-1 bg-freecut-panel hover:bg-freecut-elevated text-gray-200 hover:text-red-400 rounded border border-freecut-border transition-colors text-[11px] disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete</span>
          </button>

          {/* Ripple Delete */}
          <button
            title="Ripple Delete Selected Clip(s) (Shift+Del) - Closes Gaps"
            disabled={!hasSelection}
            onClick={() => store.rippleDeleteSelectedClips()}
            className="flex items-center space-x-1 px-2.5 py-1 bg-freecut-panel hover:bg-freecut-elevated text-gray-200 hover:text-cyan-400 rounded border border-freecut-border transition-colors text-[11px] disabled:opacity-40"
          >
            <ArrowLeftToLine className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ripple Del</span>
          </button>

          {/* Add Transition */}
          <button
            title="Add Transition between Adjacent Clips"
            disabled={!canAddTransition}
            onClick={handleAddTransition}
            className="flex items-center space-x-1 px-2.5 py-1 bg-freecut-panel hover:bg-freecut-elevated text-gray-200 hover:text-amber-400 rounded border border-freecut-border transition-colors text-[11px] disabled:opacity-40"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span>Transition</span>
          </button>

          {/* Add Text */}
          <button
            title="Add Text Element at Playhead (T)"
            onClick={() => store.addTextClip()}
            className="flex items-center space-x-1 px-2.5 py-1 bg-purple-950/50 hover:bg-purple-900/70 text-purple-200 hover:text-purple-100 rounded border border-purple-600/60 transition-colors text-[11px]"
          >
            <Type className="w-3.5 h-3.5 text-purple-400" />
            <span>Add Text</span>
          </button>

          {/* Add Caption */}
          <button
            title="Add Caption at Playhead (C)"
            onClick={() => store.addCaptionItem()}
            className="flex items-center space-x-1 px-2.5 py-1 bg-blue-950/50 hover:bg-blue-900/70 text-blue-200 hover:text-blue-100 rounded border border-blue-600/60 transition-colors text-[11px]"
          >
            <Subtitles className="w-3.5 h-3.5 text-blue-400" />
            <span>Add Caption</span>
          </button>

          <div className="h-4 w-[1px] bg-freecut-border mx-1" />

          {/* Duplicate */}
          <button
            title="Duplicate Selected Clip(s) (Ctrl+D)"
            disabled={!hasSelection}
            onClick={() => store.duplicateSelection()}
            className="p-1.5 rounded hover:bg-freecut-panel text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors"
          >
            <CopyPlus className="w-3.5 h-3.5" />
          </button>

          {/* Copy */}
          <button
            title="Copy Selected Clip(s) (Ctrl+C)"
            disabled={!hasSelection}
            onClick={() => store.copySelection()}
            className="p-1.5 rounded hover:bg-freecut-panel text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Paste */}
          <button
            title="Paste Copied Clip(s) at Playhead (Ctrl+V)"
            disabled={state.clipboard.length === 0}
            onClick={() => store.pasteClipboard()}
            className="p-1.5 rounded hover:bg-freecut-panel text-gray-400 hover:text-gray-200 disabled:opacity-40 transition-colors"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-freecut-border mx-1" />

          {/* Snapping Toggle */}
          <button
            title={`Snapping: ${state.snappingEnabled ? 'Enabled' : 'Disabled'}`}
            onClick={() => store.toggleSnapping()}
            className={`p-1.5 rounded transition-colors ${
              state.snappingEnabled
                ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Current Timecode display */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <TimelineTimecodeDisplay fps={state.project.project.fps} />
          {hasSelection && (
            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/40">
              {state.selectedClipIds.length} selected
            </span>
          )}
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            title="Zoom Out"
            onClick={() => store.setTimelineZoom(zoom - 10)}
            className="p-1 text-gray-400 hover:text-gray-200"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="10"
            max="150"
            value={zoom}
            onChange={e => store.setTimelineZoom(Number(e.target.value))}
            className="w-24 accent-cyan-400 h-1 bg-freecut-panel rounded cursor-pointer"
          />

          <button
            title="Zoom In"
            onClick={() => store.setTimelineZoom(zoom + 10)}
            className="p-1 text-gray-400 hover:text-gray-200"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Timeline Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Fixed Column: Track Headers */}
        <div className="flex flex-col shrink-0 z-20 shadow-md">
          {/* Empty corner aligned with time ruler */}
          <div className="h-6 w-48 bg-freecut-darker border-r border-b border-freecut-border flex items-center justify-between px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <span>Tracks</span>
            <span className="text-[9px] text-gray-600 font-normal">Target / Lock</span>
          </div>
          <div ref={trackHeadersRef} className="flex flex-col overflow-hidden">
            {tracks.map(track => (
              <TrackHeader key={track.id} track={track} />
            ))}
            {captionTracks.map(ct => (
              <CaptionTrackHeader key={ct.id} track={ct} />
            ))}
          </div>
        </div>

        {/* Right Scrollable Area: Time Ruler & Track Lanes */}
        <div
          ref={timelineContentRef}
          onScroll={handleScroll}
          onClick={handleEmptyAreaClick}
          className="flex-1 overflow-x-auto overflow-y-auto bg-freecut-darkest relative"
        >
          {/* Inner Content with dynamic width based on zoom */}
          <div style={{ width: `${totalWidth}px` }} className="relative">
            {/* Time Ruler */}
            <TimeRuler totalDuration={totalDuration} />

            {/* Track Lanes with Drag-and-Drop Dropzone */}
            <div
              ref={lanesContainerRef}
              onDragOver={handleLanesDragOver}
              onDrop={handleLanesDrop}
              className="relative"
              style={{ height: `${totalTracksHeight}px` }}
            >
              {tracks.map(track => {
                const trackClips = state.project.clips.filter(c => c.trackId === track.id);
                return (
                  <div
                    key={track.id}
                    style={{ height: `${track.height}px` }}
                    className={`w-full border-b border-freecut-border/60 relative ${
                      track.type === 'video' ? 'bg-[#0b0e14]' : 'bg-[#090d12]'
                    }`}
                  >
                    {/* Subtle lane background grid */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                    {/* Clips positioned on this track */}
                    {trackClips.map(clip => (
                      <TimelineClip key={clip.id} clip={clip} height={track.height} />
                    ))}

                    {/* Transitions on this track */}
                    {(state.project.transitions || [])
                      .filter(tr => tr.trackId === track.id)
                      .map(tr => {
                        const fromClip = state.project.clips.find(c => c.id === tr.fromClipId);
                        const toClip = state.project.clips.find(c => c.id === tr.toClipId);
                        if (!fromClip || !toClip) return null;

                        const cutPoint = fromClip.startTime + fromClip.duration;
                        const trStart = Math.max(fromClip.startTime, cutPoint - tr.duration / 2);
                        const trEnd = Math.min(toClip.startTime + toClip.duration, cutPoint + tr.duration / 2);
                        const trWidth = Math.max(16, (trEnd - trStart) * zoom);
                        const trLeft = trStart * zoom;
                        const isTrSelected = state.selectedTransitionId === tr.id;
                        const descriptor = TransitionRegistry.getTransition(tr.type);

                        return (
                          <div
                            key={tr.id}
                            onClick={e => {
                              e.stopPropagation();
                              store.selectTransition(tr.id);
                            }}
                            style={{
                              left: `${trLeft}px`,
                              width: `${trWidth}px`,
                              top: '2px',
                              bottom: '2px',
                            }}
                            title={`Transition: ${descriptor?.name || tr.type} (${tr.duration.toFixed(2)}s)`}
                            className={`absolute z-10 rounded cursor-pointer transition-all flex items-center justify-center border shadow-md select-none ${
                              isTrSelected
                                ? 'bg-amber-500/50 border-amber-400 ring-2 ring-amber-400/80 text-amber-100'
                                : 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-600/70 text-amber-300'
                            }`}
                          >
                            <div className="flex items-center space-x-1 text-[10px] font-bold tracking-tight px-1 truncate">
                              <span>⧖</span>
                              <span className="truncate hidden sm:inline">{descriptor?.name || tr.type}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })}

              {/* Caption Tracks */}
              {captionTracks.map(ct => (
                <CaptionTrackLane key={ct.id} track={ct} zoom={zoom} />
              ))}

              {/* Scrubber Needle across all tracks */}
              <Playhead totalHeight={totalTracksHeight + 24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
