import { AiJob, SilenceRegion } from './types';
import { TranscriptionService } from './transcription'; // reuse audio extractor
import { jobQueue } from './jobQueue';
import { aiCache } from './aiCache';

export class SilenceDetectionService {
  static async runSilenceDetection(
    job: AiJob, 
    mediaPath: string, 
    thresholdDb: number = -40, 
    minDurationSec: number = 0.5
  ): Promise<SilenceRegion[]> {
    const cacheKey = aiCache.generateKey(job.mediaId, 'silence', undefined, `${thresholdDb}_${minDurationSec}`);
    const cached = aiCache.get(cacheKey);
    if (cached) return cached as SilenceRegion[];

    jobQueue.updateJob(job.id, { progress: 0.1 });

    const audioData = await TranscriptionService.extractAudioBuffer(mediaPath);
    const sampleRate = 16000; // extracted at 16kHz
    
    jobQueue.updateJob(job.id, { progress: 0.4 });

    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
    const minSamples = minDurationSec * sampleRate;

    const silenceRegions: SilenceRegion[] = [];
    let currentSilenceStart: number | null = null;
    let isCancelled = false;
    job.cancelCallback = () => { isCancelled = true; };

    for (let i = 0; i < audioData.length; i += windowSize) {
      if (isCancelled) throw new Error('Job cancelled');

      if (i % (windowSize * 20) === 0) {
        jobQueue.updateJob(job.id, { progress: 0.4 + 0.5 * (i / audioData.length) });
      }

      let sumSquares = 0;
      let end = Math.min(i + windowSize, audioData.length);
      for (let j = i; j < end; j++) {
        sumSquares += audioData[j] * audioData[j];
      }
      const rms = Math.sqrt(sumSquares / (end - i));

      if (rms < thresholdLinear) {
        if (currentSilenceStart === null) {
          currentSilenceStart = i;
        }
      } else {
        if (currentSilenceStart !== null) {
          const silenceDuration = (i - currentSilenceStart);
          if (silenceDuration >= minSamples) {
            silenceRegions.push({
              start: currentSilenceStart / sampleRate,
              end: i / sampleRate,
              duration: silenceDuration / sampleRate
            });
          }
          currentSilenceStart = null;
        }
      }
    }

    if (currentSilenceStart !== null) {
      const silenceDuration = (audioData.length - currentSilenceStart);
      if (silenceDuration >= minSamples) {
        silenceRegions.push({
          start: currentSilenceStart / sampleRate,
          end: audioData.length / sampleRate,
          duration: silenceDuration / sampleRate
        });
      }
    }

    jobQueue.updateJob(job.id, { progress: 1.0 });
    aiCache.set(cacheKey, silenceRegions);

    return silenceRegions;
  }
}
