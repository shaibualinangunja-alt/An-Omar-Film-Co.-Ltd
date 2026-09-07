/**
 * FreeCut Alpha 0.8 Color Space Registry
 * Houses standard color spaces, gamuts, transfer functions, and automatic FFprobe metadata detection.
 */

import { StandardColorSpace, ColorSpaceDescriptor, ColorRange } from './types';

export class ColorSpaceRegistry {
  private static descriptors: Map<StandardColorSpace, ColorSpaceDescriptor> = new Map([
    [
      'rec709',
      {
        id: 'rec709',
        name: 'Rec.709 / BT.709 (HD Broadcast)',
        category: 'sdr',
        gamma: 'BT.709 (2.4)',
        primaries: 'BT.709',
        isHdr: false,
        isLog: false,
        description: 'Standard HDTV broadcast color space with Rec.709 primaries and gamma.',
      },
    ],
    [
      'srgb',
      {
        id: 'srgb',
        name: 'sRGB (Web & Computer Graphics)',
        category: 'sdr',
        gamma: 'sRGB (IEC 61966-2-1)',
        primaries: 'BT.709',
        isHdr: false,
        isLog: false,
        description: 'Standard color space for web and digital computer displays.',
      },
    ],
    [
      'rec601',
      {
        id: 'rec601',
        name: 'Rec.601 (NTSC/PAL SD)',
        category: 'sdr',
        gamma: 'BT.601',
        primaries: 'SMPTE-C / EBU',
        isHdr: false,
        isLog: false,
        description: 'Legacy standard definition television broadcast standard.',
      },
    ],
    [
      'rec2020',
      {
        id: 'rec2020',
        name: 'Rec.2020 / BT.2020 (UHD Wide Gamut)',
        category: 'wide_gamut',
        gamma: 'BT.2020 (2.4)',
        primaries: 'BT.2020',
        isHdr: false,
        isLog: false,
        description: 'Ultra HD wide gamut color space with massive color volume.',
      },
    ],
    [
      'rec2100_pq',
      {
        id: 'rec2100_pq',
        name: 'Rec.2100 PQ (HDR10 / ST 2084)',
        category: 'hdr',
        gamma: 'Perceptual Quantizer (ST 2084)',
        primaries: 'BT.2020',
        isHdr: true,
        isLog: false,
        description: 'High Dynamic Range master space supporting up to 10,000 nits peak luminance.',
      },
    ],
    [
      'rec2100_hlg',
      {
        id: 'rec2100_hlg',
        name: 'Rec.2100 HLG (Hybrid Log-Gamma)',
        category: 'hdr',
        gamma: 'HLG (ARIB STD-B67)',
        primaries: 'BT.2020',
        isHdr: true,
        isLog: false,
        description: 'Broadcast HDR standard backward-compatible with standard SDR displays.',
      },
    ],
    [
      'sony_slog3',
      {
        id: 'sony_slog3',
        name: 'Sony S-Log3 / S-Gamut3.Cine',
        category: 'log',
        gamma: 'S-Log3',
        primaries: 'S-Gamut3.Cine',
        isHdr: false,
        isLog: true,
        description: 'Sony cinema camera logarithmic profile designed for grading high dynamic range.',
      },
    ],
    [
      'canon_clog',
      {
        id: 'canon_clog',
        name: 'Canon Log / Cinema Gamut',
        category: 'log',
        gamma: 'Canon Log / C-Log3',
        primaries: 'Cinema Gamut',
        isHdr: false,
        isLog: true,
        description: 'Canon logarithmic gamma providing 12-14 stops of dynamic range.',
      },
    ],
    [
      'panasonic_vlog',
      {
        id: 'panasonic_vlog',
        name: 'Panasonic V-Log / V-Gamut',
        category: 'log',
        gamma: 'V-Log',
        primaries: 'V-Gamut',
        isHdr: false,
        isLog: true,
        description: 'Panasonic 14+ stops cinema profile with wider gamut than BT.2020.',
      },
    ],
    [
      'arri_logc',
      {
        id: 'arri_logc',
        name: 'ARRI LogC3 / ARRI Wide Gamut',
        category: 'log',
        gamma: 'LogC3',
        primaries: 'ARRI Wide Gamut 3',
        isHdr: false,
        isLog: true,
        description: 'The industry-standard digital cinema film curve from ARRI ALEXA sensors.',
      },
    ],
    [
      'apple_log',
      {
        id: 'apple_log',
        name: 'Apple Log (iPhone 15+ Pro)',
        category: 'log',
        gamma: 'Apple Log',
        primaries: 'BT.2020',
        isHdr: false,
        isLog: true,
        description: 'Apple ProRes Log curve capturing extended shadow and highlight detail.',
      },
    ],
    [
      'dji_dlog',
      {
        id: 'dji_dlog',
        name: 'DJI D-Log / D-Gamut',
        category: 'log',
        gamma: 'D-Log',
        primaries: 'D-Gamut',
        isHdr: false,
        isLog: true,
        description: 'DJI aerial and gimbal log profile maximizing highlight retention.',
      },
    ],
    [
      'fuji_flog',
      {
        id: 'fuji_flog',
        name: 'Fujifilm F-Log / F-Log2',
        category: 'log',
        gamma: 'F-Log',
        primaries: 'F-Gamut',
        isHdr: false,
        isLog: true,
        description: 'Fujifilm cinema logarithmic curve optimized for 13+ stops.',
      },
    ],
    [
      'bmd_gen5',
      {
        id: 'bmd_gen5',
        name: 'Blackmagic Film (Gen 5)',
        category: 'log',
        gamma: 'Blackmagic Film Gen 5',
        primaries: 'Blackmagic Wide Gamut',
        isHdr: false,
        isLog: true,
        description: 'Blackmagic Generation 5 color science with accurate skin tone preservation.',
      },
    ],
  ]);

  static listColorSpaces(): ColorSpaceDescriptor[] {
    return Array.from(this.descriptors.values());
  }

  static getColorSpace(id: StandardColorSpace): ColorSpaceDescriptor | undefined {
    return this.descriptors.get(id);
  }

  /**
   * Detects color space and range from ffprobe stream metadata
   */
  static detectFromMediaMetadata(streamInfo: {
    color_space?: string;
    color_transfer?: string;
    color_primaries?: string;
    color_range?: string;
  }): { detectedSpace: StandardColorSpace; detectedRange: ColorRange; confidence: 'high' | 'medium' | 'fallback' } {
    const space = (streamInfo.color_space || '').toLowerCase();
    const transfer = (streamInfo.color_transfer || '').toLowerCase();
    const primaries = (streamInfo.color_primaries || '').toLowerCase();
    const range = (streamInfo.color_range || '').toLowerCase();

    const detectedRange: ColorRange = range === 'pc' || range === 'full' ? 'full' : 'limited';

    // 1. HDR Checks
    if (transfer.includes('smpte2084') || transfer.includes('arib-std-b67') || transfer.includes('pq') || transfer.includes('hlg')) {
      if (transfer.includes('arib-std-b67') || transfer.includes('hlg')) {
        return { detectedSpace: 'rec2100_hlg', detectedRange, confidence: 'high' };
      }
      return { detectedSpace: 'rec2100_pq', detectedRange, confidence: 'high' };
    }

    // 2. Wide Gamut UHD BT.2020
    if (primaries.includes('bt2020') || space.includes('bt2020')) {
      return { detectedSpace: 'rec2020', detectedRange, confidence: 'high' };
    }

    // 3. Rec.709
    if (space.includes('bt709') || transfer.includes('bt709') || primaries.includes('bt709')) {
      return { detectedSpace: 'rec709', detectedRange, confidence: 'high' };
    }

    // 4. sRGB
    if (transfer.includes('iec61966') || transfer.includes('srgb')) {
      return { detectedSpace: 'srgb', detectedRange, confidence: 'high' };
    }

    // 5. Rec.601
    if (space.includes('smpte170m') || space.includes('bt470') || space.includes('bt601')) {
      return { detectedSpace: 'rec601', detectedRange, confidence: 'high' };
    }

    // Fallback default
    return {
      detectedSpace: 'rec709',
      detectedRange: 'limited',
      confidence: 'fallback',
    };
  }

  static listSpaces(): ColorSpaceDescriptor[] {
    return this.listColorSpaces();
  }

  static getSpace(id: StandardColorSpace): ColorSpaceDescriptor | undefined {
    return this.getColorSpace(id);
  }

  static detectFromMetadata(
    color_space?: string,
    color_transfer?: string,
    color_primaries?: string,
    color_range?: string
  ): { colorSpace: StandardColorSpace; colorRange: ColorRange } {
    const res = this.detectFromMediaMetadata({
      color_space,
      color_transfer,
      color_primaries,
      color_range,
    });
    return {
      colorSpace: res.detectedSpace,
      colorRange: res.detectedRange,
    };
  }
}
