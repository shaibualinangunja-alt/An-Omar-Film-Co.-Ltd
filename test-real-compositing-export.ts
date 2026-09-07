/**
 * FreeCut Alpha 0.7 Real Media Compositing Export Test Suite
 * Tests and verifies 5 real media export scenarios via real FFmpeg and FFprobe:
 * 1. Background Video + Green Screen Video + Chroma Key -> Export MP4
 * 2. Video + Mask (Ellipse) -> Export MP4
 * 3. Video A + Overlay B + Blend Mode (Screen) -> Export MP4
 * 4. Video + Crop (Left, Right, Top, Bottom) -> Export MP4
 * 5. Video + Flip (Horizontal) -> Export MP4
 */

import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { FreeCutProject } from './src/types/project';
import { ExportSettings } from './src/types/export';
import { FFmpegService } from './src/services/ffmpegService';
import { createDefaultMask } from './src/compositing';

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

async function ensureGreenScreenAsset(filePath: string): Promise<void> {
  if (fs.existsSync(filePath)) return;
  console.log('Generating green screen test media asset via FFmpeg...');
  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    'color=c=0x00FF00:s=864x496:r=30:d=4,drawbox=x=300:y=150:w=264:h=196:color=red@1:t=fill',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    filePath,
  ]);
}

async function runRealMediaCompositingTests() {
  console.log('=== RUNNING FREECUT ALPHA 0.7 REAL MEDIA COMPOSITING EXPORT TESTS ===\n');

  const samplePath = path.resolve('test-media/sample-video.mp4');
  assert(fs.existsSync(samplePath), `Sample video must exist at ${samplePath}`);

  const greenScreenPath = path.resolve('test-media/greenscreen.mp4');
  await ensureGreenScreenAsset(greenScreenPath);
  assert(fs.existsSync(greenScreenPath), 'Green screen test asset ready');

  const outputDir = path.resolve('test-media/exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseExportSettings: ExportSettings = {
    format: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 864,
    height: 496,
    fps: 30,
    videoBitrateKbps: 3000,
    audioBitrateKbps: 192,
    outputPath: '',
  };

  // ----------------------------------------------------
  // TEST 1: Background Video + Green Screen Video + Chroma Key
  // ----------------------------------------------------
  console.log('--- TEST 1: Background Video + Green Screen Video + Chroma Key ---');
  const ckOutputPath = path.join(outputDir, 'export_chroma_key.mp4');
  if (fs.existsSync(ckOutputPath)) fs.unlinkSync(ckOutputPath);

  const ckProject: FreeCutProject = {
    version: '0.1',
    project: {
      name: 'Chroma Key Export Test',
      width: 864,
      height: 496,
      fps: 30,
      backgroundColor: '#000000',
      audioSampleRate: 48000,
    },
    media: [
      {
        id: 'media_bg',
        name: 'sample-video.mp4',
        path: samplePath,
        type: 'video',
        size: fs.statSync(samplePath).size,
        duration: 8.0,
        createdAt: Date.now(),
      },
      {
        id: 'media_gs',
        name: 'greenscreen.mp4',
        path: greenScreenPath,
        type: 'video',
        size: fs.statSync(greenScreenPath).size,
        duration: 4.0,
        createdAt: Date.now(),
      },
    ],
    tracks: [
      { id: 'track_v1', name: 'Background Video', type: 'video', order: 1, muted: false, locked: false, visible: true, height: 64 },
      { id: 'track_v2', name: 'Keyed Overlay', type: 'video', order: 0, muted: false, locked: false, visible: true, height: 64 },
    ],
    clips: [
      {
        id: 'clip_bg',
        trackId: 'track_v1',
        mediaId: 'media_bg',
        name: 'Background Clip',
        startTime: 0,
        duration: 4.0,
        sourceStart: 0,
        sourceDuration: 4.0,
        type: 'video',
        transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
        volume: 1,
        muted: false,
      },
      {
        id: 'clip_gs',
        trackId: 'track_v2',
        mediaId: 'media_gs',
        name: 'Green Screen Keyed Clip',
        startTime: 0,
        duration: 4.0,
        sourceStart: 0,
        sourceDuration: 4.0,
        type: 'video',
        transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
        volume: 1,
        muted: false,
        chromaKey: {
          enabled: true,
          keyColor: '#00FF00',
          similarity: 0.25,
          smoothness: 0.10,
          spillSuppression: 0.50,
          edgeSoftness: 2,
          invert: false,
        },
      },
    ],
  };

  const ckSettings = { ...baseExportSettings, outputPath: ckOutputPath };
  const ckArgs = FFmpegService.generateFFmpegArgs(ckProject, ckSettings);
  console.log('FFmpeg command for Chroma Key:');
  console.log('ffmpeg', ckArgs.join(' '));

  const filterStr1 = ckArgs[ckArgs.indexOf('-filter_complex') + 1];
  assert(filterStr1.includes('colorkey='), 'filter_complex includes colorkey');
  assert(filterStr1.includes('overlay='), 'filter_complex includes overlay for keyed stream');

  await runCommand('ffmpeg', ckArgs);
  assert(fs.existsSync(ckOutputPath), 'Chroma key exported video file exists');
  const ckProbe = await probeFile(ckOutputPath);
  assert(ckProbe.streams.some((s: any) => s.codec_type === 'video'), 'Valid video stream');
  const ckDuration = parseFloat(ckProbe.format.duration);
  assert(Math.abs(ckDuration - 4.0) < 0.3, `Duration matches ~4.0s (got ${ckDuration}s)`);
  console.log(`-> PASS: Real Chroma Key export verified! (${fs.statSync(ckOutputPath).size} bytes, ${ckDuration.toFixed(2)}s)\n`);

  // ----------------------------------------------------
  // TEST 2: Video + Ellipse Mask
  // ----------------------------------------------------
  console.log('--- TEST 2: Video + Ellipse Mask ---');
  const maskOutputPath = path.join(outputDir, 'export_mask_ellipse.mp4');
  if (fs.existsSync(maskOutputPath)) fs.unlinkSync(maskOutputPath);

  const ellipseMask = createDefaultMask('ellipse', 450, 320);
  const maskProject: FreeCutProject = {
    version: '0.1',
    project: {
      name: 'Mask Export Test',
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
      { id: 'track_v1', name: 'Masked Video', type: 'video', order: 0, muted: false, locked: false, visible: true, height: 64 },
    ],
    clips: [
      {
        id: 'clip_masked',
        trackId: 'track_v1',
        mediaId: 'media_sample',
        name: 'Masked Clip',
        startTime: 0,
        duration: 3.0,
        sourceStart: 1.0,
        sourceDuration: 3.0,
        type: 'video',
        transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
        volume: 1,
        muted: false,
        masks: [ellipseMask],
      },
    ],
  };

  const maskSettings = { ...baseExportSettings, outputPath: maskOutputPath };
  const maskArgs = FFmpegService.generateFFmpegArgs(maskProject, maskSettings);
  const filterStr2 = maskArgs[maskArgs.indexOf('-filter_complex') + 1];
  assert(filterStr2.includes('geq='), 'filter_complex includes geq filter for mask');

  await runCommand('ffmpeg', maskArgs);
  assert(fs.existsSync(maskOutputPath), 'Mask exported video exists');
  const maskProbe = await probeFile(maskOutputPath);
  assert(maskProbe.streams.some((s: any) => s.codec_type === 'video'), 'Valid video stream in mask export');
  console.log(`-> PASS: Real Mask export verified! (${fs.statSync(maskOutputPath).size} bytes)\n`);

  // ----------------------------------------------------
  // TEST 3: Video A + Overlay B + Blend Mode (Screen)
  // ----------------------------------------------------
  console.log('--- TEST 3: Video A + Overlay B + Blend Mode (Screen) ---');
  const blendOutputPath = path.join(outputDir, 'export_blend_screen.mp4');
  if (fs.existsSync(blendOutputPath)) fs.unlinkSync(blendOutputPath);

  const blendProject: FreeCutProject = {
    version: '0.1',
    project: {
      name: 'Blend Mode Export Test',
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
      { id: 'track_v1', name: 'Base Video', type: 'video', order: 1, muted: false, locked: false, visible: true, height: 64 },
      { id: 'track_v2', name: 'Blend Layer', type: 'video', order: 0, muted: false, locked: false, visible: true, height: 64 },
    ],
    clips: [
      {
        id: 'clip_base',
        trackId: 'track_v1',
        mediaId: 'media_sample',
        name: 'Base Video',
        startTime: 0,
        duration: 3.0,
        sourceStart: 0,
        sourceDuration: 3.0,
        type: 'video',
        transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
        volume: 1,
        muted: false,
      },
      {
        id: 'clip_blend',
        trackId: 'track_v2',
        mediaId: 'media_sample',
        name: 'Screen Blend Video',
        startTime: 0,
        duration: 3.0,
        sourceStart: 3.0,
        sourceDuration: 3.0,
        type: 'video',
        transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
        volume: 1,
        muted: false,
        blendMode: 'screen',
      },
    ],
  };

  const blendSettings = { ...baseExportSettings, outputPath: blendOutputPath };
  const blendArgs = FFmpegService.generateFFmpegArgs(blendProject, blendSettings);
  const filterStr3 = blendArgs[blendArgs.indexOf('-filter_complex') + 1];
  assert(filterStr3.includes('blend=all_mode=screen'), 'filter_complex includes blend=all_mode=screen');

  await runCommand('ffmpeg', blendArgs);
  assert(fs.existsSync(blendOutputPath), 'Blend mode exported video exists');
  const blendProbe = await probeFile(blendOutputPath);
  assert(blendProbe.streams.some((s: any) => s.codec_type === 'video'), 'Valid video stream in blend export');
  console.log(`-> PASS: Real Blend Mode export verified! (${fs.statSync(blendOutputPath).size} bytes)\n`);

  // ----------------------------------------------------
  // TEST 4: Video + Crop
  // ----------------------------------------------------
  console.log('--- TEST 4: Video + Crop ---');
  const cropOutputPath = path.join(outputDir, 'export_crop.mp4');
  if (fs.existsSync(cropOutputPath)) fs.unlinkSync(cropOutputPath);

  const cropProject: FreeCutProject = {
    version: '0.1',
    project: {
      name: 'Crop Export Test',
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
      { id: 'track_v1', name: 'Main Video', type: 'video', order: 0, muted: false, locked: false, visible: true, height: 64 },
    ],
    clips: [
      {
        id: 'clip_cropped',
        trackId: 'track_v1',
        mediaId: 'media_sample',
        name: 'Cropped Clip',
        startTime: 0,
        duration: 3.0,
        sourceStart: 0,
        sourceDuration: 3.0,
        type: 'video',
        transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
        volume: 1,
        muted: false,
        crop: {
          left: 0.15,
          right: 0.15,
          top: 0.10,
          bottom: 0.10,
        },
      },
    ],
  };

  const cropSettings = { ...baseExportSettings, outputPath: cropOutputPath };
  const cropArgs = FFmpegService.generateFFmpegArgs(cropProject, cropSettings);
  const filterStr4 = cropArgs[cropArgs.indexOf('-filter_complex') + 1];
  assert(filterStr4.includes('crop='), 'filter_complex includes crop filter');

  await runCommand('ffmpeg', cropArgs);
  assert(fs.existsSync(cropOutputPath), 'Crop exported video exists');
  const cropProbe = await probeFile(cropOutputPath);
  assert(cropProbe.streams.some((s: any) => s.codec_type === 'video'), 'Valid video stream in crop export');
  console.log(`-> PASS: Real Crop export verified! (${fs.statSync(cropOutputPath).size} bytes)\n`);

  // ----------------------------------------------------
  // TEST 5: Video + Flip
  // ----------------------------------------------------
  console.log('--- TEST 5: Video + Flip ---');
  const flipOutputPath = path.join(outputDir, 'export_flip.mp4');
  if (fs.existsSync(flipOutputPath)) fs.unlinkSync(flipOutputPath);

  const flipProject: FreeCutProject = {
    version: '0.1',
    project: {
      name: 'Flip Export Test',
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
      { id: 'track_v1', name: 'Main Video', type: 'video', order: 0, muted: false, locked: false, visible: true, height: 64 },
    ],
    clips: [
      {
        id: 'clip_flipped',
        trackId: 'track_v1',
        mediaId: 'media_sample',
        name: 'Flipped Clip',
        startTime: 0,
        duration: 3.0,
        sourceStart: 0,
        sourceDuration: 3.0,
        type: 'video',
        transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
        volume: 1,
        muted: false,
        flip: {
          horizontal: true,
          vertical: false,
        },
      },
    ],
  };

  const flipSettings = { ...baseExportSettings, outputPath: flipOutputPath };
  const flipArgs = FFmpegService.generateFFmpegArgs(flipProject, flipSettings);
  const filterStr5 = flipArgs[flipArgs.indexOf('-filter_complex') + 1];
  assert(filterStr5.includes('hflip'), 'filter_complex includes hflip filter');

  await runCommand('ffmpeg', flipArgs);
  assert(fs.existsSync(flipOutputPath), 'Flip exported video exists');
  const flipProbe = await probeFile(flipOutputPath);
  assert(flipProbe.streams.some((s: any) => s.codec_type === 'video'), 'Valid video stream in flip export');
  console.log(`-> PASS: Real Flip export verified! (${fs.statSync(flipOutputPath).size} bytes)\n`);

  console.log('==================================================');
  console.log('ALL 5 REAL MEDIA COMPOSITING EXPORT TESTS PASSED!');
  console.log('==================================================');
}

runRealMediaCompositingTests().catch(err => {
  console.error('Real media compositing export test failed:', err);
  process.exit(1);
});
