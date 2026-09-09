import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Sliders, 
  Waves, 
  ShieldAlert, 
  ChevronDown, 
  ChevronRight,
  RotateCcw,
  Mic
} from 'lucide-react';
import { ClipItem } from '../../types/project';
import { useProjectStore } from '../../state/projectStore';
import { 
  DEFAULT_CLIP_AUDIO_EFFECTS, 
  AudioEqSettings, 
  AudioReverbSettings 
} from '../../audio/types';

interface AudioInspectorProps {
  clip: ClipItem;
}

export const AudioInspector: React.FC<AudioInspectorProps> = ({ clip }) => {
  const [, store] = useProjectStore();
  
  // Section collapse state (Progressive Disclosure)
  const [openSection, setOpenSection] = useState<'cleanup' | 'voice' | 'eq' | 'reverb' | 'separation' | null>(null);

  const toggleSection = (section: 'cleanup' | 'voice' | 'eq' | 'reverb' | 'separation') => {
    setOpenSection(prev => (prev === section ? null : section));
  };

  const fx = clip.audioEffects || DEFAULT_CLIP_AUDIO_EFFECTS;

  const updateEffects = (updater: (prev: typeof fx) => typeof fx) => {
    const updated = updater(clip.audioEffects || DEFAULT_CLIP_AUDIO_EFFECTS);
    store.updateClip(clip.id, { audioEffects: updated });
  };

  const handleEqPreset = (presetName: 'flat' | 'vocal' | 'bass' | 'podcast') => {
    let eqConfig: AudioEqSettings = {
      enabled: true,
      low: { freq: 80, gain: 0, q: 1.0 },
      lowMid: { freq: 300, gain: 0, q: 1.0 },
      mid: { freq: 1000, gain: 0, q: 1.0 },
      highMid: { freq: 3500, gain: 0, q: 1.0 },
      high: { freq: 10000, gain: 0, q: 1.0 },
    };

    if (presetName === 'vocal') {
      eqConfig.low.gain = -3.0; // Cut rumble
      eqConfig.lowMid.gain = -1.5; // Reduce boxiness
      eqConfig.mid.gain = 2.0; // Speech presence
      eqConfig.highMid.gain = 4.0; // Consonants clarity
      eqConfig.high.gain = 1.5; // Air
    } else if (presetName === 'bass') {
      eqConfig.low.gain = 5.0;
      eqConfig.lowMid.gain = 2.0;
      eqConfig.mid.gain = -1.0;
      eqConfig.highMid.gain = 0;
      eqConfig.high.gain = 0;
    } else if (presetName === 'podcast') {
      eqConfig.low.gain = -2.0;
      eqConfig.lowMid.gain = 1.0;
      eqConfig.mid.gain = 2.5;
      eqConfig.highMid.gain = 3.0;
      eqConfig.high.gain = 2.0;
    }

    updateEffects(prev => ({ ...prev, eq: eqConfig }));
  };

  const handleReverbPreset = (preset: 'small_room' | 'room' | 'hall' | 'large_hall') => {
    let rev: AudioReverbSettings = {
      enabled: true,
      preset,
      roomSize: 40,
      decay: 35,
      wetDry: 25,
      preDelay: 20,
    };
    if (preset === 'small_room') {
      rev = { enabled: true, preset, roomSize: 20, decay: 20, wetDry: 15, preDelay: 10 };
    } else if (preset === 'room') {
      rev = { enabled: true, preset, roomSize: 45, decay: 35, wetDry: 25, preDelay: 20 };
    } else if (preset === 'hall') {
      rev = { enabled: true, preset, roomSize: 70, decay: 60, wetDry: 35, preDelay: 35 };
    } else if (preset === 'large_hall') {
      rev = { enabled: true, preset, roomSize: 90, decay: 85, wetDry: 45, preDelay: 50 };
    }
    updateEffects(prev => ({ ...prev, reverb: rev }));
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* Basic Audio Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-gray-400 font-semibold text-[11px] uppercase tracking-wider">
          <div className="flex items-center space-x-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Basic Audio</span>
          </div>
          <button
            onClick={() => store.updateClipAudio(clip.id, { volume: 1.0, pan: 0, muted: false, fadeInDuration: 0, fadeOutDuration: 0 })}
            className="text-[10px] text-gray-500 hover:text-emerald-400 flex items-center space-x-0.5"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="space-y-3 bg-freecut-darkest p-3 rounded border border-freecut-border">
          {/* Volume */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span>Volume</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-emerald-300">
                  {Math.round((clip.volume ?? 1.0) * 100)}%
                </span>
                <button
                  onClick={() => store.toggleClipMute(clip.id)}
                  className={`p-1 rounded transition-colors ${clip.muted ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
                  title={clip.muted ? 'Unmute' : 'Mute'}
                >
                  {clip.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={clip.volume ?? 1.0}
              onChange={e => store.updateClipVolume(clip.id, Number(e.target.value))}
              className="w-full accent-emerald-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Pan */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
              <span>Stereo Pan</span>
              <span className="font-mono text-gray-300">
                {(clip.pan ?? 0) === 0 ? 'Center' : (clip.pan ?? 0) < 0 ? `L ${Math.abs(Math.round((clip.pan ?? 0) * 100))}%` : `R ${Math.round((clip.pan ?? 0) * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.05"
              value={clip.pan ?? 0}
              onChange={e => store.updateClipAudio(clip.id, { pan: Number(e.target.value) })}
              className="w-full accent-emerald-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Fades */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-freecut-border/60">
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Fade In</span>
                <span className="font-mono text-emerald-400/90">{((clip as any).fadeInDuration ?? 0).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.min(5, clip.duration)}
                step="0.1"
                value={(clip as any).fadeInDuration ?? 0}
                onChange={e => store.updateClipAudio(clip.id, { fadeInDuration: Number(e.target.value) })}
                className="w-full accent-emerald-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Fade Out</span>
                <span className="font-mono text-emerald-400/90">{((clip as any).fadeOutDuration ?? 0).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.min(5, clip.duration)}
                step="0.1"
                value={(clip as any).fadeOutDuration ?? 0}
                onChange={e => store.updateClipAudio(clip.id, { fadeOutDuration: Number(e.target.value) })}
                className="w-full accent-emerald-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Progressive Disclosure Section Drawers */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block px-1">
          Audio Enhancements & Processing
        </span>

        {/* 1. CLEANUP / DENOISE */}
        <div className="border border-freecut-border rounded-lg overflow-hidden bg-freecut-darkest">
          <button
            onClick={() => toggleSection('cleanup')}
            className="w-full p-2.5 flex items-center justify-between hover:bg-freecut-panel/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-semibold text-gray-200">Noise Reduction & Cleanup</span>
              {fx.denoise?.enabled && (
                <span className="bg-teal-900/60 text-teal-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                  Active
                </span>
              )}
            </div>
            {openSection === 'cleanup' ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {openSection === 'cleanup' && (
            <div className="p-3 border-t border-freecut-border bg-freecut-panel/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer text-gray-300 font-medium">
                  <input
                    type="checkbox"
                    checked={fx.denoise?.enabled ?? false}
                    onChange={e => updateEffects(prev => ({
                      ...prev,
                      denoise: { ...(prev.denoise || { amount: 50, highpass: true }), enabled: e.target.checked },
                    }))}
                    className="accent-teal-400 rounded"
                  />
                  <span>Enable Denoise</span>
                </label>
                <span className="font-mono text-teal-300 font-bold">{fx.denoise?.amount ?? 50}%</span>
              </div>

              <div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fx.denoise?.amount ?? 50}
                  disabled={!fx.denoise?.enabled}
                  onChange={e => updateEffects(prev => ({
                    ...prev,
                    denoise: { ...(prev.denoise || { enabled: true, highpass: true }), amount: Number(e.target.value) },
                  }))}
                  className="w-full accent-teal-400 h-1 bg-freecut-darkest rounded cursor-pointer disabled:opacity-40"
                />
                <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                  <span>Subtle (0%)</span>
                  <span>Moderate (50%)</span>
                  <span>Aggressive (100%)</span>
                </div>
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-gray-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={fx.denoise?.highpass ?? true}
                  disabled={!fx.denoise?.enabled}
                  onChange={e => updateEffects(prev => ({
                    ...prev,
                    denoise: { ...(prev.denoise || { enabled: true, amount: 50 }), highpass: e.target.checked },
                  }))}
                  className="accent-teal-400 rounded"
                />
                <span>Cut Low Frequency Rumble (80Hz High-Pass)</span>
              </label>
            </div>
          )}
        </div>

        {/* 2. VOICE ENHANCE & CLARITY */}
        <div className="border border-freecut-border rounded-lg overflow-hidden bg-freecut-darkest">
          <button
            onClick={() => toggleSection('voice')}
            className="w-full p-2.5 flex items-center justify-between hover:bg-freecut-panel/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-gray-200">Voice Clarity & Enhance</span>
              {fx.voice?.enabled && (
                <span className="bg-cyan-900/60 text-cyan-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                  Active
                </span>
              )}
            </div>
            {openSection === 'voice' ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {openSection === 'voice' && (
            <div className="p-3 border-t border-freecut-border bg-freecut-panel/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer text-gray-300 font-medium">
                  <input
                    type="checkbox"
                    checked={fx.voice?.enabled ?? false}
                    onChange={e => updateEffects(prev => ({
                      ...prev,
                      voice: { ...(prev.voice || { clarity: 60, enhance: true }), enabled: e.target.checked },
                    }))}
                    className="accent-cyan-400 rounded"
                  />
                  <span>Voice Enhancement</span>
                </label>
                <span className="font-mono text-cyan-300 font-bold">{fx.voice?.clarity ?? 60}%</span>
              </div>

              <div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fx.voice?.clarity ?? 60}
                  disabled={!fx.voice?.enabled}
                  onChange={e => updateEffects(prev => ({
                    ...prev,
                    voice: { ...(prev.voice || { enabled: true, enhance: true }), clarity: Number(e.target.value) },
                  }))}
                  className="w-full accent-cyan-400 h-1 bg-freecut-darkest rounded cursor-pointer disabled:opacity-40"
                />
              </div>

              <label className="flex items-center space-x-2 text-[11px] text-gray-400 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={fx.voice?.enhance ?? true}
                  disabled={!fx.voice?.enabled}
                  onChange={e => updateEffects(prev => ({
                    ...prev,
                    voice: { ...(prev.voice || { enabled: true, clarity: 60 }), enhance: e.target.checked },
                  }))}
                  className="accent-cyan-400 rounded"
                />
                <span>Dynamic Speech Compressor & Presence Boost</span>
              </label>
            </div>
          )}
        </div>

        {/* 3. 5-BAND PARAMETRIC EQ */}
        <div className="border border-freecut-border rounded-lg overflow-hidden bg-freecut-darkest">
          <button
            onClick={() => toggleSection('eq')}
            className="w-full p-2.5 flex items-center justify-between hover:bg-freecut-panel/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-gray-200">5-Band Parametric EQ</span>
              {fx.eq?.enabled && (
                <span className="bg-indigo-900/60 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                  Active
                </span>
              )}
            </div>
            {openSection === 'eq' ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {openSection === 'eq' && (
            <div className="p-3 border-t border-freecut-border bg-freecut-panel/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer text-gray-300 font-medium">
                  <input
                    type="checkbox"
                    checked={fx.eq?.enabled ?? false}
                    onChange={e => updateEffects(prev => ({
                      ...prev,
                      eq: { ...(prev.eq || DEFAULT_CLIP_AUDIO_EFFECTS.eq!), enabled: e.target.checked },
                    }))}
                    className="accent-indigo-400 rounded"
                  />
                  <span>Enable Equalizer</span>
                </label>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'flat', label: 'Flat' },
                  { id: 'vocal', label: 'Vocal Clarity' },
                  { id: 'bass', label: 'Bass Boost' },
                  { id: 'podcast', label: 'Warm Podcast' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleEqPreset(p.id as any)}
                    className="px-1.5 py-1 rounded bg-freecut-darkest hover:bg-indigo-950/60 text-gray-300 hover:text-indigo-200 border border-freecut-border text-[10px] truncate"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* 5 Bands */}
              <div className="space-y-2 pt-1">
                {[
                  { key: 'low', label: 'Low (80Hz)', band: fx.eq?.low ?? { freq: 80, gain: 0, q: 1.0 } },
                  { key: 'lowMid', label: 'Low Mid (300Hz)', band: fx.eq?.lowMid ?? { freq: 300, gain: 0, q: 1.0 } },
                  { key: 'mid', label: 'Mid (1kHz)', band: fx.eq?.mid ?? { freq: 1000, gain: 0, q: 1.0 } },
                  { key: 'highMid', label: 'High Mid (3.5kHz)', band: fx.eq?.highMid ?? { freq: 3500, gain: 0, q: 1.0 } },
                  { key: 'high', label: 'High (10kHz)', band: fx.eq?.high ?? { freq: 10000, gain: 0, q: 1.0 } },
                ].map(({ key, label, band }) => (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                      <span>{label}</span>
                      <span className="font-mono text-indigo-300">
                        {band.gain > 0 ? `+${band.gain.toFixed(1)}` : band.gain.toFixed(1)} dB
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      step="0.5"
                      value={band.gain}
                      disabled={!fx.eq?.enabled}
                      onChange={e => {
                        const val = Number(e.target.value);
                        updateEffects(prev => {
                          const base = prev.eq || DEFAULT_CLIP_AUDIO_EFFECTS.eq!;
                          return {
                            ...prev,
                            eq: {
                              ...base,
                              enabled: true,
                              [key]: { ...(base as any)[key], gain: val },
                            },
                          };
                        });
                      }}
                      className="w-full accent-indigo-400 h-1 bg-freecut-darkest rounded cursor-pointer disabled:opacity-40"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. REVERB */}
        <div className="border border-freecut-border rounded-lg overflow-hidden bg-freecut-darkest">
          <button
            onClick={() => toggleSection('reverb')}
            className="w-full p-2.5 flex items-center justify-between hover:bg-freecut-panel/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Waves className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold text-gray-200">Reverb / Room Acoustic</span>
              {fx.reverb?.enabled && (
                <span className="bg-purple-900/60 text-purple-300 text-[9px] px-1.5 py-0.5 rounded font-bold">
                  Active
                </span>
              )}
            </div>
            {openSection === 'reverb' ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {openSection === 'reverb' && (
            <div className="p-3 border-t border-freecut-border bg-freecut-panel/30 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer text-gray-300 font-medium">
                  <input
                    type="checkbox"
                    checked={fx.reverb?.enabled ?? false}
                    onChange={e => updateEffects(prev => ({
                      ...prev,
                      reverb: { ...(prev.reverb || DEFAULT_CLIP_AUDIO_EFFECTS.reverb!), enabled: e.target.checked },
                    }))}
                    className="accent-purple-400 rounded"
                  />
                  <span>Enable Reverb</span>
                </label>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'small_room', label: 'Small' },
                  { id: 'room', label: 'Room' },
                  { id: 'hall', label: 'Hall' },
                  { id: 'large_hall', label: 'Large Hall' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleReverbPreset(p.id as any)}
                    className="px-1.5 py-1 rounded bg-freecut-darkest hover:bg-purple-950/60 text-gray-300 hover:text-purple-200 border border-freecut-border text-[10px] truncate"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Wet / Dry */}
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                  <span>Wet / Dry Mix</span>
                  <span className="font-mono text-purple-300">{fx.reverb?.wetDry ?? 25}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fx.reverb?.wetDry ?? 25}
                  disabled={!fx.reverb?.enabled}
                  onChange={e => updateEffects(prev => ({
                    ...prev,
                    reverb: { ...(prev.reverb || DEFAULT_CLIP_AUDIO_EFFECTS.reverb!), wetDry: Number(e.target.value) },
                  }))}
                  className="w-full accent-purple-400 h-1 bg-freecut-darkest rounded cursor-pointer disabled:opacity-40"
                />
              </div>

              {/* Room Size */}
              <div>
                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                  <span>Room Size</span>
                  <span className="font-mono text-purple-300">{fx.reverb?.roomSize ?? 40}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={fx.reverb?.roomSize ?? 40}
                  disabled={!fx.reverb?.enabled}
                  onChange={e => updateEffects(prev => ({
                    ...prev,
                    reverb: { ...(prev.reverb || DEFAULT_CLIP_AUDIO_EFFECTS.reverb!), roomSize: Number(e.target.value) },
                  }))}
                  className="w-full accent-purple-400 h-1 bg-freecut-darkest rounded cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>
          )}
        </div>

        {/* 5. VOCAL / MUSIC SEPARATION */}
        <div className="border border-freecut-border rounded-lg overflow-hidden bg-freecut-darkest">
          <button
            onClick={() => toggleSection('separation')}
            className="w-full p-2.5 flex items-center justify-between hover:bg-freecut-panel/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-gray-200">Vocal & Music Separation</span>
            </div>
            {openSection === 'separation' ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          </button>

          {openSection === 'separation' && (
            <div className="p-3 border-t border-freecut-border bg-freecut-panel/30 space-y-3">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Extract vocals or instrumental backing tracks offline using our AI speech model pipeline.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'vocals', label: 'Extract Vocals' },
                  { mode: 'instrumental', label: 'Extract Music' },
                  { mode: 'dialogue', label: 'Isolate Dialogue' },
                  { mode: 'background', label: 'Ambience Only' },
                ].map(m => (
                  <button
                    key={m.mode}
                    onClick={() => {
                      store.setState({ statusMessage: `AI stem separation: ${m.label} queued for processing...` });
                    }}
                    className="p-2 rounded bg-freecut-darkest hover:bg-amber-950/40 text-gray-200 hover:text-amber-200 border border-freecut-border text-[11px] font-medium text-center transition-colors"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
