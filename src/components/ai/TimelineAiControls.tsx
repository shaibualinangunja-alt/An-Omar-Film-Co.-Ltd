import React from 'react';
import { useProjectStore } from '../../state/projectStore';
import { modelRegistry, jobQueue } from '../../ai';
import { TranscriptionService } from '../../ai/transcription';
import { SceneDetectionService } from '../../ai/sceneDetection';
import { BeatDetectionService } from '../../ai/beatDetection';

interface TimelineAiControlsProps {
  onModelRequired: (task: string) => void;
  onOpenSilenceUi: () => void;
}

export const TimelineAiControls: React.FC<TimelineAiControlsProps> = ({ onModelRequired, onOpenSilenceUi }) => {
  const [state, store] = useProjectStore();
  const selectedClip = state.project.clips.find(c => c.id === state.selectedClipId);

  const checkModelAndRun = async (
    modelId: string, 
    taskType: any, 
    jobType: any, 
    executor: (job: any) => Promise<any>
  ) => {
    const model = modelRegistry.getModel(modelId);
    if (!model || !model.isDownloaded) {
      onModelRequired(taskType);
      return;
    }
    
    // Model exists, create and queue job
    jobQueue.addJob(jobType, selectedClip?.mediaId || 'unknown', modelId, executor);
  };

  const handleGenerateTranscript = () => {
    if (!selectedClip) return;
    const asset = state.project.media.find(m => m.id === selectedClip.mediaId);
    if (!asset) return;

    checkModelAndRun(
      'whisper-tiny-en',
      'speech-to-text',
      'transcription',
      async (job) => {
        return TranscriptionService.runTranscription(job, asset.path);
      }
    );
  };

  const handleDetectSilence = () => {
    if (!selectedClip) return;
    onOpenSilenceUi();
  };

  const handleDetectScenes = () => {
    if (!selectedClip) return;
    const asset = state.project.media.find(m => m.id === selectedClip.mediaId);
    if (!asset) return;

    jobQueue.addJob('scene-detection', asset.id, undefined, async (job) => {
      const markers = await SceneDetectionService.runSceneDetection(job, asset.path, asset.duration);
      store.addSceneMarkers(markers);
      return markers;
    });
  };

  const handleDetectBeats = () => {
    if (!selectedClip) return;
    const asset = state.project.media.find(m => m.id === selectedClip.mediaId);
    if (!asset) return;

    jobQueue.addJob('beat-detection', asset.id, undefined, async (job) => {
      const markers = await BeatDetectionService.runBeatDetection(job, asset.path);
      store.addBeatMarkers(markers);
      return markers;
    });
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-3 flex gap-6 overflow-x-auto items-center">
      <div className="flex items-center gap-2 mr-4 border-r border-gray-700 pr-6">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">LOCAL AI</span>
          <span className="text-[10px] text-gray-500">READY</span>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-xs font-semibold text-gray-400 uppercase w-20">Transcript</span>
        <button 
          onClick={handleGenerateTranscript}
          disabled={!selectedClip}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-200 text-xs rounded transition-colors"
        >
          Generate Transcript
        </button>
      </div>

      <div className="w-px h-6 bg-gray-700"></div>

      <div className="flex gap-2 items-center">
        <span className="text-xs font-semibold text-gray-400 uppercase w-12">Edit</span>
        <button 
          onClick={handleDetectSilence}
          disabled={!selectedClip}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-200 text-xs rounded transition-colors"
        >
          Detect Silence
        </button>
        <button 
          onClick={handleDetectScenes}
          disabled={!selectedClip}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-200 text-xs rounded transition-colors"
        >
          Detect Scenes
        </button>
        <button 
          onClick={handleDetectBeats}
          disabled={!selectedClip}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-200 text-xs rounded transition-colors"
        >
          Detect Beats
        </button>
      </div>
    </div>
  );
};
