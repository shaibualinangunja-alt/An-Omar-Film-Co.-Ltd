import React from 'react';
import { Video, Volume2, Lock, Unlock, Eye, EyeOff, VolumeX, Target } from 'lucide-react';
import { TimelineTrack } from '../../types/project';
import { useProjectStoreActions } from '../../state/projectStore';

interface TrackHeaderProps {
  track: TimelineTrack;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({ track }) => {
  const store = useProjectStoreActions();

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.toggleTrackMute(track.id);
  };

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.toggleTrackVisibility(track.id);
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.toggleTrackLock(track.id);
  };

  const toggleTarget = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.setTrackTargeted(track.id);
  };

  const isVisible = track.visible !== false;

  return (
    <div
      style={{ height: `${track.height}px` }}
      className={`w-48 border-r border-b border-freecut-border flex items-center justify-between px-2 select-none shrink-0 transition-colors ${
        track.locked
          ? 'bg-[#181412] border-amber-950/40 text-gray-500'
          : 'bg-freecut-darker text-gray-300'
      }`}
    >
      {/* Left: Target Toggle & Track Name */}
      <div className="flex items-center space-x-1.5 truncate">
        {/* Track Targeting Button */}
        <button
          onClick={toggleTarget}
          title={track.targeted ? 'Targeted Track (Active for insert/overwrite)' : 'Click to Target Track'}
          className={`p-1 rounded text-[10px] font-mono font-bold transition-all ${
            track.targeted
              ? 'bg-cyan-500 text-black shadow-sm scale-105'
              : 'text-gray-600 hover:text-gray-400 hover:bg-freecut-panel'
          }`}
        >
          <Target className="w-3 h-3" />
        </button>

        {track.type === 'video' ? (
          <Video className={`w-3.5 h-3.5 shrink-0 ${track.locked ? 'text-gray-500' : 'text-cyan-400'}`} />
        ) : (
          <Volume2 className={`w-3.5 h-3.5 shrink-0 ${track.locked ? 'text-gray-500' : 'text-emerald-400'}`} />
        )}
        <span
          className={`text-xs font-semibold truncate ${
            track.locked ? 'text-gray-500 italic' : 'text-gray-200'
          }`}
          title={track.name}
        >
          {track.name}
        </span>
      </div>

      {/* Right Controls: Visibility, Mute, Lock */}
      <div className="flex items-center space-x-0.5">
        {/* Video Visibility (only for video tracks) */}
        {track.type === 'video' && (
          <button
            onClick={toggleVisibility}
            title={isVisible ? 'Disable Video Track' : 'Enable Video Track'}
            className={`p-1 rounded hover:bg-freecut-panel transition-colors ${
              !isVisible ? 'text-red-400 bg-red-950/40' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
        )}

        {/* Track Solo (for audio tracks) */}
        {track.type === 'audio' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              store.toggleTrackSolo(track.id);
            }}
            title={track.solo ? 'Unsolo Track' : 'Solo Track (isolate this track)'}
            className={`px-1 py-0.5 rounded text-[9px] font-bold transition-colors ${
              track.solo
                ? 'bg-amber-400 text-black shadow-sm'
                : 'text-gray-500 hover:text-amber-300 hover:bg-freecut-panel'
            }`}
          >
            S
          </button>
        )}

        {/* Audio Mute */}
        <button
          onClick={toggleMute}
          title={track.muted ? 'Unmute Audio' : 'Mute Audio'}
          className={`p-1 rounded hover:bg-freecut-panel transition-colors ${
            track.muted ? 'text-red-400 bg-red-950/40' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
        </button>

        {/* Track Lock */}
        <button
          onClick={toggleLock}
          title={track.locked ? 'Unlock Track (Protected against edits)' : 'Lock Track'}
          className={`p-1 rounded hover:bg-freecut-panel transition-colors ${
            track.locked ? 'text-amber-400 bg-amber-950/50' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
};
