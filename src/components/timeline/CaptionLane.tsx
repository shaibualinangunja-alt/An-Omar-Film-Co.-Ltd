import React, { useState } from 'react';
import { Subtitles, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { CaptionTrack, CaptionItem } from '../../captions';
import { useProjectStore, useProjectStoreActions } from '../../state/projectStore';
import { formatDurationCompact } from '../../utils/timecode';

interface CaptionHeaderProps {
  track: CaptionTrack;
}

export const CaptionTrackHeader: React.FC<CaptionHeaderProps> = ({ track }) => {
  const store = useProjectStoreActions();

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.executeProjectMutation('Toggle Caption Track Visibility', proj => {
      const t = (proj.captionTracks || []).find(ct => ct.id === track.id);
      if (t) t.visible = t.visible === false ? true : false;
      return proj;
    });
  };

  const handleAddCaption = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.addCaptionItem(track.id);
  };

  const handleDeleteTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.executeProjectMutation('Delete Caption Track', proj => {
      proj.captionTracks = (proj.captionTracks || []).filter(ct => ct.id !== track.id);
      return proj;
    });
  };

  const isVisible = track.visible !== false;

  return (
    <div
      style={{ height: `${track.height || 36}px` }}
      className="w-48 bg-[#090d16] border-r border-b border-freecut-border/80 px-2 flex items-center justify-between select-none text-xs text-blue-200"
    >
      <div className="flex items-center space-x-1.5 min-w-0">
        <Subtitles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-semibold text-[11px] truncate">{track.name}</span>
      </div>

      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={handleAddCaption}
          title="Add Caption at Playhead"
          className="p-1 rounded hover:bg-blue-900/40 text-blue-300 hover:text-blue-100 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>

        <button
          onClick={toggleVisibility}
          title={isVisible ? 'Hide Caption Track' : 'Show Caption Track'}
          className={`p-1 rounded transition-colors ${
            isVisible ? 'text-gray-400 hover:text-gray-200' : 'text-amber-500 bg-amber-500/10'
          }`}
        >
          {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>

        <button
          onClick={handleDeleteTrack}
          title="Delete Caption Track"
          className="p-1 rounded hover:bg-red-950/40 text-gray-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

interface CaptionBlockProps {
  trackId: string;
  item: CaptionItem;
  zoom: number;
}

const CaptionBlock: React.FC<CaptionBlockProps> = ({ trackId, item, zoom }) => {
  const [isSelected, store] = useProjectStore(s => s.selectedCaptionId === item.id);
  const [isDragging, setIsDragging] = useState(false);
  const [isTrimmingLeft, setIsTrimmingLeft] = useState(false);
  const [isTrimmingRight, setIsTrimmingRight] = useState(false);

  const left = item.startTime * zoom;
  const duration = Math.max(0.1, item.endTime - item.startTime);
  const width = Math.max(16, duration * zoom);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.selectCaptionItem(trackId, item.id);
  };

  // Drag to move caption item
  const handleMouseDownMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.selectCaptionItem(trackId, item.id);
    setIsDragging(true);

    const startX = e.clientX;
    const initialStart = item.startTime;
    const itemDuration = item.endTime - item.startTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;
      const newStart = Math.max(0, initialStart + deltaTime);
      const newEnd = newStart + itemDuration;

      store.updateCaptionItem(trackId, item.id, {
        startTime: newStart,
        endTime: newEnd,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Trim Start (Left handle)
  const handleMouseDownTrimLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.selectCaptionItem(trackId, item.id);
    setIsTrimmingLeft(true);

    const startX = e.clientX;
    const initialStart = item.startTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;
      const newStart = Math.max(0, Math.min(item.endTime - 0.2, initialStart + deltaTime));

      store.updateCaptionItem(trackId, item.id, { startTime: newStart });
    };

    const handleMouseUp = () => {
      setIsTrimmingLeft(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Trim End (Right handle)
  const handleMouseDownTrimRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    store.selectCaptionItem(trackId, item.id);
    setIsTrimmingRight(true);

    const startX = e.clientX;
    const initialEnd = item.endTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;
      const newEnd = Math.max(item.startTime + 0.2, initialEnd + deltaTime);

      store.updateCaptionItem(trackId, item.id, { endTime: newEnd });
    };

    const handleMouseUp = () => {
      setIsTrimmingRight(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      onClick={handleSelect}
      onMouseDown={handleMouseDownMove}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: '2px',
        bottom: '2px',
      }}
      className={`absolute rounded cursor-grab active:cursor-grabbing select-none transition-shadow ${
        isSelected
          ? 'bg-blue-600/90 border-2 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] z-20 text-white'
          : 'bg-blue-900/80 hover:bg-blue-800/80 border border-blue-500/60 z-10 text-blue-100'
      } ${isDragging || isTrimmingLeft || isTrimmingRight ? 'opacity-90' : ''}`}
    >
      {/* Left Trim Handle */}
      <div
        onMouseDown={handleMouseDownTrimLeft}
        title="Trim Caption Start"
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 z-30 rounded-l flex items-center justify-center"
      >
        <div className="w-[1px] h-3 bg-white/40" />
      </div>

      {/* Caption Content */}
      <div className="px-2 h-full flex items-center justify-between overflow-hidden pointer-events-none">
        <span className="text-[10px] font-medium truncate leading-tight mr-1">
          {item.text || 'Caption'}
        </span>
        <span className="text-[8px] font-mono text-blue-300/80 shrink-0">
          {formatDurationCompact(duration)}
        </span>
      </div>

      {/* Right Trim Handle */}
      <div
        onMouseDown={handleMouseDownTrimRight}
        title="Trim Caption End"
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 z-30 rounded-r flex items-center justify-center"
      >
        <div className="w-[1px] h-3 bg-white/40" />
      </div>
    </div>
  );
};

interface CaptionTrackLaneProps {
  track: CaptionTrack;
  zoom: number;
}

export const CaptionTrackLane: React.FC<CaptionTrackLaneProps> = ({ track, zoom }) => {
  return (
    <div
      style={{ height: `${track.height || 36}px` }}
      className="w-full border-b border-freecut-border/60 bg-[#070b14] relative select-none"
    >
      {/* Subtle lane background grid */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Caption Items */}
      {track.items.map(item => (
        <CaptionBlock key={item.id} trackId={track.id} item={item} zoom={zoom} />
      ))}
    </div>
  );
};
