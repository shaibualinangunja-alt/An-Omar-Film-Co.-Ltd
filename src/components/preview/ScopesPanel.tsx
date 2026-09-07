/**
 * FreeCut Alpha 0.8 Professional Color Scopes Panel
 * Displays real-time Waveform, RGB Parade, Vectorscope, and Histogram
 * derived from the active preview frame with throttling.
 */

import React, { useRef, useEffect, useState } from 'react';
import { ScopesEngine, WaveformMode } from '../../color/scopes';
import { Activity, BarChart2, Compass, LayoutGrid } from 'lucide-react';

interface ScopesPanelProps {
  sourceCanvas: HTMLCanvasElement | null;
  isOpen: boolean;
  onClose: () => void;
}

export type ScopeTab = 'waveform' | 'parade' | 'vectorscope' | 'histogram' | 'quad';

export const ScopesPanel: React.FC<ScopesPanelProps> = ({ sourceCanvas, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ScopeTab>('waveform');
  const [waveformMode, setWaveformMode] = useState<WaveformMode>('luma');

  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const paradeCanvasRef = useRef<HTMLCanvasElement>(null);
  const vectorCanvasRef = useRef<HTMLCanvasElement>(null);
  const histCanvasRef = useRef<HTMLCanvasElement>(null);

  const lastRenderTimeRef = useRef<number>(0);
  const offCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen || !sourceCanvas) return;

    let animId: number;

    const updateScopes = () => {
      const now = performance.now();
      // Throttle scopes to max 15 FPS (every 66ms) to preserve playback performance
      if (now - lastRenderTimeRef.current >= 66) {
        lastRenderTimeRef.current = now;

        const srcCtx = sourceCanvas.getContext('2d');
        if (srcCtx && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
          try {
            // Sample a downscaled version (320x180 max) for crisp yet high-performance scope analysis
            const sampleW = Math.min(320, sourceCanvas.width);
            const sampleH = Math.min(180, sourceCanvas.height);

            if (!offCanvasRef.current) {
              offCanvasRef.current = document.createElement('canvas');
            }
            const offCanvas = offCanvasRef.current;
            if (offCanvas.width !== sampleW || offCanvas.height !== sampleH) {
              offCanvas.width = sampleW;
              offCanvas.height = sampleH;
            }
            const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

            if (offCtx) {
              offCtx.drawImage(sourceCanvas, 0, 0, sampleW, sampleH);
              const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);

              if (activeTab === 'waveform' || activeTab === 'quad') {
                if (waveformCanvasRef.current) {
                  ScopesEngine.renderWaveform(imgData, waveformCanvasRef.current, waveformMode);
                }
              }

              if (activeTab === 'parade' || activeTab === 'quad') {
                if (paradeCanvasRef.current) {
                  ScopesEngine.renderParade(imgData, paradeCanvasRef.current);
                }
              }

              if (activeTab === 'vectorscope' || activeTab === 'quad') {
                if (vectorCanvasRef.current) {
                  ScopesEngine.renderVectorscope(imgData, vectorCanvasRef.current);
                }
              }

              if (activeTab === 'histogram' || activeTab === 'quad') {
                if (histCanvasRef.current) {
                  ScopesEngine.renderHistogram(imgData, histCanvasRef.current);
                }
              }
            }
          } catch (_) {}
        }
      }

      animId = requestAnimationFrame(updateScopes);
    };

    animId = requestAnimationFrame(updateScopes);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, sourceCanvas, activeTab, waveformMode]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-12 right-2 z-30 bg-freecut-darker/95 border border-freecut-border rounded-lg shadow-2xl p-2.5 flex flex-col w-[420px] h-[310px] backdrop-blur-md select-none text-xs">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between border-b border-freecut-border/80 pb-2 mb-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('waveform')}
            className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-medium transition-colors ${
              activeTab === 'waveform'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Waveform</span>
          </button>

          <button
            onClick={() => setActiveTab('parade')}
            className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-medium transition-colors ${
              activeTab === 'parade'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span>Parade</span>
          </button>

          <button
            onClick={() => setActiveTab('vectorscope')}
            className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-medium transition-colors ${
              activeTab === 'vectorscope'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Vectorscope</span>
          </button>

          <button
            onClick={() => setActiveTab('histogram')}
            className={`px-2 py-1 rounded flex items-center space-x-1 text-[11px] font-medium transition-colors ${
              activeTab === 'histogram'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            <span>Histogram</span>
          </button>

          <button
            onClick={() => setActiveTab('quad')}
            className={`px-1.5 py-1 rounded text-[11px] font-medium transition-colors ${
              activeTab === 'quad'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            title="All 4 Scopes Quad View"
          >
            4-Up
          </button>
        </div>

        <div className="flex items-center space-x-1">
          {activeTab === 'waveform' && (
            <button
              onClick={() => setWaveformMode(m => m === 'luma' ? 'rgb' : 'luma')}
              className="text-[10px] px-1.5 py-0.5 rounded bg-freecut-panel border border-freecut-border text-gray-300 hover:text-white"
            >
              {waveformMode === 'luma' ? 'Luma' : 'RGB'}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-1.5 py-0.5 text-[11px]"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scope Canvas Area */}
      <div className="flex-1 w-full h-full relative rounded overflow-hidden bg-black/80 flex items-center justify-center">
        {activeTab === 'waveform' && (
          <canvas ref={waveformCanvasRef} width={400} height={250} className="w-full h-full rounded" />
        )}

        {activeTab === 'parade' && (
          <canvas ref={paradeCanvasRef} width={400} height={250} className="w-full h-full rounded" />
        )}

        {activeTab === 'vectorscope' && (
          <canvas ref={vectorCanvasRef} width={400} height={250} className="w-full h-full rounded" />
        )}

        {activeTab === 'histogram' && (
          <canvas ref={histCanvasRef} width={400} height={250} className="w-full h-full rounded" />
        )}

        {activeTab === 'quad' && (
          <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full p-0.5">
            <canvas ref={waveformCanvasRef} width={200} height={120} className="w-full h-full rounded" />
            <canvas ref={vectorCanvasRef} width={200} height={120} className="w-full h-full rounded" />
            <canvas ref={paradeCanvasRef} width={200} height={120} className="w-full h-full rounded" />
            <canvas ref={histCanvasRef} width={200} height={120} className="w-full h-full rounded" />
          </div>
        )}
      </div>
    </div>
  );
};
