import React, { useState } from 'react';
import { useProjectStore } from '../../state/projectStore';
import { SegmentationService } from '../../ai/segmentation';
import { jobQueue } from '../../ai/jobQueue';
import { modelRegistry } from '../../ai/modelRegistry';

interface SegmentationPanelProps {
  clipId: string;
  onClose: () => void;
  onModelRequired: (task: string) => void;
}

export const SegmentationPanel: React.FC<SegmentationPanelProps> = ({ clipId, onClose, onModelRequired }) => {
  const [state, store] = useProjectStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewMask, setPreviewMask] = useState<string | null>(null);

  const clip = state.project.clips.find(c => c.id === clipId);
  const asset = clip ? state.project.media.find(m => m.id === clip.mediaId) : null;
  
  if (!clip || !asset || asset.type !== 'image') {
    // For Alpha 0.9, we restrict MODNet segmentation to images for performance reasons 
    // in the UI, though the engine could process video frames.
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-80 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-gray-200">Remove Background</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        <p className="text-sm text-gray-400">Background removal in Alpha 0.9 is restricted to image clips for performance.</p>
      </div>
    );
  }

  const handleAnalyze = () => {
    const modelId = 'clipseg-segmentation';
    const model = modelRegistry.getModel(modelId);
    if (!model || !model.isDownloaded) {
      onModelRequired('segmentation');
      return;
    }

    setIsProcessing(true);
    
    jobQueue.addJob('background-removal', asset.id, modelId, async (job) => {
      try {
        const maskBase64 = await SegmentationService.runSegmentation(job, asset.path);
        setPreviewMask(maskBase64);
        return maskBase64;
      } finally {
        setIsProcessing(false);
      }
    });
  };

  const handleApply = () => {
    if (!previewMask) return;
    
    store.executeProjectMutation('Apply AI Subject Mask', proj => {
      const c = proj.clips.find(x => x.id === clipId);
      if (c) {
        if (!c.masks) c.masks = [];
        c.masks.push({
          id: `mask_ai_${Date.now()}`,
          type: 'image', // Alpha 0.7 mask engine type + 0.9 image extension
          enabled: true,
          inverted: false,
          positionX: 0,
          positionY: 0,
          width: 0, // usually 0 defaults to full size in renderer
          height: 0,
          rotation: 0,
          feather: 0,
          opacity: 1,
          blendMode: 'normal',
          imageUrl: previewMask // Custom Alpha 0.9 integration for raster masks
        });
      }
      return proj;
    });
    
    onClose();
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 w-80 shadow-lg flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
        <h3 className="text-sm font-bold text-gray-200">Background Removal</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
      </div>

      <div className="bg-blue-900/20 border border-blue-900/50 p-2 rounded flex items-start gap-2">
        <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
        <p className="text-[10px] text-blue-300">
          Uses CLIPSeg (MIT License) via Transformers.js to isolate subjects locally and generate alpha masks.
        </p>
      </div>

      {previewMask ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">Preview generated. Apply to integrate with Alpha 0.7 Mask Engine.</p>
          <div className="w-full aspect-video bg-gray-900 rounded border border-gray-700 overflow-hidden relative checkerboard-bg">
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src={previewMask} alt="Mask Preview" className="w-full h-full object-contain" />
          </div>
          
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => setPreviewMask(null)}
              className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded transition-colors"
            >
              Discard
            </button>
            <button 
              onClick={handleApply}
              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
            >
              Apply Mask
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-gray-700">
          <button 
            onClick={handleAnalyze}
            disabled={isProcessing}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:bg-gray-700 text-white text-sm font-medium rounded transition-colors"
          >
            {isProcessing ? 'Analyzing Subject...' : 'Analyze Subject'}
          </button>
        </div>
      )}
    </div>
  );
};
