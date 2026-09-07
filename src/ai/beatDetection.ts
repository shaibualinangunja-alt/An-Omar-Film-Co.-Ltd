import { AiJob, BeatMarker } from './types';
import { TranscriptionService } from './transcription'; // reuse audio extractor
import { jobQueue } from './jobQueue';
import { aiCache } from './aiCache';

export class BeatDetectionService {
  static async runBeatDetection(job: AiJob, mediaPath: string): Promise<BeatMarker[]> {
    const cacheKey = aiCache.generateKey(job.mediaId, 'beat');
    const cached = aiCache.get(cacheKey);
    if (cached) return cached as BeatMarker[];

    jobQueue.updateJob(job.id, { progress: 0.1 });

    const audioData = await TranscriptionService.extractAudioBuffer(mediaPath);
    const sampleRate = 16000;
    
    jobQueue.updateJob(job.id, { progress: 0.4 });

    // Very simplified transient detection (local peak picking)
    const beats: BeatMarker[] = [];
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
    
    // 1. Calculate energy envelope
    const energy: number[] = [];
    for (let i = 0; i < audioData.length; i += windowSize) {
      let sumSquares = 0;
      let end = Math.min(i + windowSize, audioData.length);
      for (let j = i; j < end; j++) {
        sumSquares += audioData[j] * audioData[j];
      }
      energy.push(Math.sqrt(sumSquares / (end - i)));
    }

    jobQueue.updateJob(job.id, { progress: 0.7 });

    let isCancelled = false;
    job.cancelCallback = () => { isCancelled = true; };

    // 2. Find local maxima with dynamic threshold
    let localAvg = 0;
    for (let i = 2; i < energy.length - 2; i++) {
      if (isCancelled) throw new Error('Job cancelled');
      
      // Moving average for threshold
      localAvg = (localAvg * 9 + energy[i]) / 10;
      const threshold = localAvg * 1.5 + 0.01;

      if (
        energy[i] > threshold &&
        energy[i] > energy[i - 1] &&
        energy[i] > energy[i - 2] &&
        energy[i] > energy[i + 1] &&
        energy[i] > energy[i + 2]
      ) {
        // Debounce: ensure beat is at least 0.2s away from previous
        const timestamp = (i * windowSize) / sampleRate;
        if (beats.length === 0 || timestamp - beats[beats.length - 1].timestamp > 0.2) {
          beats.push({
            timestamp,
            confidence: Math.min(1, energy[i] * 5)
          });
        }
      }
    }

    jobQueue.updateJob(job.id, { progress: 1.0 });
    aiCache.set(cacheKey, beats);

    return beats;
  }
}
