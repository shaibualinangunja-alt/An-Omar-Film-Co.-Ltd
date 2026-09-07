import React, { useEffect, useState } from 'react';
import { jobQueue } from '../../ai/jobQueue';
import { AiJob } from '../../ai/types';

export const AiJobQueue: React.FC = () => {
  const [jobs, setJobs] = useState<AiJob[]>([]);

  useEffect(() => {
    // Initial fetch
    setJobs(jobQueue.getJobs());
    
    // Subscribe to updates
    const unsubscribe = jobQueue.subscribe((_updatedJob) => {
      setJobs(jobQueue.getJobs());
    });
    
    return () => { unsubscribe(); };
  }, []);

  const activeJobs = jobs.filter(j => j.status === 'running' || j.status === 'queued');
  
  if (jobs.length === 0) return null;

  return (
    <div className="absolute bottom-10 right-4 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">AI Operations</h3>
        <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
          {activeJobs.length} Active
        </span>
      </div>
      <div className="max-h-64 overflow-y-auto p-2 space-y-2">
        {jobs.map(job => (
          <div key={job.id} className="bg-gray-800 p-3 rounded border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm font-medium text-gray-200 capitalize">{job.type.replace('-', ' ')}</div>
                <div className="text-xs text-gray-400 mt-1 truncate w-48">
                  {job.modelId ? `Model: ${job.modelId}` : 'Local AI / Deterministic'}
                </div>
              </div>
              {job.status === 'running' || job.status === 'queued' ? (
                <button 
                  onClick={() => jobQueue.cancelJob(job.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Cancel
                </button>
              ) : (
                <span className={`text-xs ${job.status === 'completed' ? 'text-green-400' : job.status === 'failed' ? 'text-red-400' : 'text-gray-500'}`}>
                  {job.status.toUpperCase()}
                </span>
              )}
            </div>
            {(job.status === 'running' || job.status === 'queued') && (
              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-1.5 transition-all duration-300"
                  style={{ width: `${Math.max(5, job.progress * 100)}%` }}
                ></div>
              </div>
            )}
            {job.status === 'failed' && job.error && (
              <div className="text-xs text-red-400 mt-2 truncate">Error: {job.error}</div>
            )}
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>{Math.round(job.progress * 100)}%</span>
              <span>{job.elapsedTimeMs > 0 ? `${(job.elapsedTimeMs / 1000).toFixed(1)}s` : ''}</span>
            </div>
            <div className="text-[10px] text-gray-600 mt-1 uppercase">Local AI Processing</div>
          </div>
        ))}
      </div>
    </div>
  );
};
