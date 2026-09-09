/**
 * FreeCut Alpha 0.8 Centralized Audio Mixing Engine
 * Compiles multi-track audio clips, fades, pan, volume, and timeline timing
 * into deterministic FFmpeg audio filter graphs.
 */

import { FreeCutProject, ClipItem, TimelineTrack } from '../types/project';

export interface CompiledAudioGraph {
  filterComplexParts: string[];
  outputStream: string | null;
  hasAudio: boolean;
}

export class AudioMixer {
  /**
   * Generates FFmpeg audio filter tokens for an individual clip's audio suite effects.
   */
  static generateAudioFilterChain(fx?: import('./types').ClipAudioEffects, volume: number = 1.0): string[] {
    const filters: string[] = [];
    if (Math.abs(volume - 1.0) > 0.01) {
      filters.push(`volume=${volume.toFixed(2)}`);
    }

    // 1. Cleanup / Denoise
    if (fx?.denoise?.enabled) {
      const nrAmount = Math.max(1, Math.min(97, Math.round((fx.denoise.amount / 100) * 35)));
      const noiseFloor = -50 + Math.round((fx.denoise.amount / 100) * 30);
      filters.push(`afftdn=nr=${nrAmount}:nf=${noiseFloor}`);
      if (fx.denoise.highpass) {
        filters.push('highpass=f=80');
      }
    }

    // 2. Voice Enhancement & Speech Clarity
    if (fx?.voice?.enabled) {
      const clarityGain = ((fx.voice.clarity / 100) * 6).toFixed(1);
      filters.push('highpass=f=85', `equalizer=f=3200:width_type=q:w=1.2:g=${clarityGain}`);
      if (fx.voice.enhance) {
        filters.push('acompressor=threshold=-16dB:ratio=3:attack=15:release=200');
      }
    }

    // 3. 5-Band Parametric EQ
    if (fx?.eq?.enabled) {
      const bands = [fx.eq.low, fx.eq.lowMid, fx.eq.mid, fx.eq.highMid, fx.eq.high];
      for (const band of bands) {
        if (band && Math.abs(band.gain) > 0.1) {
          filters.push(`equalizer=f=${Math.round(band.freq)}:width_type=q:w=${band.q.toFixed(2)}:g=${band.gain.toFixed(1)}`);
        }
      }
    }

    // 4. Reverb
    if (fx?.reverb?.enabled) {
      const inGain = ((100 - fx.reverb.wetDry * 0.4) / 100).toFixed(2);
      const outGain = (fx.reverb.wetDry / 120).toFixed(2);
      const delay = Math.max(20, Math.min(250, Math.round(fx.reverb.roomSize * 1.8 + fx.reverb.preDelay)));
      const decay = Math.max(0.1, Math.min(0.7, (fx.reverb.decay / 150))).toFixed(2);
      filters.push(`aecho=${inGain}:${outGain}:${delay}:${decay}`);
    }

    return filters;
  }

  /**
   * Compiles the project's audio clips into an FFmpeg filter_complex sub-graph.
   */
  static compileAudioMix(
    project: FreeCutProject,
    mediaMap: Map<string, number>,
    _totalProjectDuration: number = 5
  ): CompiledAudioGraph {
    const filterComplexParts: string[] = [];

    // 1. Identify active audio tracks
    const audioTracks = project.tracks.filter(t => t.type === 'audio');
    const hasSoloTrack = audioTracks.some(t => t.solo);

    // Track active lookup
    const isTrackAudible = (trackId: string): boolean => {
      const track = project.tracks.find(t => t.id === trackId);
      if (!track) return true;
      if (hasSoloTrack) {
        return track.solo && !track.muted;
      }
      return !track.muted;
    };

    // 2. Find eligible clips (both dedicated audio clips and video clips with audio)
    const eligibleClips: { clip: ClipItem; track: TimelineTrack }[] = [];

    for (const clip of project.clips) {
      if (clip.muted || (clip as any).audioEnabled === false) continue;
      const vol = clip.volume ?? 1.0;
      if (vol <= 0.001) continue;

      const track = project.tracks.find(t => t.id === clip.trackId);
      if (!track || !isTrackAudible(track.id)) continue;

      // Ensure media exists and has audio
      const media = project.media.find(m => m.id === clip.mediaId);
      if (!media) continue;

      if (clip.type === 'audio' || (clip.type === 'video' && (media.audioChannels ?? 0) > 0)) {
        eligibleClips.push({ clip, track });
      }
    }

    if (eligibleClips.length === 0) {
      return {
        filterComplexParts: [],
        outputStream: null,
        hasAudio: false,
      };
    }

    // 3. Compile each clip's audio chain: trim -> volume -> fades -> pan -> adelay
    const delayedStreamLabels: string[] = [];

    eligibleClips.forEach(({ clip, track }, index) => {
      const mediaInIdx = mediaMap.get(clip.mediaId);
      if (mediaInIdx === undefined) return;

      const clipVolume = Math.max(0, clip.volume ?? 1.0);
      const trackVolume = Math.max(0, track.volume ?? 1.0);
      const netVolume = Number((clipVolume * trackVolume).toFixed(3));

      const filters: string[] = [
        `atrim=start=${clip.sourceStart.toFixed(3)}:duration=${clip.duration.toFixed(3)}`,
        `asetpts=PTS-STARTPTS`,
      ];

      // Volume
      if (Math.abs(netVolume - 1.0) > 0.001) {
        filters.push(`volume=${netVolume}`);
      }

      // Fade in
      const fadeIn = (clip as any).fadeInDuration ?? 0;
      if (fadeIn > 0.01) {
        const actualFadeIn = Math.min(fadeIn, clip.duration);
        filters.push(`afade=t=in:ss=0:d=${actualFadeIn.toFixed(3)}`);
      }

      // Fade out
      const fadeOut = (clip as any).fadeOutDuration ?? 0;
      if (fadeOut > 0.01) {
        const actualFadeOut = Math.min(fadeOut, clip.duration);
        const fadeStart = Math.max(0, clip.duration - actualFadeOut);
        filters.push(`afade=t=out:st=${fadeStart.toFixed(3)}:d=${actualFadeOut.toFixed(3)}`);
      }

      // Pan (-1.0 to 1.0)
      const clipPan = (clip as any).pan ?? 0;
      const trackPan = (track as any).pan ?? 0;
      const netPan = Math.max(-1.0, Math.min(1.0, clipPan + trackPan));

      if (Math.abs(netPan) > 0.01) {
        // Equal power pan calculation
        const angle = ((netPan + 1.0) * Math.PI) / 4.0; // 0 to PI/2
        const leftGain = Math.cos(angle).toFixed(3);
        const rightGain = Math.sin(angle).toFixed(3);
        filters.push(`pan=stereo|c0=${leftGain}*c0|c1=${rightGain}*c1`);
      }

      // Non-destructive AI Audio Cleanup: route processed audio input or apply real-time denoiser
      let inAudioIdx = mediaInIdx;
      if (clip.aiAudioCleanup?.processedAudioPath && mediaMap.has(clip.aiAudioCleanup.processedAudioPath)) {
        inAudioIdx = mediaMap.get(clip.aiAudioCleanup.processedAudioPath)!;
      }

      // --- Professional Audio Processing Suite ---
      const fx = clip.audioEffects;

      // 1. Cleanup / Denoise
      if (fx?.denoise?.enabled) {
        const nrAmount = Math.max(1, Math.min(97, Math.round((fx.denoise.amount / 100) * 35))); // 1 to 35 dB reduction
        const noiseFloor = -50 + Math.round((fx.denoise.amount / 100) * 30); // -50 to -20 dB
        filters.push(`afftdn=nr=${nrAmount}:nf=${noiseFloor}`);
        if (fx.denoise.highpass) {
          filters.push('highpass=f=80');
        }
      } else if (clip.aiAudioCleanup?.reduceNoise) {
        filters.push('afftdn=nr=12:nf=-25', 'highpass=f=80', 'lowpass=f=12000');
      }

      // 2. Voice Enhancement & Speech Clarity
      if (fx?.voice?.enabled) {
        const clarityGain = ((fx.voice.clarity / 100) * 6).toFixed(1); // 0 to +6dB boost
        filters.push('highpass=f=85', `equalizer=f=3200:width_type=q:w=1.2:g=${clarityGain}`);
        if (fx.voice.enhance) {
          filters.push('acompressor=threshold=-16dB:ratio=3:attack=15:release=200');
        }
      }

      // 3. 5-Band Parametric EQ
      if (fx?.eq?.enabled) {
        const bands = [fx.eq.low, fx.eq.lowMid, fx.eq.mid, fx.eq.highMid, fx.eq.high];
        for (const band of bands) {
          if (Math.abs(band.gain) > 0.1) {
            filters.push(`equalizer=f=${Math.round(band.freq)}:width_type=q:w=${band.q.toFixed(2)}:g=${band.gain.toFixed(1)}`);
          }
        }
      }

      // 4. Reverb
      if (fx?.reverb?.enabled) {
        const inGain = ((100 - fx.reverb.wetDry * 0.4) / 100).toFixed(2);
        const outGain = (fx.reverb.wetDry / 120).toFixed(2);
        const delay = Math.max(20, Math.min(250, Math.round(fx.reverb.roomSize * 1.8 + fx.reverb.preDelay)));
        const decay = Math.max(0.1, Math.min(0.7, (fx.reverb.decay / 150))).toFixed(2);
        filters.push(`aecho=${inGain}:${outGain}:${delay}:${decay}`);
      }

      // Delay to timeline start position in milliseconds
      const delayMs = Math.max(0, Math.round(clip.startTime * 1000));
      filters.push(`adelay=${delayMs}|${delayMs}`);

      const outLabel = `a_clip_${index}`;
      filterComplexParts.push(`[${inAudioIdx}:a]${filters.join(',')}[${outLabel}]`);
      delayedStreamLabels.push(`[${outLabel}]`);
    });

    if (delayedStreamLabels.length === 0) {
      return {
        filterComplexParts: [],
        outputStream: null,
        hasAudio: false,
      };
    }

    if (delayedStreamLabels.length === 1) {
      filterComplexParts.push(`${delayedStreamLabels[0]}anull[a_mix_out]`);
    } else {
      // amix all delayed streams into stereo mixdown without clipping normalizer
      filterComplexParts.push(
        `${delayedStreamLabels.join('')}amix=inputs=${delayedStreamLabels.length}:dropout_transition=0:normalize=0[a_mix_out]`
      );
    }

    return {
      filterComplexParts,
      outputStream: '[a_mix_out]',
      hasAudio: true,
    };
  }
}
