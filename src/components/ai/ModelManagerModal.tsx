import React, { useEffect, useState } from 'react';
import { modelManager, modelRegistry, AiModel } from '../../ai';
import { capabilityDetector } from '../../ai/capabilityDetector';
import { AiCapabilities } from '../../ai/types';

interface ModelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelManagerModal: React.FC<ModelManagerModalProps> = ({ isOpen, onClose }) => {
  const [models, setModels] = useState<AiModel[]>([]);
  const [capabilities, setCapabilities] = useState<AiCapabilities | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  const refreshData = async () => {
    setIsRefreshing(true);
    await modelManager.checkDownloadedModels();
    setModels(modelRegistry.getModels());
    setCapabilities(await capabilityDetector.detectCapabilities());
    setIsRefreshing(false);
  };

  const handleInstall = async (modelId: string) => {
    await modelManager.downloadModel(modelId, (_progress) => {
      // Refresh models to trigger UI update with progress
      setModels(modelRegistry.getModels());
    });
    setModels(modelRegistry.getModels());
  };

  const handleRemove = async (modelId: string) => {
    await modelManager.removeModel(modelId);
    setModels(modelRegistry.getModels());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-100">AI Model Manager</h2>
            <p className="text-sm text-gray-400 mt-1">Local Inference Engines for FreeCut Alpha 0.9</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            ✕
          </button>
        </div>

        {/* Hardware Status */}
        <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-800 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">WebGPU:</span>
            <span className={capabilities?.webGpuAvailable ? 'text-green-400 font-medium' : 'text-yellow-500 font-medium'}>
              {capabilities?.webGpuAvailable ? 'Supported' : 'Unsupported / Fallback'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">CPU Cores:</span>
            <span className="text-blue-400 font-medium">{capabilities?.cpuCores || '?'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">System Memory:</span>
            <span className="text-blue-400 font-medium">{(capabilities?.memoryLimitMb || 0) / 1024} GB</span>
          </div>
          <div className="flex-grow"></div>
          <button 
            onClick={refreshData}
            disabled={isRefreshing}
            className="text-blue-400 hover:text-blue-300 text-xs uppercase tracking-wider font-semibold disabled:opacity-50"
          >
            {isRefreshing ? 'Scanning...' : 'Refresh Status'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {models.length === 0 && !isRefreshing && (
            <div className="text-center py-12 text-gray-500">No models registered in system.</div>
          )}
          
          {models.map(model => (
            <div key={model.id} className="bg-gray-800 border border-gray-700 rounded-lg p-5 flex flex-col md:flex-row gap-6">
              
              {/* Info section */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-100">{model.name}</h3>
                  <span className="bg-blue-900/50 text-blue-300 border border-blue-800/50 text-[10px] px-2 py-0.5 rounded uppercase tracking-wide">
                    {model.task.replace('-', ' ')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-4 text-xs">
                  <div><span className="text-gray-500">Version:</span> <span className="text-gray-300">{model.version}</span></div>
                  <div><span className="text-gray-500">Format:</span> <span className="text-gray-300 uppercase">{model.format}</span></div>
                  <div><span className="text-gray-500">Size:</span> <span className="text-gray-300">{(model.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span></div>
                  <div><span className="text-gray-500">Runtime:</span> <span className="text-gray-300">{model.runtime}</span></div>
                  <div><span className="text-gray-500">License:</span> <span className="text-gray-300">{model.license}</span></div>
                  <div><span className="text-gray-500">Hardware:</span> <span className="text-gray-300">{model.gpuSupport ? 'CPU/GPU' : 'CPU Only'}</span></div>
                </div>
                
                <div className="mt-4 text-[10px] text-gray-500 font-mono">
                  Path: {model.path}
                </div>
              </div>
              
              {/* Action section */}
              <div className="w-full md:w-64 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-700 pt-4 md:pt-0 md:pl-6">
                
                <div className="mb-4 text-center">
                  <div className="text-xs text-gray-400 mb-1">Status</div>
                  {model.isDownloaded ? (
                    <div className="text-green-400 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span> Installed Locally
                    </div>
                  ) : (
                    <div className="text-gray-500 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-500"></span> Not Installed
                    </div>
                  )}
                </div>

                {!model.isDownloaded && model.downloadProgress !== undefined && model.downloadProgress > 0 && model.downloadProgress < 1.0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Downloading...</span>
                      <span>{Math.round(model.downloadProgress * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-1.5 transition-all duration-300"
                        style={{ width: `${model.downloadProgress * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {model.isDownloaded ? (
                    <>
                      <button className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded transition-colors disabled:opacity-50">
                        Verify Installation
                      </button>
                      <button 
                        onClick={() => handleRemove(model.id)}
                        className="w-full py-2 bg-transparent border border-red-900/50 text-red-400 hover:bg-red-900/20 text-sm font-medium rounded transition-colors"
                      >
                        Remove Local Cache
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleInstall(model.id)}
                      disabled={model.downloadProgress !== undefined && model.downloadProgress > 0 && model.downloadProgress < 1.0}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
                    >
                      Install Model
                    </button>
                  )}
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
