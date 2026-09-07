import type { AudioCleanupSettings, AudioCleanupResult } from './types';
import { AiJob } from './types';
import { jobQueue } from './jobQueue';

export type { AudioCleanupSettings, AudioCleanupResult };

export class AudioCleanupService {
  /**
   * Applies genuine local audio cleanup (stationary noise reduction via FFT spectral
   * subtraction, sub-bass highpass, and lowpass filtering).
   * 
   * Non-destructive: Leaves original source media 100% untouched and renders
   * a processed WAV reference for timeline playback and export mixdown.
   */
  static async runAudioCleanup(
    job: AiJob, 
    mediaPath: string,
    settings: AudioCleanupSettings,
    customOutputPath?: string
  ): Promise<string> {
    jobQueue.updateJob(job.id, { progress: 0.1 });

    let isCancelled = false;
    let childProc: any = null;
    job.cancelCallback = () => { 
      isCancelled = true;
      if (childProc && typeof childProc.kill === 'function') {
        childProc.kill('SIGKILL');
      }
    };

    // Compile filter graph
    const audioFilters: string[] = [];

    if (settings.reduceNoise) {
      // Real FFT-based spectral subtraction denoiser + sub-bass rumble cutoff + hiss filter
      audioFilters.push('afftdn=nr=12:nf=-25');
      audioFilters.push('highpass=f=80');
      audioFilters.push('lowpass=f=12000');
    }

    if (settings.removeHum) {
      // 60Hz notch filter
      audioFilters.push('bandreject=f=60:width_type=h:w=2');
    }

    if (settings.enhanceSpeech) {
      // Dialogue vocal dynamics compression
      audioFilters.push('acompressor=threshold=-18dB:ratio=3:attack=10:release=100');
    }

    const filterString = audioFilters.length > 0 ? audioFilters.join(',') : 'anull';

    jobQueue.updateJob(job.id, { progress: 0.25 });
    if (isCancelled) throw new Error('Job cancelled');

    // Determine non-destructive output path
    let outPath = customOutputPath;
    const isNode = typeof process !== 'undefined' && (process.versions?.node || (process as any).release?.name === 'node');

    if (!outPath) {
      if (isNode) {
        const path = await import('path');
        const fs = await import('fs');
        const outDir = path.resolve('test-media/processed');
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        const basename = path.basename(mediaPath, path.extname(mediaPath));
        outPath = path.join(outDir, `cleaned_${basename}_${Date.now()}.wav`);
      } else {
        outPath = `cleaned_${Date.now()}.wav`;
      }
    }

    jobQueue.updateJob(job.id, { progress: 0.4 });
    if (isCancelled) throw new Error('Job cancelled');

    if (isNode) {
      const { execFile } = await import('child_process');
      const fs = await import('fs');

      // Record original stats before processing to verify non-destructive preservation
      const originalStat = fs.statSync(mediaPath);

      await new Promise<void>((resolve, reject) => {
        if (isCancelled) return reject(new Error('Job cancelled'));

        const ffmpegArgs = [
          '-y',
          '-i', mediaPath,
          '-af', filterString,
          '-c:a', 'pcm_s16le',
          outPath!
        ];

        childProc = execFile('ffmpeg', ffmpegArgs, (err: any, _stdout: any, _stderr: any) => {
          if (isCancelled) {
            return reject(new Error('Job cancelled'));
          }
          if (err) {
            return reject(new Error(`FFmpeg audio cleanup failed: ${err.message}`));
          }
          resolve();
        });
      });

      jobQueue.updateJob(job.id, { progress: 0.85 });

      // Verify output file existence and non-destructive status of original
      if (!fs.existsSync(outPath)) {
        throw new Error('Processed audio file was not generated');
      }

      const outStat = fs.statSync(outPath);
      const postOriginalStat = fs.statSync(mediaPath);

      if (postOriginalStat.size !== originalStat.size) {
        throw new Error('Fatal: Original source audio media was altered during cleanup');
      }

      jobQueue.updateJob(job.id, { progress: 1.0 });

      const result: AudioCleanupResult = {
        settings,
        originalPath: mediaPath,
        processedPath: outPath,
        algorithm: 'FFT Spectral Subtraction Denoiser (afftdn) + Sub-bass Cutoff (80Hz) + Lowpass (12kHz)',
        outputSize: outStat.size,
        appliedAt: new Date().toISOString()
      };

      return JSON.stringify(result);
    } else {
      // Browser / Dev Server Bridge
      const { DesktopBridge } = await import('../native/desktopBridge');
      const ffmpegArgs = [
        '-y',
        '-i', mediaPath,
        '-af', filterString,
        '-c:a', 'pcm_s16le',
        outPath!
      ];

      jobQueue.updateJob(job.id, { progress: 0.6 });
      await DesktopBridge.renderExport(ffmpegArgs);
      jobQueue.updateJob(job.id, { progress: 1.0 });

      const result: AudioCleanupResult = {
        settings,
        originalPath: mediaPath,
        processedPath: outPath,
        algorithm: 'FFT Spectral Subtraction Denoiser (afftdn) + Sub-bass Cutoff (80Hz) + Lowpass (12kHz)',
        appliedAt: new Date().toISOString()
      };

      return JSON.stringify(result);
    }
  }
}
