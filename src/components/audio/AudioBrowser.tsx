import React, { useState } from 'react';
import { Music, Plus, Activity, Sliders, Mic, ShieldAlert, Waves, Check } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { DesktopBridge } from '../../native/desktopBridge';
import { MediaService } from '../../services/mediaService';
import { AudioInspector } from '../inspector/AudioInspector';

export const AudioBrowser: React.FC = () => {
  const [state, store] = useProjectStore(s => ({
    media: s.project.media,
    tracks: s.project.tracks,
    clips: s.project.clips,
    selectedClipId: s.selectedClipId,
  }));
  const [activeSubTab, setActiveSubTab] = useState<'files' | 'suite'>('files');
  const [appliedPresetFeedback, setAppliedPresetFeedback] = useState<string | null>(null);

  const audioMedia = state.media.filter(m => m.type === 'audio');
  const audioTracks = state.tracks.filter(t => t.type === 'audio');
  const selectedClip = state.clips.find(c => c.id === state.selectedClipId);
  const isAudioEligible = selectedClip && (selectedClip.type === 'audio' || selectedClip.type === 'video');

  const handleImportAudio = async () => {
    try {
      const files = await DesktopBridge.selectFiles({
        multiple: true,
        title: 'Import Audio (MP3, WAV, AAC, OGG)',
        filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'] }],
      });

      for (const item of files) {
        if (typeof item === 'string') {
          const asset = await MediaService.probeLocalFile(item);
          store.addMedia(asset);
        } else if (item instanceof File) {
          const asset = await MediaService.probeMediaFile(item);
          store.addMedia(asset);
        }
      }
    } catch (err) {
      console.error('Audio import failed:', err);
    }
  };

  const applyQuickPreset = (presetName: string, config: any) => {
    if (!selectedClip) {
      store.setState({ statusMessage: 'Select a clip on the timeline to apply audio enhancement.' });
      return;
    }
    store.updateClip(selectedClip.id, {
      audioEffects: {
        ...(selectedClip.audioEffects || {}),
        ...config,
      },
    });
    setAppliedPresetFeedback(presetName);
    setTimeout(() => setAppliedPresetFeedback(null), 1500);
    store.setState({ statusMessage: `Applied audio preset "${presetName}" to ${selectedClip.name}` });
  };

  return (
    <div className="h-full flex flex-col bg-freecut-darker border-r border-freecut-border select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-emerald-600/30 flex items-center justify-center text-emerald-400">
            <Music className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">Audio Suite & Files</h2>
            <p className="text-[10px] text-gray-500">Processing, mixing & sound design</p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-freecut-border bg-freecut-darkest px-2 pt-1 gap-1">
        <button
          onClick={() => setActiveSubTab('files')}
          className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors ${
            activeSubTab === 'files'
              ? 'border-emerald-400 text-emerald-300 bg-freecut-panel/40'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Audio Files ({audioMedia.length})
        </button>
        <button
          onClick={() => setActiveSubTab('suite')}
          className={`px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors flex items-center space-x-1 ${
            activeSubTab === 'suite'
              ? 'border-emerald-400 text-emerald-300 bg-freecut-panel/40'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sliders className="w-3 h-3 text-emerald-400" />
          <span>Processing Suite</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4">
        {activeSubTab === 'files' ? (
          <>
            {/* Project Audio Assets */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Project Audio Files ({audioMedia.length})
                </span>
                <button
                  onClick={handleImportAudio}
                  className="px-2 py-0.5 bg-freecut-panel hover:bg-emerald-600/20 text-gray-300 hover:text-emerald-300 rounded border border-freecut-border flex items-center space-x-1 text-[10px] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Import</span>
                </button>
              </div>

              {audioMedia.length > 0 ? (
                <div className="space-y-1.5">
                  {audioMedia.map(m => (
                    <div
                      key={m.id}
                      className="bg-freecut-panel border border-freecut-border rounded-md p-2 flex items-center justify-between group hover:border-emerald-500/50"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-gray-200 truncate">{m.name}</span>
                      </div>
                      <button
                        onClick={() => store.addClipToTimeline(m.id, audioTracks[0]?.id || 'track_a1', store.getState().currentTime)}
                        className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded text-[10px] font-medium transition-colors shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-freecut-darkest/50 border border-dashed border-freecut-border rounded-lg p-4 text-center text-gray-500">
                  <p className="text-[11px]">No audio files imported yet.</p>
                  <button
                    onClick={handleImportAudio}
                    className="mt-2 text-emerald-400 hover:underline text-[10px] font-medium"
                  >
                    Click to browse audio
                  </button>
                </div>
              )}
            </section>

            {/* AI Audio & Beat Features */}
            <section className="space-y-2 pt-2 border-t border-freecut-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Audio Intelligence
              </span>

              <div className="bg-freecut-darkest p-3 rounded-lg border border-freecut-border space-y-2.5">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Offline Beat Detection</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Detect musical transients and sync clip edit cuts exactly to beats.
                </p>
                <button
                  onClick={() => store.setState({ activeSidebarTab: 'ai' })}
                  className="w-full py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded border border-emerald-500/40 text-[11px] font-medium"
                >
                  Open AI Audio Assistant
                </button>
              </div>
            </section>
          </>
        ) : (
          /* Processing Suite View */
          <div className="space-y-4">
            {/* Quick Action Presets */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  1-Click Audio Enhancements
                </span>
                {appliedPresetFeedback && (
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>{appliedPresetFeedback} applied</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    applyQuickPreset('Dialogue Cleanup', {
                      denoiseAmount: 40,
                      voiceClarity: true,
                      equalizerBands: [
                        { frequency: 100, gain: -4, q: 1 },
                        { frequency: 300, gain: 0, q: 1 },
                        { frequency: 1000, gain: 1, q: 1 },
                        { frequency: 3000, gain: 2, q: 1 },
                        { frequency: 8000, gain: -1, q: 1 },
                      ],
                    })
                  }
                  className="p-2.5 bg-freecut-panel border border-freecut-border hover:border-emerald-500/50 rounded text-left transition-colors group"
                >
                  <div className="flex items-center space-x-1.5 text-emerald-400 group-hover:text-emerald-300 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[11px]">Dialogue Cleanup</span>
                  </div>
                  <p className="text-[9px] text-gray-400">Remove AC hum & background rumble</p>
                </button>

                <button
                  onClick={() =>
                    applyQuickPreset('Speech Clarity', {
                      denoiseAmount: 20,
                      voiceClarity: true,
                      equalizerBands: [
                        { frequency: 100, gain: -2, q: 1 },
                        { frequency: 300, gain: -1, q: 1 },
                        { frequency: 1000, gain: 2, q: 1 },
                        { frequency: 3000, gain: 4, q: 1 },
                        { frequency: 8000, gain: 2, q: 1 },
                      ],
                    })
                  }
                  className="p-2.5 bg-freecut-panel border border-freecut-border hover:border-emerald-500/50 rounded text-left transition-colors group"
                >
                  <div className="flex items-center space-x-1.5 text-emerald-400 group-hover:text-emerald-300 mb-1">
                    <Mic className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[11px]">Speech Clarity</span>
                  </div>
                  <p className="text-[9px] text-gray-400">Brighten vocals and improve intelligibility</p>
                </button>

                <button
                  onClick={() =>
                    applyQuickPreset('Warm Podcast', {
                      voiceClarity: true,
                      equalizerBands: [
                        { frequency: 100, gain: 3.5, q: 1 },
                        { frequency: 300, gain: 2, q: 1 },
                        { frequency: 1000, gain: 0, q: 1 },
                        { frequency: 3000, gain: 1, q: 1 },
                        { frequency: 8000, gain: 0, q: 1 },
                      ],
                    })
                  }
                  className="p-2.5 bg-freecut-panel border border-freecut-border hover:border-emerald-500/50 rounded text-left transition-colors group"
                >
                  <div className="flex items-center space-x-1.5 text-emerald-400 group-hover:text-emerald-300 mb-1">
                    <Waves className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[11px]">Warm Podcast</span>
                  </div>
                  <p className="text-[9px] text-gray-400">Deep proximity radio broadcast tone</p>
                </button>

                <button
                  onClick={() =>
                    applyQuickPreset('Concert Hall', {
                      reverbEnabled: true,
                      reverbPreset: 'hall',
                      reverbDecay: 3.2,
                      reverbWet: 30,
                    })
                  }
                  className="p-2.5 bg-freecut-panel border border-freecut-border hover:border-emerald-500/50 rounded text-left transition-colors group"
                >
                  <div className="flex items-center space-x-1.5 text-emerald-400 group-hover:text-emerald-300 mb-1">
                    <Music className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[11px]">Concert Hall</span>
                  </div>
                  <p className="text-[9px] text-gray-400">Spacious acoustic reverberation</p>
                </button>
              </div>
            </section>

            {/* Embedded Inspector or Selection Prompt */}
            <section className="space-y-2 pt-2 border-t border-freecut-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Selected Clip Audio Controls
              </span>

              {isAudioEligible && selectedClip ? (
                <div className="bg-freecut-darkest/60 border border-freecut-border rounded-lg overflow-hidden">
                  <AudioInspector clip={selectedClip} />
                </div>
              ) : (
                <div className="bg-freecut-darkest/50 border border-dashed border-freecut-border rounded-lg p-5 text-center text-gray-500 space-y-2">
                  <Sliders className="w-6 h-6 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400 font-medium">No Audio Clip Selected</p>
                  <p className="text-[10px] text-gray-500 max-w-xs mx-auto">
                    Click any video or audio clip on the timeline to fine-tune volume, EQ, denoise, and reverb.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
