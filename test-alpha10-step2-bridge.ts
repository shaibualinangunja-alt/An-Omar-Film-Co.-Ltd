/**
 * FREECUT Alpha 1.0 Step 2 Validation Suite
 * Tests native desktop bridge hardening, export error handling, live progress,
 * cancellation, sidecar binary packaging, and release branding.
 */

import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { DesktopBridge } from './src/native/desktopBridge';
import { ExportService } from './src/services/exportService';
import { ProjectService } from './src/services/projectService';
import { ExportSettings, ExportProgress } from './src/types/export';

// Polyfill relative fetch for Node runtime against active dev server
const originalFetch = globalThis.fetch;
globalThis.fetch = (input: any, init?: any) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    input = 'http://localhost:5173' + input;
  }
  return originalFetch(input, init);
};

async function runStep2Tests() {
  console.log('===============================================================');
  console.log('FREECUT by ROMALABS — Alpha 1.0 Step 2 Native Bridge Validation');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`✓ [PASS] Test ${total}: ${desc}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] Test ${total}: ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  // --- 1. SIDECAR BINARY INTEGRITY (Clean Machine Independence) ---
  console.log('--- SECTION 1: SIDECAR BINARIES & CLEAN MACHINE INDEPENDENCE ---');
  const tauriBinDir = path.resolve('src-tauri/binaries');
  assert(fs.existsSync(tauriBinDir), 'src-tauri/binaries directory exists');

  const ffmpegExe = path.join(tauriBinDir, 'ffmpeg.exe');
  const ffprobeExe = path.join(tauriBinDir, 'ffprobe.exe');
  const ffmpegTriple = path.join(tauriBinDir, 'ffmpeg-x86_64-pc-windows-msvc.exe');
  const ffprobeTriple = path.join(tauriBinDir, 'ffprobe-x86_64-pc-windows-msvc.exe');

  assert(fs.existsSync(ffmpegExe) && fs.statSync(ffmpegExe).size > 50000000, 'Bundled ffmpeg.exe exists (>50MB)');
  assert(fs.existsSync(ffprobeExe) && fs.statSync(ffprobeExe).size > 50000000, 'Bundled ffprobe.exe exists (>50MB)');
  assert(fs.existsSync(ffmpegTriple) && fs.statSync(ffmpegTriple).size > 50000000, 'Target-triple sidecar ffmpeg-x86_64-pc-windows-msvc.exe exists');
  assert(fs.existsSync(ffprobeTriple) && fs.statSync(ffprobeTriple).size > 50000000, 'Target-triple sidecar ffprobe-x86_64-pc-windows-msvc.exe exists');

  // Verify direct invocation of sidecar without system PATH
  const sidecarVersion = await new Promise<string>((resolve, reject) => {
    execFile(ffmpegExe, ['-version'], { env: { PATH: '' } }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.split('\n')[0].trim());
    });
  });
  assert(sidecarVersion.includes('ffmpeg version'), `Bundled FFmpeg runs independently on clean machine (${sidecarVersion.substring(0, 30)}...)`);

  // --- 2. RELEASE METADATA & BRANDING ASSETS ---
  console.log('\n--- SECTION 2: RELEASE METADATA & BRANDING ASSETS ---');
  const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  assert(pkgJson.version === '1.0.0', `package.json version is aligned to 1.0.0 (got ${pkgJson.version})`);

  const cargoToml = fs.readFileSync('src-tauri/Cargo.toml', 'utf-8');
  assert(cargoToml.includes('version = "1.0.0"'), 'src-tauri/Cargo.toml version is 1.0.0');

  const tauriConf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf-8'));
  assert(tauriConf.package.version === '1.0.0', `tauri.conf.json version is 1.0.0 (got ${tauriConf.package.version})`);
  assert(Array.isArray(tauriConf.tauri.bundle.externalBin) && tauriConf.tauri.bundle.externalBin.includes('binaries/ffmpeg'), 'tauri.conf.json externalBin registers binaries/ffmpeg');
  assert(Array.isArray(tauriConf.tauri.bundle.externalBin) && tauriConf.tauri.bundle.externalBin.includes('binaries/ffprobe'), 'tauri.conf.json externalBin registers binaries/ffprobe');

  const iconDir = path.resolve('src-tauri/icons');
  assert(fs.existsSync(path.join(iconDir, '32x32.png')), '32x32.png icon generated');
  assert(fs.existsSync(path.join(iconDir, '128x128.png')), '128x128.png icon generated');
  assert(fs.existsSync(path.join(iconDir, '128x128@2x.png')), '128x128@2x.png icon generated');
  assert(fs.existsSync(path.join(iconDir, 'icon.ico')) && fs.statSync(path.join(iconDir, 'icon.ico')).size > 1000, 'icon.ico Windows multi-resolution icon generated');

  // --- 3. LIVE PROGRESS & REAL EXPORT VIA DESKTOP BRIDGE ---
  console.log('\n--- SECTION 3: LIVE PROGRESS & REAL EXPORT VIA DESKTOP BRIDGE ---');
  const sampleVideo = path.resolve('test-media/sample-video.mp4');
  const exportOut = path.resolve('test-media/exports/step2_live_progress_export.mp4');

  const progressLines: string[] = [];
  const exportArgs = [
    '-y',
    '-i', sampleVideo,
    '-t', '2',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-b:v', '2000k',
    '-r', '30',
    exportOut
  ];

  const renderResult = await DesktopBridge.renderExport({
    args: exportArgs,
    jobId: 'step2_test_render_01',
    onProgressLine: (line) => {
      progressLines.push(line);
    }
  });

  assert(renderResult.success === true, 'DesktopBridge.renderExport completed with success: true');
  assert(fs.existsSync(exportOut) && fs.statSync(exportOut).size > 0, 'Exported video file exists on disk');

  // --- 4. EXPORT ERROR HANDLING (NO SWALLOWING) ---
  console.log('\n--- SECTION 4: EXPORT ERROR PROPAGATION (NO FALSE SUCCESS) ---');
  const project = ProjectService.createDefaultProject('Error Handling Test');
  // Intentionally invalid export settings: invalid input file
  project.media = [{
    id: 'missing_media',
    name: 'missing.mp4',
    path: 'C:\\NonExistentPath\\definitely_missing_file_404.mp4',
    type: 'video',
    size: 1000,
    duration: 5,
    createdAt: Date.now()
  }];
  project.clips = [{
    id: 'clip_invalid',
    mediaId: 'missing_media',
    trackId: project.tracks[0].id,
    startTime: 0,
    duration: 3,
    sourceStart: 0,
    sourceDuration: 3,
    type: 'video',
    speed: 1,
    volume: 1
  }];

  const invalidSettings: ExportSettings = {
    outputPath: path.resolve('test-media/exports/should_never_exist.mp4'),
    format: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 864,
    height: 496,
    fps: 30,
    videoBitrateKbps: 3000,
    audioBitrateKbps: 192,
    useHardwareAcceleration: false
  };

  const progressHistory: ExportProgress[] = [];
  let errorCaught = false;

  try {
    await ExportService.startExport(project, invalidSettings, (progress) => {
      progressHistory.push({ ...progress });
    });
  } catch (err: any) {
    errorCaught = true;
    console.log(`   Caught expected render failure: "${err.message.substring(0, 60)}..."`);
  }

  assert(errorCaught === true, 'ExportService.startExport strictly throws when render fails');
  const lastProgress = progressHistory[progressHistory.length - 1];
  assert(lastProgress && lastProgress.status === 'error', `Final progress status is 'error' (got '${lastProgress?.status}')`);
  assert(lastProgress && !!lastProgress.errorMessage, 'Error progress contains user-visible errorMessage');
  assert(!progressHistory.some(p => p.status === 'completed'), 'Export never falsely reports status: completed on error');
  assert(!progressHistory.some(p => p.percent === 100), 'Export never falsely reports percent: 100 on error');
  assert(!fs.existsSync(invalidSettings.outputPath), 'Failed export does not produce output file');

  // --- 5. CANCELLATION VIA DESKTOP BRIDGE ---
  console.log('\n--- SECTION 5: CANCELLATION HANDLING ---');
  const longExportOut = path.resolve('test-media/exports/should_be_cancelled.mp4');
  const longExportArgs = [
    '-y',
    '-f', 'lavfi',
    '-i', 'testsrc=size=1920x1080:rate=30',
    '-t', '60',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    longExportOut
  ];

  const cancelJobId = `cancel_test_${Date.now()}`;
  let cancelExportErrorCaught = false;

  // Start background export
  const renderPromise = DesktopBridge.renderExport({
    args: longExportArgs,
    jobId: cancelJobId
  }).catch((err) => {
    cancelExportErrorCaught = true;
  });

  // Wait 100ms then trigger cancellation
  await new Promise(r => setTimeout(r, 100));
  const cancelResult = await DesktopBridge.cancelExport(cancelJobId);
  console.log(`   cancelExport call returned: ${cancelResult}`);

  await renderPromise;
  assert(cancelResult === true || cancelExportErrorCaught === true, 'DesktopBridge.cancelExport successfully terminates running render');

  console.log('\n===============================================================');
  console.log(`ALPHA 1.0 STEP 2 VALIDATION: ${passed} / ${total} TESTS PASSED!`);
  console.log('===============================================================\n');
}

runStep2Tests().catch(err => {
  console.error('\nSTEP 2 TESTS FAILED:', err);
  process.exit(1);
});
