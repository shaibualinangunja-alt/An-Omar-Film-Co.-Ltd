import React from 'react';
import { Wand2, Eye, EyeOff } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { ClipItem } from '../../types/project';
import { DEFAULT_CHROMA_KEY_SETTINGS } from '../../compositing';

interface ChromaKeyInspectorProps {
  clip: ClipItem;
}

export const ChromaKeyInspector: React.FC<ChromaKeyInspectorProps> = ({ clip }) => {
  const [, store] = useProjectStore();
  const chromaKey = clip.chromaKey || DEFAULT_CHROMA_KEY_SETTINGS;

  const handleChange = (updates: Partial<typeof chromaKey>) => {
    store.updateClipChromaKey(clip.id, updates);
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
        <div className="flex items-center space-x-1.5">
          <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chroma Key</span>
        </div>
        <button
          onClick={() => handleChange({ enabled: !chromaKey.enabled })}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
            chromaKey.enabled
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200'
          }`}
        >
          {chromaKey.enabled ? <Eye className="w-3 h-3 mr-0.5" /> : <EyeOff className="w-3 h-3 mr-0.5" />}
          <span>{chromaKey.enabled ? 'Enabled' : 'Disabled'}</span>
        </button>
      </div>

      <div className={`bg-freecut-darkest p-3 rounded border border-freecut-border space-y-3 transition-opacity ${
        chromaKey.enabled ? 'opacity-100' : 'opacity-60 pointer-events-none'
      }`}>
        {/* Key Color */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-gray-400 block">Key Color</label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={chromaKey.keyColor || '#00FF00'}
              onChange={e => handleChange({ keyColor: e.target.value })}
              className="w-7 h-7 rounded border border-freecut-border bg-freecut-panel cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={chromaKey.keyColor || '#00FF00'}
              onChange={e => handleChange({ keyColor: e.target.value })}
              className="w-24 bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 font-mono text-xs focus:outline-none focus:border-emerald-400"
            />
            {/* Quick color chips */}
            <button
              onClick={() => handleChange({ keyColor: '#00FF00' })}
              className="px-2 py-1 text-[10px] rounded bg-green-950 text-green-300 border border-green-800 hover:bg-green-900"
              title="Green Screen Preset"
            >
              Green
            </button>
            <button
              onClick={() => handleChange({ keyColor: '#0000FF' })}
              className="px-2 py-1 text-[10px] rounded bg-blue-950 text-blue-300 border border-blue-800 hover:bg-blue-900"
              title="Blue Screen Preset"
            >
              Blue
            </button>
          </div>
        </div>

        {/* Similarity */}
        <div>
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Similarity</span>
            <span className="font-mono text-emerald-400">
              {Math.round((chromaKey.similarity ?? 0.25) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={Math.round((chromaKey.similarity ?? 0.25) * 100)}
            onChange={e => handleChange({ similarity: Number(e.target.value) / 100 })}
            className="w-full accent-emerald-400 h-1 bg-freecut-panel rounded cursor-pointer"
          />
        </div>

        {/* Smoothness */}
        <div>
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Smoothness</span>
            <span className="font-mono text-emerald-400">
              {Math.round((chromaKey.smoothness ?? 0.10) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={Math.round((chromaKey.smoothness ?? 0.10) * 100)}
            onChange={e => handleChange({ smoothness: Number(e.target.value) / 100 })}
            className="w-full accent-emerald-400 h-1 bg-freecut-panel rounded cursor-pointer"
          />
        </div>

        {/* Spill Suppression */}
        <div>
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Spill Suppression</span>
            <span className="font-mono text-emerald-400">
              {Math.round((chromaKey.spillSuppression ?? 0.50) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round((chromaKey.spillSuppression ?? 0.50) * 100)}
            onChange={e => handleChange({ spillSuppression: Number(e.target.value) / 100 })}
            className="w-full accent-emerald-400 h-1 bg-freecut-panel rounded cursor-pointer"
          />
        </div>

        {/* Edge Softness */}
        <div>
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Edge Softness</span>
            <span className="font-mono text-emerald-400">{chromaKey.edgeSoftness ?? 2}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="1"
            value={chromaKey.edgeSoftness ?? 2}
            onChange={e => handleChange({ edgeSoftness: Number(e.target.value) })}
            className="w-full accent-emerald-400 h-1 bg-freecut-panel rounded cursor-pointer"
          />
        </div>

        {/* Invert */}
        <div className="flex items-center justify-between pt-1 border-t border-freecut-border/50 text-[11px]">
          <span className="text-gray-400">Invert Keying</span>
          <input
            type="checkbox"
            checked={chromaKey.invert ?? false}
            onChange={e => handleChange({ invert: e.target.checked })}
            className="rounded bg-freecut-panel border-freecut-border text-emerald-500 focus:ring-0 w-3.5 h-3.5"
          />
        </div>
      </div>
    </section>
  );
};
