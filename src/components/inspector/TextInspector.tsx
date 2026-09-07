import React, { useState } from 'react';
import { 
  Type, 
  Palette, 
  Sparkles, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Play
} from 'lucide-react';
import { ClipItem } from '../../types/project';
import { useProjectStoreActions } from '../../state/projectStore';
import { FontRegistry } from '../../text/fontRegistry';
import { TextAnimationType } from '../../text/types';
import { TEXT_ANIMATION_PRESETS } from '../../text/animationPresets';

interface TextInspectorProps {
  clip: ClipItem;
}

export const TextInspector: React.FC<TextInspectorProps> = ({ clip }) => {
  const store = useProjectStoreActions();
  const [presetDuration, setPresetDuration] = useState<number>(0.5);

  const textConfig = clip.textConfig;
  if (!textConfig) return null;

  const style = textConfig.style;
  const fonts = FontRegistry.getAvailableFonts();

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    store.updateTextConfig(clip.id, { content: e.target.value });
  };

  const updateStyle = (updates: Parameters<typeof store.updateTextConfig>[1]) => {
    store.updateTextConfig(clip.id, updates);
  };

  const handleApplyPreset = (presetType: TextAnimationType) => {
    store.applyTextAnimationPreset(clip.id, presetType, presetDuration);
  };

  return (
    <div className="space-y-4">
      {/* 1. Text Content Editor */}
      <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2">
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <Type className="w-3.5 h-3.5 text-purple-400" />
            <span>Text Content</span>
          </span>
        </label>
        <textarea
          value={textConfig.content}
          onChange={handleContentChange}
          placeholder="Type something..."
          rows={3}
          className="w-full bg-freecut-panel border border-freecut-border rounded p-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none font-sans"
        />
      </div>

      {/* 2. Typography & Font Styling */}
      <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-3">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          <span>Typography</span>
        </div>

        {/* Font Family */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-400">Font Family</label>
          <select
            value={style.fontFamily}
            onChange={e => updateStyle(prev => ({ ...prev, style: { ...prev.style, fontFamily: e.target.value } }))}
            className="w-full bg-freecut-panel border border-freecut-border rounded px-2.5 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-purple-400"
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
            <span className="font-mono text-purple-400">{style.fontSize}px</span>
          </div>
          <input
            type="range"
            min="12"
            max="180"
            value={style.fontSize}
            onChange={e => updateStyle(prev => ({ ...prev, style: { ...prev.style, fontSize: Number(e.target.value) } }))}
            className="w-full accent-purple-400 h-1 bg-freecut-panel rounded cursor-pointer"
          />
        </div>

        {/* Weight, Style, and Alignment Controls */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Weight & Style */}
          <div className="flex items-center space-x-1 bg-freecut-panel p-1 rounded border border-freecut-border">
            <button
              onClick={() => updateStyle(prev => ({
                ...prev,
                style: { ...prev.style, fontWeight: prev.style.fontWeight === 'bold' ? 'normal' : 'bold' }
              }))}
              title="Bold"
              className={`flex-1 p-1 rounded flex items-center justify-center transition-colors ${
                style.fontWeight === 'bold' || style.fontWeight === '700' || style.fontWeight === '900'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateStyle(prev => ({
                ...prev,
                style: { ...prev.style, fontStyle: prev.style.fontStyle === 'italic' ? 'normal' : 'italic' }
              }))}
              title="Italic"
              className={`flex-1 p-1 rounded flex items-center justify-center transition-colors ${
                style.fontStyle === 'italic'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center space-x-1 bg-freecut-panel p-1 rounded border border-freecut-border">
            <button
              onClick={() => updateStyle(prev => ({ ...prev, style: { ...prev.style, alignment: 'left' } }))}
              title="Align Left"
              className={`flex-1 p-1 rounded flex items-center justify-center transition-colors ${
                style.alignment === 'left' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateStyle(prev => ({ ...prev, style: { ...prev.style, alignment: 'center' } }))}
              title="Align Center"
              className={`flex-1 p-1 rounded flex items-center justify-center transition-colors ${
                style.alignment === 'center' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateStyle(prev => ({ ...prev, style: { ...prev.style, alignment: 'right' } }))}
              title="Align Right"
              className={`flex-1 p-1 rounded flex items-center justify-center transition-colors ${
                style.alignment === 'right' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Color Picker */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-gray-400">Text Color</span>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={style.color}
              onChange={e => updateStyle(prev => ({ ...prev, style: { ...prev.style, color: e.target.value } }))}
              className="w-6 h-6 rounded border border-freecut-border cursor-pointer bg-transparent"
            />
            <span className="font-mono text-[10px] text-gray-300 uppercase">{style.color}</span>
          </div>
        </div>

        {/* Letter Spacing */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>Letter Spacing</span>
            <span className="font-mono text-purple-400">{style.letterSpacing}px</span>
          </div>
          <input
            type="range"
            min="-5"
            max="30"
            value={style.letterSpacing}
            onChange={e => updateStyle(prev => ({ ...prev, style: { ...prev.style, letterSpacing: Number(e.target.value) } }))}
            className="w-full accent-purple-400 h-1 bg-freecut-panel rounded cursor-pointer"
          />
        </div>
      </div>

      {/* 3. Stroke Section */}
      <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Outline / Stroke</span>
          <input
            type="checkbox"
            checked={!!style.stroke?.enabled}
            onChange={e => updateStyle(prev => ({
              ...prev,
              style: {
                ...prev.style,
                stroke: { ...prev.style.stroke, enabled: e.target.checked }
              }
            }))}
            className="rounded accent-purple-500 cursor-pointer"
          />
        </div>
        {style.stroke?.enabled && (
          <div className="space-y-2 pt-1 border-t border-freecut-border/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Stroke Color</span>
              <input
                type="color"
                value={style.stroke.color}
                onChange={e => updateStyle(prev => ({
                  ...prev,
                  style: {
                    ...prev.style,
                    stroke: { ...prev.style.stroke, color: e.target.value }
                  }
                }))}
                className="w-5 h-5 rounded border border-freecut-border cursor-pointer bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Stroke Width</span>
                <span className="font-mono text-purple-400">{style.stroke.width}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={style.stroke.width}
                onChange={e => updateStyle(prev => ({
                  ...prev,
                  style: {
                    ...prev.style,
                    stroke: { ...prev.style.stroke, width: Number(e.target.value) }
                  }
                }))}
                className="w-full accent-purple-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Shadow Section */}
      <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Drop Shadow</span>
          <input
            type="checkbox"
            checked={!!style.shadow?.enabled}
            onChange={e => updateStyle(prev => ({
              ...prev,
              style: {
                ...prev.style,
                shadow: { ...prev.style.shadow, enabled: e.target.checked }
              }
            }))}
            className="rounded accent-purple-500 cursor-pointer"
          />
        </div>
        {style.shadow?.enabled && (
          <div className="space-y-2 pt-1 border-t border-freecut-border/50">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Blur</span>
                <span className="font-mono text-purple-400">{style.shadow.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={style.shadow.blur}
                onChange={e => updateStyle(prev => ({
                  ...prev,
                  style: {
                    ...prev.style,
                    shadow: { ...prev.style.shadow, blur: Number(e.target.value) }
                  }
                }))}
                className="w-full accent-purple-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Background Box Section */}
      <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Background Box</span>
          <input
            type="checkbox"
            checked={!!style.background?.enabled}
            onChange={e => updateStyle(prev => ({
              ...prev,
              style: {
                ...prev.style,
                background: { ...prev.style.background, enabled: e.target.checked }
              }
            }))}
            className="rounded accent-purple-500 cursor-pointer"
          />
        </div>
        {style.background?.enabled && (
          <div className="space-y-2 pt-1 border-t border-freecut-border/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Color</span>
              <input
                type="color"
                value={style.background.color}
                onChange={e => updateStyle(prev => ({
                  ...prev,
                  style: {
                    ...prev.style,
                    background: { ...prev.style.background, color: e.target.value }
                  }
                }))}
                className="w-5 h-5 rounded border border-freecut-border cursor-pointer bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Opacity</span>
                <span className="font-mono text-purple-400">{Math.round((style.background.opacity || 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={style.background.opacity ?? 0.8}
                onChange={e => updateStyle(prev => ({
                  ...prev,
                  style: {
                    ...prev.style,
                    background: { ...prev.style.background, opacity: Number(e.target.value) }
                  }
                }))}
                className="w-full accent-purple-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Padding</span>
                <span className="font-mono text-purple-400">{style.background.padding}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={style.background.padding}
                onChange={e => updateStyle(prev => ({
                  ...prev,
                  style: {
                    ...prev.style,
                    background: { ...prev.style.background, padding: Number(e.target.value) }
                  }
                }))}
                className="w-full accent-purple-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* 6. Animation Presets Section */}
      <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-3">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Animation Presets</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] text-gray-400">
            <span>Preset Duration</span>
            <span className="font-mono text-amber-400">{presetDuration.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min="0.2"
            max={Math.min(2.5, clip.duration / 2)}
            step="0.05"
            value={presetDuration}
            onChange={e => setPresetDuration(Number(e.target.value))}
            className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
          />
        </div>

        {/* Entrance Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-gray-400 font-semibold">Entrance</span>
          <div className="grid grid-cols-2 gap-1.5">
            {TEXT_ANIMATION_PRESETS.filter(p => p.category === 'entrance' && p.type !== 'none').map(preset => (
              <button
                key={preset.name}
                onClick={() => handleApplyPreset(preset.type)}
                className="px-2 py-1 bg-freecut-panel hover:bg-freecut-elevated border border-freecut-border rounded text-[11px] text-gray-300 hover:text-amber-300 text-left transition-colors flex items-center justify-between"
              >
                <span>{preset.name}</span>
                <Play className="w-2.5 h-2.5 opacity-50" />
              </button>
            ))}
          </div>
        </div>

        {/* Exit Presets */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] text-gray-400 font-semibold">Exit</span>
          <div className="grid grid-cols-2 gap-1.5">
            {TEXT_ANIMATION_PRESETS.filter(p => p.category === 'exit').map(preset => (
              <button
                key={preset.name}
                onClick={() => handleApplyPreset(preset.type)}
                className="px-2 py-1 bg-freecut-panel hover:bg-freecut-elevated border border-freecut-border rounded text-[11px] text-gray-300 hover:text-amber-300 text-left transition-colors flex items-center justify-between"
              >
                <span>{preset.name}</span>
                <Play className="w-2.5 h-2.5 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
