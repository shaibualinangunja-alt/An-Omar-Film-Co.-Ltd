/**
 * FreeCut Alpha 0.8 Professional Stereo Audio Meter Component
 * Visualizes Left & Right channel RMS, peak dBFS, peak hold, and clipping alerts.
 */

import React, { useEffect, useState, useRef } from 'react';
import { AudioMeterEngine } from '../../audio/audioMeter';
import { AudioMeterData } from '../../audio/types';

interface AudioMeterProps {
  mediaElement?: HTMLMediaElement | null;
  isPlaying?: boolean;
}

export const AudioMeter: React.FC<AudioMeterProps> = ({ mediaElement, isPlaying }) => {
  const engineRef = useRef<AudioMeterEngine>(new AudioMeterEngine());
  const [meterData, setMeterData] = useState<AudioMeterData>({
    leftRms: 0,
    rightRms: 0,
    leftPeakDb: -60,
    rightPeakDb: -60,
    leftPeakHold: -60,
    rightPeakHold: -60,
    isClipping: false,
  });

  useEffect(() => {
    if (mediaElement) {
      engineRef.current.connectMediaElement(mediaElement);
    }
    return () => {
      engineRef.current.disconnect();
    };
  }, [mediaElement]);

  useEffect(() => {
    let animId: number;

    const updateMeter = () => {
      if (isPlaying) {
        const data = engineRef.current.getMeterData();
        setMeterData(data);
      } else {
        // Decay to zero when paused
        setMeterData(prev => ({
          leftRms: Math.max(0, prev.leftRms - 0.05),
          rightRms: Math.max(0, prev.rightRms - 0.05),
          leftPeakDb: Math.max(-60, prev.leftPeakDb - 1.5),
          rightPeakDb: Math.max(-60, prev.rightPeakDb - 1.5),
          leftPeakHold: Math.max(-60, prev.leftPeakHold - 0.8),
          rightPeakHold: Math.max(-60, prev.rightPeakHold - 0.8),
          isClipping: false,
        }));
      }
      animId = requestAnimationFrame(updateMeter);
    };

    animId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Convert dB (-60 to 0) to percentage (0 to 100)
  const dbToPercent = (db: number) => {
    return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  };

  return (
    <div className="flex items-center space-x-1.5 bg-freecut-darkest/90 px-2 py-1 rounded border border-freecut-border select-none text-[9px] font-mono">
      <div className="flex flex-col space-y-0.5 w-24">
        {/* Left Channel */}
        <div className="flex items-center space-x-1">
          <span className="text-gray-500 w-2.5">L</span>
          <div className="flex-1 bg-gray-900 h-1.5 rounded-sm overflow-hidden relative border border-gray-800">
            <div
              style={{ width: `${dbToPercent(meterData.leftPeakDb)}%` }}
              className={`h-full transition-all duration-75 ${
                meterData.leftPeakDb >= -1
                  ? 'bg-red-500'
                  : meterData.leftPeakDb >= -6
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
            />
            {/* Peak hold pip */}
            <div
              style={{ left: `${dbToPercent(meterData.leftPeakHold)}%` }}
              className="absolute top-0 bottom-0 w-[1.5px] bg-white opacity-80"
            />
          </div>
        </div>

        {/* Right Channel */}
        <div className="flex items-center space-x-1">
          <span className="text-gray-500 w-2.5">R</span>
          <div className="flex-1 bg-gray-900 h-1.5 rounded-sm overflow-hidden relative border border-gray-800">
            <div
              style={{ width: `${dbToPercent(meterData.rightPeakDb)}%` }}
              className={`h-full transition-all duration-75 ${
                meterData.rightPeakDb >= -1
                  ? 'bg-red-500'
                  : meterData.rightPeakDb >= -6
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
            />
            {/* Peak hold pip */}
            <div
              style={{ left: `${dbToPercent(meterData.rightPeakHold)}%` }}
              className="absolute top-0 bottom-0 w-[1.5px] bg-white opacity-80"
            />
          </div>
        </div>
      </div>

      {/* Peak readout & Clip warning */}
      <div className="flex items-center space-x-1 pl-1">
        <span
          className={`px-1 py-0.2 rounded font-bold text-[8px] ${
            meterData.isClipping
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-gray-800 text-gray-400'
          }`}
          title={meterData.isClipping ? 'Audio Clipping Warning!' : 'Normal Peak Level'}
        >
          CLIP
        </span>
        <span className="text-gray-400 w-7 text-right">
          {meterData.leftPeakDb <= -59 ? '-∞' : `${Math.round(meterData.leftPeakDb)}dB`}
        </span>
      </div>
    </div>
  );
};
