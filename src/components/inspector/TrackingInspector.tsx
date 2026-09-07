import React, { useState } from 'react';
import { Target, Play, Zap, Check } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { ClipItem } from '../../types/project';
import { TrackingService, TrackingData } from '../../compositing';

interface TrackingInspectorProps {
  clip: ClipItem;
}

export const TrackingInspector: React.FC<TrackingInspectorProps> = ({ clip }) => {
  const [state, store] = useProjectStore();
  const [trackerType, setTrackerType] = useState<'point' | 'object' | 'face'>('point');
  const [anchorX, setAnchorX] = useState<number>(0);
  const [anchorY, setAnchorY] = useState<number>(0);
  const [currentSession, setCurrentSession] = useState<TrackingData | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);

  const handleStartTracking = () => {
    setIsTracking(true);
    setApplied(false);

    // Simulate optical point tracking across the clip span
    const duration = Math.min(3.0, clip.duration);
    const trackingResult = TrackingService.trackPointSequence(
      clip.id,
      { x: anchorX, y: anchorY },
      0,
      duration,
      state.project.project.fps || 30,
      (t) => {
        // Natural visual drift simulation
        return {
          dx: Math.sin(t * 2) * 40 + t * 15,
          dy: Math.cos(t * 1.5) * 25,
        };
      }
    );

    setCurrentSession(trackingResult);
    store.addTrackingData(clip.id, trackingResult);
    setIsTracking(false);
  };

  const handleApplyToKeyframes = () => {
    if (!currentSession) return;
    store.applyTrackingToClip(currentSession, clip.id);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center space-x-1.5 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
        <Target className="w-3.5 h-3.5 text-amber-400" />
        <span>Motion Tracking</span>
      </div>

      <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-3 text-[11px]">
        {/* Tracker Type Selection */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Tracker Type</span>
          <select
            value={trackerType}
            onChange={e => setTrackerType(e.target.value as any)}
            className="bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-amber-400"
          >
            <option value="point">Point Tracker (Optical)</option>
            <option value="object">Object Boundary</option>
            <option value="face">Face Anchor</option>
          </select>
        </div>

        {/* Anchor Coordinates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-gray-500 block mb-0.5">Anchor X (px)</span>
            <input
              type="number"
              value={anchorX}
              onChange={e => setAnchorX(Number(e.target.value))}
              className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 font-mono text-[11px]"
            />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 block mb-0.5">Anchor Y (px)</span>
            <input
              type="number"
              value={anchorY}
              onChange={e => setAnchorY(Number(e.target.value))}
              className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Track Action Button */}
        <button
          onClick={handleStartTracking}
          disabled={isTracking}
          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs transition-colors disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isTracking ? 'Tracking Frame...' : 'Track Forward (3s)'}</span>
        </button>

        {/* Tracking Results & Apply */}
        {currentSession && (
          <div className="pt-2 border-t border-freecut-border/50 space-y-2">
            <div className="flex justify-between items-center text-gray-400">
              <span>Points Tracked:</span>
              <span className="font-mono text-amber-400 font-bold">{currentSession.points.length} pts</span>
            </div>
            <button
              onClick={handleApplyToKeyframes}
              className={`w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded font-semibold text-xs transition-colors ${
                applied
                  ? 'bg-green-600 text-white'
                  : 'bg-freecut-panel border border-freecut-border hover:border-amber-400 text-gray-200'
              }`}
            >
              {applied ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
              <span>{applied ? 'Keyframes Applied!' : 'Convert to Keyframes'}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
