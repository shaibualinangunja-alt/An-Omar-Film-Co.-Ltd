import React from 'react';
import { Crop, FlipHorizontal, FlipVertical, RotateCcw } from 'lucide-react';
import { useProjectStoreActions } from '../../state/projectStore';
import { ClipItem } from '../../types/project';

interface CropFlipInspectorProps {
  clip: ClipItem;
}

export const CropFlipInspector: React.FC<CropFlipInspectorProps> = ({ clip }) => {
  const store = useProjectStoreActions();
  const crop = clip.crop || { left: 0, right: 0, top: 0, bottom: 0 };
  const flip = clip.flip || { horizontal: false, vertical: false };

  const handleCropChange = (field: 'left' | 'right' | 'top' | 'bottom', value: number) => {
    store.updateClipCrop(clip.id, { [field]: value / 100 });
  };

  const handleReset = () => {
    store.updateClipCrop(clip.id, { left: 0, right: 0, top: 0, bottom: 0 });
    store.updateClipFlip(clip.id, { horizontal: false, vertical: false });
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
        <div className="flex items-center space-x-1.5">
          <Crop className="w-3.5 h-3.5 text-cyan-400" />
          <span>Crop & Flip</span>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center space-x-1 text-[10px] text-gray-500 hover:text-cyan-400 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-3">
        {/* Flip Controls */}
        <div className="flex space-x-2">
          <button
            onClick={() => store.updateClipFlip(clip.id, { horizontal: !flip.horizontal })}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded border text-[11px] transition-colors ${
              flip.horizontal
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-freecut-panel border-freecut-border text-gray-400 hover:text-gray-200'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Flip Horizontal</span>
          </button>
          <button
            onClick={() => store.updateClipFlip(clip.id, { vertical: !flip.vertical })}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded border text-[11px] transition-colors ${
              flip.vertical
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-freecut-panel border-freecut-border text-gray-400 hover:text-gray-200'
            }`}
          >
            <FlipVertical className="w-3.5 h-3.5" />
            <span>Flip Vertical</span>
          </button>
        </div>

        {/* Crop Sliders */}
        <div className="space-y-2 pt-1 border-t border-freecut-border/50">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Left</span>
                <span className="font-mono text-cyan-400">{Math.round((crop.left || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round((crop.left || 0) * 100)}
                onChange={e => handleCropChange('left', Number(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Right</span>
                <span className="font-mono text-cyan-400">{Math.round((crop.right || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round((crop.right || 0) * 100)}
                onChange={e => handleCropChange('right', Number(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Top</span>
                <span className="font-mono text-cyan-400">{Math.round((crop.top || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round((crop.top || 0) * 100)}
                onChange={e => handleCropChange('top', Number(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                <span>Bottom</span>
                <span className="font-mono text-cyan-400">{Math.round((crop.bottom || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={Math.round((crop.bottom || 0) * 100)}
                onChange={e => handleCropChange('bottom', Number(e.target.value))}
                className="w-full accent-cyan-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
