import React, { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { AudioCleanupService, AudioCleanupSettings } from '../../ai/audioCleanup';
import { jobQueue } from '../../ai/jobQueue';

interface AiAudioPanelProps {
  clipId: string;
  onClose: () => void;
}

export const AiAudioPanel: React.FC<AiAudioPanelProps> = ({ clipId, onClose }) => {
  const [state, store] = useProjectStore();
  const [settings, setSettings] = useState<AudioCleanupSettings>({
    reduceNoise: true,
    enhanceSpeech: false,
    removeHum: false
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const clip = state.project.clips.find(c => c.id === clipId);
  const asset = clip ? state.project.media.find(m => m.id === clip.mediaId) : null;
  
  if (!clip || !asset) return null;

  const handleApply = () => {
    setIsProcessing(true);
    
    jobQueue.addJob('audio-cleanup', asset.id, undefined, async (job) => {
      try {
        const payload = await AudioCleanupService.runAudioCleanup(job, asset.path, settings);
        store.executeProjectMutation('AI Audio Cleanup', proj => {
          const c = proj.clips.find(x => x.id === clipId);
          if (c) {
            c.aiAudioCleanup = JSON.parse(payload);
          }
          return proj;
        });
        return payload;
      } finally {
        setIsProcessing(false);
        onClose(); // Automatically close on success
      }
    });
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-84 shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
        <h3 className="text-sm font-bold text-gray-200">AI Audio Cleanup</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
      </div>

      <div className="bg-blue-900/20 border border-blue-900/50 p-2 rounded flex items-start gap-2">
        <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
        <p className="text-[10px] text-blue-300">
          Uses local FFT spectral subtraction denoiser (afftdn) and highpass filtering. Non-destructive; leaves original media untouched.
        </p>
      </div>

      <div className="space-y-3 text-sm mt-1">
        {/* Reduce Noise - GENUINELY FUNCTIONAL */}
        <label className="flex items-start gap-3 cursor-pointer group p-1.5 rounded hover:bg-gray-700/40 transition-colors">
          <input 
            type="checkbox" 
            checked={settings.reduceNoise}
            onChange={(e) => setSettings({...settings, reduceNoise: e.target.checked})}
            className="w-4 h-4 mt-0.5 rounded bg-gray-900 border-gray-600 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-gray-800"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-200 font-medium group-hover:text-white transition-colors">Reduce Noise</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-green-900/60 border border-green-700/60 text-green-400 rounded">FUNCTIONAL</span>
            </div>
            <div className="text-[10px] text-gray-400">FFT spectral subtraction & sub-bass cutoff (80Hz).</div>
          </div>
        </label>

        {/* Clean Voice - FOUNDATION ONLY */}
        <div className="flex items-start gap-3 p-1.5 rounded bg-gray-900/30 border border-gray-700/40 opacity-75">
          <input 
            type="checkbox" 
            disabled
            checked={false}
            className="w-4 h-4 mt-0.5 rounded bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-medium">Clean Voice</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-900/40 border border-yellow-700/40 text-yellow-400 rounded">FOUNDATION ONLY</span>
            </div>
            <div className="text-[10px] text-gray-500">Deep neural speech isolation architecture (planned for Alpha 1.0).</div>
          </div>
        </div>

        {/* Enhance Speech - FOUNDATION ONLY */}
        <div className="flex items-start gap-3 p-1.5 rounded bg-gray-900/30 border border-gray-700/40 opacity-75">
          <input 
            type="checkbox" 
            disabled
            checked={false}
            className="w-4 h-4 mt-0.5 rounded bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-medium">Enhance Speech</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-yellow-900/40 border border-yellow-700/40 text-yellow-400 rounded">FOUNDATION ONLY</span>
            </div>
            <div className="text-[10px] text-gray-500">Multi-band vocal presence dynamics architecture.</div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-700">
        <button 
          onClick={handleApply}
          disabled={isProcessing || !settings.reduceNoise}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:bg-gray-700 text-white text-sm font-medium rounded transition-colors"
        >
          {isProcessing ? 'Processing Audio...' : 'Apply Noise Reduction'}
        </button>
      </div>
    </div>
  );
};
