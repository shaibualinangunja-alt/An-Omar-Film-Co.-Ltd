import React, { useState, useEffect } from 'react';
import { Link2, Volume2, VolumeX, Trash2, Unlink } from 'lucide-react';
import { ClipItem } from '../../types/project';
import { useProjectStore } from '../../state/projectStore';
import { formatDurationCompact } from '../../utils/timecode';
import { findSnapPoint, snapToFrame } from '../../utils/timelineMath';
import { AnimatableProperty } from '../../animation';
import { WaveformService } from '../../audio';

interface TimelineClipProps {
  clip: ClipItem;
  height: number;
}

export const TimelineClip: React.FC<TimelineClipProps> = ({ clip, height }) => {
  const [clipState, store] = useProjectStore(s => ({
    selectedClipIds: s.selectedClipIds,
    isSelected: s.selectedClipIds.includes(clip.id),
    zoom: s.timelineZoom,
    isTrackLocked: !!s.project.tracks.find(t => t.id === clip.trackId)?.locked,
    fps: s.project.project.fps || 30,
    media: s.project.media.find(m => m.id === clip.mediaId),
  }));
  const { selectedClipIds, isSelected, zoom, isTrackLocked, fps, media } = clipState;
  const [isDragging, setIsDragging] = useState(false);
  const [isTrimmingLeft, setIsTrimmingLeft] = useState(false);
  const [isTrimmingRight, setIsTrimmingRight] = useState(false);
  const [draggingKfId, setDraggingKfId] = useState<string | null>(null);

  const [waveformPeaks, setWaveformPeaks] = useState<{ min: number[]; max: number[] } | null>(null);
  const [isDropHovered, setIsDropHovered] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const isAudio = clip.type === 'audio';
  const hasAudio = isAudio || clip.type === 'video';

  const left = clip.startTime * zoom;
  const width = Math.max(12, clip.duration * zoom);

  useEffect(() => {
    if (!menuPos) return;
    const closeMenu = () => setMenuPos(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [menuPos]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    store.selectClip(clip.id);
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!hasAudio || !media) return;
    let isCancelled = false;

    WaveformService.getWaveform(clip.mediaId, media.path, media.duration || 10).then(data => {
      if (isCancelled) return;
      const targetBuckets = Math.max(10, Math.floor(width / 2));
      const peaks = WaveformService.getPeaksForWindow(data, clip.sourceStart, clip.duration, targetBuckets);
      setWaveformPeaks(peaks);
    });

    return () => {
      isCancelled = true;
    };
  }, [clip.mediaId, clip.sourceStart, clip.duration, width, hasAudio, media]);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isMulti = e.ctrlKey || e.metaKey;
    const isRange = e.shiftKey;
    store.selectClip(clip.id, isMulti, isRange);
  };

  // Move clip(s)
  const handleMouseDownMove = (e: React.MouseEvent) => {
    if (isTrackLocked || draggingKfId) return;
    e.stopPropagation();

    const isMulti = e.ctrlKey || e.metaKey;
    const isRange = e.shiftKey;

    let movingClipIds = selectedClipIds;
    if (!selectedClipIds.includes(clip.id) || isMulti || isRange) {
      store.selectClip(clip.id, isMulti, isRange);
      movingClipIds = isMulti
        ? selectedClipIds.includes(clip.id)
          ? selectedClipIds.filter(id => id !== clip.id)
          : [...selectedClipIds, clip.id]
        : [clip.id];
    }

    if (movingClipIds.length === 0) return;

    setIsDragging(true);
    const startX = e.clientX;
    let accumulatedDeltaTime = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let deltaTime = deltaX / zoom;

      const currentState = store.getState();
      if (currentState.snappingEnabled) {
        const potentialNewStart = Math.max(0, clip.startTime + deltaTime);
        const snappedStart = findSnapPoint(
          potentialNewStart,
          currentState.project.clips,
          currentState.currentTime,
          clip.id,
          12 / zoom
        );
        deltaTime = snappedStart - clip.startTime;
      }

      accumulatedDeltaTime = deltaTime;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (Math.abs(accumulatedDeltaTime) > 0.01) {
        store.moveClips(movingClipIds, accumulatedDeltaTime);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Trim Start (Left Handle)
  const handleMouseDownTrimLeft = (e: React.MouseEvent) => {
    if (isTrackLocked) return;
    e.stopPropagation();
    store.selectClip(clip.id);
    setIsTrimmingLeft(true);

    const startX = e.clientX;
    const initialStartTime = clip.startTime;
    const initialDuration = clip.duration;
    const initialSourceStart = clip.sourceStart;

    let finalStart = initialStartTime;
    let finalDuration = initialDuration;
    let finalSourceStart = initialSourceStart;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;
      
      const maxSourceStart = Math.max(0, clip.sourceDuration - 0.2);
      const newSourceStart = Math.max(0, Math.min(maxSourceStart, initialSourceStart + deltaTime));
      const actualDelta = newSourceStart - initialSourceStart;

      finalStart = Math.max(0, initialStartTime + actualDelta);
      finalDuration = Math.max(0.1, initialDuration - actualDelta);
      finalSourceStart = newSourceStart;
    };

    const handleMouseUp = () => {
      setIsTrimmingLeft(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      store.trimClip(clip.id, finalStart, finalDuration, finalSourceStart);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Trim End (Right Handle)
  const handleMouseDownTrimRight = (e: React.MouseEvent) => {
    if (isTrackLocked) return;
    e.stopPropagation();
    store.selectClip(clip.id);
    setIsTrimmingRight(true);

    const startX = e.clientX;
    const initialDuration = clip.duration;
    let finalDuration = initialDuration;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;
      
      const maxDuration = Math.max(0.1, clip.sourceDuration - clip.sourceStart);
      finalDuration = Math.max(0.1, Math.min(maxDuration, initialDuration + deltaTime));
    };

    const handleMouseUp = () => {
      setIsTrimmingRight(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      store.trimClip(clip.id, clip.startTime, finalDuration, clip.sourceStart);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Keyframe Dragging
  const handleMouseDownKeyframe = (
    e: React.MouseEvent,
    kfId: string,
    property: AnimatableProperty,
    initialTime: number
  ) => {
    if (isTrackLocked) return;
    e.stopPropagation();
    store.selectClip(clip.id);
    setDraggingKfId(kfId);

    const startX = e.clientX;
    let finalTime = initialTime;
    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (Math.abs(deltaX) > 2) {
        hasMoved = true;
      }
      const deltaTime = deltaX / zoom;
      const potentialTime = Math.max(0, Math.min(clip.duration, initialTime + deltaTime));
      finalTime = snapToFrame(potentialTime, fps);
    };

    const handleMouseUp = () => {
      setDraggingKfId(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (hasMoved) {
        store.moveKeyframe(clip.id, property, kfId, finalTime);
      } else {
        // Just clicked: seek playhead to keyframe
        store.setCurrentTime(snapToFrame(clip.startTime + initialTime, fps));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Collect keyframes for visualization
  const keyframeList: { id: string; property: AnimatableProperty; time: number }[] = [];
  if (clip.animations) {
    for (const key of Object.keys(clip.animations) as AnimatableProperty[]) {
      const trk = clip.animations[key];
      if (trk) {
        for (const kf of trk.keyframes) {
          keyframeList.push({ id: kf.id, property: key, time: kf.time });
        }
      }
    }
  }

  const handleClipDragOver = (e: React.DragEvent) => {
    const types = e.dataTransfer.types;
    if (types.includes('application/freecut-effect-type') || types.includes('application/freecut-transition-type') || types.includes('application/freecut-motion-preset')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setIsDropHovered(true);
    }
  };

  const handleClipDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropHovered(false);
  };

  const handleClipDrop = (e: React.DragEvent) => {
    setIsDropHovered(false);

    const motionPreset = e.dataTransfer.getData('application/freecut-motion-preset');
    if (motionPreset) {
      e.preventDefault();
      e.stopPropagation();
      store.applyMotionPreset(clip.id, motionPreset as any);
      store.selectClip(clip.id);
      return;
    }

    const effectType = e.dataTransfer.getData('application/freecut-effect-type');
    if (effectType) {
      e.preventDefault();
      e.stopPropagation();
      store.addEffect(clip.id, effectType as any);
      store.selectClip(clip.id);
      store.setState({ statusMessage: `Applied effect "${effectType}" to clip "${clip.name}"` });
      return;
    }

    const transitionType = e.dataTransfer.getData('application/freecut-transition-type');
    if (transitionType) {
      e.preventDefault();
      e.stopPropagation();
      const allClips = store.getState().project.clips;
      const nextClip = allClips.find(
        c => c.trackId === clip.trackId && Math.abs(c.startTime - (clip.startTime + clip.duration)) < 0.25
      );
      if (nextClip) {
        store.addTransition(transitionType as any, clip.id, nextClip.id, 1.0);
        store.setState({ statusMessage: `Applied ${transitionType} transition` });
      } else {
        const prevClip = allClips.find(
          c => c.trackId === clip.trackId && Math.abs((c.startTime + c.duration) - clip.startTime) < 0.25
        );
        if (prevClip) {
          store.addTransition(transitionType as any, prevClip.id, clip.id, 1.0);
          store.setState({ statusMessage: `Applied ${transitionType} transition` });
        }
      }
    }
  };

  const getTypeBadge = () => {
    switch (clip.type) {
      case 'text':
        return <span className="px-1 py-0.2 bg-purple-600/90 text-white rounded text-[8px] font-bold shrink-0">TXT</span>;
      case 'audio':
        return <span className="px-1 py-0.2 bg-emerald-600/90 text-white rounded text-[8px] font-bold shrink-0">AUD</span>;
      case 'image':
        return <span className="px-1 py-0.2 bg-amber-600/90 text-white rounded text-[8px] font-bold shrink-0">IMG</span>;
      case 'video':
      default:
        return <span className="px-1 py-0.2 bg-cyan-700/80 text-cyan-100 rounded text-[8px] font-bold shrink-0">VID</span>;
    }
  };

  return (
    <div
      onClick={handleSelect}
      onMouseDown={handleMouseDownMove}
      onContextMenu={handleContextMenu}
      onDragOver={handleClipDragOver}
      onDragLeave={handleClipDragLeave}
      onDrop={handleClipDrop}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        height: `${height - 4}px`,
        top: '2px',
      }}
      className={`absolute rounded select-none transition-shadow ${
        isTrackLocked
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-grab active:cursor-grabbing'
      } ${
        isAudio
          ? 'bg-gradient-to-r from-emerald-800/90 to-teal-700/90 border border-emerald-500/60 text-emerald-100'
          : clip.type === 'text'
          ? 'bg-gradient-to-r from-purple-900/95 to-indigo-800/95 border border-purple-500/70 text-purple-100 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
          : 'bg-gradient-to-r from-cyan-900/90 to-blue-800/90 border border-cyan-500/60 text-cyan-100'
      } ${
        isDropHovered
          ? 'ring-2 ring-violet-400 border-violet-400 bg-violet-600/40 z-30 shadow-[0_0_12px_rgba(167,139,250,0.6)]'
          : isSelected
          ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black z-20 shadow-lg'
          : 'hover:border-white/60 z-10'
      } ${isDragging || isTrimmingLeft || isTrimmingRight ? 'opacity-90' : ''}`}
    >
      {/* Left Trim Handle */}
      <div
        onMouseDown={handleMouseDownTrimLeft}
        title="Trim In-point"
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 z-30 rounded-l flex items-center justify-center group-hover:bg-white/10"
      >
        <div className="w-[1px] h-3 bg-white/40" />
      </div>

      {/* Real Audio Waveform Visualization */}
      {waveformPeaks && hasAudio && (
        <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden flex items-center z-10 px-1">
          <svg className="w-full h-full" preserveAspectRatio="none">
            {waveformPeaks.max.map((maxVal, idx) => {
              const minVal = waveformPeaks.min[idx];
              const x = (idx / waveformPeaks.max.length) * 100;
              const barH = Math.max(1.5, (maxVal - minVal) * height * 0.45);
              const y = (height - barH) / 2;
              return (
                <rect
                  key={idx}
                  x={`${x}%`}
                  y={y}
                  width="1.2"
                  height={barH}
                  fill={isAudio ? '#34d399' : '#38bdf8'}
                />
              );
            })}
          </svg>
        </div>
      )}

      {/* Audio Fade In Overlay */}
      {((clip as any).fadeInDuration ?? 0) > 0 && (
        <div
          style={{ width: `${Math.min(width, (clip as any).fadeInDuration * zoom)}px` }}
          className="absolute left-0 top-0 bottom-0 pointer-events-none z-15 bg-gradient-to-r from-black/60 to-transparent"
        >
          <svg className="w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="100%" x2="100%" y2="0" stroke="rgba(52, 211, 153, 0.7)" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Audio Fade Out Overlay */}
      {((clip as any).fadeOutDuration ?? 0) > 0 && (
        <div
          style={{ width: `${Math.min(width, (clip as any).fadeOutDuration * zoom)}px` }}
          className="absolute right-0 top-0 bottom-0 pointer-events-none z-15 bg-gradient-to-l from-black/60 to-transparent"
        >
          <svg className="w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(52, 211, 153, 0.7)" strokeWidth="1.5" />
          </svg>
        </div>
      )}

      {/* Clip Content & Title */}
      <div className="px-2 py-0.5 h-full flex flex-col justify-between overflow-hidden pointer-events-none">
        <div className="flex items-center space-x-1.5 truncate">
          {getTypeBadge()}
          {clip.linkedClipId && (
            <span title="Linked audio/video clip" className="text-amber-400 shrink-0 flex items-center">
              <Link2 className="w-2.5 h-2.5" />
            </span>
          )}
          <span className="text-[11px] font-semibold truncate leading-tight text-white/95">{clip.name}</span>
          {clip.effects && clip.effects.length > 0 && (
            <span className="px-1 py-0.2 bg-violet-600 text-violet-100 rounded text-[8px] font-bold shrink-0">
              fx ({clip.effects.length})
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono opacity-70">
          <span>{formatDurationCompact(clip.duration)}</span>
          {clip.sourceStart > 0 && <span>In: {clip.sourceStart.toFixed(1)}s</span>}
        </div>
      </div>

      {/* Context Menu */}
      {menuPos && (
        <div
          style={{ position: 'fixed', left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
          className="z-50 bg-freecut-darkest border border-freecut-border rounded shadow-2xl py-1 w-44 text-xs select-none pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {clip.linkedClipId ? (
            <button
              onClick={() => {
                store.unlinkClip(clip.id);
                setMenuPos(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center space-x-2 text-amber-300"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Unlink Audio & Video</span>
            </button>
          ) : null}

          {clip.linkedClipId && clip.type === 'video' && (
            <button
              onClick={() => {
                const audioId = clip.linkedClipId;
                store.unlinkClip(clip.id);
                if (audioId) store.deleteClips([audioId]);
                setMenuPos(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center space-x-2 text-red-300"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Delete Audio Only</span>
            </button>
          )}

          {clip.linkedClipId && clip.type === 'audio' && (
            <button
              onClick={() => {
                const videoId = clip.linkedClipId;
                store.unlinkClip(clip.id);
                if (videoId) store.deleteClips([videoId]);
                setMenuPos(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center space-x-2 text-red-300"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Video Only</span>
            </button>
          )}

          <button
            onClick={() => {
              store.executeProjectMutation('Toggle Mute', proj => {
                const c = proj.clips.find(item => item.id === clip.id);
                if (c) c.muted = !c.muted;
                return proj;
              });
              setMenuPos(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-white/10 flex items-center space-x-2 text-gray-200"
          >
            {clip.muted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{clip.muted ? 'Unmute Clip' : 'Mute Clip'}</span>
          </button>

          <div className="border-t border-freecut-border my-1" />

          <button
            onClick={() => {
              store.deleteClips([clip.id]);
              setMenuPos(null);
            }}
            className="w-full px-3 py-1.5 text-left hover:bg-red-500/20 flex items-center space-x-2 text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Clip</span>
          </button>
        </div>
      )}

      {/* Keyframe Markers Visualization (Shown on selected clips or clips with keyframes) */}
      {keyframeList.length > 0 && (
        <div className="absolute left-0 right-0 bottom-1 h-3 pointer-events-none z-20">
          {/* Connecting line */}
          {isSelected && (
            <div className="absolute left-1 right-1 top-[5px] h-[1px] bg-amber-400/30 border-dashed" />
          )}

          {keyframeList.map(kf => {
            const kfLeft = kf.time * zoom;
            if (kfLeft < -2 || kfLeft > width + 2) return null;

            return (
              <div
                key={kf.id}
                onMouseDown={e => handleMouseDownKeyframe(e, kf.id, kf.property, kf.time)}
                title={`${kf.property}: ${kf.time.toFixed(2)}s (Click to seek, drag to move)`}
                style={{ left: `${kfLeft}px` }}
                className={`absolute top-0 w-2.5 h-2.5 -ml-1.5 rotate-45 pointer-events-auto cursor-ew-resize transition-transform hover:scale-125 ${
                  isSelected
                    ? 'bg-amber-400 border border-black shadow-[0_0_4px_rgba(251,191,36,0.6)]'
                    : 'bg-cyan-300/80 border border-black/80'
                } ${draggingKfId === kf.id ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-black' : ''}`}
              />
            );
          })}
        </div>
      )}

      {/* Right Trim Handle */}
      <div
        onMouseDown={handleMouseDownTrimRight}
        title="Trim Out-point"
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 z-30 rounded-r flex items-center justify-center group-hover:bg-white/10"
      >
        <div className="w-[1px] h-3 bg-white/40" />
      </div>
    </div>
  );
};
