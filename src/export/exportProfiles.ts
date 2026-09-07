/**
 * FreeCut Alpha 0.8 Professional Export Profiles
 * Houses verified broadcast and web delivery presets.
 */

import { ExportProfile } from './types';

export class ExportProfileRegistry {
  private static profiles: ExportProfile[] = [
    {
      id: 'web_1080p',
      name: 'Full HD 1080p (Web & YouTube)',
      description: '1920x1080 H.264 MP4 optimized for YouTube and web streaming.',
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      width: 1920,
      height: 1080,
      fps: 30,
      videoBitrateKbps: 12000,
      audioBitrateKbps: 192,
      qualityPreset: 'medium',
      useHardwareAcceleration: true,
      colorSpace: 'rec709',
      colorRange: 'limited',
    },
    {
      id: 'qhd_1440p',
      name: 'QHD 1440p (High Res Web)',
      description: '2560x1440 H.264 MP4 with enhanced bit budget for sharp desktop viewing.',
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      width: 2560,
      height: 1440,
      fps: 30,
      videoBitrateKbps: 24000,
      audioBitrateKbps: 256,
      qualityPreset: 'medium',
      useHardwareAcceleration: true,
      colorSpace: 'rec709',
      colorRange: 'limited',
    },
    {
      id: 'uhd_4k',
      name: 'UHD 4K (Ultra High Definition)',
      description: '3840x2160 HEVC / H.265 high efficiency master quality.',
      container: 'mp4',
      videoCodec: 'hevc',
      audioCodec: 'aac',
      width: 3840,
      height: 2160,
      fps: 30,
      videoBitrateKbps: 45000,
      audioBitrateKbps: 320,
      qualityPreset: 'medium',
      useHardwareAcceleration: true,
      colorSpace: 'rec709',
      colorRange: 'limited',
    },
    {
      id: 'social_vertical_9_16',
      name: 'Social / Vertical (1080x1920 9:16)',
      description: '1080x1920 vertical H.264 MP4 for mobile reels, shorts, and stories.',
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      width: 1080,
      height: 1920,
      fps: 30,
      videoBitrateKbps: 10000,
      audioBitrateKbps: 192,
      qualityPreset: 'medium',
      useHardwareAcceleration: true,
      colorSpace: 'rec709',
      colorRange: 'limited',
    },
    {
      id: 'master_prores',
      name: 'High Quality Master (Apple ProRes 422)',
      description: 'Broadcast production master with visually lossless 10-bit color.',
      container: 'mov',
      videoCodec: 'prores',
      audioCodec: 'pcm_s16le',
      width: 1920,
      height: 1080,
      fps: 30,
      videoBitrateKbps: 147000,
      audioBitrateKbps: 1536,
      qualityPreset: 'crf',
      proresProfile: 'standard',
      useHardwareAcceleration: false,
      colorSpace: 'rec709',
      colorRange: 'limited',
    },
    {
      id: 'webm_vp9',
      name: 'Open WebM (VP9 + Opus)',
      description: 'Royalty-free HTML5 video format with Opus stereo audio.',
      container: 'webm',
      videoCodec: 'vp9',
      audioCodec: 'opus',
      width: 1920,
      height: 1080,
      fps: 30,
      videoBitrateKbps: 8000,
      audioBitrateKbps: 160,
      qualityPreset: 'medium',
      useHardwareAcceleration: true,
      colorSpace: 'rec709',
      colorRange: 'limited',
    },
  ];

  static listProfiles(): ExportProfile[] {
    return this.profiles;
  }

  static getProfile(id: string): ExportProfile | undefined {
    return this.profiles.find(p => p.id === id);
  }

  static getDefaultProfile(): ExportProfile {
    return this.profiles[0];
  }

  static createCustomProfile(overrides: Partial<ExportProfile> = {}): ExportProfile {
    return {
      id: overrides.id || `custom_${Date.now()}`,
      name: overrides.name || 'Custom Profile',
      description: overrides.description || 'Custom user defined export settings',
      container: overrides.container || 'mp4',
      videoCodec: overrides.videoCodec || 'h264',
      audioCodec: overrides.audioCodec || 'aac',
      width: overrides.width || 1920,
      height: overrides.height || 1080,
      fps: overrides.fps || 30,
      videoBitrateKbps: overrides.videoBitrateKbps || 12000,
      audioBitrateKbps: overrides.audioBitrateKbps || 192,
      qualityPreset: overrides.qualityPreset || 'medium',
      useHardwareAcceleration: overrides.useHardwareAcceleration ?? true,
      colorSpace: overrides.colorSpace || 'rec709',
      colorRange: overrides.colorRange || 'limited',
      ...overrides,
    };
  }
}
