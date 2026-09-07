import { AiJob, SceneMarker } from './types';
import { jobQueue } from './jobQueue';
import { aiCache } from './aiCache';

export class SceneDetectionService {
  static async runSceneDetection(
    job: AiJob, 
    mediaUrl: string, 
    duration: number,
    fps: number = 5 // Process at 5 fps to save time
  ): Promise<SceneMarker[]> {
    const cacheKey = aiCache.generateKey(job.mediaId, 'scene');
    const cached = aiCache.get(cacheKey);
    if (cached) return cached as SceneMarker[];

    jobQueue.updateJob(job.id, { progress: 0.1 });

    const video = document.createElement('video');
    video.src = mediaUrl.startsWith('blob:') || mediaUrl.startsWith('http') 
      ? mediaUrl 
      : `/api/media-stream?path=${encodeURIComponent(mediaUrl)}`;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = (_e) => reject(new Error('Failed to load video for scene detection'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = 64; // downscale aggressively for performance
    canvas.height = 36;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const markers: SceneMarker[] = [];
    const totalFrames = Math.floor(duration * fps);
    let prevHist: number[] | null = null;

    let isCancelled = false;
    job.cancelCallback = () => { isCancelled = true; };

    for (let frame = 0; frame < totalFrames; frame++) {
      if (isCancelled) break;

      const time = frame / fps;
      video.currentTime = time;

      await new Promise<void>((resolve) => {
        const onSeek = () => {
          video.removeEventListener('seeked', onSeek);
          resolve();
        };
        video.addEventListener('seeked', onSeek);
      });

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const currentHist = new Array(64).fill(0); // Simple 64-bin grayscale histogram
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i+1];
        const b = imageData.data[i+2];
        const luma = (r * 299 + g * 587 + b * 114) / 1000;
        const bin = Math.floor(luma / 4);
        currentHist[bin]++;
      }

      if (prevHist) {
        let diff = 0;
        for (let i = 0; i < 64; i++) {
          diff += Math.abs(currentHist[i] - prevHist[i]);
        }
        
        // Normalize diff by total pixels (64 * 36 = 2304)
        const normalizedDiff = diff / 2304;

        if (normalizedDiff > 0.35) { // Hard cut threshold
          // Debounce: 1 second
          if (markers.length === 0 || time - markers[markers.length - 1].timestamp > 1.0) {
            markers.push({
              timestamp: time,
              strength: normalizedDiff,
              type: 'hard-cut'
            });
          }
        }
      }

      prevHist = currentHist;
      
      if (frame % 5 === 0) {
        jobQueue.updateJob(job.id, { progress: 0.1 + 0.8 * (frame / totalFrames) });
      }
    }

    if (isCancelled) throw new Error('Job cancelled');

    jobQueue.updateJob(job.id, { progress: 1.0 });
    aiCache.set(cacheKey, markers);

    return markers;
  }
}
