import React, { useState } from 'react';
import { Cpu, Scissors, Activity, VolumeX, FileText } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { SegmentationPanel } from './SegmentationPanel';
import { SceneDetectionPanel } from './SceneDetectionPanel';
import { SilenceDetectionPanel } from './SilenceDetectionPanel';
import { BeatDetectionPanel } from './BeatDetectionPanel';
import { TranscriptPanel } from './TranscriptPanel';

export const AiBrowser: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'segmentation' | 'scene' | 'silence' | 'beat' | 'transcript'>('segmentation');
  const [state, store] = useProjectStore(s => ({
    selectedClipId: s.selectedClipId,
    clips: s.project.clips,
  }));

  const selectedClip = state.clips.find(c => c.id === state.selectedClipId);

  const tools = [
    { id: 'segmentation', label: 'Smart Cutout', icon: Scissors, desc: 'AI subject segmentation & mask' },
    { id: 'scene', label: 'Scene Cuts', icon: Scissors, desc: 'Detect shot changes' },
    { id: 'silence', label: 'Silence Remover', icon: VolumeX, desc: 'Auto-cut silent pauses' },
    { id: 'beat', label: 'Beat Sync', icon: Activity, desc: 'Rhythm marker generation' },
    { id: 'transcript', label: 'Auto Subtitles', icon: FileText, desc: 'Whisper speech-to-text' },
  ];

  return (
    <div className="h-full flex flex-col bg-freecut-darker border-r border-freecut-border select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">AI Intelligence</h2>
            <p className="text-[10px] text-gray-500">100% Private Offline Processing</p>
          </div>
        </div>
        <button
          onClick={() => store.setState({ isAiModelManagerModalOpen: true })}
          className="text-[10px] text-cyan-400 hover:underline font-medium cursor-pointer"
        >
          Model Manager
        </button>
      </div>

      {/* Tool Selector Bar */}
      <div className="p-2 border-b border-freecut-border bg-freecut-darkest flex flex-wrap gap-1">
        {tools.map(t => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id as any)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'bg-freecut-panel text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active AI Assistant Body */}
      <div className="flex-1 p-3 overflow-y-auto">
        {!selectedClip ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-freecut-panel flex items-center justify-center text-cyan-400 mb-3 border border-freecut-border shadow-md">
              <Cpu className="w-6 h-6" />
            </div>
            <p className="font-semibold text-gray-200 mb-1">Select a Clip to Begin</p>
            <p className="text-[11px] text-gray-500 max-w-[200px] leading-relaxed">
              Click any clip on the timeline to run {tools.find(t => t.id === activeTool)?.label}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="px-2 py-1 bg-cyan-950/40 border border-cyan-800/40 rounded text-[11px] text-cyan-300">
              Active Clip: <strong>{selectedClip.name}</strong>
            </div>

            {activeTool === 'segmentation' && (
              <SegmentationPanel
                clipId={selectedClip.id}
                onClose={() => {}}
                onModelRequired={() => store.setState({ isAiModelManagerModalOpen: true })}
              />
            )}
            {activeTool === 'scene' && (
              <SceneDetectionPanel
                clipId={selectedClip.id}
                onClose={() => {}}
              />
            )}
            {activeTool === 'silence' && (
              <SilenceDetectionPanel
                clipId={selectedClip.id}
                onClose={() => {}}
              />
            )}
            {activeTool === 'beat' && (
              <BeatDetectionPanel
                clipId={selectedClip.id}
                onClose={() => {}}
              />
            )}
            {activeTool === 'transcript' && (
              <TranscriptPanel
                clipId={selectedClip.id}
                onClose={() => {}}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
