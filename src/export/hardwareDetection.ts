/**
 * FreeCut Alpha 0.8 Hardware Encoder Detection
 * Detects available hardware encoders (NVENC, QuickSync, AMF, D3D12VA, MediaFoundation)
 * and provides safe fallbacks to professional software encoders.
 */

import { ExportVideoCodec, HardwareEncoderInfo } from './types';

export class HardwareDetector {
  private static detectedEncoders: HardwareEncoderInfo[] = [];
  private static isInitialized = false;

  /**
   * Initializes hardware encoder capabilities from media engine diagnostic
   */
  static initialize(rawEncodersOutput?: string): void {
    const list: HardwareEncoderInfo[] = [];

    const text = rawEncodersOutput || '';

    // NVENC (NVIDIA)
    const hasNvencH264 = text.includes('h264_nvenc');
    const hasNvencHevc = text.includes('hevc_nvenc');
    if (hasNvencH264 || hasNvencHevc) {
      list.push({
        vendor: 'nvenc',
        encoderName: 'NVIDIA NVENC Hardware Encoder',
        supportedCodecs: [
          ...(hasNvencH264 ? ['h264' as ExportVideoCodec] : []),
          ...(hasNvencHevc ? ['hevc' as ExportVideoCodec] : []),
        ],
        isAvailable: true,
      });
    }

    // Quick Sync Video (Intel QSV)
    const hasQsvH264 = text.includes('h264_qsv');
    const hasQsvHevc = text.includes('hevc_qsv');
    const hasQsvVp9 = text.includes('vp9_qsv');
    if (hasQsvH264 || hasQsvHevc || hasQsvVp9) {
      list.push({
        vendor: 'qsv',
        encoderName: 'Intel Quick Sync Video (QSV)',
        supportedCodecs: [
          ...(hasQsvH264 ? ['h264' as ExportVideoCodec] : []),
          ...(hasQsvHevc ? ['hevc' as ExportVideoCodec] : []),
          ...(hasQsvVp9 ? ['vp9' as ExportVideoCodec] : []),
        ],
        isAvailable: true,
      });
    }

    // Advanced Media Framework (AMD AMF)
    const hasAmfH264 = text.includes('h264_amf');
    const hasAmfHevc = text.includes('hevc_amf');
    if (hasAmfH264 || hasAmfHevc) {
      list.push({
        vendor: 'amf',
        encoderName: 'AMD AMF Hardware Acceleration',
        supportedCodecs: [
          ...(hasAmfH264 ? ['h264' as ExportVideoCodec] : []),
          ...(hasAmfHevc ? ['hevc' as ExportVideoCodec] : []),
        ],
        isAvailable: true,
      });
    }

    // Windows MediaFoundation
    const hasMfH264 = text.includes('h264_mf');
    const hasMfHevc = text.includes('hevc_mf');
    if (hasMfH264 || hasMfHevc) {
      list.push({
        vendor: 'mediafoundation',
        encoderName: 'Windows MediaFoundation (Hardware/OS)',
        supportedCodecs: [
          ...(hasMfH264 ? ['h264' as ExportVideoCodec] : []),
          ...(hasMfHevc ? ['hevc' as ExportVideoCodec] : []),
        ],
        isAvailable: true,
      });
    }

    this.detectedEncoders = list;
    this.isInitialized = true;
  }

  static getAvailableHardwareEncoders(): HardwareEncoderInfo[] {
    if (!this.isInitialized) {
      // Default initial query
      this.initialize('');
    }
    return this.detectedEncoders;
  }

  static getAvailableEncoders(): HardwareEncoderInfo[] {
    return this.getAvailableHardwareEncoders();
  }

  /**
   * Resolves the optimal FFmpeg encoder name for the chosen codec and acceleration preference.
   */
  static resolveEncoderName(codec: ExportVideoCodec, preferHardware: boolean = true): {
    encoderName: string;
    isHardware: boolean;
    vendor: string;
  } {
    if (preferHardware && this.detectedEncoders.length > 0) {
      // Check NVENC
      const nvenc = this.detectedEncoders.find(e => e.vendor === 'nvenc' && e.supportedCodecs.includes(codec));
      if (nvenc) {
        return {
          encoderName: codec === 'hevc' ? 'hevc_nvenc' : 'h264_nvenc',
          isHardware: true,
          vendor: 'NVIDIA NVENC',
        };
      }

      // Check QSV
      const qsv = this.detectedEncoders.find(e => e.vendor === 'qsv' && e.supportedCodecs.includes(codec));
      if (qsv) {
        return {
          encoderName: codec === 'hevc' ? 'hevc_qsv' : codec === 'vp9' ? 'vp9_qsv' : 'h264_qsv',
          isHardware: true,
          vendor: 'Intel QSV',
        };
      }

      // Check AMF
      const amf = this.detectedEncoders.find(e => e.vendor === 'amf' && e.supportedCodecs.includes(codec));
      if (amf) {
        return {
          encoderName: codec === 'hevc' ? 'hevc_amf' : 'h264_amf',
          isHardware: true,
          vendor: 'AMD AMF',
        };
      }

      // Check MediaFoundation
      const mf = this.detectedEncoders.find(e => e.vendor === 'mediafoundation' && e.supportedCodecs.includes(codec));
      if (mf) {
        return {
          encoderName: codec === 'hevc' ? 'hevc_mf' : 'h264_mf',
          isHardware: true,
          vendor: 'Windows MediaFoundation',
        };
      }
    }

    // High quality software fallbacks
    switch (codec) {
      case 'hevc':
        return { encoderName: 'libx265', isHardware: false, vendor: 'Software (libx265)' };
      case 'vp9':
        return { encoderName: 'libvpx-vp9', isHardware: false, vendor: 'Software (libvpx-vp9)' };
      case 'prores':
        return { encoderName: 'prores_ks', isHardware: false, vendor: 'Software (Apple ProRes)' };
      case 'h264':
      default:
        return { encoderName: 'libx264', isHardware: false, vendor: 'Software (libx264)' };
    }
  }
}
