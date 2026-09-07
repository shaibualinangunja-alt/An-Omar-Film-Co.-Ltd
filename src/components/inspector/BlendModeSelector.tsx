import React from 'react';
import { Layers } from 'lucide-react';
import { BlendMode, listBlendModes } from '../../compositing';
import { useProjectStoreActions } from '../../state/projectStore';
import { ClipItem } from '../../types/project';

interface BlendModeSelectorProps {
  clip: ClipItem;
}

export const BlendModeSelector: React.FC<BlendModeSelectorProps> = ({ clip }) => {
  const store = useProjectStoreActions();
  const blendModes = listBlendModes();
  const currentMode = clip.blendMode || 'normal';

  return (
    <section className="space-y-2">
      <div className="flex items-center space-x-1.5 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
        <Layers className="w-3.5 h-3.5 text-cyan-400" />
        <span>Compositing & Blend Mode</span>
      </div>

      <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-400">Blend Mode</span>
          <select
            value={currentMode}
            onChange={e => store.updateClipBlendMode(clip.id, e.target.value as BlendMode)}
            className="bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-cyan-400"
          >
            {blendModes.map(mode => (
              <option key={mode.id} value={mode.id}>
                {mode.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[10px] text-gray-500 italic">
          {blendModes.find(m => m.id === currentMode)?.description}
        </p>
      </div>
    </section>
  );
};
