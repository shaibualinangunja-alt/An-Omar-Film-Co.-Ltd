import React, { useState } from 'react';
import { Sparkles, Search, Plus, Check, Layers, Camera, Sliders } from 'lucide-react';
import { EffectRegistry, MOTION_PRESETS, MotionPresetId } from '../../effects';
import { EffectType } from '../../effects/types';
import { useProjectStore } from '../../state/projectStore';

const EFFECT_VISUALS: Record<EffectType, { gradient: string; icon: string; previewFilter: string }> = {
  blur: {
    gradient: 'from-blue-600/40 via-indigo-600/30 to-purple-800/40',
    icon: '💧',
    previewFilter: 'blur(3px)',
  },
  brightness: {
    gradient: 'from-amber-500/40 via-yellow-500/30 to-orange-600/40',
    icon: '☀️',
    previewFilter: 'brightness(1.4)',
  },
  contrast: {
    gradient: 'from-gray-900 via-zinc-600 to-gray-200/40',
    icon: '🌗',
    previewFilter: 'contrast(1.6)',
  },
  saturation: {
    gradient: 'from-pink-500/40 via-rose-500/30 to-red-600/40',
    icon: '🎨',
    previewFilter: 'saturate(2)',
  },
  grayscale: {
    gradient: 'from-zinc-900 via-zinc-700 to-zinc-500',
    icon: '⬛',
    previewFilter: 'grayscale(1)',
  },
  sharpen: {
    gradient: 'from-cyan-600/40 via-teal-600/30 to-emerald-700/40',
    icon: '🗡️',
    previewFilter: 'contrast(1.2) brightness(1.1)',
  },
  vignette: {
    gradient: 'from-black via-zinc-800 to-black',
    icon: '⭕',
    previewFilter: 'none',
  },
  chromaKey: {
    gradient: 'from-emerald-600/40 via-green-500/30 to-teal-800/40',
    icon: '🟢',
    previewFilter: 'none',
  },
};

export const EffectsBrowser: React.FC = () => {
  const [state, store] = useProjectStore(s => ({
    selectedClipId: s.selectedClipId,
    project: s.project,
  }));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'motion' | 'blur' | 'color' | 'stylize'>('all');
  const [motionIntensity, setMotionIntensity] = useState<number>(1.0);
  const [feedbackEffect, setFeedbackEffect] = useState<string | null>(null);

  const selectedClip = state.project.clips.find(c => c.id === state.selectedClipId);
  const isVisualClip = selectedClip && (selectedClip.type === 'video' || selectedClip.type === 'image');
  const allEffects = EffectRegistry.listEffects();

  const filteredEffects = allEffects.filter(eff => {
    const matchesCat = selectedCategory === 'all' || eff.category === selectedCategory;
    const matchesSearch =
      eff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eff.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredMotion = MOTION_PRESETS.filter(mp => {
    const matchesCat = selectedCategory === 'all' || selectedCategory === 'motion';
    const matchesSearch =
      mp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleApplyEffect = (effectType: EffectType) => {
    if (!selectedClip) {
      store.setState({ statusMessage: 'Select a video or image clip on the timeline first to apply an effect.' });
      return;
    }
    if (!isVisualClip) {
      store.setState({ statusMessage: `Effects cannot be applied to ${selectedClip.type} clips.` });
      return;
    }

    store.addEffect(selectedClip.id, effectType);
    store.setState({ statusMessage: `Applied "${EffectRegistry.getEffect(effectType)?.name}" to ${selectedClip.name}` });
    setFeedbackEffect(effectType);
    setTimeout(() => setFeedbackEffect(null), 1500);
  };

  const handleApplyMotion = (presetId: MotionPresetId) => {
    if (!selectedClip) {
      store.setState({ statusMessage: 'Select a video or image clip on the timeline first to apply motion.' });
      return;
    }
    if (!isVisualClip) {
      store.setState({ statusMessage: `Camera motion can only be applied to visual clips.` });
      return;
    }

    store.applyMotionPreset(selectedClip.id, presetId, motionIntensity);
    setFeedbackEffect(presetId);
    setTimeout(() => setFeedbackEffect(null), 1500);
  };

  const handleDragStart = (e: React.DragEvent, effectType: EffectType) => {
    e.dataTransfer.setData('application/freecut-effect-type', effectType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleMotionDragStart = (e: React.DragEvent, presetId: MotionPresetId) => {
    e.dataTransfer.setData('application/freecut-motion-preset', presetId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col bg-freecut-darker border-r border-freecut-border select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-violet-600/30 flex items-center justify-center text-violet-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">Video Effects & Motion</h2>
            <p className="text-[10px] text-gray-500">Camera moves, filters & stylization</p>
          </div>
        </div>
        <span className="text-[10px] text-gray-500 bg-freecut-darkest px-2 py-0.5 rounded border border-freecut-border">
          {allEffects.length + MOTION_PRESETS.length} Available
        </span>
      </div>

      {/* Target Clip Hint */}
      <div className="px-3 py-2 bg-freecut-darkest/70 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-1.5 truncate">
          <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-[11px] text-gray-400 truncate">
            Target:{' '}
            {selectedClip ? (
              <span className={`font-semibold ${isVisualClip ? 'text-cyan-300' : 'text-amber-400'}`}>
                {selectedClip.name}
              </span>
            ) : (
              <span className="text-gray-500 italic">No clip selected</span>
            )}
          </span>
        </div>
        {!selectedClip && (
          <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800/40 px-1.5 py-0.5 rounded shrink-0">
            Select clip to add
          </span>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-freecut-border bg-freecut-darkest px-2 pt-1 gap-1 overflow-x-auto">
        {[
          { id: 'all', label: 'All' },
          { id: 'motion', label: 'Motion / Camera', icon: '🎥' },
          { id: 'blur', label: 'Blur' },
          { id: 'color', label: 'Color & Light' },
          { id: 'stylize', label: 'Stylize' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id as typeof selectedCategory)}
            className={`px-2.5 py-1 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap flex items-center space-x-1 ${
              selectedCategory === tab.id
                ? 'border-violet-400 text-violet-300 bg-freecut-panel/40'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Motion Intensity Slider when Motion is active */}
      {selectedCategory === 'motion' && (
        <div className="px-3 py-2 bg-freecut-panel/60 border-b border-freecut-border flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 text-gray-400">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium">Motion Intensity:</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={motionIntensity}
              onChange={e => setMotionIntensity(Number(e.target.value))}
              className="w-24 accent-cyan-400 h-1 bg-freecut-darkest rounded cursor-pointer"
            />
            <span className="font-mono text-cyan-300 text-[11px] w-9 text-right">
              {Math.round(motionIntensity * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-2 border-b border-freecut-border">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search effects & camera moves..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-freecut-darkest border border-freecut-border rounded px-2 pl-8 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4">
        {/* Motion & Camera Presets Section */}
        {(selectedCategory === 'all' || selectedCategory === 'motion') && filteredMotion.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-[11px] uppercase tracking-wider">
                <Camera className="w-3.5 h-3.5" />
                <span>Motion & Camera Presets</span>
              </div>
              <span className="text-[10px] text-gray-500">{filteredMotion.length} Presets</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {filteredMotion.map(mp => {
                const isJustApplied = feedbackEffect === mp.id;
                return (
                  <div
                    key={mp.id}
                    draggable
                    onDragStart={e => handleMotionDragStart(e, mp.id)}
                    className="group relative bg-freecut-panel border border-freecut-border hover:border-cyan-500/60 rounded-lg p-2.5 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:shadow-cyan-950/20"
                  >
                    {/* Visual Box */}
                    <div className="w-full aspect-[16/10] rounded bg-gradient-to-tr from-cyan-950/60 via-blue-900/40 to-indigo-950/50 border border-cyan-500/20 relative overflow-hidden flex flex-col items-center justify-center mb-2">
                      <div className="text-2xl select-none group-hover:scale-110 transition-transform">
                        {mp.icon}
                      </div>
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono text-cyan-300/80 bg-black/60 px-1 rounded uppercase">
                        {mp.category}
                      </span>
                    </div>

                    {/* Preset Info */}
                    <div className="space-y-0.5 mb-2">
                      <h3 className="font-semibold text-gray-200 text-xs truncate leading-tight group-hover:text-cyan-300 transition-colors">
                        {mp.name}
                      </h3>
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                        {mp.description}
                      </p>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => handleApplyMotion(mp.id)}
                      className={`w-full py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all ${
                        isJustApplied
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isVisualClip
                          ? 'bg-cyan-600/20 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-500/40 hover:border-cyan-500'
                          : 'bg-freecut-darkest text-gray-500 hover:text-gray-300 border border-freecut-border'
                      }`}
                      title={isVisualClip ? `Apply ${mp.name} to ${selectedClip?.name}` : 'Select a video clip to apply'}
                    >
                      {isJustApplied ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>Applied!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Apply Motion</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Visual Effects Section */}
        {selectedCategory !== 'motion' && filteredEffects.length > 0 && (
          <div className="space-y-2">
            {selectedCategory === 'all' && (
              <div className="flex items-center justify-between pt-2 border-t border-freecut-border/60">
                <div className="flex items-center space-x-1.5 text-violet-400 font-semibold text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Visual Filters</span>
                </div>
                <span className="text-[10px] text-gray-500">{filteredEffects.length} Filters</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {filteredEffects.map(eff => {
                const visual = EFFECT_VISUALS[eff.type] || {
                  gradient: 'from-violet-900/40 to-indigo-900/40',
                  icon: '✨',
                  previewFilter: 'none',
                };
                const isJustAdded = feedbackEffect === eff.type;
                const hasOnCurrentClip = selectedClip?.effects?.some(e => e.effectType === eff.type && e.enabled);

                return (
                  <div
                    key={eff.type}
                    draggable
                    onDragStart={e => handleDragStart(e, eff.type)}
                    className="group relative bg-freecut-panel border border-freecut-border hover:border-violet-500/60 rounded-lg p-2.5 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:shadow-violet-950/20"
                  >
                    {/* Visual Preview Box */}
                    <div
                      className={`w-full aspect-[16/10] rounded bg-gradient-to-tr ${visual.gradient} border border-white/5 relative overflow-hidden flex flex-col items-center justify-center mb-2`}
                    >
                      <div className="text-2xl select-none group-hover:scale-110 transition-transform">
                        {visual.icon}
                      </div>
                      <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />

                      {hasOnCurrentClip && (
                        <span className="absolute top-1 right-1 bg-violet-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Applied
                        </span>
                      )}
                    </div>

                    {/* Effect Info */}
                    <div className="space-y-0.5 mb-2">
                      <h3 className="font-semibold text-gray-200 text-xs truncate leading-tight group-hover:text-violet-300 transition-colors">
                        {eff.name}
                      </h3>
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                        {eff.description}
                      </p>
                    </div>

                    {/* Add Action Button */}
                    <button
                      onClick={() => handleApplyEffect(eff.type)}
                      className={`w-full py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all ${
                        isJustAdded
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isVisualClip
                          ? 'bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white border border-violet-500/40 hover:border-violet-500'
                          : 'bg-freecut-darkest text-gray-500 hover:text-gray-300 border border-freecut-border'
                      }`}
                      title={isVisualClip ? `Add ${eff.name} to ${selectedClip?.name}` : 'Select a video clip to add'}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>Add to Clip</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredEffects.length === 0 && filteredMotion.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">
            No effects or camera moves match "{searchQuery}"
          </div>
        )}

        {/* Pro Tip */}
        <div className="mt-4 p-2.5 rounded bg-freecut-darkest border border-freecut-border/60 text-[10px] text-gray-400 space-y-1">
          <div className="flex items-center space-x-1 text-cyan-400 font-semibold">
            <Camera className="w-3 h-3" />
            <span>Workflow Tip:</span>
          </div>
          <p>
            Click <strong className="text-gray-200">Apply Motion</strong> to animate the selected timeline clip, or <strong className="text-gray-200">drag & drop</strong> any motion preset directly onto a clip on the timeline.
          </p>
        </div>
      </div>
    </div>
  );
};
