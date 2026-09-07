import { Transcript, AiJob } from './types';
import { modelRegistry } from './modelRegistry';
import { jobQueue } from './jobQueue';
import { aiCache } from './aiCache';

export class TranscriptionService {
  private static audioCtx: AudioContext | null = null;

  private static getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 16000 }); // Whisper expects 16kHz
    }
    return this.audioCtx;
  }

  static async extractAudioBuffer(mediaPathOrUrl: string): Promise<Float32Array> {
    if (typeof window === 'undefined') {
      const fs = await import('fs');
      const buf = fs.readFileSync(mediaPathOrUrl);
      const dataIdx = buf.indexOf(Buffer.from('data'));
      if (dataIdx !== -1) {
        const pcmData = buf.subarray(dataIdx + 8);
        const floatData = new Float32Array(pcmData.length / 2);
        for (let i = 0; i < floatData.length; i++) {
          floatData[i] = pcmData.readInt16LE(i * 2) / 32768.0;
        }
        return floatData;
      }
    }

    const ctx = this.getAudioContext();
    const streamUrl = mediaPathOrUrl.startsWith('blob:') || mediaPathOrUrl.startsWith('http')
      ? mediaPathOrUrl
      : `/api/media-stream?path=${encodeURIComponent(mediaPathOrUrl)}`;

    const response = await fetch(streamUrl);
    if (!response.ok) throw new Error('Failed to fetch media for transcription');
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    
    // Downmix to mono if stereo
    if (audioBuffer.numberOfChannels > 1) {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);
      const mono = new Float32Array(left.length);
      for (let i = 0; i < left.length; i++) {
        mono[i] = (left[i] + right[i]) / 2;
      }
      return mono;
    }
    
    return audioBuffer.getChannelData(0);
  }

  static async runTranscription(job: AiJob, mediaPath: string, language?: string): Promise<Transcript> {
    const modelId = job.modelId || 'whisper-tiny-en';
    const model = modelRegistry.getModel(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    const cacheKey = aiCache.generateKey(job.mediaId, 'transcription', modelId, language);
    const cached = aiCache.get(cacheKey);
    if (cached) return cached as Transcript;

    jobQueue.updateJob(job.id, { progress: 0.1 });

    const { pipeline } = await import('@xenova/transformers');
    
    // Extract audio
    const audioData = await this.extractAudioBuffer(mediaPath);
    jobQueue.updateJob(job.id, { progress: 0.3 });

    // Load pipeline
    const transcriber = await pipeline('automatic-speech-recognition', model.path, {
      progress_callback: (info: any) => {
        if (info.status === 'progress' && job.progress < 0.5) {
          jobQueue.updateJob(job.id, { progress: 0.3 + (info.progress / 100) * 0.2 });
        }
      }
    });

    jobQueue.updateJob(job.id, { progress: 0.5 });

    let isCancelled = false;
    job.cancelCallback = () => { isCancelled = true; };

    // Run inference with word timestamps
    const options: any = {
      task: 'transcribe',
      return_timestamps: 'word'
    };
    // Whisper English-only (.en) models do not accept a language token
    if (language && !modelId.endsWith('-en') && !model.path.endsWith('.en')) {
      options.language = language;
    }
    if (audioData.length > 30 * 16000) {
      options.chunk_length_s = 30;
      options.stride_length_s = 5;
    }

    const output = await transcriber(audioData, options) as any;

    if (isCancelled) throw new Error('Job cancelled');

    jobQueue.updateJob(job.id, { progress: 0.9 });

    const transcript: Transcript = {
      language: language || 'english',
      segments: []
    };

    if (output && output.chunks) {
      transcript.segments = output.chunks.map((chunk: any, i: number) => {
        return {
          id: `seg_${i}_${Date.now()}`,
          text: chunk.text.trim(),
          start: chunk.timestamp[0],
          end: chunk.timestamp[1] || (chunk.timestamp[0] + 1), // Fallback if end is null
        };
      });
    } else {
      transcript.segments = [{
        id: `seg_0_${Date.now()}`,
        text: output.text || '',
        start: 0,
        end: audioData.length / 16000
      }];
    }

    aiCache.set(cacheKey, transcript);
    jobQueue.updateJob(job.id, { progress: 1.0 });

    return transcript;
  }
}
