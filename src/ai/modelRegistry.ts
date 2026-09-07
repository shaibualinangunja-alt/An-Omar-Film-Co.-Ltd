import { AiModel } from './types';

export const SUPPORTED_MODELS: Record<string, AiModel> = {
  'whisper-tiny-en': {
    id: 'whisper-tiny-en',
    name: 'Whisper Tiny (English)',
    version: '1.0.0',
    task: 'speech-to-text',
    path: 'Xenova/whisper-tiny.en',
    sizeBytes: 151000000, // ~151MB
    format: 'onnx',
    runtime: 'transformers.js',
    cpuSupport: true,
    gpuSupport: true,
    license: 'MIT',
    isDownloaded: false
  },
  'whisper-base-en': {
    id: 'whisper-base-en',
    name: 'Whisper Base (English)',
    version: '1.0.0',
    task: 'speech-to-text',
    path: 'Xenova/whisper-base.en',
    sizeBytes: 290000000, // ~290MB
    format: 'onnx',
    runtime: 'transformers.js',
    cpuSupport: true,
    gpuSupport: true,
    license: 'MIT',
    isDownloaded: false
  },
  'modnet-segmentation': {
    id: 'modnet-segmentation',
    name: 'MODNet (Background Removal)',
    version: '1.0.0',
    task: 'segmentation',
    path: 'Xenova/modnet',
    sizeBytes: 25000000, // ~25MB
    format: 'onnx',
    runtime: 'transformers.js',
    cpuSupport: true,
    gpuSupport: true,
    license: 'Apache-2.0',
    isDownloaded: false
  },
  'clipseg-segmentation': {
    id: 'clipseg-segmentation',
    name: 'CLIPSeg (Subject Segmentation)',
    version: '1.0.0',
    task: 'segmentation',
    path: 'Xenova/clipseg-rd64-refined',
    sizeBytes: 38000000, // ~38MB quantized
    format: 'onnx',
    runtime: 'transformers.js',
    cpuSupport: true,
    gpuSupport: true,
    license: 'MIT',
    isDownloaded: false
  }
};

class ModelRegistry {
  private models: Map<string, AiModel> = new Map();

  constructor() {
    Object.values(SUPPORTED_MODELS).forEach(model => {
      this.models.set(model.id, { ...model });
    });
  }

  getModels(): AiModel[] {
    return Array.from(this.models.values());
  }

  getModel(id: string): AiModel | undefined {
    return this.models.get(id);
  }

  updateModelStatus(id: string, isDownloaded: boolean, progress?: number) {
    const model = this.models.get(id);
    if (model) {
      model.isDownloaded = isDownloaded;
      if (progress !== undefined) {
        model.downloadProgress = progress;
      }
      this.models.set(id, model);
    }
  }
}

export const modelRegistry = new ModelRegistry();
