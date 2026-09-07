import React, { useRef } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { formatTimecode } from '../../utils/timecode';

interface TimeRulerProps {
  totalDuration: number;
}

export const TimeRuler: React.FC<TimeRulerProps> = ({ totalDuration }) => {
  const [{ zoom, fps }, store] = useProjectStore(s => ({
    zoom: s.timelineZoom,
    fps: s.project.project.fps || 30,
  }));
  const rulerRef = useRef<HTMLDivElement>(null);
  const totalWidth = Math.max(1200, totalDuration * zoom + 400);

  const handleScrub = (e: React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const time = Math.max(0, offsetX / zoom);
    store.setCurrentTime(time);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleScrub(e);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const offsetX = moveEvent.clientX - rect.left;
      const time = Math.max(0, offsetX / zoom);
      store.setCurrentTime(time);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Determine tick frequency based on zoom
  let secondStep = 1;
  if (zoom < 20) secondStep = 10;
  else if (zoom < 40) secondStep = 5;
  else if (zoom < 70) secondStep = 2;
  else secondStep = 1;

  const ticks: React.ReactNode[] = [];
  const maxSeconds = Math.ceil(totalWidth / zoom);

  for (let s = 0; s <= maxSeconds; s += secondStep) {
    const left = s * zoom;
    ticks.push(
      <div
        key={`major_${s}`}
        className="absolute bottom-0 flex flex-col items-start select-none pointer-events-none"
        style={{ left: `${left}px` }}
      >
        <span className="text-[9px] font-mono text-gray-500 pl-1 -translate-y-3.5">
          {formatTimecode(s, fps)}
        </span>
        <div className="h-3 w-[1px] bg-gray-500" />
      </div>
    );

    // Minor ticks
    if (secondStep === 1 && zoom >= 40) {
      for (let sub = 1; sub < 4; sub++) {
        const subLeft = left + (sub / 4) * zoom;
        ticks.push(
          <div
            key={`minor_${s}_${sub}`}
            className="absolute bottom-0 h-1.5 w-[1px] bg-gray-700 pointer-events-none"
            style={{ left: `${subLeft}px` }}
          />
        );
      }
    }
  }

  return (
    <div
      ref={rulerRef}
      onMouseDown={handleMouseDown}
      style={{ width: `${totalWidth}px` }}
      className="h-6 bg-freecut-darkest border-b border-freecut-border relative cursor-pointer select-none"
    >
      {ticks}
    </div>
  );
};
