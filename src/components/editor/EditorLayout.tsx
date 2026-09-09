import React from 'react';
import { 
  Film, 
  Music, 
  Type, 
  Subtitles, 
  Sparkles, 
  Layers,
  Shuffle, 
  Palette, 
  Wand2 
} from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { MediaLibrary } from '../media/MediaLibrary';
import { AudioBrowser } from '../audio/AudioBrowser';
import { TextBrowser } from '../text/TextBrowser';
import { CaptionsBrowser } from '../captions/CaptionsBrowser';
import { EffectsBrowser } from '../effects/EffectsBrowser';
import { OverlaysBrowser } from '../overlays/OverlaysBrowser';
import { TransitionsBrowser } from '../transitions/TransitionsBrowser';
import { ColorBrowser } from '../color/ColorBrowser';
import { AiBrowser } from '../ai/AiBrowser';
import { PreviewPanel } from '../preview/PreviewPanel';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { TimelinePanel } from '../timeline/TimelinePanel';

const NAV_TABS = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'captions', label: 'Captions', icon: Subtitles },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'overlays', label: 'Overlays', icon: Layers },
  { id: 'transitions', label: 'Transitions', icon: Shuffle },
  { id: 'color', label: 'Color', icon: Palette },
  { id: 'ai', label: 'AI Tools', icon: Wand2 },
] as const;

export const EditorLayout: React.FC = () => {
  const [activeTab, store] = useProjectStore(s => s.activeSidebarTab);

  const renderActiveBrowser = () => {
    switch (activeTab) {
      case 'media':
        return <MediaLibrary />;
      case 'audio':
        return <AudioBrowser />;
      case 'text':
        return <TextBrowser />;
      case 'captions':
        return <CaptionsBrowser />;
      case 'effects':
        return <EffectsBrowser />;
      case 'overlays':
        return <OverlaysBrowser />;
      case 'transitions':
        return <TransitionsBrowser />;
      case 'color':
        return <ColorBrowser />;
      case 'ai':
        return <AiBrowser />;
      default:
        return <MediaLibrary />;
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden select-none">
      {/* Top Workspace (Creative Nav Rail + Active Browser, Preview Monitor, Inspector) */}
      <div className="flex-1 flex overflow-hidden min-h-[300px]">
        {/* Left Side: Category Navigation Rail + Active Tool Browser */}
        <section aria-label="Tool Browser" className="w-80 lg:w-96 h-full shrink-0 flex">
          {/* Vertical Navigation Rail */}
          <nav 
            aria-label="Editor categories" 
            className="w-14 bg-freecut-darkest border-r border-freecut-border flex flex-col items-center py-2 space-y-1 shrink-0 z-10"
          >
            {NAV_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => store.setActiveSidebarTab(tab.id)}
                  title={`${tab.label} Browser`}
                  className={`w-12 py-2 flex flex-col items-center justify-center rounded-md transition-all group ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm shadow-cyan-950/50'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-freecut-panel/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <span className={`text-[9px] font-semibold tracking-tight ${isActive ? 'text-cyan-300' : 'text-gray-400'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Active Tool Content Panel */}
          <div className="flex-1 h-full flex flex-col overflow-hidden bg-freecut-darker">
            {renderActiveBrowser()}
          </div>
        </section>

        {/* Center Panel: Video Preview Monitor */}
        <section aria-label="Program Monitor" className="flex-1 h-full min-w-[360px] flex flex-col">
          <PreviewPanel />
        </section>

        {/* Right Panel: Inspector / Properties */}
        <section aria-label="Clip Inspector" className="w-72 lg:w-80 h-full shrink-0 flex flex-col">
          <InspectorPanel />
        </section>
      </div>

      {/* Bottom Panel: Multi-track Timeline */}
      <section aria-label="Timeline" className="h-64 lg:h-72 shrink-0 flex flex-col">
        <TimelinePanel />
      </section>
    </main>
  );
};
