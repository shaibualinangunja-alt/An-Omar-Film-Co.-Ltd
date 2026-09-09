import React, { useState } from 'react';
import { Palette, Check, Plus, SunMedium, Sliders, RotateCcw } from 'lucide-react';
import { QuickLooksRegistry } from '../../color/quickLooks';
import { DEFAULT_COLOR_GRADE } from '../../color/types';
import { useProjectStore } from '../../state/projectStore';

export const ColorBrowser: React.FC = () => {
  const [state, store] = useProjectStore(s => ({
    selectedClipId: s.selectedClipId,
    project: s.project,
  }));

  const [colorTab, setColorTab] = useState<'looks' | 'basic'>('looks');

  const selectedClip = state.project.clips.find(c => c.id === state.selectedClipId);
  const isVisualClip = selectedClip && (selectedClip.type === 'video' || selectedClip.type === 'image');
  const allLooks = QuickLooksRegistry.listLooks().filter(l => !l.name.includes('(Legacy)'));

  const grade = selectedClip?.colorGrade || DEFAULT_COLOR_GRADE;
  const currentLookId = grade.quickGrade?.lookId || 'none';
  const currentIntensity = grade.quickGrade?.intensity ?? 1.0;

  const handleApplyLook = (lookId: string) => {
    if (!selectedClip || !isVisualClip) {
      store.setState({ statusMessage: 'Select a video or image clip to apply a color look.' });
      return;
    }

    const look = QuickLooksRegistry.getLook(lookId as any);
    if (!look) return;

    store.applyQuickLook(selectedClip.id, look.id, currentIntensity);
    store.setState({ statusMessage: `Applied color look "${look.name}" to ${selectedClip.name}` });
  };

  const handleIntensityChange = (val: number) => {
    if (!selectedClip || !isVisualClip) return;
    store.applyQuickLook(selectedClip.id, currentLookId, val);
  };

  const handleBasicChange = (field: keyof typeof grade.basic, val: number) => {
    if (!selectedClip || !isVisualClip) return;
    store.updateClipBasicGrade(selectedClip.id, { [field]: val });
  };

  return (
    <div className="h-full flex flex-col bg-freecut-darker border-r border-freecut-border select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Palette className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">Color & Looks</h2>
            <p className="text-[10px] text-gray-500">Non-destructive grading & enhancement looks</p>
          </div>
        </div>

        {isVisualClip && (
          <button
            onClick={() => store.resetClipColor(selectedClip.id)}
            className="p-1 rounded text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
            title="Reset Clip Color Grading"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Target Info */}
      <div className="px-3 py-1.5 bg-freecut-darkest/70 border-b border-freecut-border flex items-center justify-between text-[11px] text-gray-400">
        <span>Target: {selectedClip ? <strong className="text-cyan-300">{selectedClip.name}</strong> : 'No clip selected'}</span>
        {!isVisualClip && <span className="text-[9px] text-amber-400">Select video/photo</span>}
      </div>

      {/* Sub-tabs: Looks vs Basic */}
      <div className="flex border-b border-freecut-border bg-freecut-darkest text-xs">
        <button
          onClick={() => setColorTab('looks')}
          className={`flex-1 py-1.5 font-medium border-b-2 transition-colors flex items-center justify-center space-x-1 ${
            colorTab === 'looks'
              ? 'border-amber-400 text-amber-300 bg-freecut-panel/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <SunMedium className="w-3 h-3" />
          <span>Looks & Presets</span>
        </button>
        <button
          onClick={() => setColorTab('basic')}
          className={`flex-1 py-1.5 font-medium border-b-2 transition-colors flex items-center justify-center space-x-1 ${
            colorTab === 'basic'
              ? 'border-amber-400 text-amber-300 bg-freecut-panel/50'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sliders className="w-3 h-3" />
          <span>Basic Controls</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {colorTab === 'looks' ? (
          <>
            {/* Look Intensity Slider (when a look is active) */}
            {currentLookId !== 'none' && isVisualClip && (
              <div className="p-2.5 bg-freecut-darkest rounded border border-amber-500/30 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-amber-300 font-semibold">Preset Intensity</span>
                  <span className="font-mono text-gray-200">{Math.round(currentIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={currentIntensity}
                  onChange={e => handleIntensityChange(Number(e.target.value))}
                  className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-gray-500">
                  <span>0% (Original)</span>
                  <span>50% (Subtle)</span>
                  <span>100% (Full)</span>
                </div>
              </div>
            )}

            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Enhancement Looks ({allLooks.length})
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {allLooks.map(look => {
                const isApplied = currentLookId === look.id;

                return (
                  <div
                    key={look.id}
                    onClick={() => handleApplyLook(look.id)}
                    className={`group relative bg-freecut-panel border rounded-lg p-2.5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg ${
                      isApplied
                        ? 'border-amber-400 ring-1 ring-amber-400/40'
                        : 'border-freecut-border hover:border-amber-400/50'
                    }`}
                  >
                    {/* Look Preview Gradient */}
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${look.previewColor}40, #09090b)`,
                        borderColor: `${look.previewColor}60`,
                      }}
                      className="w-full aspect-[16/10] rounded border relative overflow-hidden flex items-center justify-center mb-2"
                    >
                      <SunMedium className="w-5 h-5 text-gray-200 group-hover:scale-110 transition-transform" />
                      {isApplied && (
                        <span className="absolute top-1 right-1 bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 mb-2">
                      <h4 className="font-semibold text-gray-200 text-xs truncate group-hover:text-amber-300 transition-colors">
                        {look.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                        {look.description}
                      </p>
                    </div>

                    <button
                      className={`w-full py-1 rounded text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all ${
                        isApplied
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'bg-freecut-darkest hover:bg-amber-500 hover:text-black text-gray-300 border border-freecut-border'
                      }`}
                    >
                      {isApplied ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      <span>{isApplied ? 'Applied' : 'Apply'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Basic Adjustments Tab */
          <div className="space-y-3">
            {!isVisualClip ? (
              <div className="p-4 text-center text-gray-500 border border-dashed border-freecut-border rounded">
                Select a video or photo clip to adjust basic color parameters.
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Exposure */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Exposure</span>
                    <span className="font-mono text-gray-200">{grade.basic.exposure.toFixed(2)} EV</span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="4"
                    step="0.05"
                    value={grade.basic.exposure}
                    onChange={e => handleBasicChange('exposure', Number(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
                  />
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Brightness</span>
                    <span className="font-mono text-gray-200">{(grade.basic.brightness || 0).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.02"
                    value={grade.basic.brightness || 0}
                    onChange={e => handleBasicChange('brightness', Number(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Contrast</span>
                    <span className="font-mono text-gray-200">{grade.basic.contrast.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.02"
                    value={grade.basic.contrast}
                    onChange={e => handleBasicChange('contrast', Number(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Saturation</span>
                    <span className="font-mono text-gray-200">{Math.round(grade.basic.saturation * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.02"
                    value={grade.basic.saturation}
                    onChange={e => handleBasicChange('saturation', Number(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
                  />
                </div>

                {/* Temperature */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Temperature</span>
                    <span className="font-mono text-gray-200">{grade.basic.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={grade.basic.temperature}
                    onChange={e => handleBasicChange('temperature', Number(e.target.value))}
                    className="w-full accent-orange-400 h-1 bg-freecut-panel rounded cursor-pointer"
                  />
                </div>

                {/* Tint */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Tint</span>
                    <span className="font-mono text-gray-200">{grade.basic.tint}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={grade.basic.tint}
                    onChange={e => handleBasicChange('tint', Number(e.target.value))}
                    className="w-full accent-fuchsia-400 h-1 bg-freecut-panel rounded cursor-pointer"
                  />
                </div>

                {/* Highlights / Shadows */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Highlights</span>
                      <span className="font-mono">{grade.basic.highlights.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={grade.basic.highlights}
                      onChange={e => handleBasicChange('highlights', Number(e.target.value))}
                      className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Shadows</span>
                      <span className="font-mono">{grade.basic.shadows.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={grade.basic.shadows}
                      onChange={e => handleBasicChange('shadows', Number(e.target.value))}
                      className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Whites / Blacks */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Whites</span>
                      <span className="font-mono">{grade.basic.whites.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={grade.basic.whites}
                      onChange={e => handleBasicChange('whites', Number(e.target.value))}
                      className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Blacks</span>
                      <span className="font-mono">{grade.basic.blacks.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.05"
                      value={grade.basic.blacks}
                      onChange={e => handleBasicChange('blacks', Number(e.target.value))}
                      className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
