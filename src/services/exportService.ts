import { FreeCutProject } from '../types/project';
import { ExportSettings, ExportProgress } from '../types/export';
import { FFmpegService } from './ffmpegService';
import { DesktopBridge } from '../native/desktopBridge';

export type ExportProgressCallback = (progress: ExportProgress) => void;

export class ExportService {
  private static isExporting = false;
  private static activeJobId: string | null = null;

  static getActiveJobId(): string | null {
    return this.activeJobId;
  }

  static async cancelActiveExport(): Promise<boolean> {
    if (!this.activeJobId) return false;
    const cancelled = await DesktopBridge.cancelExport(this.activeJobId);
    this.isExporting = false;
    this.activeJobId = null;
    return cancelled;
  }

  static async startExport(
    project: FreeCutProject,
    settings: ExportSettings,
    onProgress: ExportProgressCallback
  ): Promise<void> {
    if (this.isExporting) {
      throw new Error('An export is already in progress.');
    }

    this.isExporting = true;
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.activeJobId = jobId;

    // Calculate real project duration and total frames
    const projectDuration = Math.max(
      1,
      ...project.clips.map(c => c.startTime + c.duration),
      ...(project.captionTracks || []).flatMap(t => t.items.map(i => i.endTime))
    );
    const fps = settings.fps || project.project.fps || 30;
    const totalFrames = Math.max(1, Math.round(projectDuration * fps));

    onProgress({
      status: 'preparing',
      percent: 0,
      currentFrame: 0,
      totalFrames,
      fps: 0,
      etaSeconds: 0,
    });

    try {
      const args = FFmpegService.generateFFmpegArgs(project, settings);
      console.log('[ExportService] Generated FFmpeg Pipeline Arguments:', args.join(' '));

      onProgress({
        status: 'rendering',
        percent: 1,
        currentFrame: 0,
        totalFrames,
        fps: 0,
        etaSeconds: Math.ceil(projectDuration),
      });

      let lastFps = 0;
      let lastFrame = 0;

      // Execute render with real-time FFmpeg stderr progress streaming
      const renderResult = await DesktopBridge.renderExport({
        args,
        jobId,
        onProgressLine: (line: string) => {
          // Parse standard FFmpeg progress output:
          // e.g. "frame=  120 fps= 45.2 q=28.0 size=    1024kB time=00:00:04.00 bitrate=2097.2kbits/s speed=1.50x"
          const frameMatch = line.match(/frame=\s*(\d+)/);
          const fpsMatch = line.match(/fps=\s*([\d\.]+)/);
          const timeMatch = line.match(/time=\s*(\d+):(\d+):([\d\.]+)/);

          if (frameMatch || timeMatch) {
            let currentFrame = lastFrame;
            if (frameMatch) {
              currentFrame = parseInt(frameMatch[1], 10);
              lastFrame = currentFrame;
            }

            if (fpsMatch) {
              lastFps = parseFloat(fpsMatch[1]);
            }

            let percent = Math.min(99, Math.round((currentFrame / totalFrames) * 100));

            if (timeMatch) {
              const hours = parseInt(timeMatch[1], 10);
              const minutes = parseInt(timeMatch[2], 10);
              const seconds = parseFloat(timeMatch[3]);
              const timeSec = hours * 3600 + minutes * 60 + seconds;
              const timePercent = Math.min(99, Math.round((timeSec / projectDuration) * 100));
              percent = Math.max(percent, timePercent);
            }

            const remainingFrames = Math.max(0, totalFrames - currentFrame);
            const etaSeconds = lastFps > 0 ? Math.ceil(remainingFrames / lastFps) : 0;

            onProgress({
              status: 'rendering',
              percent: Math.max(1, percent),
              currentFrame,
              totalFrames,
              fps: Math.round(lastFps),
              etaSeconds,
            });
          }
        },
      });

      if (!renderResult.success) {
        const errorMsg = renderResult.error || renderResult.stderr || 'FFmpeg export render failed';
        throw new Error(errorMsg);
      }

      onProgress({
        status: 'completed',
        percent: 100,
        currentFrame: totalFrames,
        totalFrames,
        fps: lastFps > 0 ? Math.round(lastFps) : fps,
        etaSeconds: 0,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err || 'Export render failed');
      console.error('[ExportService] Export failed with error:', errorMessage);

      onProgress({
        status: 'error',
        percent: 0,
        currentFrame: 0,
        totalFrames,
        fps: 0,
        etaSeconds: 0,
        errorMessage,
      });

      throw err;
    } finally {
      this.isExporting = false;
      this.activeJobId = null;
    }
  }
}
