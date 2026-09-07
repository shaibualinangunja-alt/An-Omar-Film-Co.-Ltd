/**
 * FreeCut Alpha 0.8 Export Queue System
 * Manages background rendering queue, progress tracking, job cancellation, and retry.
 */

import { ExportQueueJob, ExportProfile } from './types';

export type QueueSubscriber = (jobs: ExportQueueJob[], activeJob: ExportQueueJob | null) => void;

export class ExportQueueManager {
  private static jobs: ExportQueueJob[] = [];
  private static activeJobId: string | null = null;
  private static subscribers: Set<QueueSubscriber> = new Set();
  private static abortController: AbortController | null = null;

  static subscribe(callback: QueueSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.jobs, this.getActiveJob());
    return () => this.subscribers.delete(callback);
  }

  private static notify(): void {
    const active = this.getActiveJob();
    this.subscribers.forEach(cb => cb([...this.jobs], active));
  }

  static getJobs(): ExportQueueJob[] {
    return [...this.jobs];
  }

  static getJob(jobId: string): ExportQueueJob | undefined {
    return this.jobs.find(j => j.id === jobId);
  }

  static getActiveJob(): ExportQueueJob | null {
    if (!this.activeJobId) return null;
    return this.jobs.find(j => j.id === this.activeJobId) || null;
  }

  /**
   * Adds a new export job to the render queue
   */
  static addJob(
    projectOrName: any,
    profile: ExportProfile,
    outputPath: string,
    totalDuration: number = 10
  ): ExportQueueJob {
    const name = typeof projectOrName === 'string' ? projectOrName : (projectOrName?.project?.name || 'Untitled Export');
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const totalFrames = Math.max(1, Math.round(totalDuration * profile.fps));

    const newJob: ExportQueueJob = {
      id,
      name,
      profile,
      outputPath,
      status: 'queued',
      percent: 0,
      currentFrame: 0,
      totalFrames,
      fps: 0,
      etaSeconds: 0,
      createdAt: Date.now(),
    };

    this.jobs.push(newJob);
    this.notify();
    return newJob;
  }

  /**
   * Updates progress of a job
   */
  static updateProgress(
    jobId: string,
    progress: number | { percent: number; currentFrame?: number; fps?: number; etaSeconds?: number },
    currentFrame?: number,
    totalFrames?: number,
    fps?: number,
    etaSeconds?: number
  ): void {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;

    if (typeof progress === 'number') {
      job.percent = Math.max(0, Math.min(100, progress));
      if (currentFrame !== undefined) job.currentFrame = currentFrame;
      if (totalFrames !== undefined) job.totalFrames = totalFrames;
      if (fps !== undefined) job.fps = fps;
      if (etaSeconds !== undefined) job.etaSeconds = etaSeconds;
    } else {
      job.percent = Math.max(0, Math.min(100, progress.percent));
      if (progress.currentFrame !== undefined) job.currentFrame = progress.currentFrame;
      if (progress.fps !== undefined) job.fps = progress.fps;
      if (progress.etaSeconds !== undefined) job.etaSeconds = progress.etaSeconds;
    }

    if (job.status === 'queued') {
      job.status = 'rendering';
      job.startedAt = Date.now();
    }

    if (job.percent >= 100) {
      job.status = 'completed';
      job.completedAt = Date.now();
      if (this.activeJobId === jobId) {
        this.activeJobId = null;
      }
    }

    this.notify();
  }

  /**
   * Marks a job as completed
   */
  static completeJob(jobId: string): void {
    const job = this.jobs.find(j => j.id === jobId);
    if (job) {
      job.status = 'completed';
      job.percent = 100;
      job.completedAt = Date.now();
      if (this.activeJobId === jobId) {
        this.activeJobId = null;
      }
      this.notify();
    }
  }

  /**
   * Marks a job as failed
   */
  static failJob(jobId: string, errorMessage: string): void {
    const job = this.jobs.find(j => j.id === jobId);
    if (job) {
      job.status = 'error';
      job.errorMessage = errorMessage;
      job.completedAt = Date.now();
      if (this.activeJobId === jobId) {
        this.activeJobId = null;
      }
      this.notify();
    }
  }

  /**
   * Cancels a currently running or queued job
   */
  static cancelJob(jobId: string): void {
    const job = this.jobs.find(j => j.id === jobId);
    if (job) {
      if (this.activeJobId === jobId && this.abortController) {
        try {
          this.abortController.abort();
        } catch (_) {}
      }
      job.status = 'cancelled';
      job.completedAt = Date.now();
      if (this.activeJobId === jobId) {
        this.activeJobId = null;
      }
      this.notify();
    }
  }

  /**
   * Retries a failed or cancelled job
   */
  static retryJob(jobId: string): void {
    const job = this.jobs.find(j => j.id === jobId);
    if (job && (job.status === 'error' || job.status === 'cancelled')) {
      job.status = 'queued';
      job.percent = 0;
      job.currentFrame = 0;
      job.errorMessage = undefined;
      job.startedAt = undefined;
      job.completedAt = undefined;
      this.notify();
    }
  }

  /**
   * Removes a job from the queue list
   */
  static removeJob(jobId: string): void {
    if (this.activeJobId === jobId) {
      this.cancelJob(jobId);
    }
    this.jobs = this.jobs.filter(j => j.id !== jobId);
    this.notify();
  }

  static clearCompleted(): void {
    this.jobs = this.jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled');
    this.notify();
  }

  static setActiveAbortController(controller: AbortController | null): void {
    this.abortController = controller;
  }
}
