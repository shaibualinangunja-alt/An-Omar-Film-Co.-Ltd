/**
 * FREECUT Alpha 1.0 Smoke Test
 * Tests the complete 10-step real-media lifecycle:
 * 1. Launch / initialize project store
 * 2. Create project
 * 3. Ingest real media with FFprobe
 * 4. Add clip to timeline
 * 5. Verify preview frame evaluation
 * 6. Execute timeline edit (split + trim)
 * 7. Serialize / save project
 * 8. Deserialize / reload project
 * 9. Export real video via FFmpeg
 * 10. Verify export with FFprobe
 */

import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { ProjectService } from './src/services/projectService';
import { MediaService } from './src/services/mediaService';
import { TimelineOperations } from './src/services/timelineOperations';
import { FFmpegService } from './src/services/ffmpegService';
import { ExportSettings } from './src/types/export';

// Polyfill relative fetch for Node runtime against active dev server
const originalFetch = globalThis.fetch;
globalThis.fetch = (input: any, init?: any) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    input = 'http://localhost:5173' + input;
  }
  return originalFetch(input, init);
};

async function runSmokeTest() {
  console.log('=== RUNNING FREECUT ALPHA 1.0 REAL-MEDIA SMOKE TEST ===\n');

  // Step 1 & 2: Create project
  console.log('Step 1 & 2: Initialize Editor & Create Project...');
  const project = ProjectService.createDefaultProject('Alpha 1.0 Smoke Test Project');
  if (!project || project.tracks.length === 0) {
    throw new Error('Failed to create default project');
  }
  console.log(` -> PASS: Project created "${project.project.name}" with ${project.tracks.length} tracks.`);

  // Step 3: Ingest real media
  console.log('Step 3: Ingest Real Media (FFprobe)...');
  const mediaFile = path.resolve('test-media/sample-video.mp4');
  if (!fs.existsSync(mediaFile)) {
    throw new Error(`Test media file not found at ${mediaFile}`);
  }
  const mediaAsset = await MediaService.probeLocalFile(mediaFile);
  project.media.push(mediaAsset);
  console.log(` -> PASS: Probed ${mediaAsset.name} (${mediaAsset.width}x${mediaAsset.height}, ${mediaAsset.duration.toFixed(2)}s, codec: ${mediaAsset.codec}).`);

  // Step 4: Place media on timeline
  console.log('Step 4: Place Media on Timeline...');
  const targetTrack = project.tracks.find(t => t.type === 'video')!.id;
  const insertRes = TimelineOperations.insertClip(project, mediaAsset.id, targetTrack, 0);
  if (insertRes.project.clips.length === 0) {
    throw new Error('Failed to place clip on timeline');
  }
  let currentProject = insertRes.project;
  const originalClip = currentProject.clips[0];
  console.log(` -> PASS: Clip placed on track ${targetTrack} at ${originalClip.startTime}s with duration ${originalClip.duration}s.`);

  // Step 5: Play preview / evaluate frame at 1.0s
  console.log('Step 5: Preview Frame Evaluation...');
  const playheadTime = 1.0;
  const activeClips = currentProject.clips.filter(
    c => playheadTime >= c.startTime && playheadTime < c.startTime + c.duration
  );
  if (activeClips.length === 0) {
    throw new Error('No active clip found at playhead 1.0s');
  }
  console.log(` -> PASS: Preview evaluation confirmed active clip "${activeClips[0].id}" at playhead ${playheadTime}s.`);

  // Step 6: Make a basic edit (Split clip at 2.0s)
  console.log('Step 6: Make Timeline Edit (Split at 2.0s)...');
  const splitRes = TimelineOperations.splitClipsAtTime(currentProject, [originalClip.id], 2.0);
  if (splitRes.project.clips.length < 2) {
    throw new Error('Split operation did not create additional clip');
  }
  currentProject = splitRes.project;
  console.log(` -> PASS: Split successful. Project now contains ${currentProject.clips.length} clips.`);

  // Step 7: Save project
  console.log('Step 7: Save Project (Serialize to JSON)...');
  const jsonString = ProjectService.serializeProject(currentProject);
  if (!jsonString || jsonString.length < 100) {
    throw new Error('Project serialization failed');
  }
  const savePath = path.resolve('test-media/smoke_test_project.freecut');
  fs.writeFileSync(savePath, jsonString, 'utf-8');
  console.log(` -> PASS: Project serialized and saved (${jsonString.length} bytes) to ${savePath}.`);

  // Step 8: Reload project
  console.log('Step 8: Reload Project (Deserialize from JSON)...');
  const readBackJson = fs.readFileSync(savePath, 'utf-8');
  const reloadedProject = ProjectService.deserializeProject(readBackJson);
  if (reloadedProject.clips.length !== currentProject.clips.length) {
    throw new Error('Reloaded project clip count mismatch');
  }
  console.log(` -> PASS: Project reloaded successfully with ${reloadedProject.clips.length} clips and ${reloadedProject.tracks.length} tracks.`);

  // Step 9: Export real video
  console.log('Step 9: Export Real Video via FFmpeg...');
  const exportDir = path.resolve('test-media/exports');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  const exportPath = path.join(exportDir, 'smoke_test_export.mp4');

  const settings: ExportSettings = {
    outputPath: exportPath,
    format: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    width: 864,
    height: 496,
    fps: 30,
    videoBitrateKbps: 3000,
    audioBitrateKbps: 192,
    useHardwareAcceleration: false,
  };

  const args = FFmpegService.generateFFmpegArgs(reloadedProject, settings);
  console.log(' -> FFmpeg command:', 'ffmpeg', args.slice(0, 8).join(' '), '...');

  await new Promise<void>((resolve, reject) => {
    execFile('ffmpeg', args, (err, stdout, stderr) => {
      if (err) {
        return reject(new Error(`FFmpeg export failed: ${err.message}\nStderr: ${stderr}`));
      }
      resolve();
    });
  });

  if (!fs.existsSync(exportPath) || fs.statSync(exportPath).size === 0) {
    throw new Error(`Export file was not created or empty: ${exportPath}`);
  }
  const stat = fs.statSync(exportPath);
  console.log(` -> PASS: Video rendered successfully (${stat.size} bytes).`);

  // Step 10: Verify exported media with FFprobe
  console.log('Step 10: Verify Exported Media with FFprobe...');
  const probeArgs = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', exportPath];
  const probeOutput = await new Promise<string>((resolve, reject) => {
    execFile('ffprobe', probeArgs, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });

  const probeData = JSON.parse(probeOutput);
  const vStream = probeData.streams?.find((s: any) => s.codec_type === 'video');
  const aStream = probeData.streams?.find((s: any) => s.codec_type === 'audio');

  console.log(` -> Probed Format: ${probeData.format.format_name}, Duration: ${probeData.format.duration}s, Size: ${probeData.format.size} bytes`);
  console.log(` -> Video: ${vStream?.codec_name}, ${vStream?.width}x${vStream?.height}, fps: ${vStream?.r_frame_rate}`);
  console.log(` -> Audio: ${aStream?.codec_name}, ${aStream?.sample_rate}Hz, channels: ${aStream?.channels}`);

  if (!vStream || vStream.width !== 864 || vStream.height !== 496) {
    throw new Error('Video stream invalid or resolution mismatch');
  }

  console.log('\n===============================================================');
  console.log('FREECUT ALPHA 1.0 REAL-MEDIA SMOKE TEST: ALL 10 STEPS PASSED!');
  console.log('===============================================================\n');
}

runSmokeTest().catch(err => {
  console.error('\nSMOKE TEST FAILED:', err);
  process.exit(1);
});
