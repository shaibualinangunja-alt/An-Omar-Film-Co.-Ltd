/**
 * FreeCut Alpha 0.8 Real-time Audio Meter Engine
 * Analyzes audio playback levels using Web Audio API to calculate RMS, peak hold, and clipping.
 */

import { AudioMeterData } from './types';

export class AudioMeterEngine {
  private audioCtx: AudioContext | null = null;
  private analyserLeft: AnalyserNode | null = null;
  private analyserRight: AnalyserNode | null = null;
  private splitter: ChannelSplitterNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private currentElement: HTMLMediaElement | null = null;

  private leftPeakHold: number = -60;
  private rightPeakHold: number = -60;
  private lastHoldTime: number = 0;

  connectMediaElement(element: HTMLMediaElement): void {
    if (this.currentElement === element) return;
    this.disconnect();

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      this.sourceNode = this.audioCtx.createMediaElementSource(element);
      this.splitter = this.audioCtx.createChannelSplitter(2);

      this.analyserLeft = this.audioCtx.createAnalyser();
      this.analyserRight = this.audioCtx.createAnalyser();
      this.analyserLeft.fftSize = 512;
      this.analyserRight.fftSize = 512;

      // Connect: source -> splitter -> left/right analysers -> destination
      this.sourceNode.connect(this.splitter);
      this.splitter.connect(this.analyserLeft, 0);
      this.splitter.connect(this.analyserRight, 1);

      // Pass-through to speakers
      this.sourceNode.connect(this.audioCtx.destination);
      this.currentElement = element;
    } catch (e) {
      console.warn('[AudioMeterEngine] Could not connect media element to AudioContext:', e);
    }
  }

  disconnect(): void {
    try {
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      this.currentElement = null;
    } catch (_) {}
  }

  getMeterData(): AudioMeterData {
    if (!this.analyserLeft || !this.analyserRight) {
      return {
        leftRms: 0,
        rightRms: 0,
        leftPeakDb: -60,
        rightPeakDb: -60,
        leftPeakHold: -60,
        rightPeakHold: -60,
        isClipping: false,
      };
    }

    const leftData = new Float32Array(this.analyserLeft.fftSize);
    const rightData = new Float32Array(this.analyserRight.fftSize);

    this.analyserLeft.getFloatTimeDomainData(leftData);
    this.analyserRight.getFloatTimeDomainData(rightData);

    let leftSumSq = 0;
    let rightSumSq = 0;
    let leftPeak = 0;
    let rightPeak = 0;

    for (let i = 0; i < leftData.length; i++) {
      const l = Math.abs(leftData[i]);
      const r = Math.abs(rightData[i]);
      leftSumSq += l * l;
      rightSumSq += r * r;
      if (l > leftPeak) leftPeak = l;
      if (r > rightPeak) rightPeak = r;
    }

    const leftRms = Math.sqrt(leftSumSq / leftData.length);
    const rightRms = Math.sqrt(rightSumSq / rightData.length);

    const toDb = (linear: number): number => {
      if (linear <= 0.0001) return -60;
      return Math.max(-60, Math.min(6, 20 * Math.log10(linear)));
    };

    const leftDb = toDb(leftPeak);
    const rightDb = toDb(rightPeak);

    // Peak Hold logic with decay
    const now = Date.now();
    if (leftDb > this.leftPeakHold || now - this.lastHoldTime > 1500) {
      this.leftPeakHold = leftDb;
    } else {
      this.leftPeakHold = Math.max(-60, this.leftPeakHold - 0.5);
    }

    if (rightDb > this.rightPeakHold || now - this.lastHoldTime > 1500) {
      this.rightPeakHold = rightDb;
    } else {
      this.rightPeakHold = Math.max(-60, this.rightPeakHold - 0.5);
    }

    this.lastHoldTime = now;

    return {
      leftRms: Math.min(1.0, leftRms * 1.5),
      rightRms: Math.min(1.0, rightRms * 1.5),
      leftPeakDb: leftDb,
      rightPeakDb: rightDb,
      leftPeakHold: this.leftPeakHold,
      rightPeakHold: this.rightPeakHold,
      isClipping: leftPeak >= 0.99 || rightPeak >= 0.99,
    };
  }
}
