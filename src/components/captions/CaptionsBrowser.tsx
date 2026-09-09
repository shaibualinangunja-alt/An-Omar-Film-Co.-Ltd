import React from 'react';
import { Subtitles, Plus, Sparkles, Trash2, Clock } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { formatTimecode } from '../../utils/timecode';

export const CaptionsBrowser: React.FC = () => {
  const [state, store] = useProjectStore(s => ({
    project: s.project,
    currentTime: s.currentTime,
    selectedCaptionId: s.selectedCaptionId,
  }));

  const captionTracks = state.project.captionTracks || [];
  const allItems = captionTracks.flatMap(t => t.items.map(i => ({ ...i, trackId: t.id })));
  const fps = state.project.project.fps || 30;

  const handleAddCaption = () => {
    store.addCaptionItem();
    store.setState({ statusMessage: 'Caption created at playhead' });
  };

  const handleSelectCaption = (trackId: string, itemId: string) => {
    store.selectCaptionItem(trackId, itemId);
  };

  const handleDeleteCaption = (trackId: string, itemId: string) => {
    store.deleteCaptionItem(trackId, itemId);
  };

  return (
    <div className="h-full flex flex-col bg-freecut-darker border-r border-freecut-border select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-blue-600/30 flex items-center justify-center text-blue-400">
            <Subtitles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">Captions & Subtitles</h2>
            <p className="text-[10px] text-gray-500">Auto-transcription & manual timing</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-b border-freecut-border space-y-2">
        <button
          onClick={handleAddCaption}
          className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-blue-950/40 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Caption at Playhead (C)</span>
        </button>

        <button
          onClick={() => store.setState({ activeSidebarTab: 'ai' })}
          className="w-full py-1.5 px-3 rounded-lg bg-freecut-panel hover:bg-freecut-elevated text-blue-300 hover:text-white border border-blue-500/30 flex items-center justify-center space-x-2 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Auto-Generate Subtitles (Whisper AI)</span>
        </button>
      </div>

      {/* Captions List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Timeline Subtitles ({allItems.length})
          </span>
        </div>

        {allItems.length > 0 ? (
          <div className="space-y-1.5">
            {allItems.map(cap => {
              const isSelected = state.selectedCaptionId === cap.id;
              return (
                <div
                  key={cap.id}
                  onClick={() => handleSelectCaption(cap.trackId, cap.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-950/60 border-blue-400 ring-1 ring-blue-400/40'
                      : 'bg-freecut-panel border-freecut-border hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span className="flex items-center space-x-1 text-blue-300">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimecode(cap.startTime, fps)} ➔ {formatTimecode(cap.endTime, fps)}</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCaption(cap.trackId, cap.id);
                      }}
                      className="text-gray-500 hover:text-red-400 p-0.5 rounded"
                      title="Delete Caption"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-gray-100 font-medium text-xs truncate">
                    {cap.text || <span className="text-gray-500 italic">Empty caption...</span>}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-freecut-darkest/50 border border-dashed border-freecut-border rounded-lg p-6 text-center text-gray-500">
            <Subtitles className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <p className="text-[11px] text-gray-400 mb-1">No captions yet</p>
            <p className="text-[10px] text-gray-500">
              Click "Add Caption" or use Auto-Generate to transcribe spoken words.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
