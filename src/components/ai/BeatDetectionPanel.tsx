import React from 'react';
import { useProjectStore } from '../../state/projectStore';

interface BeatDetectionPanelProps {
  clipId: string;
  onClose: () => void;
}

export const BeatDetectionPanel: React.FC<BeatDetectionPanelProps> = ({ clipId, onClose }) => {
  const [state, store] = useProjectStore();

  const clip = state.project.clips.find(c => c.id === clipId);
  const asset = clip ? state.project.media.find(m => m.id === clip.mediaId) : null;
  
  if (!clip || !asset) return null;

  const rawMarkers = state.project.beatMarkers || [];

  // Very rough BPM calculation from markers
  let bpm = 0;
  if (rawMarkers.length > 5) {
    let sumDiff = 0;
    let count = 0;
    for (let i = 1; i < Math.min(rawMarkers.length, 50); i++) {
      const diff = rawMarkers[i].timestamp - rawMarkers[i-1].timestamp;
      if (diff > 0.1 && diff < 2.0) { // realistic beat interval
        sumDiff += diff;
        count++;
      }
    }
    if (count > 0) {
      bpm = Math.round(60 / (sumDiff / count));
    }
  }

  const handleSeek = (time: number) => {
    store.setState({ currentTime: clip.startTime + time });
  };

  const handleEnableSnapping = () => {
    store.setState({ snappingEnabled: true });
    alert('Timeline snapping to beats enabled.');
    onClose();
  };

  return (
    <div className="bg-gray-800 border-l border-gray-700 h-full w-80 flex flex-col shadow-2xl z-40">
      <div className="flex justify-between items-center border-b border-gray-700 p-4 bg-gray-900/50">
        <div>
          <h3 className="text-sm font-bold text-gray-200">Beat Detection</h3>
          <p className="text-[10px] text-gray-500 uppercase mt-0.5">{asset.name}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
      </div>

      <div className="p-6 bg-gray-900 border-b border-gray-700 flex flex-col items-center justify-center">
        <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-2">Estimated Tempo</span>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-bold text-gray-100">{bpm > 0 ? bpm : '--'}</span>
          <span className="text-sm text-gray-500 mb-1">BPM</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {rawMarkers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400">No beats detected.</p>
          </div>
        ) : (
          rawMarkers.map((marker, idx) => (
            <div 
              key={idx} 
              className="flex justify-between items-center p-2 rounded bg-gray-700/30 hover:bg-gray-700/60 transition-colors cursor-pointer"
              onClick={() => handleSeek(marker.timestamp)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 w-6">{(idx + 1).toString().padStart(3, '0')}</span>
                <span className="text-sm font-mono text-gray-200">
                  {Math.floor(marker.timestamp / 60)}:{(marker.timestamp % 60).toFixed(2).padStart(5, '0')}
                </span>
              </div>
              <div className="w-16 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-400 h-1.5" 
                  style={{ width: `${Math.max(10, marker.confidence * 100)}%` }}
                ></div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <button 
          onClick={handleEnableSnapping}
          disabled={rawMarkers.length === 0}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
        >
          Enable Snap to Beat
        </button>
      </div>
    </div>
  );
};
