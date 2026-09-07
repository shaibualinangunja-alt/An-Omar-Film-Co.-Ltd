import React from 'react';
import { 
  Subtitles, 
  Trash2, 
  Copy, 
  Clock, 
  Palette, 
  Type 
} from 'lucide-react';
import { CaptionItem } from '../../captions';
import { useProjectStoreActions } from '../../state/projectStore';
import { FontRegistry } from '../../text/fontRegistry';

interface CaptionInspectorProps {
  trackId: string;
  caption: CaptionItem;
}

export const CaptionInspector: React.FC<CaptionInspectorProps> = ({ trackId, caption }) => {
  const store = useProjectStoreActions();
  const fonts = FontRegistry.getAvailableFonts();
  const style = caption.style || {};

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    store.updateCaptionItem(trackId, caption.id, { text: e.target.value });
  };

  const handleStartTimeChange = (val: number) => {
    store.updateCaptionItem(trackId, caption.id, { startTime: Math.max(0, val) });
  };

  const handleEndTimeChange = (val: number) => {
    store.updateCaptionItem(trackId, caption.id, { endTime: Math.max(caption.startTime + 0.1, val) });
  };

  const updateStyle = (styleUpdates: Parameters<typeof store.updateCaptionItem>[2]['style']) => {
    store.updateCaptionItem(trackId, caption.id, {
      style: {
        ...(caption.style || {}),
        ...styleUpdates,
      },
    });
  };

  const duration = Math.max(0.1, caption.endTime - caption.startTime);

  return (
    <div className="h-full bg-freecut-darker border-l border-freecut-border flex flex-col select-none overflow-y-auto text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between bg-freecut-panel/50">
        <div className="flex items-center space-x-2 truncate">
          <Subtitles className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-bold text-gray-200 truncate">Caption Item</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => store.duplicateCaptionItem(trackId, caption.id)}
            className="p-1 rounded text-gray-400 hover:bg-freecut-panel hover:text-gray-200 transition-colors"
            title="Duplicate Caption"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => store.deleteCaptionItem(trackId, caption.id)}
            className="p-1 rounded text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
            title="Delete Caption"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* 1. Caption Text Content */}
        <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Type className="w-3.5 h-3.5 text-blue-400" />
            <span>Caption Text</span>
          </label>
          <textarea
            value={caption.text}
            onChange={handleTextChange}
            placeholder="Type subtitle caption..."
            rows={3}
            className="w-full bg-freecut-panel border border-freecut-border rounded p-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
          />
        </div>

        {/* 2. Timing Controls */}
        <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-3">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Timing</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400">Start Time (s)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={caption.startTime.toFixed(2)}
                onChange={e => handleStartTimeChange(Number(e.target.value))}
                className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400">End Time (s)</label>
              <input
                type="number"
                step="0.1"
                min={caption.startTime + 0.1}
                value={caption.endTime.toFixed(2)}
                onChange={e => handleEndTimeChange(Number(e.target.value))}
                className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1 border-t border-freecut-border/40">
            <span>Duration</span>
            <span className="font-mono text-blue-400 font-semibold">{duration.toFixed(2)}s</span>
          </div>
        </div>

        {/* 3. Caption Typography & Styling */}
        <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-3">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Palette className="w-3.5 h-3.5 text-blue-400" />
            <span>Caption Style</span>
          </div>

          {/* Font Family */}
          <div className="space-y-1">
            <label className="text-[10px] text-gray-400">Font Family</label>
            <select
              value={style.fontFamily || 'Inter'}
              onChange={e => updateStyle({ fontFamily: e.target.value })}
              className="w-full bg-freecut-panel border border-freecut-border rounded px-2.5 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-blue-400"
            >
              {fonts.map(f => (
                <option key={f.family} value={f.family}>
                  {f.family} ({f.category})
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-gray-400">
              <span>Font Size</span>
              <span className="font-mono text-blue-400">{style.fontSize || 32}px</span>
            </div>
            <input
              type="range"
              min="16"
              max="72"
              value={style.fontSize || 32}
              onChange={e => updateStyle({ fontSize: Number(e.target.value) })}
              className="w-full accent-blue-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Text Color */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-gray-400">Text Color</span>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={style.color || '#FFFFFF'}
                onChange={e => updateStyle({ color: e.target.value })}
                className="w-6 h-6 rounded border border-freecut-border cursor-pointer bg-transparent"
              />
              <span className="font-mono text-[10px] text-gray-300 uppercase">{style.color || '#FFFFFF'}</span>
            </div>
          </div>

          {/* Outline / Stroke */}
          <div className="space-y-1 pt-1 border-t border-freecut-border/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Outline Stroke</span>
              <input
                type="checkbox"
                checked={style.stroke?.enabled !== false}
                onChange={e => updateStyle({
                  stroke: {
                    enabled: e.target.checked,
                    color: style.stroke?.color || '#000000',
                    width: style.stroke?.width || 3,
                  }
                })}
                className="rounded accent-blue-500 cursor-pointer"
              />
            </div>
            {style.stroke?.enabled !== false && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">Stroke Width</span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={style.stroke?.width || 3}
                  onChange={e => updateStyle({
                    stroke: {
                      enabled: true,
                      color: style.stroke?.color || '#000000',
                      width: Number(e.target.value),
                    }
                  })}
                  className="w-24 accent-blue-400 h-1 bg-freecut-panel rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Background Box */}
          <div className="space-y-1 pt-1 border-t border-freecut-border/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Background Box</span>
              <input
                type="checkbox"
                checked={style.background?.enabled !== false}
                onChange={e => updateStyle({
                  background: {
                    enabled: e.target.checked,
                    color: style.background?.color || '#000000',
                    opacity: style.background?.opacity ?? 0.6,
                    padding: style.background?.padding || 8,
                    borderRadius: style.background?.borderRadius || 4,
                  }
                })}
                className="rounded accent-blue-500 cursor-pointer"
              />
            </div>
            {style.background?.enabled !== false && (
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">Box Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={style.background?.opacity ?? 0.6}
                  onChange={e => updateStyle({
                    background: {
                      enabled: true,
                      color: style.background?.color || '#000000',
                      opacity: Number(e.target.value),
                      padding: style.background?.padding || 8,
                      borderRadius: style.background?.borderRadius || 4,
                    }
                  })}
                  className="w-24 accent-blue-400 h-1 bg-freecut-panel rounded cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
