import React, { useRef } from 'react';
import { useProjectStore } from '../../state/projectStore';

interface PlayheadProps {
  totalHeight: number;
}

export const Playhead: React.FC<PlayheadProps> = ({ totalHeight }) => {
  const [{ currentTime, zoom }, store] = useProjectStore(s => ({
    currentTime: s.currentTime,
    zoom: s.timelineZoom,
  }));
  const playheadRef = useRef<HTMLDivElement>(null);

  const left = currentTime * zoom;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    const startX = e.clientX;
    const initialTime = currentTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;
      store.setCurrentTime(Math.max(0, initialTime + deltaTime));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={playheadRef}
      style={{ left: `${left}px` }}
      className="absolute top-0 bottom-0 z-40 pointer-events-none"
    >
      {/* Playhead Scrubber Head */}
      <div
        onMouseDown={handleMouseDown}
        className="pointer-events-auto -translate-x-1/2 cursor-ew-resize flex flex-col items-center group -mt-6"
      >
        <div className="w-3.5 h-4 bg-amber-400 group-hover:bg-amber-300 rounded-t-sm shadow-md flex items-center justify-center">
          <div className="w-1 h-1.5 bg-black/70 rounded-full" />
        </div>
        {/* Triangular pointer */}
        <div className="w-0 h-0 border-x-[7px] border-x-transparent border-t-[6px] border-t-amber-400 group-hover:border-t-amber-300" />
      </div>

      {/* Vertical Needle Line */}
      <div
        style={{ height: `${totalHeight}px` }}
        className="w-[1.5px] bg-amber-400 shadow-sm -translate-x-[0.75px]"
      />
    </div>
  );
};
