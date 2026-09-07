import React from 'react';
import { Square, Circle, Slash, Trash2, Eye, EyeOff } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { ClipItem } from '../../types/project';
import { MaskType, MaskItem } from '../../compositing';

interface MaskInspectorProps {
  clip: ClipItem;
}

export const MaskInspector: React.FC<MaskInspectorProps> = ({ clip }) => {
  const [, store] = useProjectStore();
  const masks = clip.masks || [];

  const handleAddMask = (type: MaskType) => {
    store.addClipMask(clip.id, type);
  };

  const handleUpdateMask = (maskId: string, updates: Partial<MaskItem>) => {
    store.updateClipMask(clip.id, maskId, updates);
  };

  const handleRemoveMask = (maskId: string) => {
    store.removeClipMask(clip.id, maskId);
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
        <div className="flex items-center space-x-1.5">
          <Square className="w-3.5 h-3.5 text-purple-400" />
          <span>Masks ({masks.length})</span>
        </div>
      </div>

      {/* Add Mask Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={() => handleAddMask('rectangle')}
          className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded bg-freecut-panel border border-freecut-border hover:border-purple-400 text-gray-300 text-[11px] transition-colors"
        >
          <Square className="w-3 h-3 text-purple-400" />
          <span>Rectangle</span>
        </button>
        <button
          onClick={() => handleAddMask('ellipse')}
          className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded bg-freecut-panel border border-freecut-border hover:border-purple-400 text-gray-300 text-[11px] transition-colors"
        >
          <Circle className="w-3 h-3 text-purple-400" />
          <span>Ellipse</span>
        </button>
        <button
          onClick={() => handleAddMask('linear')}
          className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded bg-freecut-panel border border-freecut-border hover:border-purple-400 text-gray-300 text-[11px] transition-colors"
        >
          <Slash className="w-3 h-3 text-purple-400" />
          <span>Linear</span>
        </button>
      </div>

      {/* Active Masks List */}
      <div className="space-y-2.5">
        {masks.map((mask, idx) => (
          <div
            key={mask.id}
            className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2.5 text-[11px]"
          >
            {/* Mask Header */}
            <div className="flex items-center justify-between border-b border-freecut-border/50 pb-1.5">
              <div className="flex items-center space-x-1.5">
                {mask.type === 'rectangle' && <Square className="w-3.5 h-3.5 text-purple-400" />}
                {mask.type === 'ellipse' && <Circle className="w-3.5 h-3.5 text-purple-400" />}
                {mask.type === 'linear' && <Slash className="w-3.5 h-3.5 text-purple-400" />}
                <span className="font-semibold text-gray-200 capitalize">
                  {mask.type} Mask {idx + 1}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleUpdateMask(mask.id, { enabled: !mask.enabled })}
                  className={`p-1 rounded hover:bg-white/5 ${
                    mask.enabled ? 'text-purple-400' : 'text-gray-600'
                  }`}
                  title={mask.enabled ? 'Disable Mask' : 'Enable Mask'}
                >
                  {mask.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleRemoveMask(mask.id)}
                  className="p-1 rounded text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Remove Mask"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Invert */}
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Invert Mask</span>
              <input
                type="checkbox"
                checked={mask.inverted}
                onChange={e => handleUpdateMask(mask.id, { inverted: e.target.checked })}
                className="rounded bg-freecut-panel border-freecut-border text-purple-500 focus:ring-0 w-3.5 h-3.5"
              />
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500 block mb-0.5">Width</span>
                <input
                  type="number"
                  value={Math.round(mask.width)}
                  onChange={e => handleUpdateMask(mask.id, { width: Math.max(10, Number(e.target.value)) })}
                  className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 font-mono text-[11px]"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block mb-0.5">Height</span>
                <input
                  type="number"
                  value={Math.round(mask.height)}
                  onChange={e => handleUpdateMask(mask.id, { height: Math.max(10, Number(e.target.value)) })}
                  className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-500 block mb-0.5">Pos X</span>
                <input
                  type="number"
                  value={Math.round(mask.positionX)}
                  onChange={e => handleUpdateMask(mask.id, { positionX: Number(e.target.value) })}
                  className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 font-mono text-[11px]"
                />
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block mb-0.5">Pos Y</span>
                <input
                  type="number"
                  value={Math.round(mask.positionY)}
                  onChange={e => handleUpdateMask(mask.id, { positionY: Number(e.target.value) })}
                  className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Feather */}
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Feather</span>
                <span className="font-mono text-purple-400">{mask.feather}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={mask.feather}
                onChange={e => handleUpdateMask(mask.id, { feather: Number(e.target.value) })}
                className="w-full accent-purple-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Opacity</span>
                <span className="font-mono text-purple-400">{Math.round(mask.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(mask.opacity * 100)}
                onChange={e => handleUpdateMask(mask.id, { opacity: Number(e.target.value) / 100 })}
                className="w-full accent-purple-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
