import React, { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { aiCache } from '../../ai/aiCache';
import { Transcript } from '../../ai/types';
import { modelRegistry } from '../../ai/modelRegistry';

interface TranscriptPanelProps {
  clipId: string;
  onClose: () => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ clipId, onClose }) => {
  const [state, store] = useProjectStore();
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);

  const clip = state.project.clips.find(c => c.id === clipId);
  const asset = clip ? state.project.media.find(m => m.id === clip.mediaId) : null;
  
  if (!clip || !asset) return null;

  // Retrieve cached transcript if it exists
  const modelId = 'whisper-tiny-en'; // default for this iteration
  const cacheKey = aiCache.generateKey(asset.id, 'transcription', modelId, 'english');
  const transcript: Transcript | null = aiCache.get(cacheKey);

  const handleGenerateCaptions = () => {
    if (!transcript) return;
    setIsGeneratingCaptions(true);
    // In Alpha 0.9, we route directly to store for deterministic project mutation
    store.addCaptionTrackFromTranscript(transcript, `${asset.name} Captions`);
    
    // Simulate UI feedback delay
    setTimeout(() => {
      setIsGeneratingCaptions(false);
      onClose();
    }, 500);
  };

  const handleSeek = (time: number) => {
    // Jump playhead
    store.setState({ currentTime: time });
  };

  const model = modelRegistry.getModel(modelId);
  const modelStatus = model?.isDownloaded ? 'Local Model' : 'Model Required';

  return (
    <div className="bg-gray-800 border-l border-gray-700 h-full w-80 flex flex-col shadow-2xl z-40">
      <div className="flex justify-between items-center border-b border-gray-700 p-4 bg-gray-900/50">
        <div>
          <h3 className="text-sm font-bold text-gray-200">Transcript</h3>
          <p className="text-[10px] text-gray-500 uppercase mt-0.5">{asset.name}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
      </div>

      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${model?.isDownloaded ? 'bg-green-400' : 'bg-yellow-500'}`}></span>
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{modelStatus}</span>
        </div>
        {transcript && (
          <span className="text-[10px] text-gray-500">{transcript.language}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!transcript ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <svg className="w-10 h-10 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            <p className="text-sm text-gray-400">No transcript available.</p>
            <p className="text-xs text-gray-500 mt-2 max-w-[200px]">Use the Timeline AI controls to generate a transcript.</p>
          </div>
        ) : (
          transcript.segments.map((seg) => (
            <div 
              key={seg.id} 
              className="group flex gap-3 p-2 -mx-2 rounded hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={() => handleSeek(seg.start)}
            >
              <div className="w-10 pt-0.5 text-[10px] font-mono text-blue-400 text-right opacity-70 group-hover:opacity-100 transition-opacity">
                {Math.floor(seg.start / 60)}:{(seg.start % 60).toFixed(1).padStart(4, '0')}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">
                  {seg.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <button 
          onClick={handleGenerateCaptions}
          disabled={!transcript || isGeneratingCaptions}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
        >
          {isGeneratingCaptions ? 'Generating...' : 'Create Captions from Transcript'}
        </button>
      </div>
    </div>
  );
};
