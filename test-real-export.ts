/**
 * FreeCut Alpha 0.5 Real Media Export Test
 * Validates real media rendering through FFmpeg for:
 * 1. Clip A -> Cross Dissolve -> Clip B
 * 2. Clip -> Blur Effect
 */

import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { FreeCutProject } from './src/types/project';
import { ExportSettings } from './src/types/export';
import { FFmpegService } from './src/services/ffmpegService';

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

async function runRealMediaExportTests() {
  console.log('=== RUNNING FREECUT ALPHA 0.5 REAL MEDIA EXPORT TESTS ===\n');

  const samplePath = path.resolve('test-media/sample-video.mp4');
  assert(fs.existsSync(samplePath), `Sample video must exist at ${samplePath}`);

  const outputDir = path.resolve('test-media/exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // ----------------------------------------------------
  // TEST 1: Clip A -> Cross Dissolve -> Clip B
  // ----------------------------------------------------
  console.log('--- TEST 1: Clip A -> Cross Dissolve -> Clip B ---');
  const transOutputPath = path.join(outputDir, 'export_cross_dissolve.mp4');
  if (fs.existsSync(transOutputPath)) fs.unlinkSync(transOutputPath);

  const transProject: FreeCutProject = {
    version: '0.1',
    project: {
      name: 'Cross Dissolve Export Test',
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
        name: 'Video 1',
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
        id: 'clip_1',
        trackId: 'track_v1',
        mediaId: 'media_sample',
        name: 'Clip A (0s-2.5s)',
        startTime: 0,
        duration: 2.5,
        sourceStart: 0,
        sourceDuration: 2.5,
        type: 'video',
      },
      {
        id: 'clip_2',
        trackId: 'track_v1',
        mediaId: 'media_sample',
        name: 'Clip B (2.5s-5s)',
        startTime: 2.5,
        duration: 2.5,
        sourceStart: 2.0,
        sourceDuration: 2.5,
        type: 'video',
      },
    ],
    transitions: [
      {
        id: 'tr_dissolve_1',
        trackId: 'track_v1',
        fromClipId: 'clip_1',
        toClipId: 'clip_2',
        type: 'crossDissolve',
        duration: 1.0,
        enabled: true,
      },
    ],
  };

  const transExportSettings: ExportSettings = {
    format: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 864,
    height: 496,
    fps: 30,
    videoBitrateKbps: 3000,
    audioBitrateKbps: 192,
    outputPath: transOutputPath,
  };

  const transArgs = FFmpegService.generateFFmpegArgs(transProject, transExportSettings);
  console.log('Executing FFmpeg command with compiled xfade arguments:');
  console.log('ffmpeg', transArgs.join(' '));

  await runCommand('ffmpeg', transArgs);

  assert(fs.existsSync(transOutputPath), 'Exported transition file must exist');
  const transStats = fs.statSync(transOutputPath);
  assert(transStats.size > 10000, `Exported file has real content (size: ${transStats.size} bytes)`);

  const transProbe = await probeFile(transOutputPath);
  assert(transProbe.streams.length >= 1, 'Contains valid video stream');
  const videoStream = transProbe.streams.find((s: any) => s.codec_type === 'video');
  assert(videoStream !== undefined, 'Found video stream');
  assert(videoStream.width === 864 && videoStream.height === 496, 'Matches resolution 864x496');

  // Total duration: 2.5s + 2.5s - 1.0s overlap = 4.0s
  const durationSec = parseFloat(transProbe.format.duration);
  assert(Math.abs(durationSec - 4.0) < 0.25, `Expected ~4.0s duration, got ${durationSec}s`);
  console.log(`-> PASS: Real Cross Dissolve transition exported successfully! (${transStats.size} bytes, ${durationSec.toFixed(2)}s)\n`);

  // ----------------------------------------------------
  // TEST 2: Clip with Blur Effect
  // ----------------------------------------------------
  console.log('--- TEST 2: Clip with Blur Effect ---');
  const blurOutputPath = path.join(outputDir, 'export_blur_effect.mp4');
  if (fs.existsSync(blurOutputPath)) fs.unlinkSync(blurOutputPath);

  const blurProject: FreeCutProject = {
    version: '0.1',
    project: {
      name: 'Blur Effect Export Test',
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
        name: 'Video 1',
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
        id: 'clip_blur',
        trackId: 'track_v1',
        mediaId: 'media_sample',
        name: 'Clip with Blur',
        startTime: 0,
        duration: 3.0,
        sourceStart: 1.0,
        sourceDuration: 3.0,
        type: 'video',
        effects: [
          {
            id: 'ef_blur_test',
            effectType: 'blur',
            enabled: true,
            parameters: { amount: 15 },
          },
        ],
      },
    ],
    transitions: [],
  };

  const blurExportSettings: ExportSettings = {
    format: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 864,
    height: 496,
    fps: 30,
    videoBitrateKbps: 3000,
    audioBitrateKbps: 192,
    outputPath: blurOutputPath,
  };

  const blurArgs = FFmpegService.generateFFmpegArgs(blurProject, blurExportSettings);
  console.log('Executing FFmpeg command with compiled boxblur filter:');
  console.log('ffmpeg', blurArgs.join(' '));

  await runCommand('ffmpeg', blurArgs);

  assert(fs.existsSync(blurOutputPath), 'Exported blur file must exist');
  const blurStats = fs.statSync(blurOutputPath);
  assert(blurStats.size > 10000, `Exported file has real content (size: ${blurStats.size} bytes)`);

  const blurProbe = await probeFile(blurOutputPath);
  const blurVideoStream = blurProbe.streams.find((s: any) => s.codec_type === 'video');
  assert(blurVideoStream !== undefined, 'Found video stream in blurred export');
  const blurDurationSec = parseFloat(blurProbe.format.duration);
  assert(Math.abs(blurDurationSec - 3.0) < 0.25, `Expected ~3.0s duration, got ${blurDurationSec}s`);
  console.log(`-> PASS: Real Blur effect exported successfully! (${blurStats.size} bytes, ${blurDurationSec.toFixed(2)}s)\n`);

  console.log('==================================================');
  console.log('ALL REAL MEDIA EXPORT TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================\n');
}

runRealMediaExportTests().catch(err => {
  console.error('Fatal Real Media Test Error:', err);
  process.exit(1);
});
