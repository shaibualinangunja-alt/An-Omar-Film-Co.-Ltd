import { AiJob, AiJobType } from './types';
import { v4 as uuidv4 } from 'uuid';

export type JobUpdateCallback = (job: AiJob) => void;

class JobQueue {
  private jobs: Map<string, AiJob> = new Map();
  private subscribers: Set<JobUpdateCallback> = new Set();
  private activeJobs = 0;

  subscribe(callback: JobUpdateCallback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(job: AiJob) {
    this.subscribers.forEach(cb => cb({ ...job }));
  }

  getJobs(): AiJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  addJob(
    type: AiJobType,
    mediaId: string,
    modelId?: string,
    executor?: (job: AiJob) => Promise<any>,
    cancelFn?: () => void
  ): string {
    const job: AiJob = {
      id: uuidv4(),
      type,
      mediaId,
      modelId,
      status: 'queued',
      progress: 0,
      elapsedTimeMs: 0,
      createdAt: Date.now(),
      cancelCallback: cancelFn
    };

    this.jobs.set(job.id, job);
    this.notifySubscribers(job);

    if (executor) {
      // Internal execution handling for convenience, though jobs can be managed externally
      this.processQueue(job, executor);
    }

    return job.id;
  }

  updateJob(id: string, updates: Partial<AiJob>) {
    const job = this.jobs.get(id);
    if (!job) return;

    Object.assign(job, updates);
    this.jobs.set(id, job);
    this.notifySubscribers(job);
  }

  cancelJob(id: string) {
    const job = this.jobs.get(id);
    if (job && (job.status === 'queued' || job.status === 'running' || job.status === 'paused')) {
      if (job.cancelCallback) {
        job.cancelCallback();
      }
      this.updateJob(id, { status: 'cancelled' });
      this.activeJobs--;
    }
  }

  private async processQueue(job: AiJob, executor: (job: AiJob) => Promise<any>) {
    // Simple execution for now without complex concurrency locking
    if (job.status !== 'queued') return;
    
    this.activeJobs++;
    this.updateJob(job.id, { status: 'running' });
    const startTime = Date.now();

    try {
      const result = await executor(job);
      this.updateJob(job.id, { 
        status: 'completed', 
        progress: 1.0, 
        result,
        elapsedTimeMs: Date.now() - startTime
      });
    } catch (err: any) {
      const currentJob = this.jobs.get(job.id);
      if (currentJob?.status !== 'cancelled') {
        this.updateJob(job.id, { 
          status: 'failed', 
          error: err.message || 'Unknown error',
          elapsedTimeMs: Date.now() - startTime
        });
      }
    } finally {
      this.activeJobs--;
    }
  }
}

export const jobQueue = new JobQueue();
