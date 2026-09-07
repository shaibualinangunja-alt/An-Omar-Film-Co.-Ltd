import React from 'react';
import { Film, Music, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { MediaAsset } from '../../types/project';
import { formatDurationCompact } from '../../utils/timecode';
import { formatFileSize } from '../../utils/formatters';
import { projectStore } from '../../state/projectStore';

interface MediaItemCardProps {
  media: MediaAsset;
  onAddToTimeline: (mediaId: string) => void;
  onDeleteMedia: (mediaId: string) => void;
}

export const MediaItemCard: React.FC<MediaItemCardProps> = ({
  media,
  onAddToTimeline,
  onDeleteMedia,
}) => {
  const getIcon = () => {
    switch (media.type) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-cyan-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-emerald-400" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/freecut-media-id', media.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group relative bg-freecut-panel border border-freecut-border hover:border-cyan-500/60 rounded-md overflow-hidden transition-all duration-150 flex flex-col cursor-grab active:cursor-grabbing select-none"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video bg-black/60 flex items-center justify-center overflow-hidden">
        {media.thumbnailUrl ? (
          <img
            src={media.thumbnailUrl}
            alt={media.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 pointer-events-none">
            {getIcon()}
            <span className="text-[10px] mt-1 capitalize font-medium">{media.type}</span>
          </div>
        )}

        {/* Duration badge */}
        {media.duration > 0 && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-mono px-1 rounded text-gray-200 pointer-events-none">
            {formatDurationCompact(media.duration)}
          </span>
        )}

        {/* Missing Media Banner */}
        {media.isMissing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              projectStore.setState({ isRelinkModalOpen: true });
            }}
            className="absolute inset-x-0 bottom-0 bg-red-600/90 hover:bg-red-500 text-white text-[9px] font-bold py-0.5 text-center uppercase tracking-wider transition cursor-pointer z-10"
            title="Click to relink missing media file"
          >
            Media Offline — Relink
          </button>
        )}

        {/* Media type & resolution pill */}
        {media.width && media.height ? (
          <span className="absolute top-1 left-1 bg-black/70 text-[9px] font-mono px-1 rounded text-cyan-300 pointer-events-none">
            {media.width}×{media.height}
          </span>
        ) : null}

        {/* Quick Add overlay button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-2 transition-opacity">
          <button
            title="Add to Timeline"
            onClick={(e) => {
              e.stopPropagation();
              onAddToTimeline(media.id);
            }}
            className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full shadow-lg transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            title="Delete Media"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteMedia(media.id);
            }}
            className="p-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-full shadow-lg transition-transform active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info Footer */}
      <div className="p-2 flex flex-col justify-between flex-1 bg-freecut-darker">
        <span className="text-xs font-medium text-gray-200 truncate" title={media.name}>
          {media.name}
        </span>
        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1 font-mono">
          <div className="flex items-center space-x-1">
            <span className="capitalize text-gray-300">{media.type}</span>
            {media.fps && <span className="text-gray-500">• {media.fps}fps</span>}
            {media.codec && <span className="text-cyan-400 uppercase text-[9px]">• {media.codec}</span>}
          </div>
          <span>{formatFileSize(media.size)}</span>
        </div>
      </div>
    </div>
  );
};
