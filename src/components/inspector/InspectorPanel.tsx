import React, { useState } from 'react';
import { 
  Sliders, 
  Move, 
  Maximize2, 
  RotateCw, 
  Eye, 
  Film, 
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Shuffle
} from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { formatTimecode } from '../../utils/timecode';
import { snapToFrame } from '../../utils/timelineMath';
import { 
  AnimatableProperty, 
  evaluateClipAnimations, 
  findKeyframeAtTime, 
  findNearestKeyframeTimes 
} from '../../animation';
import { EffectRegistry, evaluateEffectParameters, EffectType } from '../../effects';
import { TransitionRegistry, TransitionType } from '../../transitions';
import { TextInspector } from './TextInspector';
import { CaptionInspector } from './CaptionInspector';
import { BlendModeSelector } from './BlendModeSelector';
import { CropFlipInspector } from './CropFlipInspector';
import { ChromaKeyInspector } from './ChromaKeyInspector';
import { MaskInspector } from './MaskInspector';
import { TrackingInspector } from './TrackingInspector';
import { ColorInspector } from './ColorInspector';
import { AudioInspector } from './AudioInspector';

export const InspectorPanel: React.FC = () => {
  const [state, store] = useProjectStore();
  const [selectedEffectToAdd, setSelectedEffectToAdd] = useState<EffectType>('blur');

  const selectedClip = state.project.clips.find(c => c.id === state.selectedClipId);
  const selectedTransition = state.project.transitions?.find(t => t.id === state.selectedTransitionId);
  const media = selectedClip ? state.project.media.find(m => m.id === selectedClip.mediaId) : null;
  const track = selectedClip ? state.project.tracks.find(t => t.id === selectedClip.trackId) : null;

  const fps = state.project.project.fps || 30;

  // Render Transition Inspector if a transition is selected
  if (selectedTransition && !selectedClip) {
    const fromClip = state.project.clips.find(c => c.id === selectedTransition.fromClipId);
    const toClip = state.project.clips.find(c => c.id === selectedTransition.toClipId);
    const allTransitions = TransitionRegistry.listTransitions();

    return (
      <div className="h-full bg-freecut-darker border-l border-freecut-border flex flex-col select-none overflow-y-auto text-xs">
        <div className="p-3 border-b border-freecut-border flex items-center justify-between bg-freecut-panel/50">
          <div className="flex items-center space-x-2 truncate">
            <Shuffle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold text-gray-200 truncate">Transition</span>
          </div>
          <button
            onClick={() => store.removeTransition(selectedTransition.id)}
            className="p-1 rounded text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
            title="Remove Transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3 space-y-4">
          {/* Transition Type */}
          <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2">
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
              Transition Type
            </label>
            <select
              value={selectedTransition.type}
              onChange={e => {
                store.addTransition(
                  e.target.value as TransitionType,
                  selectedTransition.fromClipId,
                  selectedTransition.toClipId,
                  selectedTransition.duration
                );
              }}
              className="w-full bg-freecut-panel border border-freecut-border rounded px-2.5 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-amber-400"
            >
              {allTransitions.map(tr => (
                <option key={tr.type} value={tr.type}>
                  {tr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2">
            <div className="flex justify-between items-center text-[11px] text-gray-400">
              <span className="font-semibold uppercase tracking-wider">Duration</span>
              <span className="font-mono text-amber-400">{selectedTransition.duration.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="4.0"
              step="0.05"
              value={selectedTransition.duration}
              onChange={e => store.updateTransitionDuration(selectedTransition.id, Number(e.target.value))}
              className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Connected Clips */}
          <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-2 text-[11px]">
            <span className="text-gray-400 font-semibold uppercase tracking-wider block">Connection</span>
            <div className="flex justify-between">
              <span className="text-gray-500">From Clip:</span>
              <span className="text-gray-300 font-medium truncate max-w-[140px]">{fromClip?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">To Clip:</span>
              <span className="text-gray-300 font-medium truncate max-w-[140px]">{toClip?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-gray-500">Enabled:</span>
              <input
                type="checkbox"
                checked={selectedTransition.enabled}
                onChange={() => store.toggleTransitionEnabled(selectedTransition.id)}
                className="accent-amber-400"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Caption Inspector if a caption is selected
  if (state.selectedCaptionId && state.selectedCaptionTrackId && !selectedClip) {
    const capTrack = state.project.captionTracks?.find(t => t.id === state.selectedCaptionTrackId);
    const captionItem = capTrack?.items.find(i => i.id === state.selectedCaptionId);
    if (captionItem) {
      return <CaptionInspector trackId={state.selectedCaptionTrackId} caption={captionItem} />;
    }
  }

  if (!selectedClip) {
    return (
      <div className="h-full bg-freecut-darker border-l border-freecut-border p-4 flex flex-col items-center justify-center text-center select-none">
        <div className="w-12 h-12 rounded-full bg-freecut-panel flex items-center justify-center text-cyan-400 mb-3 border border-freecut-border shadow-md">
          <Sliders className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-bold text-gray-200 mb-1.5 uppercase tracking-wider">Inspector</h3>
        <p className="text-[11px] text-gray-400 max-w-[200px] leading-relaxed">
          Select a clip, text, caption, transition or effect to edit it.
        </p>
      </div>
    );
  }

  const relativeTime = snapToFrame(
    Math.max(0, Math.min(selectedClip.duration, state.currentTime - selectedClip.startTime)),
    fps
  );
  const evalState = evaluateClipAnimations(selectedClip, relativeTime);

  const hasKeyframes = (prop: AnimatableProperty) =>
    (selectedClip.animations?.[prop]?.keyframes?.length ?? 0) > 0;

  const isKeyframeAtPlayhead = (prop: AnimatableProperty) =>
    !!findKeyframeAtTime(selectedClip.animations?.[prop], relativeTime, fps);

  const getNearest = (prop: AnimatableProperty) =>
    findNearestKeyframeTimes(selectedClip, relativeTime, fps, prop);

  const handleTransformChange = (field: 'positionX' | 'positionY' | 'scale' | 'rotation' | 'opacity', value: number) => {
    store.updateClipTransform(selectedClip.id, { [field]: value });
  };

  const renderKeyframeControl = (property: AnimatableProperty) => {
    const isKeyframed = hasKeyframes(property);
    const activeAtPlayhead = isKeyframeAtPlayhead(property);
    const { prev, next } = getNearest(property);

    return (
      <div className="flex items-center space-x-0.5 shrink-0 ml-1.5">
        <button
          onClick={() => store.jumpToPrevKeyframe(selectedClip.id, property)}
          disabled={prev === null}
          title="Jump to Previous Keyframe"
          className="p-1 rounded text-gray-500 hover:text-cyan-400 disabled:opacity-20 disabled:hover:text-gray-500 transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <button
          onClick={() => store.toggleKeyframe(selectedClip.id, property)}
          title={
            activeAtPlayhead
              ? `Remove ${property} keyframe at ${relativeTime.toFixed(2)}s`
              : `Add ${property} keyframe at ${relativeTime.toFixed(2)}s`
          }
          className={`p-1 rounded transition-all ${
            activeAtPlayhead
              ? 'text-amber-400 bg-amber-400/20 ring-1 ring-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.35)]'
              : isKeyframed
              ? 'text-gray-300 hover:text-amber-400 hover:bg-white/5'
              : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
          }`}
        >
          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
            <polygon points="12,2 22,12 12,22 2,12" />
          </svg>
        </button>
        <button
          onClick={() => store.jumpToNextKeyframe(selectedClip.id, property)}
          disabled={next === null}
          title="Jump to Next Keyframe"
          className="p-1 rounded text-gray-500 hover:text-cyan-400 disabled:opacity-20 disabled:hover:text-gray-500 transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div className="h-full bg-freecut-darker border-l border-freecut-border flex flex-col select-none overflow-y-auto text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between bg-freecut-panel/50">
        <div className="flex items-center space-x-2 truncate">
          {selectedClip.type === 'text' ? (
            <span className="p-1 rounded bg-purple-600/30 text-purple-300">
              <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            </span>
          ) : (
            <Film className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span className="font-bold text-gray-200 truncate">{selectedClip.name}</span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-semibold ${
          selectedClip.type === 'text'
            ? 'bg-purple-950 text-purple-400 border-purple-800/50'
            : 'bg-cyan-950 text-cyan-400 border-cyan-800/50'
        }`}>
          {selectedClip.type}
        </span>
      </div>

      <div className="p-3 space-y-5">
        {/* Clip Metadata Section */}
        <section className="space-y-2">
          <div className="flex items-center space-x-1.5 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Clip Info</span>
          </div>
          <div className="bg-freecut-darkest p-2.5 rounded border border-freecut-border space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Track:</span>
              <span className="text-gray-300 font-medium">{track?.name || selectedClip.trackId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Timeline In:</span>
              <span className="text-amber-400 font-mono">
                {formatTimecode(selectedClip.startTime, state.project.project.fps)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Duration:</span>
              <span className="text-gray-300 font-mono">
                {formatTimecode(selectedClip.duration, state.project.project.fps)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Playhead Offset:</span>
              <span className="text-cyan-400 font-mono">
                {relativeTime.toFixed(2)}s
              </span>
            </div>
            {media?.width && (
              <div className="flex justify-between">
                <span className="text-gray-500">Source Res:</span>
                <span className="text-gray-300">{media.width}×{media.height}</span>
              </div>
            )}
          </div>
        </section>

        {/* Text Engine Inspector */}
        {selectedClip.type === 'text' && (
          <TextInspector clip={selectedClip} />
        )}

        {/* Video / Visual Transform Controls */}
        {(selectedClip.type === 'video' || selectedClip.type === 'image' || selectedClip.type === 'text') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
              <div className="flex items-center space-x-1.5">
                <Move className="w-3.5 h-3.5 text-cyan-400" />
                <span>Transform</span>
              </div>
              <button
                onClick={() =>
                  store.updateClipTransform(selectedClip.id, {
                    positionX: 0,
                    positionY: 0,
                    scale: 1,
                    rotation: 0,
                    opacity: 1,
                  })
                }
                className="text-[10px] text-gray-500 hover:text-cyan-400"
              >
                Reset
              </button>
            </div>

            <div className="space-y-3.5 bg-freecut-darkest p-3 rounded border border-freecut-border">
              {/* Position X */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span>Position X</span>
                  {renderKeyframeControl('positionX')}
                </div>
                <div className="flex items-center bg-freecut-panel border border-freecut-border rounded px-2 py-1">
                  <span className="text-[10px] text-gray-500 mr-1.5 font-bold">X</span>
                  <input
                    type="number"
                    value={Math.round(evalState.positionX)}
                    onChange={e => handleTransformChange('positionX', Number(e.target.value))}
                    className="w-full bg-transparent text-gray-200 focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Position Y */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span>Position Y</span>
                  {renderKeyframeControl('positionY')}
                </div>
                <div className="flex items-center bg-freecut-panel border border-freecut-border rounded px-2 py-1">
                  <span className="text-[10px] text-gray-500 mr-1.5 font-bold">Y</span>
                  <input
                    type="number"
                    value={Math.round(evalState.positionY)}
                    onChange={e => handleTransformChange('positionY', Number(e.target.value))}
                    className="w-full bg-transparent text-gray-200 focus:outline-none font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Scale */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span className="flex items-center space-x-1">
                    <Maximize2 className="w-3 h-3 text-cyan-400" />
                    <span>Scale</span>
                  </span>
                  <div className="flex items-center">
                    <span className="font-mono text-gray-300 mr-1">
                      {Math.round(evalState.scale * 100)}%
                    </span>
                    {renderKeyframeControl('scale')}
                  </div>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={evalState.scale}
                  onChange={e => handleTransformChange('scale', Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-freecut-panel rounded cursor-pointer"
                />
              </div>

              {/* Rotation */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span className="flex items-center space-x-1">
                    <RotateCw className="w-3 h-3 text-cyan-400" />
                    <span>Rotation</span>
                  </span>
                  <div className="flex items-center">
                    <span className="font-mono text-gray-300 mr-1">
                      {Math.round(evalState.rotation)}°
                    </span>
                    {renderKeyframeControl('rotation')}
                  </div>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={evalState.rotation}
                  onChange={e => handleTransformChange('rotation', Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-freecut-panel rounded cursor-pointer"
                />
              </div>

              {/* Opacity */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3 h-3 text-cyan-400" />
                    <span>Opacity</span>
                  </span>
                  <div className="flex items-center">
                    <span className="font-mono text-gray-300 mr-1">
                      {Math.round(evalState.opacity * 100)}%
                    </span>
                    {renderKeyframeControl('opacity')}
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={evalState.opacity}
                  onChange={e => handleTransformChange('opacity', Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-freecut-panel rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Blend Mode */}
            <BlendModeSelector clip={selectedClip} />

            {/* Crop & Flip (Video & Image) */}
            {selectedClip.type !== 'text' && (
              <CropFlipInspector clip={selectedClip} />
            )}

            {/* Chroma Key (Video & Image) */}
            {selectedClip.type !== 'text' && (
              <ChromaKeyInspector clip={selectedClip} />
            )}

            {/* Masks */}
            <MaskInspector clip={selectedClip} />

            {/* Motion Tracking */}
            <TrackingInspector clip={selectedClip} />
          </section>
        )}

        {/* Audio / Volume / Pan / Fades Controls */}
        {(selectedClip.type === 'audio' || selectedClip.type === 'video') && (
          <AudioInspector clip={selectedClip} />
        )}

        {/* Color Grading & Management (Video & Image clips) */}
        {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
          <ColorInspector clip={selectedClip} />
        )}

        {/* Effects Stack Section (Visual clips: Video & Image) */}
        {(selectedClip.type === 'video' || selectedClip.type === 'image') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Visual Effects ({(selectedClip.effects || []).length})</span>
              </div>
            </div>

            {/* Add Effect Bar */}
            <div className="flex items-center space-x-1.5 bg-freecut-darkest p-2 rounded border border-freecut-border">
              <select
                value={selectedEffectToAdd}
                onChange={e => setSelectedEffectToAdd(e.target.value as EffectType)}
                className="flex-1 bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-violet-400"
              >
                {EffectRegistry.listEffects().map(ef => (
                  <option key={ef.type} value={ef.type}>
                    {ef.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  store.addEffect(selectedClip.id, selectedEffectToAdd);
                }}
                className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded font-medium flex items-center space-x-1 text-xs transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Effect Stack List */}
            {(!selectedClip.effects || selectedClip.effects.length === 0) ? (
              <div className="bg-freecut-darkest/60 border border-dashed border-freecut-border rounded p-3 text-center text-gray-500 text-[11px]">
                No effects applied to this clip. Add an effect above.
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedClip.effects.map((effect, idx) => {
                  const descriptor = EffectRegistry.getEffect(effect.effectType);
                  if (!descriptor) return null;

                  const evaluated = evaluateEffectParameters(effect, relativeTime);

                  return (
                    <div
                      key={effect.id}
                      className="bg-freecut-darkest border border-freecut-border rounded p-2.5 space-y-2.5"
                    >
                      {/* Effect Header */}
                      <div className="flex items-center justify-between border-b border-freecut-border/60 pb-1.5">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={effect.enabled}
                            onChange={() => store.toggleEffectEnabled(selectedClip.id, effect.id)}
                            className="accent-violet-400 rounded cursor-pointer"
                            title="Enable / Disable Effect"
                          />
                          <span className="font-semibold text-gray-200 text-[11px]">
                            {descriptor.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          {/* Reorder Up */}
                          <button
                            disabled={idx === 0}
                            onClick={() => store.reorderEffects(selectedClip.id, idx, idx - 1)}
                            className="p-1 rounded text-gray-500 hover:text-gray-300 disabled:opacity-20 transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          {/* Reorder Down */}
                          <button
                            disabled={idx === selectedClip.effects!.length - 1}
                            onClick={() => store.reorderEffects(selectedClip.id, idx, idx + 1)}
                            className="p-1 rounded text-gray-500 hover:text-gray-300 disabled:opacity-20 transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          {/* Remove */}
                          <button
                            onClick={() => store.removeEffect(selectedClip.id, effect.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
                            title="Remove Effect"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Parameters */}
                      <div className="space-y-2 pt-0.5">
                        {descriptor.parameters.map(param => {
                          const val = Number(evaluated[param.id] ?? effect.parameters[param.id] ?? param.defaultValue);
                          const track = effect.animations?.[param.id];
                          const hasKfs = (track?.keyframes?.length ?? 0) > 0;
                          const kfAtPlayhead = track?.keyframes?.some(
                            k => Math.abs(k.time - relativeTime) <= 0.5 / fps
                          );

                          return (
                            <div key={param.id} className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-gray-400">
                                <span>{param.name}</span>
                                <div className="flex items-center space-x-1">
                                  <span className="font-mono text-gray-300">
                                    {val.toFixed(param.step && param.step < 1 ? 2 : 0)}{param.unit || ''}
                                  </span>

                                  {/* Keyframe Diamond */}
                                  {param.animatable && (
                                    <button
                                      onClick={() => store.toggleEffectKeyframe(selectedClip.id, effect.id, param.id)}
                                      title={
                                        kfAtPlayhead
                                          ? `Remove keyframe at ${relativeTime.toFixed(2)}s`
                                          : `Add keyframe at ${relativeTime.toFixed(2)}s`
                                      }
                                      className={`p-1 rounded transition-all ml-1 ${
                                        kfAtPlayhead
                                          ? 'text-amber-400 bg-amber-400/20 ring-1 ring-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.35)]'
                                          : hasKfs
                                          ? 'text-gray-300 hover:text-amber-400 hover:bg-white/5'
                                          : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
                                      }`}
                                    >
                                      <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                                        <polygon points="12,2 22,12 12,22 2,12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <input
                                type="range"
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                value={val}
                                onChange={e => {
                                  store.updateEffectParameter(
                                    selectedClip.id,
                                    effect.id,
                                    param.id,
                                    Number(e.target.value)
                                  );
                                }}
                                className="w-full accent-violet-400 h-1 bg-freecut-panel rounded cursor-pointer"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
