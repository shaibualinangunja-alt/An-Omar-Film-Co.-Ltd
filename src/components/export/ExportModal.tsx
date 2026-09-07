import React, { useState } from 'react';
import { X, Download, Film, CheckCircle2, AlertCircle, Loader2, Cpu } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { ExportService } from '../../services/exportService';
import { ExportProgress, ExportSettings } from '../../types/export';
import { ExportProfileRegistry } from '../../export/exportProfiles';
import { ExportContainer, ExportVideoCodec, ExportAudioCodec, HardwareEncoderInfo } from '../../export/types';
import { HardwareDetector } from '../../export/hardwareDetection';

export const ExportModal: React.FC = () => {
  const [state, store] = useProjectStore();
  const proj = state.project.project;

  const defaultProfiles = ExportProfileRegistry.listProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState<string>('web_1080p');
  
  const [container, setContainer] = useState<ExportContainer>('mp4');
  const [videoCodec, setVideoCodec] = useState<ExportVideoCodec>('h264');
  const [audioCodec, setAudioCodec] = useState<ExportAudioCodec>('aac');
  const [width, setWidth] = useState<number>(1920);
  const [height, setHeight] = useState<number>(1080);
  const [fps, setFps] = useState<number>(proj.fps || 30);
  const [bitrateKbps, setBitrateKbps] = useState<number>(12000);
  const [useHardware, setUseHardware] = useState<boolean>(true);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  const hwEncoders = HardwareDetector.getAvailableEncoders();
  const hasHardware = hwEncoders.length > 0;

  // Apply profile when selected
  const handleProfileChange = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (profileId === 'custom') return;

    const prof = ExportProfileRegistry.getProfile(profileId);
    if (prof) {
      setContainer(prof.container);
      setVideoCodec(prof.videoCodec);
      setAudioCodec(prof.audioCodec);
      setWidth(prof.width);
      setHeight(prof.height);
      setFps(prof.fps);
      setBitrateKbps(prof.videoBitrateKbps);
    }
  };

  if (!state.isExportModalOpen) return null;

  const ext = container === 'mov' ? 'mov' : container === 'webm' ? 'webm' : 'mp4';
  const outFilename = `${proj.name || 'FreeCut_Master'}.${ext}`;

  const handleStartExport = async () => {
    const settings: ExportSettings = {
      filename: outFilename,
      outputPath: outFilename,
      format: container,
      videoCodec,
      audioCodec,
      width,
      height,
      fps,
      videoBitrateKbps: bitrateKbps,
      audioBitrateKbps: 192,
      useHardwareAcceleration: useHardware,
    };

    try {
      await ExportService.startExport(state.project, settings, progress => {
        setExportProgress(progress);
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const isRendering = exportProgress && ['preparing', 'rendering'].includes(exportProgress.status);
  const isFinished = exportProgress && exportProgress.status === 'completed';
  const isError = exportProgress && exportProgress.status === 'error';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="bg-freecut-panel border border-freecut-border rounded-lg shadow-2xl w-full max-w-xl overflow-hidden text-xs">
        {/* Header */}
        <div className="p-3 border-b border-freecut-border flex items-center justify-between bg-freecut-darker">
          <div className="flex items-center space-x-2">
            <Film className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-gray-200">Export Video (Professional Master Render)</h3>
          </div>
          {!isRendering && (
            <button
              onClick={() => {
                setExportProgress(null);
                store.setState({ isExportModalOpen: false });
              }}
              className="p-1 rounded hover:bg-freecut-panel text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {!exportProgress ? (
            <>
              {/* Preset Selection */}
              <div className="bg-freecut-darkest p-3 rounded border border-freecut-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-200 font-semibold">Master Export Profile</span>
                  <select
                    value={selectedProfileId}
                    onChange={e => handleProfileChange(e.target.value)}
                    className="bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-cyan-300 font-medium text-[11px]"
                  >
                    {defaultProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="custom">Custom Configuration</option>
                  </select>
                </div>

                {/* Grid of specs */}
                <div className="grid grid-cols-3 gap-2.5 text-[11px] pt-1">
                  <div>
                    <label className="text-gray-500 block mb-1">Container</label>
                    <select
                      value={container}
                      onChange={e => {
                        setContainer(e.target.value as ExportContainer);
                        setSelectedProfileId('custom');
                      }}
                      className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200"
                    >
                      <option value="mp4">MP4 (.mp4)</option>
                      <option value="mov">QuickTime (.mov)</option>
                      <option value="webm">WebM (.webm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Video Codec</label>
                    <select
                      value={videoCodec}
                      onChange={e => {
                        setVideoCodec(e.target.value as ExportVideoCodec);
                        setSelectedProfileId('custom');
                      }}
                      className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200"
                    >
                      <option value="h264">H.264 / AVC</option>
                      <option value="hevc">H.265 / HEVC</option>
                      <option value="vp9">VP9</option>
                      <option value="prores">Apple ProRes 422</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Audio Codec</label>
                    <select
                      value={audioCodec}
                      onChange={e => {
                        setAudioCodec(e.target.value as ExportAudioCodec);
                        setSelectedProfileId('custom');
                      }}
                      className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200"
                    >
                      <option value="aac">AAC Stereo</option>
                      <option value="opus">Opus Audio</option>
                      <option value="pcm">PCM 16-bit (Lossless)</option>
                      <option value="mp3">MP3</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-[11px] pt-1">
                  <div>
                    <label className="text-gray-500 block mb-1">Dimensions</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={width}
                        onChange={e => {
                          setWidth(Number(e.target.value));
                          setSelectedProfileId('custom');
                        }}
                        className="w-full bg-freecut-panel border border-freecut-border rounded px-1.5 py-1 text-gray-200 font-mono text-[10px]"
                      />
                      <span className="text-gray-500">×</span>
                      <input
                        type="number"
                        value={height}
                        onChange={e => {
                          setHeight(Number(e.target.value));
                          setSelectedProfileId('custom');
                        }}
                        className="w-full bg-freecut-panel border border-freecut-border rounded px-1.5 py-1 text-gray-200 font-mono text-[10px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Frame Rate</label>
                    <select
                      value={fps}
                      onChange={e => {
                        setFps(Number(e.target.value));
                        setSelectedProfileId('custom');
                      }}
                      className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200"
                    >
                      <option value="24">24 fps (Cinema)</option>
                      <option value="25">25 fps (PAL)</option>
                      <option value="30">30 fps (Standard)</option>
                      <option value="60">60 fps (High Motion)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Target Bitrate</label>
                    <select
                      value={bitrateKbps}
                      onChange={e => {
                        setBitrateKbps(Number(e.target.value));
                        setSelectedProfileId('custom');
                      }}
                      className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200"
                    >
                      <option value="4000">Web / Proxy (4 Mbps)</option>
                      <option value="8000">Standard HD (8 Mbps)</option>
                      <option value="12000">High Quality (12 Mbps)</option>
                      <option value="25000">High Bitrate 4K (25 Mbps)</option>
                      <option value="50000">Master Grade (50 Mbps)</option>
                    </select>
                  </div>
                </div>

                {/* Hardware Acceleration Status */}
                <div className="pt-2 border-t border-freecut-border/50 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5 text-gray-300">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Hardware Encoding:</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${hasHardware ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-800 text-gray-400'}`}>
                      {hasHardware ? hwEncoders.map((e: HardwareEncoderInfo) => e.encoderName).join(', ') : 'Software CPU Fallback'}
                    </span>
                  </div>

                  <label className="flex items-center space-x-1.5 cursor-pointer text-gray-400 hover:text-gray-200">
                    <input
                      type="checkbox"
                      checked={useHardware}
                      onChange={e => setUseHardware(e.target.checked)}
                      className="rounded bg-freecut-panel border-freecut-border text-cyan-500"
                    />
                    <span>Enable Acceleration</span>
                  </label>
                </div>
              </div>

              {/* Output File Summary */}
              <div className="text-[11px] text-gray-400 flex items-center justify-between px-1">
                <span>Output File: <strong className="text-gray-200 font-mono">{outFilename}</strong></span>
                <span className="text-gray-500">{width}×{height} @ {fps}fps • {container.toUpperCase()}</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => store.setState({ isExportModalOpen: false })}
                  className="px-3 py-1.5 rounded bg-freecut-darker hover:bg-freecut-elevated border border-freecut-border text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartExport}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Start Export</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              {isRendering && (
                <>
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-200">Rendering Video Pipeline...</h4>
                    <p className="text-gray-500 text-[11px] mt-1">
                      Executing FFmpeg multi-track render • Frame {exportProgress.currentFrame} / {exportProgress.totalFrames}
                    </p>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-freecut-darkest border border-freecut-border rounded-full h-3 overflow-hidden p-0.5">
                    <div
                      style={{ width: `${exportProgress.percent}%` }}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-200"
                    />
                  </div>
                  <div className="flex justify-between w-full text-[10px] text-gray-400 font-mono px-1">
                    <span>{exportProgress.percent}% completed</span>
                    <span>ETA: ~{exportProgress.etaSeconds}s</span>
                  </div>
                </>
              )}

              {isFinished && (
                <>
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-100">Export Complete!</h4>
                    <p className="text-gray-400 text-[11px] mt-1">
                      Your video has been rendered according to project specifications.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setExportProgress(null);
                      store.setState({ isExportModalOpen: false });
                    }}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded"
                  >
                    Close
                  </button>
                </>
              )}

              {isError && (
                <>
                  <AlertCircle className="w-12 h-12 text-red-400" />
                  <div>
                    <h4 className="text-sm font-bold text-red-300">Export Failed</h4>
                    <p className="text-gray-400 text-[11px] mt-1">
                      {exportProgress.errorMessage || 'An error occurred during export render.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setExportProgress(null)}
                    className="px-4 py-1.5 bg-freecut-elevated border border-freecut-border text-gray-200 rounded"
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
