/**
 * FreeCut Alpha 0.6 Real Media Text & Caption Export Test
 * Validates real media rendering through FFmpeg for:
 * 1. Video + Text Clip (styled, stroke, shadow, background box, timing)
 * 2. Video + Manual Captions (burned-in subtitle items on caption track)
 */

import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { FreeCutProject } from './src/types/project';
import { ExportSettings } from './src/types/export';
import { FFmpegService } from './src/services/ffmpegService';
import { createDefaultTextConfig } from './src/text';
import { createCaptionItem, createCaptionTrack } from './src/captions';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function runCommand(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`Command ${cmd} failed: ${err.message}\n${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function probeFile(filePath: string): Promise<any> {
  const { stdout } = await runCommand('ffprobe', [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]);
  return JSON.parse(stdout);
}

async function runRealMediaTextAndCaptionTests() {
  console.log('=== RUNNING FREECUT ALPHA 0.6 REAL MEDIA TEXT & CAPTION EXPORT TESTS ===\n');

  const samplePath = path.resolve('test-media/sample-video.mp4');
  assert(fs.existsSync(samplePath), `Sample video must exist at ${samplePath}`);

  const outputDir = path.resolve('test-media/exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // ----------------------------------------------------
  // TEST 1: Video + Text Clip Overlay
  // ----------------------------------------------------
  console.log('--- TEST 1: Video + Text Clip Overlay ---');
  const textOutputPath = path.join(outputDir, 'export_text_overlay.mp4');
  if (fs.existsSync(textOutputPath)) fs.unlinkSync(textOutputPath);

  const textConfig = createDefaultTextConfig('FREECUT ALPHA 0.6', {
    fontFamily: 'Arial',
    fontSize: 48,
    fillColor: '#FFD700', // Gold text
    fontWeight: 'bold',
    stroke: {
      enabled: true,
      color: '#000000',
      width: 4,
    },
    shadow: {
      enabled: true,
      color: '#000000',
      blur: 4,
      offsetX: 3,
      offsetY: 3,
    },
    background: {
      enabled: true,
      color: '#1E293B',
      opacity: 0.8,
      padding: 12,
      cornerRadius: 6,
    },
  });

  const textProject: FreeCutProject = {
    version: '0.1',
    project: {
      name: 'Text Overlay Export Test',
      width: 864,
      height: 496,
      fps: 30,
      backgroundColor: '#000000',
      audioSampleRate: 48000,
    },
    media: [
      {
        id: 'media_sample',
        name: 'sample-video.mp4',
        path: samplePath,
        type: 'video',
        size: fs.statSync(samplePath).size,
        duration: 8.0,
        createdAt: Date.now(),
      },
    ],
    tracks: [
      {
        id: 'track_v1',
        name: 'Video Track 1',
        type: 'video',
        order: 0,
        muted: false,
        locked: false,
        visible: true,
        height: 64,
      },
      {
        id: 'track_v2',
        name: 'Text Overlay Track',
        type: 'video',
        order: 1,
        muted: false,
        locked: false,
        visible: true,
        height: 64,
      },
    ],
    clips: [
      {
        id: 'clip_video',
        trackId: 'track_v1',
        mediaId: 'media_sample',
        name: 'Background Video',
        startTime: 0,
        duration: 5.0,
        sourceStart: 0,
        sourceDuration: 5.0,
        type: 'video',
      },
      {
        id: 'clip_text',
        trackId: 'track_v2',
        mediaId: '',
        name: 'Title Text Clip',
        startTime: 1.0,
        duration: 3.5,
        sourceStart: 0,
        sourceDuration: 3.5,
        type: 'text',
        textConfig,
      },
    ],
  };

  const textExportSettings: ExportSettings = {
    format: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 864,
    height: 496,
    fps: 30,
    videoBitrateKbps: 3000,
    audioBitrateKbps: 192,
    outputPath: textOutputPath,
  };

  const textArgs = FFmpegService.generateFFmpegArgs(textProject, textExportSettings);
  console.log('Generated FFmpeg arguments for Text export:');
  console.log('ffmpeg', textArgs.join(' '));

  // Verify drawtext filter is included in args
  const filterArg = textArgs[textArgs.indexOf('-filter_complex') + 1];
  assert(filterArg.includes('drawtext='), 'filter_complex must include drawtext for text overlay');
  assert(filterArg.includes('FREECUT ALPHA 0.6'), 'filter_complex must include text content');
  assert(filterArg.includes('between(t,1.000,4.500)'), 'drawtext must activate precisely between 1.0s and 4.5s');

  console.log('Executing real FFmpeg command...');
  await runCommand('ffmpeg', textArgs);

  assert(fs.existsSync(textOutputPath), 'Exported text video file must exist');
  const textStats = fs.statSync(textOutputPath);
  assert(textStats.size > 10000, `Exported file must have substantial content (size: ${textStats.size} bytes)`);

  const textProbe = await probeFile(textOutputPath);
  assert(textProbe.streams.length >= 1, 'Contains valid streams');
  const videoStream1 = textProbe.streams.find((s: any) => s.codec_type === 'video');
  assert(videoStream1 !== undefined, 'Found video stream in export');
  assert(videoStream1.width === 864 && videoStream1.height === 496, 'Video matches project dimensions');

  const textDuration = parseFloat(textProbe.format.duration);
  assert(Math.abs(textDuration - 5.0) < 0.25, `Expected ~5.0s duration, got ${textDuration}s`);
  console.log(`-> PASS: Real Video + Text Clip exported and verified successfully! (${textStats.size} bytes, ${textDuration.toFixed(2)}s)\n`);

  // ----------------------------------------------------
  // TEST 2: Video + Manual Caption Track (Burned-in Subtitles)
  // ----------------------------------------------------
  console.log('--- TEST 2: Video + Manual Caption Track ---');
  const captionOutputPath = path.join(outputDir, 'export_caption_burned_in.mp4');
  if (fs.existsSync(captionOutputPath)) fs.unlinkSync(captionOutputPath);

  const captionTrack = createCaptionTrack('Subtitle Track 1');
  const cap1 = createCaptionItem(0.5, 2.0, 'Welcome to FreeCut', {
    fontSize: 36,
    fillColor: '#FFFFFF',
    background: { enabled: true, color: '#000000', opacity: 0.75, padding: 8, cornerRadius: 4 },
  });
  const cap2 = createCaptionItem(2.8, 2.0, 'Professional Editing. Zero Barriers.', {
    fontSize: 36,
    fillColor: '#00FFFF', // Cyan caption
    stroke: { enabled: true, color: '#000000', width: 3 },
  });
  captionTrack.items = [cap1, cap2];

  const captionProject: FreeCutProject = {
    version: '0.1',
    project: {
      name: 'Caption Burn-in Export Test',
      width: 864,
      height: 496,
      fps: 30,
      backgroundColor: '#000000',
      audioSampleRate: 48000,
    },
    media: [
      {
        id: 'media_sample',
        name: 'sample-video.mp4',
        path: samplePath,
        type: 'video',
        size: fs.statSync(samplePath).size,
        duration: 8.0,
        createdAt: Date.now(),
      },
    ],
    tracks: [
      {
        id: 'track_v1',
        name: 'Video Track',
        type: 'video',
        order: 0,
        muted: false,
        locked: false,
        visible: true,
        height: 64,
      },
    ],
    clips: [
      {
        id: 'clip_video',
        trackId: 'track_v1',
        mediaId: 'media_sample',
        name: 'Background Video',
        startTime: 0,
        duration: 5.0,
        sourceStart: 0,
        sourceDuration: 5.0,
        type: 'video',
      },
    ],
    captionTracks: [captionTrack],
  };

  const captionExportSettings: ExportSettings = {
    format: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 864,
    height: 496,
    fps: 30,
    videoBitrateKbps: 3000,
    audioBitrateKbps: 192,
    outputPath: captionOutputPath,
  };

  const capArgs = FFmpegService.generateFFmpegArgs(captionProject, captionExportSettings);
  console.log('Generated FFmpeg arguments for Caption export:');
  console.log('ffmpeg', capArgs.join(' '));

  const capFilterArg = capArgs[capArgs.indexOf('-filter_complex') + 1];
  assert(capFilterArg.includes('drawtext='), 'filter_complex must include drawtext for captions');
  assert(capFilterArg.includes('Welcome to FreeCut'), 'filter_complex must include first caption');
  assert(capFilterArg.includes('Professional Editing. Zero Barriers.'), 'filter_complex must include second caption');
  assert(capFilterArg.includes('between(t,0.500,2.500)'), 'drawtext must activate between 0.5s and 2.5s for cap 1');
  assert(capFilterArg.includes('between(t,2.800,4.800)'), 'drawtext must activate between 2.8s and 4.8s for cap 2');

  console.log('Executing real FFmpeg command for burned-in captions...');
  await runCommand('ffmpeg', capArgs);

  assert(fs.existsSync(captionOutputPath), 'Exported caption video file must exist');
  const capStats = fs.statSync(captionOutputPath);
  assert(capStats.size > 10000, `Exported file must have substantial content (size: ${capStats.size} bytes)`);

  const capProbe = await probeFile(captionOutputPath);
  assert(capProbe.streams.length >= 1, 'Contains valid streams');
  const videoStream2 = capProbe.streams.find((s: any) => s.codec_type === 'video');
  assert(videoStream2 !== undefined, 'Found video stream in export');
  assert(videoStream2.width === 864 && videoStream2.height === 496, 'Video matches project dimensions');

  const capDuration = parseFloat(capProbe.format.duration);
  assert(Math.abs(capDuration - 5.0) < 0.25, `Expected ~5.0s duration, got ${capDuration}s`);
  console.log(`-> PASS: Real Video + Manual Captions exported and verified successfully! (${capStats.size} bytes, ${capDuration.toFixed(2)}s)\n`);

  console.log('==================================================');
  console.log('ALL REAL MEDIA TEXT & CAPTION EXPORT TESTS PASSED!');
  console.log('==================================================');
}

runRealMediaTextAndCaptionTests().catch((err) => {
  console.error('Real media export test failed:', err);
  process.exit(1);
});
