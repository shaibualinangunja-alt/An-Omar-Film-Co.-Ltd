import React from 'react';
import { Type, Plus, Subtitles } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { TextStyle } from '../../text/types';

interface TextTemplate {
  id: string;
  name: string;
  category: 'title' | 'lowerThird' | 'stylized';
  previewText: string;
  previewBg: string;
  style: Partial<TextStyle>;
}

const TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: 'default-title',
    name: 'Default Title',
    category: 'title',
    previewText: 'Default Title',
    previewBg: 'from-gray-900 to-gray-800',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 48,
      fontWeight: 'bold',
      color: '#FFFFFF',
      textAlign: 'center',
    },
  },
  {
    id: 'cinematic-header',
    name: 'Cinematic Header',
    category: 'title',
    previewText: 'CINEMATIC',
    previewBg: 'from-blue-950 to-slate-900',
    style: {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 64,
      fontWeight: 'bold',
      color: '#E0F2FE',
      letterSpacing: 8,
      textAlign: 'center',
      shadow: { enabled: true, color: 'rgba(0,0,0,0.8)', blur: 16, offsetX: 2, offsetY: 2 },
    },
  },
  {
    id: 'lower-third',
    name: 'Modern Lower Third',
    category: 'lowerThird',
    previewText: 'Speaker Name // Role',
    previewBg: 'from-cyan-950 to-slate-900',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 32,
      fontWeight: '600',
      color: '#38BDF8',
      textAlign: 'left',
      background: { enabled: true, color: 'rgba(15, 23, 42, 0.75)', opacity: 0.8, padding: 12, borderRadius: 6 },
    },
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    category: 'stylized',
    previewText: 'NEON LIGHTS',
    previewBg: 'from-purple-950 to-pink-950',
    style: {
      fontFamily: 'Impact, sans-serif',
      fontSize: 52,
      fontWeight: 'bold',
      color: '#F472B6',
      stroke: { enabled: true, color: '#C084FC', width: 2 },
      shadow: { enabled: true, color: '#EC4899', blur: 24, offsetX: 0, offsetY: 0 },
      textAlign: 'center',
    },
  },
  {
    id: 'minimal-subtitle',
    name: 'Subtitle Callout',
    category: 'lowerThird',
    previewText: 'Subtle text comment',
    previewBg: 'from-zinc-900 to-black',
    style: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 26,
      fontWeight: 'normal',
      color: '#F3F4F6',
      textAlign: 'center',
      background: { enabled: true, color: 'rgba(0, 0, 0, 0.6)', opacity: 0.6, padding: 8, borderRadius: 4 },
    },
  },
];

export const TextBrowser: React.FC = () => {
  const store = useProjectStore()[1];

  const handleAddTemplate = (tpl: TextTemplate) => {
    store.addTextClip(undefined, undefined, tpl.previewText, tpl.style);
    store.setState({ statusMessage: `Added text: "${tpl.name}"` });
  };

  const handleAddCaption = () => {
    store.addCaptionItem();
    store.setState({ statusMessage: 'Added caption element at playhead' });
  };

  return (
    <div className="h-full flex flex-col bg-freecut-darker border-r border-freecut-border select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-purple-600/30 flex items-center justify-center text-purple-400">
            <Type className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">Text & Titles</h2>
            <p className="text-[10px] text-gray-500">Headers, lower thirds & captions</p>
          </div>
        </div>
      </div>

      {/* Quick Add Custom Text Button */}
      <div className="p-3 border-b border-freecut-border space-y-2">
        <button
          onClick={() => store.addTextClip()}
          className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-purple-950/40 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Default Text (T)</span>
        </button>

        <button
          onClick={handleAddCaption}
          className="w-full py-1.5 px-3 rounded-lg bg-freecut-panel hover:bg-freecut-elevated text-purple-300 hover:text-white border border-purple-500/30 flex items-center justify-center space-x-2 transition-colors"
        >
          <Subtitles className="w-3.5 h-3.5 text-purple-400" />
          <span>Add Caption Lane Item (C)</span>
        </button>
      </div>

      {/* Templates List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
          Text Templates
        </span>

        <div className="grid grid-cols-1 gap-2.5">
          {TEXT_TEMPLATES.map(tpl => (
            <div
              key={tpl.id}
              className="bg-freecut-panel border border-freecut-border hover:border-purple-500/50 rounded-lg p-2.5 flex items-center justify-between group transition-all"
            >
              <div className="flex items-center space-x-3 truncate">
                <div
                  className={`w-14 h-10 rounded bg-gradient-to-tr ${tpl.previewBg} border border-white/10 flex items-center justify-center text-center px-1 shrink-0 overflow-hidden`}
                >
                  <span
                    style={{
                      fontFamily: tpl.style.fontFamily,
                      color: tpl.style.color,
                      fontWeight: tpl.style.fontWeight,
                      fontSize: '9px',
                    }}
                    className="truncate"
                  >
                    Aa
                  </span>
                </div>

                <div className="truncate">
                  <h4 className="font-semibold text-gray-200 text-xs truncate group-hover:text-purple-300 transition-colors">
                    {tpl.name}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-mono truncate">
                    {tpl.style.fontFamily?.split(',')[0]} · {tpl.style.fontSize}px
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleAddTemplate(tpl)}
                className="p-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-md transition-all shrink-0 ml-2"
                title="Add to Timeline"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
