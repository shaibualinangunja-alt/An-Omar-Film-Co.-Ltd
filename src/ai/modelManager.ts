import { env } from '@xenova/transformers';
import { modelRegistry } from './modelRegistry';
import { capabilityDetector } from './capabilityDetector';

// Configure Transformers.js environment for local execution
env.allowLocalModels = false; // We use HuggingFace hub but cache locally in browser IndexedDB
env.useBrowserCache = true;

class ModelManager {
  async init() {
    await capabilityDetector.detectCapabilities();
    // We could pre-check cache here, but @xenova/transformers handles its own Cache API 
    // We'll mark them downloaded lazily when first used, or check Cache API explicitly.
    await this.checkDownloadedModels();
  }

  async checkDownloadedModels() {
    // Check browser Cache API
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open('transformers-cache');
        const keys = await cache.keys();
        
        const downloadedPaths = new Set(
          keys.map(request => {
            const url = new URL(request.url);
            const match = url.pathname.match(/^(?:.*\/)?([^/]+\/[^/]+)/);
            return match ? match[1] : null;
          }).filter(Boolean)
        );

        const models = modelRegistry.getModels();
        models.forEach(model => {
          if (downloadedPaths.has(model.path)) {
            modelRegistry.updateModelStatus(model.id, true, 1.0);
          }
        });
      } catch (e) {
        console.warn("Could not check downloaded models in Cache API", e);
      }
    }

    // Check Node.js filesystem cache
    if (typeof process !== 'undefined' && (process.versions?.node || (process as any).release?.name === 'node')) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const cacheDir = (env as any).cacheDir || path.resolve('node_modules/@xenova/transformers/.cache');
        const models = modelRegistry.getModels();
        models.forEach(model => {
          const parts = model.path.split('/');
          const modelDir = path.join(cacheDir, ...parts);
          // A model is considered downloaded if its directory exists and contains onnx or config
          if (fs.existsSync(modelDir)) {
            const files = fs.readdirSync(modelDir);
            if (files.includes('onnx') || files.some(f => f.endsWith('.onnx') || f === 'config.json')) {
              modelRegistry.updateModelStatus(model.id, true, 1.0);
            }
          }
        });
      } catch (e) {
        console.warn("Could not check downloaded models in Node cache", e);
      }
    }
  }

  // Pre-load a model into the local cache
  async downloadModel(modelId: string, onProgress?: (progress: number) => void): Promise<boolean> {
    const model = modelRegistry.getModel(modelId);
    if (!model) return false;

    if (model.isDownloaded) return true;

    try {
      if (model.task === 'segmentation') {
        const { AutoTokenizer, AutoProcessor, CLIPSegForImageSegmentation } = await import('@xenova/transformers');
        const progressCb = (info: any) => {
          if (info.status === 'progress') {
            const progress = info.progress / 100;
            modelRegistry.updateModelStatus(modelId, false, progress);
            if (onProgress) onProgress(progress);
          } else if (info.status === 'done') {
            modelRegistry.updateModelStatus(modelId, true, 1.0);
            if (onProgress) onProgress(1.0);
          }
        };

        await AutoTokenizer.from_pretrained(model.path, { progress_callback: progressCb });
        await AutoProcessor.from_pretrained(model.path, { progress_callback: progressCb });
        await CLIPSegForImageSegmentation.from_pretrained(model.path, { progress_callback: progressCb });
        modelRegistry.updateModelStatus(modelId, true, 1.0);
        return true;
      }

      // Default pipeline download
      const { pipeline } = await import('@xenova/transformers');
      
      await pipeline(model.task as any, model.path, {
        progress_callback: (info: any) => {
          if (info.status === 'progress') {
            const progress = info.progress / 100;
            modelRegistry.updateModelStatus(modelId, false, progress);
            if (onProgress) onProgress(progress);
          } else if (info.status === 'done') {
            modelRegistry.updateModelStatus(modelId, true, 1.0);
            if (onProgress) onProgress(1.0);
          }
        }
      });
      
      return true;
    } catch (err) {
      console.error(`Failed to download model ${modelId}:`, err);
      return false;
    }
  }

  async removeModel(modelId: string): Promise<boolean> {
    const model = modelRegistry.getModel(modelId);
    if (!model || !('caches' in window)) return false;

    try {
      const cache = await caches.open('transformers-cache');
      const keys = await cache.keys();
      
      let removedCount = 0;
      for (const request of keys) {
        if (request.url.includes(model.path)) {
          await cache.delete(request);
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        modelRegistry.updateModelStatus(modelId, false, 0);
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Failed to remove model ${modelId}:`, err);
      return false;
    }
  }
}

export const modelManager = new ModelManager();
