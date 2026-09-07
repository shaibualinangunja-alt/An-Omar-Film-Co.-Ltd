import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Maximize2, 
  MonitorPlay,
  Activity,
  Columns
} from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { formatTimecode } from '../../utils/timecode';
import { DesktopBridge } from '../../native/desktopBridge';
import { calculateSourceTime } from '../../utils/timelineMath';
import { evaluateClipAnimations } from '../../animation';

import { TransitionRegistry, findActiveTransitionAtTime } from '../../transitions';
import { TextRenderer } from '../../text';
import { CompositingPipeline } from '../../compositing';
import { AudioMeter } from './AudioMeter';
import { ScopesPanel } from './ScopesPanel';

export const PreviewPanel: React.FC = () => {
  const [state, store] = useProjectStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fromCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const toCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const splitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewZoom, setPreviewZoom] = useState<'fit' | '50%' | '100%'>('fit');
  const [showScopes, setShowScopes] = useState<boolean>(false);
  const [colorComparisonMode, setColorComparisonMode] = useState<'off' | 'before' | 'split'>('off');
  const [activeMediaEl, setActiveMediaEl] = useState<HTMLMediaElement | null>(null);

  // Pool of HTMLVideoElements keyed by mediaId
  const videoPoolRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Calculate project total duration
  const totalDuration = Math.max(
    5,
    ...state.project.clips.map(c => c.startTime + c.duration)
  );

  // Synchronize and render canvas frame based on active timeline clips
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = state.project.project.width || 1920;
    const height = state.project.project.height || 1080;
    const fps = state.project.project.fps || 30;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (!fromCanvasRef.current) fromCanvasRef.current = document.createElement('canvas');
    if (!toCanvasRef.current) toCanvasRef.current = document.createElement('canvas');
    if (!splitCanvasRef.current) splitCanvasRef.current = document.createElement('canvas');
    if (fromCanvasRef.current.width !== width || fromCanvasRef.current.height !== height) {
      fromCanvasRef.current.width = width;
      fromCanvasRef.current.height = height;
    }
    if (toCanvasRef.current.width !== width || toCanvasRef.current.height !== height) {
      toCanvasRef.current.width = width;
      toCanvasRef.current.height = height;
    }
    if (splitCanvasRef.current.width !== width || splitCanvasRef.current.height !== height) {
      splitCanvasRef.current.width = width;
      splitCanvasRef.current.height = height;
    }

    // 1. Clear background
    ctx.fillStyle = state.project.project.backgroundColor || '#000000';
    ctx.fillRect(0, 0, width, height);

    // 2. Find active clips at current playhead time
    const time = state.currentTime;
    const activeClips = state.project.clips.filter(
      clip => time >= clip.startTime && time < (clip.startTime + clip.duration)
    );

    // Track mute and visibility lookups
    const isTrackMuted = (trackId: string) => {
      const track = state.project.tracks.find(t => t.id === trackId);
      return track?.muted ?? false;
    };

    const isTrackVisible = (trackId: string) => {
      const track = state.project.tracks.find(t => t.id === trackId);
      return track ? track.visible !== false : true;
    };

    // Keep track of which videos are active this frame
    const activeMediaIds = new Set<string>();
    let hasDrawnVisual = false;
    const handledClipIds = new Set<string>();

    // Helper to render an individual clip frame with effects and transforms
    const renderClipContent = (
      targetCtx: CanvasRenderingContext2D,
      clip: (typeof state.project.clips)[0],
      clipPlayheadTime: number,
      disableColorGrade: boolean = false
    ): boolean => {
      if (clip.type === 'text') {
        if (!isTrackVisible(clip.trackId)) return false;
        if (!clip.textConfig) return false;
        const relativeTime = clipPlayheadTime - clip.startTime;
        const animState = evaluateClipAnimations(clip, relativeTime);
        TextRenderer.renderText(targetCtx, clip.textConfig, animState, width, height);
        return true;
      }

      const media = state.project.media.find(m => m.id === clip.mediaId);
      if (!media) return false;

      const relativeTime = clipPlayheadTime - clip.startTime;
      const animState = evaluateClipAnimations(clip, relativeTime);
      let rendered = false;

      // Handle color grade disable override for before/split comparison
      const effectiveClip = disableColorGrade && clip.colorGrade
        ? { ...clip, colorGrade: { ...clip.colorGrade, enabled: false } }
        : clip;

      if (clip.type === 'video' || clip.type === 'audio') {
        activeMediaIds.add(media.id);

        let mediaEl = videoPoolRef.current.get(media.id);
        if (!mediaEl) {
          mediaEl = document.createElement('video');
          mediaEl.crossOrigin = 'anonymous';
          mediaEl.playsInline = true;
          mediaEl.preload = 'auto';
          const streamUrl = DesktopBridge.getMediaStreamUrl(media.path);
          mediaEl.src = streamUrl;
          videoPoolRef.current.set(media.id, mediaEl);
        }

        const targetSourceTime = calculateSourceTime(clipPlayheadTime, clip);
        const trackMuted = isTrackMuted(clip.trackId);
        mediaEl.muted = clip.muted || trackMuted;
        mediaEl.volume = Math.max(0, Math.min(1, animState.volume));

        if (Math.abs(mediaEl.currentTime - targetSourceTime) > 0.08) {
          mediaEl.currentTime = targetSourceTime;
        }

        if (state.isPlaying) {
          if (mediaEl.paused && !mediaEl.seeking) {
            mediaEl.play().catch(() => {});
          }
        } else {
          if (!mediaEl.paused) {
            mediaEl.pause();
          }
        }

        if (clip.type === 'video' && isTrackVisible(clip.trackId)) {
          if (mediaEl.readyState >= 2) {
            rendered = true;
            CompositingPipeline.renderClip(targetCtx, mediaEl, effectiveClip, animState, relativeTime, width, height);
          } else if (media.thumbnailUrl) {
            const img = new Image();
            img.src = media.thumbnailUrl;
            if (img.complete) {
              rendered = true;
              CompositingPipeline.renderClip(targetCtx, img, effectiveClip, animState, relativeTime, width, height);
            }
          }
        }
      } else if (clip.type === 'image' && isTrackVisible(clip.trackId)) {
        if (media.thumbnailUrl) {
          const img = new Image();
          img.src = media.thumbnailUrl;
          if (img.complete) {
            rendered = true;
            CompositingPipeline.renderClip(targetCtx, img, effectiveClip, animState, relativeTime, width, height);
          }
        }
      }

      return rendered;
    };

    // Render video tracks according to hierarchy (lower order index renders on top)
    const videoTracks = [...state.project.tracks].filter(t => t.type === 'video');
    videoTracks.sort((a, b) => b.order - a.order);

    const isBeforeMode = colorComparisonMode === 'before';

    for (const track of videoTracks) {
      if (!isTrackVisible(track.id)) continue;

      // Check if a transition is currently active on this track
      const activeTr = findActiveTransitionAtTime(state.project.transitions, state.project.clips, track.id, time, fps);
      if (activeTr) {
        const fromCanvas = fromCanvasRef.current!;
        const toCanvas = toCanvasRef.current!;
        const fromCtx = fromCanvas.getContext('2d')!;
        const toCtx = toCanvas.getContext('2d')!;

        fromCtx.clearRect(0, 0, width, height);
        toCtx.clearRect(0, 0, width, height);

        renderClipContent(fromCtx, activeTr.fromClip, time, isBeforeMode);
        renderClipContent(toCtx, activeTr.toClip, time, isBeforeMode);

        const descriptor = TransitionRegistry.getTransition(activeTr.transition.type);
        if (descriptor) {
          descriptor.renderPreview(ctx, {
            fromCanvas,
            toCanvas,
            progress: activeTr.progress,
            width,
            height,
            parameters: activeTr.transition.parameters,
          });
          hasDrawnVisual = true;
        }
        handledClipIds.add(activeTr.fromClip.id);
        handledClipIds.add(activeTr.toClip.id);
      }

      // Render remaining non-transition clips on this track
      const trackClips = activeClips.filter(c => c.trackId === track.id && !handledClipIds.has(c.id));
      for (const clip of trackClips) {
        if (renderClipContent(ctx, clip, time, isBeforeMode)) {
          hasDrawnVisual = true;
        }
      }
    }

    // Process audio tracks for audio playback sync
    const audioTracks = state.project.tracks.filter(t => t.type === 'audio');
    for (const track of audioTracks) {
      const trackClips = activeClips.filter(c => c.trackId === track.id);
      for (const clip of trackClips) {
        renderClipContent(ctx, clip, time, isBeforeMode);
      }
    }

    // Handle Split Comparison (Left half: Ungraded Before; Right half: Graded After)
    if (colorComparisonMode === 'split' && splitCanvasRef.current && hasDrawnVisual) {
      const sCtx = splitCanvasRef.current.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = state.project.project.backgroundColor || '#000000';
        sCtx.fillRect(0, 0, width, height);

        for (const track of videoTracks) {
          if (!isTrackVisible(track.id)) continue;
          const trackClips = activeClips.filter(c => c.trackId === track.id);
          for (const clip of trackClips) {
            renderClipContent(sCtx, clip, time, true); // disableColorGrade = true
          }
        }

        // Draw left half of ungraded version onto main ctx
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width / 2, height);
        ctx.clip();
        ctx.drawImage(splitCanvasRef.current, 0, 0);
        ctx.restore();

        // Draw vertical divider
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Split Badges
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(width / 2 - 84, 16, 72, 22);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('BEFORE', width / 2 - 74, 32);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(width / 2 + 12, 16, 64, 22);
        ctx.fillStyle = '#22d3ee';
        ctx.fillText('AFTER', width / 2 + 22, 32);
        ctx.restore();
      }
    }

    // Render active captions on top of video clips
    if (state.project.captionTracks) {
      for (const capTrack of state.project.captionTracks) {
        if (capTrack.visible === false) continue;
        for (const item of capTrack.items) {
          if (time >= item.startTime && time < item.endTime) {
            TextRenderer.renderCaption(ctx, item, width, height);
            hasDrawnVisual = true;
          }
        }
      }
    }

    // Render Safe Area Guides if toggled on
    if (state.showSafeAreas) {
      TextRenderer.renderSafeAreas(ctx, width, height);
    }

    // Update active media element for real-time audio meter
    let currentActiveEl: HTMLMediaElement | null = null;
    for (const id of activeMediaIds) {
      const el = videoPoolRef.current.get(id);
      if (el) {
        currentActiveEl = el;
        break;
      }
    }
    setActiveMediaEl(currentActiveEl);

    // Pause and mute any pooled videos that are no longer active at this playhead time
    videoPoolRef.current.forEach((video, mediaId) => {
      if (!activeMediaIds.has(mediaId)) {
        if (!video.paused) {
          video.pause();
        }
        video.muted = true;
      }
    });

    // Default backdrop placeholder when in a gap or when no active visual media is playing
    if (!hasDrawnVisual) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let x = 0; x < width; x += 120) {
        ctx.fillRect(x, 0, 1, height);
      }
      for (let y = 0; y < height; y += 120) {
        ctx.fillRect(0, y, width, 1);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.font = '600 32px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FREECUT PREVIEW', width / 2, height / 2 - 15);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('Timeline Gap (Empty Frame)', width / 2, height / 2 + 25);
    }
  }, [state.currentTime, state.isPlaying, state.project, state.showSafeAreas, previewZoom, colorComparisonMode]);

  // Clean up pooled videos on unmount
  useEffect(() => {
    return () => {
      videoPoolRef.current.forEach(video => {
        video.pause();
        video.src = '';
        video.load();
      });
      videoPoolRef.current.clear();
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => console.warn(err));
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-freecut-darkest select-none relative">
      {/* Viewport Header */}
      <div className="h-9 px-3 border-b border-freecut-border bg-freecut-darker flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <MonitorPlay className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-gray-200">Program Monitor</span>
          <span className="text-[10px] text-gray-500">
            {state.project.project.width}×{state.project.project.height}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Grade Before / After / Split Comparison Toggle */}
          <button
            onClick={() => {
              setColorComparisonMode(prev => {
                if (prev === 'off') return 'split';
                if (prev === 'split') return 'before';
                return 'off';
              });
            }}
            title="Color Grade Comparison Mode: Normal / Split-Screen / Before Only"
            className={`px-2 py-0.5 text-[11px] rounded font-medium border flex items-center space-x-1 transition-colors ${
              colorComparisonMode === 'split'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : colorComparisonMode === 'before'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'border-freecut-border bg-freecut-panel text-gray-400 hover:text-gray-200 hover:bg-freecut-border/50'
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>{colorComparisonMode === 'split' ? 'Grade: Split' : colorComparisonMode === 'before' ? 'Grade: Before' : 'Grade: Normal'}</span>
          </button>

          {/* Color Scopes Toggle */}
          <button
            onClick={() => setShowScopes(prev => !prev)}
            title="Toggle Color Scopes (Waveform, RGB Parade, Vectorscope, Histogram)"
            className={`px-2 py-0.5 text-[11px] rounded font-medium border flex items-center space-x-1 transition-colors ${
              showScopes
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'border-freecut-border bg-freecut-panel text-gray-400 hover:text-gray-200 hover:bg-freecut-border/50'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Scopes</span>
          </button>

          {/* Safe Area Guides Toggle */}
          <button
            onClick={() => store.toggleSafeAreas()}
            title="Toggle Safe Area Guides (Action 90% / Title 80%)"
            className={`px-2 py-0.5 text-[11px] rounded font-medium border transition-colors ${
              state.showSafeAreas
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'border-freecut-border bg-freecut-panel text-gray-400 hover:text-gray-200 hover:bg-freecut-border/50'
            }`}
          >
            Safe Area
          </button>

          {/* Zoom / Fit selector */}
          <select
            value={previewZoom}
            onChange={e => setPreviewZoom(e.target.value as typeof previewZoom)}
            className="bg-freecut-panel border border-freecut-border rounded px-2 py-0.5 text-[11px] text-gray-300 focus:outline-none"
          >
            <option value="fit">Fit to View</option>
            <option value="50%">50%</option>
            <option value="100%">100%</option>
          </select>

          <button
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1 rounded hover:bg-freecut-panel text-gray-400 hover:text-gray-200"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-black/90 relative"
      >
        <div className="relative shadow-2xl rounded overflow-hidden border border-freecut-border/50 max-h-full max-w-full aspect-video flex items-center justify-center bg-black">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Transport Controls Bar */}
      <div className="h-11 border-t border-freecut-border bg-freecut-darker px-4 flex items-center justify-between">
        {/* Current Timecode */}
        <div className="font-mono text-sm font-bold text-amber-400 min-w-[90px]">
          {formatTimecode(state.currentTime, state.project.project.fps)}
        </div>

        {/* Playback Transport Buttons */}
        <div className="flex items-center space-x-2">
          <button
            title="Step Back 1 Frame (←)"
            onClick={() => store.stepFrames(-1)}
            className="p-1.5 rounded hover:bg-freecut-panel text-gray-400 hover:text-gray-200 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            title={state.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            onClick={() => store.togglePlayPause()}
            className={`p-2 rounded-full shadow-lg transition-all active:scale-95 ${
              state.isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black'
            }`}
          >
            {state.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            title="Step Forward 1 Frame (→)"
            onClick={() => store.stepFrames(1)}
            className="p-1.5 rounded hover:bg-freecut-panel text-gray-400 hover:text-gray-200 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Stereo Audio Meters */}
        <div className="flex items-center space-x-3">
          <AudioMeter mediaElement={activeMediaEl} isPlaying={state.isPlaying} />

          {/* Total Duration & Audio Indicator */}
          <div className="flex items-center space-x-2 text-xs font-mono text-gray-400">
            <span className="text-gray-500">/</span>
            <span className="text-gray-300">
              {formatTimecode(totalDuration, state.project.project.fps)}
            </span>
          </div>
        </div>
      </div>

      {/* Floating / Docked Color Scopes Panel */}
      <ScopesPanel
        sourceCanvas={canvasRef.current}
        isOpen={showScopes}
        onClose={() => setShowScopes(false)}
      />
    </div>
  );
};
