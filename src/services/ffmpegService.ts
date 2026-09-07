import { FreeCutProject } from '../types/project';
import { ExportSettings } from '../types/export';
import { compileEffectsToFFmpeg } from '../effects';
import { TransitionRegistry } from '../transitions';
import { compileTextToFFmpegDrawtext, TextStyle } from '../text';
import { DEFAULT_CAPTION_STYLE } from '../captions';
import { compileChromaKeyToFFmpeg, compileMaskToFFmpeg, getFFmpegBlendMode } from '../compositing';
import { ColorCompiler } from '../color/colorCompiler';
import { AudioMixer } from '../audio/audioMixer';
import { HardwareDetector } from '../export/hardwareDetection';

export class FFmpegService {
  /**
   * Constructs the FFmpeg command line arguments from a FreeCut project model.
   * Compiles clip trims, scaling, visual effect stacks, transition xfades, text overlays, captions, and audio mixdown.
   */
  static generateFFmpegArgs(project: FreeCutProject, settings: ExportSettings): string[] {
    const args: string[] = ['-y'];

    // 1. Collect unique media files and map to input indexes
    const mediaMap = new Map<string, number>();
    let inputIndex = 0;

    project.clips.forEach(clip => {
      if (clip.mediaId && !mediaMap.has(clip.mediaId)) {
        const media = project.media.find(m => m.id === clip.mediaId);
        if (media) {
          mediaMap.set(clip.mediaId, inputIndex);
          args.push('-i', media.path);
          inputIndex++;
        }
      }

      // Non-destructive processed audio reference
      if (clip.aiAudioCleanup?.processedAudioPath && !mediaMap.has(clip.aiAudioCleanup.processedAudioPath)) {
        mediaMap.set(clip.aiAudioCleanup.processedAudioPath, inputIndex);
        args.push('-i', clip.aiAudioCleanup.processedAudioPath);
        inputIndex++;
      }

      // Raster mask input reference
      if (clip.masks && clip.masks.length > 0) {
        for (const mask of clip.masks) {
          if (mask.enabled && mask.type === 'image' && mask.imageUrl && !mask.imageUrl.startsWith('data:') && !mediaMap.has(mask.imageUrl)) {
            mediaMap.set(mask.imageUrl, inputIndex);
            args.push('-i', mask.imageUrl);
            inputIndex++;
          }
        }
      }
    });

    const textClips = project.clips.filter(c => c.type === 'text' && c.textConfig);
    const captionTracks = (project.captionTracks || []).filter(t => t.visible !== false);
    const hasTextOrCaptions = textClips.length > 0 || captionTracks.some(t => t.items.length > 0);

    if (inputIndex === 0 && !hasTextOrCaptions) {
      // Empty project fallback
      args.push('-f', 'lavfi', '-i', `color=c=black:s=${settings.width}x${settings.height}:r=${settings.fps}:d=5`);
      args.push('-c:v', settings.videoCodec === 'h264' ? 'libx264' : 'libvpx-vp9');
      args.push('-preset', 'fast');
      args.push('-b:v', `${settings.videoBitrateKbps}k`);
      args.push('-r', `${settings.fps}`);
      args.push('-s', `${settings.width}x${settings.height}`);
      args.push(settings.outputPath || 'output.mp4');
      return args;
    }

    const filterParts: string[] = [];

    // 2. Process Video Clips
    const videoClips = project.clips
      .filter(c => c.type === 'video' || c.type === 'image')
      .sort((a, b) => a.startTime - b.startTime);

    let finalVideoStream: string | null = null;

    if (videoClips.length > 0) {
      // Pre-process each video clip: trim, crop, flip, chroma key, effects, scale, pad, masks
      videoClips.forEach((clip, i) => {
        const inIdx = mediaMap.get(clip.mediaId);
        const filters: string[] = [
          `trim=start=${clip.sourceStart}:duration=${clip.duration}`,
          `setpts=PTS-STARTPTS`,
        ];

        // Crop
        if (clip.crop) {
          const cL = clip.crop.left || 0;
          const cR = clip.crop.right || 0;
          const cT = clip.crop.top || 0;
          const cB = clip.crop.bottom || 0;
          if (cL > 0 || cR > 0 || cT > 0 || cB > 0) {
            filters.push(
              `crop=in_w*(1-${(cL + cR).toFixed(3)}):in_h*(1-${(cT + cB).toFixed(3)}):in_w*${cL.toFixed(3)}:in_h*${cT.toFixed(3)}`
            );
          }
        }

        // Flip
        if (clip.flip?.horizontal) filters.push('hflip');
        if (clip.flip?.vertical) filters.push('vflip');

        // Chroma Key
        if (clip.chromaKey?.enabled) {
          const ckFilter = compileChromaKeyToFFmpeg(clip.chromaKey);
          if (ckFilter) filters.push(ckFilter);
        }

        // Effects Stack
        const effectFilters = compileEffectsToFFmpeg(clip.effects);
        if (effectFilters.length > 0) {
          filters.push(...effectFilters);
        }

        // Scaling and padding to match project resolution
        filters.push(
          `scale=${settings.width}:${settings.height}:force_original_aspect_ratio=decrease`,
          `pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2`,
          `setsar=1`
        );

        // Masks
        if (clip.masks && clip.masks.length > 0) {
          for (const mask of clip.masks) {
            if (mask.enabled) {
              const maskFilter = compileMaskToFFmpeg(mask, settings.width, settings.height);
              if (maskFilter) filters.push(maskFilter);
            }
          }
        }

        // Color Pipeline (Grading, Curves, Wheels, LUT, Range)
        const colorFilters = ColorCompiler.compileGradingToFFmpeg(
          clip.colorGrade,
          clip.colorManagement || project.project.colorManagement
        );
        if (colorFilters.length > 0) {
          filters.push(...colorFilters);
        }

        const imageMask = clip.masks?.find(m => m.enabled && m.type === 'image' && m.imageUrl && mediaMap.has(m.imageUrl));
        if (imageMask && imageMask.imageUrl) {
          const maskIdx = mediaMap.get(imageMask.imageUrl)!;
          const preMaskLabel = `v_pre_${i}`;
          filterParts.push(`[${inIdx}:v]${filters.join(',')}[${preMaskLabel}]`);
          filterParts.push(`[${maskIdx}:v]scale=${settings.width}:${settings.height}:force_original_aspect_ratio=decrease,pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[mask_s_${i}]`);
          filterParts.push(`[${preMaskLabel}][mask_s_${i}]alphamerge[v${i}]`);
        } else {
          const filterChain = `[${inIdx}:v]${filters.join(',')}[v${i}]`;
          filterParts.push(filterChain);
        }
      });

      if (videoClips.length === 1) {
        finalVideoStream = '[v0]';
      } else {
        // Chain video clips with transitions, blend modes, overlays, or hard cuts
        let currentStream = 'v0';
        let accumulatedDuration = videoClips[0].duration;

        for (let i = 1; i < videoClips.length; i++) {
          const prevClip = videoClips[i - 1];
          const nextClip = videoClips[i];

          const transition = project.transitions?.find(
            t => t.fromClipId === prevClip.id && t.toClipId === nextClip.id && t.enabled
          );

          const nextStream = `v_xfade_${i}`;

          if (transition) {
            const descriptor = TransitionRegistry.getTransition(transition.type);
            const trDuration = Math.min(
              transition.duration,
              accumulatedDuration * 0.95,
              nextClip.duration * 0.95
            );
            const offset = Math.max(0.01, accumulatedDuration - trDuration);

            if (descriptor) {
              const xfadeFilter = descriptor.compileFFmpeg(
                currentStream,
                `v${i}`,
                nextStream,
                offset,
                trDuration,
                transition.parameters
              );
              filterParts.push(xfadeFilter);
            } else {
              filterParts.push(
                `[${currentStream}][v${i}]xfade=transition=fade:duration=${trDuration.toFixed(3)}:offset=${offset.toFixed(3)}[${nextStream}]`
              );
            }

            accumulatedDuration = offset + nextClip.duration;
          } else if (nextClip.blendMode && nextClip.blendMode !== 'normal') {
            // Blend Mode operation between base and overlay
            filterParts.push(
              `[${currentStream}][v${i}]blend=all_mode=${getFFmpegBlendMode(nextClip.blendMode)}[${nextStream}]`
            );
            accumulatedDuration = Math.max(accumulatedDuration, nextClip.startTime + nextClip.duration);
          } else if (
            nextClip.chromaKey?.enabled ||
            (nextClip.masks && nextClip.masks.length > 0) ||
            nextClip.startTime < accumulatedDuration
          ) {
            // Layer overlay (e.g. keyed transparent layer or multi-track visual element)
            const overlayStart = nextClip.startTime;
            filterParts.push(
              `[${currentStream}][v${i}]overlay=enable='between(t,${overlayStart.toFixed(3)},${(overlayStart + nextClip.duration).toFixed(3)})':eof_action=pass[${nextStream}]`
            );
            accumulatedDuration = Math.max(accumulatedDuration, nextClip.startTime + nextClip.duration);
          } else {
            // Cut between clips using xfade with minimal 0.001s duration
            const offset = accumulatedDuration;
            filterParts.push(
              `[${currentStream}][v${i}]xfade=transition=fade:duration=0.001:offset=${offset.toFixed(3)}[${nextStream}]`
            );
            accumulatedDuration += nextClip.duration;
          }

          currentStream = nextStream;
        }

        finalVideoStream = `[${currentStream}]`;
      }
    }

    // 2b. Process Text Clips and Captions (Burned into video stream)
    if (hasTextOrCaptions) {
      if (!finalVideoStream) {
        const textDuration = Math.max(
          5,
          ...textClips.map(c => c.startTime + c.duration),
          ...captionTracks.flatMap(t => t.items.map(i => i.endTime))
        );
        filterParts.push(`color=c=black:s=${settings.width}x${settings.height}:r=${settings.fps}:d=${textDuration.toFixed(3)}[v_base]`);
        finalVideoStream = '[v_base]';
      }

      let currentStream = finalVideoStream.replace(/[\[\]]/g, '');
      let textOverlayIndex = 0;

      // Overlay text clips
      for (const clip of textClips) {
        if (!clip.textConfig) continue;
        const nextStream = `v_txt_${textOverlayIndex++}`;
        const drawtext = compileTextToFFmpegDrawtext(
          clip.textConfig.content,
          clip.textConfig.style,
          clip.startTime,
          clip.duration,
          clip.transform?.positionX || 0,
          clip.transform?.positionY || 0
        );
        filterParts.push(`[${currentStream}]${drawtext}[${nextStream}]`);
        currentStream = nextStream;
      }

      // Overlay captions
      for (const track of captionTracks) {
        for (const item of track.items) {
          const nextStream = `v_cap_${textOverlayIndex++}`;
          const duration = Math.max(0.1, item.endTime - item.startTime);
          const captionStyle: TextStyle = {
            ...DEFAULT_CAPTION_STYLE,
            ...(item.style || {}),
            textAlign: 'center',
          };
          const drawtext = compileTextToFFmpegDrawtext(
            item.text,
            captionStyle,
            item.startTime,
            duration,
            0,
            Math.round(settings.height * 0.36) // Lower-third offset
          );
          filterParts.push(`[${currentStream}]${drawtext}[${nextStream}]`);
          currentStream = nextStream;
        }
      }

      finalVideoStream = `[${currentStream}]`;
    }

    // 3. Process Multi-Track Audio Mix (Video audio + Audio clips)
    const totalDuration = Math.max(
      5,
      ...project.clips.map(c => c.startTime + c.duration)
    );
    const audioGraph = AudioMixer.compileAudioMix(project, mediaMap, totalDuration);
    if (audioGraph.hasAudio && audioGraph.outputStream) {
      filterParts.push(...audioGraph.filterComplexParts);
    }

    // 4. Attach filter_complex and stream mappings
    if (filterParts.length > 0) {
      args.push('-filter_complex', filterParts.join(';'));
    }

    if (finalVideoStream) {
      args.push('-map', finalVideoStream);
    }

    if (audioGraph.hasAudio && audioGraph.outputStream) {
      args.push('-map', audioGraph.outputStream);
    }

    // 5. Encoding parameters & Hardware acceleration resolution
    const resolvedVideo = HardwareDetector.resolveEncoderName(
      settings.videoCodec,
      settings.useHardwareAcceleration ?? true
    );

    if (settings.videoCodec === 'prores') {
      args.push('-c:v', resolvedVideo.encoderName);
      const profile = settings.proresProfile === 'proxy' ? '0' : settings.proresProfile === 'lt' ? '1' : settings.proresProfile === 'hq' ? '3' : '2';
      args.push('-profile:v', profile);
      args.push('-vendor', 'apl0');
    } else if (settings.videoCodec === 'vp9') {
      args.push('-c:v', resolvedVideo.encoderName);
      args.push('-b:v', `${settings.videoBitrateKbps}k`);
    } else if (settings.videoCodec === 'hevc') {
      args.push('-c:v', resolvedVideo.encoderName);
      if (!resolvedVideo.isHardware) {
        args.push('-preset', 'fast');
      }
      args.push('-b:v', `${settings.videoBitrateKbps}k`);
    } else {
      // H.264
      args.push('-c:v', resolvedVideo.encoderName);
      if (!resolvedVideo.isHardware) {
        args.push('-preset', 'fast');
      }
      args.push('-b:v', `${settings.videoBitrateKbps}k`);
    }

    if (audioGraph.hasAudio && audioGraph.outputStream) {
      if (settings.audioCodec === 'pcm_s16le') {
        args.push('-c:a', 'pcm_s16le');
      } else if (settings.audioCodec === 'opus') {
        args.push('-c:a', 'libopus', '-b:a', `${settings.audioBitrateKbps}k`);
      } else if (settings.audioCodec === 'mp3') {
        args.push('-c:a', 'libmp3lame', '-b:a', `${settings.audioBitrateKbps}k`);
      } else {
        args.push('-c:a', 'aac', '-b:a', `${settings.audioBitrateKbps}k`);
      }
    }

    args.push('-r', `${settings.fps}`);
    args.push('-s', `${settings.width}x${settings.height}`);
    args.push(settings.outputPath || 'output.mp4');

    return args;
  }
}
