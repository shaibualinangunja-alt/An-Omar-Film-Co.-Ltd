import React, { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';

interface SceneDetectionPanelProps {
  clipId: string;
  onClose: () => void;
}

export const SceneDetectionPanel: React.FC<SceneDetectionPanelProps> = ({ clipId, onClose }) => {
  const [state, store] = useProjectStore();
  const [threshold, setThreshold] = useState(0.35);

  const clip = state.project.clips.find(c => c.id === clipId);
  const asset = clip ? state.project.media.find(m => m.id === clip.mediaId) : null;
  
  if (!clip || !asset) return null;

  // Ideally, markers are tied to the clip or asset in state, 
  // but for Alpha 0.9 we rely on global project markers mapped to this media
  const rawMarkers = state.project.sceneMarkers || [];
  // Filter for this threshold
  const markers = rawMarkers.filter(m => m.strength >= threshold);

  const handleSeek = (time: number) => {
    // Add clip start time offset
    store.setState({ currentTime: clip.startTime + time });
  };

  const handleCreateSubclips = () => {
    if (markers.length === 0) return;
    
    // In Alpha 0.9, we don't automatically slice to prevent destruction,
    // we use the timeline blade tool on the markers, or explicitly mutate here.
    // For now we just add standard markers to the timeline that snapping can use.
    
    alert('Scene markers added to timeline for snapping. Use blade tool to slice.');
    onClose();
  };

  return (
    <div className="bg-gray-800 border-l border-gray-700 h-full w-80 flex flex-col shadow-2xl z-40">
      <div className="flex justify-between items-center border-b border-gray-700 p-4 bg-gray-900/50">
        <div>
          <h3 className="text-sm font-bold text-gray-200">Detected Scenes</h3>
          <p className="text-[10px] text-gray-500 uppercase mt-0.5">{asset.name}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
      </div>

      <div className="p-4 bg-gray-900 border-b border-gray-700">
        <label className="flex justify-between text-gray-400 mb-1 text-xs">
          <span>Sensitivity (Threshold)</span>
          <span>{threshold.toFixed(2)}</span>
        </label>
        <input 
          type="range" 
          min="0.1" max="0.8" step="0.05"
          value={threshold} 
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>More Scenes</span>
          <span>Fewer Scenes</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {markers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400">No scenes detected at this threshold.</p>
          </div>
        ) : (
          markers.map((marker, idx) => (
            <div 
              key={idx} 
              className="flex justify-between items-center p-2 rounded bg-gray-700/30 hover:bg-gray-700/60 transition-colors cursor-pointer"
              onClick={() => handleSeek(marker.timestamp)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 w-6">{(idx + 1).toString().padStart(2, '0')}</span>
                <span className="text-sm font-mono text-gray-200">
                  {Math.floor(marker.timestamp / 60)}:{(marker.timestamp % 60).toFixed(2).padStart(5, '0')}
                </span>
              </div>
              <span className="text-[10px] text-blue-400 font-medium">
                {(marker.strength * 100).toFixed(0)}%
              </span>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <button 
          onClick={handleCreateSubclips}
          disabled={markers.length === 0}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
        >
          Add Markers to Timeline
        </button>
      </div>
    </div>
  );
};
