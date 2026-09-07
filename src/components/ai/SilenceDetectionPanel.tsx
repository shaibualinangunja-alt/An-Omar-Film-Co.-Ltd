import React, { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { SilenceDetectionService } from '../../ai/silenceDetection';
import { jobQueue } from '../../ai/jobQueue';
import { SilenceRegion } from '../../ai/types';

interface SilenceDetectionPanelProps {
  clipId: string;
  onClose: () => void;
}

export const SilenceDetectionPanel: React.FC<SilenceDetectionPanelProps> = ({ clipId, onClose }) => {
  const [state, store] = useProjectStore();
  const [threshold, setThreshold] = useState(-40);
  const [minDuration, setMinDuration] = useState(0.5);
  const [padding, setPadding] = useState(0.1);
  const [regions, setRegions] = useState<SilenceRegion[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const clip = state.project.clips.find(c => c.id === clipId);
  const asset = clip ? state.project.media.find(m => m.id === clip.mediaId) : null;

  const handleDetect = () => {
    if (!clip || !asset) return;
    setIsDetecting(true);
    
    jobQueue.addJob('silence-detection', asset.id, undefined, async (job) => {
      try {
        const detected = await SilenceDetectionService.runSilenceDetection(
          job, 
          asset.path, 
          threshold, 
          minDuration
        );
        setRegions(detected);
        return detected;
      } finally {
        setIsDetecting(false);
      }
    });
  };

  const handleApply = () => {
    store.applySilenceRemoval(clipId, regions.map(r => ({
      ...r,
      start: Math.max(0, r.start + padding),
      end: Math.max(0, r.end - padding),
      duration: Math.max(0, (r.end - padding) - (r.start + padding))
    })));
    onClose();
  };

  if (!clip) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-80 shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
        <h3 className="text-sm font-bold text-gray-200">Silence Detection</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <label className="flex justify-between text-gray-400 mb-1 text-xs">
            <span>Threshold (dB)</span>
            <span>{threshold}</span>
          </label>
          <input 
            type="range" 
            min="-60" max="-10" 
            value={threshold} 
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="flex justify-between text-gray-400 mb-1 text-xs">
            <span>Minimum Duration (s)</span>
            <span>{minDuration.toFixed(1)}</span>
          </label>
          <input 
            type="range" 
            min="0.1" max="2.0" step="0.1"
            value={minDuration} 
            onChange={(e) => setMinDuration(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="flex justify-between text-gray-400 mb-1 text-xs">
            <span>Padding (s)</span>
            <span>{padding.toFixed(2)}</span>
          </label>
          <input 
            type="range" 
            min="0" max="0.5" step="0.05"
            value={padding} 
            onChange={(e) => setPadding(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      </div>

      {regions.length > 0 && (
        <div className="bg-gray-900 p-2 rounded border border-gray-700 text-xs text-gray-300">
          Found <span className="font-bold text-blue-400">{regions.length}</span> silent regions
          <div className="text-[10px] text-gray-500 mt-1 uppercase">Preview available on timeline</div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-700">
        <button 
          onClick={handleDetect}
          disabled={isDetecting}
          className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded transition-colors disabled:opacity-50"
        >
          {isDetecting ? 'Detecting...' : 'Detect'}
        </button>
        <button 
          onClick={handleApply}
          disabled={regions.length === 0}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:bg-gray-700 text-white text-xs font-medium rounded transition-colors"
        >
          Remove Silence
        </button>
      </div>
    </div>
  );
};
