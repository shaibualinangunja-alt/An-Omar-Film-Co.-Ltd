import React, { useState } from 'react';
import { Layers, Search, Plus, Check, Sparkles } from 'lucide-react';
import { OVERLAY_PRESETS, OverlayCategory } from '../../compositing';
import { useProjectStore } from '../../state/projectStore';

const CATEGORY_TABS: { id: 'all' | OverlayCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'weather', label: 'Weather', icon: '❄️' },
  { id: 'fire', label: 'Fire & Atmosphere', icon: '🔥' },
  { id: 'love', label: 'Love / Emotion', icon: '💖' },
  { id: 'light', label: 'Light', icon: '🌅' },
  { id: 'cinematic', label: 'Cinematic', icon: '🎞️' },
  { id: 'celebration', label: 'Celebration', icon: '🎉' },
];

export const OverlaysBrowser: React.FC = () => {
  const [, store] = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | OverlayCategory>('all');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const filteredPresets = OVERLAY_PRESETS.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddOverlay = (overlayId: string) => {
    store.addOverlayToTimeline(overlayId);
    setJustAddedId(overlayId);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  const handleDragStart = (e: React.DragEvent, overlayId: string) => {
    e.dataTransfer.setData('application/freecut-overlay-id', overlayId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col bg-freecut-darker border-r border-freecut-border select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-amber-600/30 flex items-center justify-center text-amber-400">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">Creative Overlays</h2>
            <p className="text-[10px] text-gray-500">Atmosphere, particles & lighting layers</p>
          </div>
        </div>
        <span className="text-[10px] text-gray-500 bg-freecut-darkest px-2 py-0.5 rounded border border-freecut-border">
          {OVERLAY_PRESETS.length} Available
        </span>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-freecut-border bg-freecut-darkest px-2 pt-1 gap-1 overflow-x-auto">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-2.5 py-1 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap flex items-center space-x-1 ${
              selectedCategory === tab.id
                ? 'border-amber-400 text-amber-300 bg-freecut-panel/40'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-freecut-border">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search overlays (rain, fire, grain, flare...)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-freecut-darkest border border-freecut-border rounded px-2 pl-8 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Overlays Grid */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          {filteredPresets.map(preset => {
            const isJustAdded = justAddedId === preset.id;
            return (
              <div
                key={preset.id}
                draggable
                onDragStart={e => handleDragStart(e, preset.id)}
                className="group relative bg-freecut-panel border border-freecut-border hover:border-amber-500/60 rounded-lg p-2.5 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:shadow-amber-950/20"
              >
                {/* Visual Preview Box */}
                <div className="w-full aspect-[16/10] rounded bg-gradient-to-tr from-amber-950/40 via-zinc-900 to-black border border-amber-500/20 relative overflow-hidden flex flex-col items-center justify-center mb-2">
                  <div className="text-3xl select-none group-hover:scale-110 transition-transform">
                    {preset.icon}
                  </div>
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono text-amber-300/80 bg-black/70 px-1 rounded uppercase">
                    {preset.defaultBlendMode}
                  </span>
                </div>

                {/* Info */}
                <div className="space-y-0.5 mb-2">
                  <h3 className="font-semibold text-gray-200 text-xs truncate leading-tight group-hover:text-amber-300 transition-colors">
                    {preset.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                    {preset.description}
                  </p>
                </div>

                {/* Add to Timeline Button */}
                <button
                  onClick={() => handleAddOverlay(preset.id)}
                  className={`w-full py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all ${
                    isJustAdded
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-amber-600/20 hover:bg-amber-600 text-amber-200 hover:text-white border border-amber-500/40 hover:border-amber-500'
                  }`}
                  title={`Add ${preset.name} layer to timeline`}
                >
                  {isJustAdded ? (
                    <>
                      <Check className="w-3 h-3 text-white" />
                      <span>Added Layer!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Add to Timeline</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {filteredPresets.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">
            No overlays match "{searchQuery}"
          </div>
        )}

        {/* Workflow Guidance */}
        <div className="mt-4 p-2.5 rounded bg-freecut-darkest border border-freecut-border/60 text-[10px] text-gray-400 space-y-1">
          <div className="flex items-center space-x-1 text-amber-400 font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>Timeline Layer System:</span>
          </div>
          <p>
            Adding an overlay creates a real layer on <strong className="text-gray-200">V2 / V3</strong> above your main video. You can trim, move, duplicate, split, animate, and adjust opacity or blend modes non-destructively.
          </p>
        </div>
      </div>
    </div>
  );
};
