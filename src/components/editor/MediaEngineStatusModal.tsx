import React, { useState, useEffect } from 'react';
import { X, Cpu, CheckCircle2, XCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { DesktopBridge } from '../../native/desktopBridge';
import { MediaEngineStatus } from '../../types/mediaEngine';

interface MediaEngineStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MediaEngineStatusModal: React.FC<MediaEngineStatusModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<MediaEngineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await DesktopBridge.getMediaEngineStatus();
      setStatus(res);
    } catch (e) {
      console.error('Error fetching engine status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyDiagnostics = () => {
    if (!status) return;
    const info = `FREECUT by ROMALABS — Media Engine Diagnostic
Professional Editing. Zero Barriers.
FFmpeg: ${status.ffmpegAvailable ? 'READY' : 'NOT FOUND'} (${status.ffmpegVersion})
FFmpeg Path: ${status.ffmpegPath || 'N/A'}
FFprobe: ${status.ffprobeAvailable ? 'READY' : 'NOT FOUND'} (${status.ffprobeVersion})
FFprobe Path: ${status.ffprobePath || 'N/A'}
Environment: ${DesktopBridge.isTauri() ? 'Tauri Native Container' : 'Desktop Local Engine Bridge'}`;

    navigator.clipboard.writeText(info);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="bg-freecut-panel border border-freecut-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-xs">
        {/* Header */}
        <div className="p-3 border-b border-freecut-border flex items-center justify-between bg-freecut-darker">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-gray-200">Media Engine Diagnostics</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-freecut-panel text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between text-gray-400 text-[11px]">
            <span>Desktop Processing Pipeline</span>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-check</span>
            </button>
          </div>

          {/* Engine Cards */}
          <div className="space-y-2.5">
            {/* FFmpeg Status */}
            <div className="bg-freecut-darkest p-3 rounded border border-freecut-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-gray-200">FFmpeg (Video/Audio Engine)</span>
                {status?.ffmpegAvailable ? (
                  <span className="flex items-center space-x-1 text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>READY</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[10px] bg-red-950/80 text-red-400 border border-red-800/80 px-2 py-0.5 rounded font-semibold">
                    <XCircle className="w-3 h-3" />
                    <span>NOT FOUND</span>
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-gray-400 truncate">
                {status?.ffmpegVersion || (status ? 'FFmpeg executable not detected' : 'Checking...')}
              </div>
              {status?.ffmpegPath && (
                <div className="text-[10px] font-mono text-gray-500 truncate mt-1" title={status.ffmpegPath}>
                  Path: {status.ffmpegPath}
                </div>
              )}
            </div>

            {/* FFprobe Status */}
            <div className="bg-freecut-darkest p-3 rounded border border-freecut-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-gray-200">FFprobe (Media Inspector)</span>
                {status?.ffprobeAvailable ? (
                  <span className="flex items-center space-x-1 text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>READY</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-[10px] bg-red-950/80 text-red-400 border border-red-800/80 px-2 py-0.5 rounded font-semibold">
                    <XCircle className="w-3 h-3" />
                    <span>NOT FOUND</span>
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-gray-400 truncate">
                {status?.ffprobeVersion || (status ? 'FFprobe executable not detected' : 'Checking...')}
              </div>
              {status?.ffprobePath && (
                <div className="text-[10px] font-mono text-gray-500 truncate mt-1" title={status.ffprobePath}>
                  Path: {status.ffprobePath}
                </div>
              )}
            </div>
          </div>

          {!status?.ffmpegAvailable && status && (
            <div className="p-2.5 bg-amber-950/30 border border-amber-800/50 rounded text-amber-300 text-[11px]">
              FreeCut could not find FFmpeg. Install FFmpeg and restart FreeCut.
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-freecut-border">
            <button
              onClick={handleCopyDiagnostics}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-freecut-darker hover:bg-freecut-elevated border border-freecut-border text-gray-300 text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Diagnostics'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded text-[11px]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
