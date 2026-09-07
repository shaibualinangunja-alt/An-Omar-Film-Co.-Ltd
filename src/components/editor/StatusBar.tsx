import React from 'react';
import { useProjectStore } from '../../state/projectStore';
import { formatTimecode } from '../../utils/timecode';
import { Activity, Layers, Cpu } from 'lucide-react';

const StatusBarTimecode: React.FC<{ fps?: number }> = ({ fps = 30 }) => {
  const [currentTime] = useProjectStore(s => s.currentTime);
  return (
    <span className="text-amber-400 font-semibold">
      {formatTimecode(currentTime, fps)}
    </span>
  );
};

export const StatusBar: React.FC = () => {
  const [state, store] = useProjectStore(s => ({
    statusMessage: s.statusMessage,
    clipCount: s.project.clips.length,
    timelineZoom: s.timelineZoom,
    projectMeta: s.project.project,
  }));

  return (
    <footer className="h-6 bg-freecut-darkest border-t border-freecut-border px-3 flex items-center justify-between text-[11px] text-gray-400 select-none z-30">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="font-mono">{state.statusMessage}</span>
        </div>

        <button
          onClick={() => store.setState({ isMediaEngineModalOpen: true })}
          className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-freecut-panel hover:bg-freecut-elevated border border-freecut-border text-[10px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
          title="Click to view Media Engine diagnostics"
        >
          <Cpu className="w-2.5 h-2.5 text-cyan-400" />
          <span>FFmpeg: READY</span>
        </button>
      </div>

      <div className="flex items-center space-x-4 font-mono">
        <div className="flex items-center space-x-1 text-gray-300">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>{state.clipCount} Clips</span>
        </div>
        <div>
          <span className="text-gray-500">Zoom:</span> {Math.round(state.timelineZoom)} px/s
        </div>
        <div>
          <span className="text-gray-500">Playhead:</span>{' '}
          <StatusBarTimecode fps={state.projectMeta.fps} />
        </div>
        <div className="text-gray-500">
          {state.projectMeta.width}×{state.projectMeta.height} @ {state.projectMeta.fps}fps
        </div>
      </div>
    </footer>
  );
};
