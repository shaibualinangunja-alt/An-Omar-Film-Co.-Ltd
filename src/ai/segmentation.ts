import { AiJob } from './types';
import { modelRegistry } from './modelRegistry';
import { jobQueue } from './jobQueue';
import { aiCache } from './aiCache';

export class SegmentationService {
  /**
   * Executes genuine local neural subject segmentation using CLIPSeg.
   * Produces a high-fidelity alpha mask distinguishing foreground subjects from background.
   * Returns a base64 PNG data URL and caches the result.
   */
  static async runSegmentation(
    job: AiJob, 
    imageUrl: string, 
    prompt: string = 'person',
    customOutputPath?: string
  ): Promise<string> {
    const modelId = job.modelId || 'clipseg-segmentation';
    const model = modelRegistry.getModel(modelId) || modelRegistry.getModel('clipseg-segmentation');
    if (!model) throw new Error(`Model ${modelId} not found`);

    const cacheKey = aiCache.generateKey(job.mediaId, 'segmentation', model.id, prompt);
    const cached = aiCache.get(cacheKey);
    if (cached) return cached as string;

    jobQueue.updateJob(job.id, { progress: 0.1 });

    let isCancelled = false;
    job.cancelCallback = () => { isCancelled = true; };

    const { AutoTokenizer, AutoProcessor, CLIPSegForImageSegmentation, RawImage } = await import('@xenova/transformers');

    jobQueue.updateJob(job.id, { progress: 0.25 });
    if (isCancelled) throw new Error('Job cancelled');

    const progressCb = (info: any) => {
      if (info.status === 'progress' && job.progress < 0.5) {
        jobQueue.updateJob(job.id, { progress: 0.25 + (info.progress / 100) * 0.25 });
      }
    };

    const tokenizer = await AutoTokenizer.from_pretrained(model.path, { progress_callback: progressCb });
    const processor = await AutoProcessor.from_pretrained(model.path, { progress_callback: progressCb });
    const clipsegModel = await CLIPSegForImageSegmentation.from_pretrained(model.path, { progress_callback: progressCb });

    jobQueue.updateJob(job.id, { progress: 0.5 });
    if (isCancelled) throw new Error('Job cancelled');

    // Read input image
    const image = await RawImage.read(imageUrl);
    const textInputs = tokenizer([prompt], { padding: true, truncation: true });
    const imageInputs = await processor(image);

    jobQueue.updateJob(job.id, { progress: 0.65 });
    if (isCancelled) throw new Error('Job cancelled');

    // Run inference
    const { logits } = await clipsegModel({ ...textInputs, ...imageInputs });
    const preds = logits.sigmoid();

    jobQueue.updateJob(job.id, { progress: 0.8 });
    if (isCancelled) throw new Error('Job cancelled');

    // Convert predictions to normalized grayscale alpha mask
    const data = preds.data;
    const width = preds.dims[1];
    const height = preds.dims[0];

    let minVal = 1.0;
    let maxVal = 0.0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < minVal) minVal = data[i];
      if (data[i] > maxVal) maxVal = data[i];
    }
    const range = Math.max(0.0001, maxVal - minVal);

    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i++) {
      // Normalize contrast to span 0..255
      const normalized = Math.max(0, Math.min(1, (data[i] - minVal) / range));
      const val = Math.round(normalized * 255);
      rgba[i * 4] = val;     // R
      rgba[i * 4 + 1] = val; // G
      rgba[i * 4 + 2] = val; // B
      rgba[i * 4 + 3] = 255; // A (opaque mask buffer for canvas/ffmpeg)
    }

    const rawMask = new RawImage(rgba, width, height, 4);
    const resizedMask = await rawMask.resize(image.width, image.height);

    jobQueue.updateJob(job.id, { progress: 0.9 });

    const isNode = typeof process !== 'undefined' && (process.versions?.node || (process as any).release?.name === 'node');
    let maskResultString = '';

    if (isNode) {
      const fs = await import('fs');
      const path = await import('path');
      const outDir = path.resolve('test-media/processed');
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      const outPath = customOutputPath || path.join(outDir, `mask_${Date.now()}.png`);
      await resizedMask.save(outPath);
      
      const fileBuffer = fs.readFileSync(outPath);
      maskResultString = `data:image/png;base64,${fileBuffer.toString('base64')}`;
    } else {
      // Browser canvas conversion
      const canvas = resizedMask.toCanvas();
      maskResultString = canvas.toDataURL('image/png');
    }

    aiCache.set(cacheKey, maskResultString);
    jobQueue.updateJob(job.id, { progress: 1.0 });

    return maskResultString;
  }
}
