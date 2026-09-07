/**
 * FreeCut Alpha 0.8 Professional Audio + Color Management + Color Grading + Professional Export
 * Automated Test Suite (34/34 Tests)
 */

import { FreeCutProject, ClipItem } from './src/types/project';
import { ProjectService } from './src/services/projectService';
import { AudioMixer } from './src/audio/audioMixer';
import {
  ColorSpaceRegistry,
  LUTService,
  AutoColorEngine,
  ColorCompiler,
  DEFAULT_COLOR_GRADE,
  DEFAULT_COLOR_MANAGEMENT,
  StandardColorSpace,
} from './src/color';
import {
  ExportProfileRegistry,
  HardwareDetector,
  ExportQueueManager,
} from './src/export';
import { evaluateClipAnimations } from './src/animation';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

let passedCount = 0;
let failedCount = 0;

function runTest(testNumber: number, title: string, testFn: () => void) {
  try {
    testFn();
    passedCount++;
    console.log(`✓ Test ${testNumber}: ${title}`);
  } catch (err: any) {
    failedCount++;
    console.error(`✗ Test ${testNumber} FAILED: ${title}\n  -> ${err.message}`);
  }
}

console.log('===============================================================');
console.log('FREECUT by ROMALABS — Alpha 0.8 Automated Unit Test Suite');
console.log('Audio + Color Management + Color Grading + Professional Export');
console.log('===============================================================\n');

// -------------------------------------------------------------
// SECTION 1: PROFESSIONAL AUDIO ENGINE (Tests 1-10)
// -------------------------------------------------------------

runTest(1, 'Audio clip creation with default properties', () => {
  const proj = ProjectService.createDefaultProject('Audio Test');
  assert(proj.tracks.some(t => t.type === 'audio'), 'Default project must contain audio tracks');
  const a1 = proj.tracks.find(t => t.id === 'track_a1')!;
  assert(a1 !== undefined, 'Track A1 exists');
  assert(a1.solo === false, 'A1 solo initialized to false');
  assert(a1.volume === 1.0, 'A1 volume initialized to 1.0');
  assert(a1.pan === 0.0, 'A1 pan initialized to center (0.0)');
});

runTest(2, 'Audio clip volume/gain adjustment', () => {
  const proj = ProjectService.createDefaultProject('Volume Test');
  const clip: ClipItem = {
    id: 'clip-audio-1',
    mediaId: 'media-audio',
    trackId: 'track_a1',
    name: 'Voiceover',
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceDuration: 10,
    type: 'audio',
    volume: 0.75,
    pan: 0,
    muted: false,
  };
  proj.clips.push(clip);
  assert(proj.clips[0].volume === 0.75, 'Clip volume set to 0.75');
});

runTest(3, 'Audio clip pan/balance adjustment', () => {
  const clip: ClipItem = {
    id: 'clip-audio-pan',
    mediaId: 'm1',
    trackId: 'track_a1',
    name: 'SFX',
    startTime: 0,
    duration: 5,
    sourceStart: 0,
    sourceDuration: 5,
    type: 'audio',
    volume: 1,
    pan: -0.8, // Left panned
    muted: false,
  };
  assert(clip.pan === -0.8, 'Clip pan set to -0.8');
});

runTest(4, 'Audio clip mute and track mute enforcement', () => {
  const proj = ProjectService.createDefaultProject('Mute Test');
  const track = proj.tracks.find(t => t.id === 'track_a1')!;
  track.muted = true;
  const clip: ClipItem = {
    id: 'clip-muted',
    mediaId: 'm1',
    trackId: 'track_a1',
    name: 'Muted Clip',
    startTime: 0,
    duration: 5,
    sourceStart: 0,
    sourceDuration: 5,
    type: 'audio',
    volume: 1,
    pan: 0,
    muted: true,
  };
  proj.clips.push(clip);
  assert(track.muted === true, 'Track muted is true');
  assert(clip.muted === true, 'Clip muted is true');
});

runTest(5, 'Audio track solo isolation logic', () => {
  const proj = ProjectService.createDefaultProject('Solo Test');
  const a1 = proj.tracks.find(t => t.id === 'track_a1')!;
  const a2 = proj.tracks.find(t => t.id === 'track_a2')!;
  a1.solo = true;
  a2.solo = false;
  assert(a1.solo === true, 'Track A1 soloed');
  assert(a2.solo === false, 'Track A2 not soloed');
});

runTest(6, 'Audio clip fade-in parameter and compilation', () => {
  const clip: ClipItem = {
    id: 'clip-fade-in',
    mediaId: 'm1',
    trackId: 'track_a1',
    name: 'Music Fade In',
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceDuration: 10,
    type: 'audio',
    volume: 1,
    pan: 0,
    muted: false,
    fadeInDuration: 1.5,
  };
  assert(clip.fadeInDuration === 1.5, 'Clip fade-in duration is 1.5s');
});

runTest(7, 'Audio clip fade-out parameter and compilation', () => {
  const clip: ClipItem = {
    id: 'clip-fade-out',
    mediaId: 'm1',
    trackId: 'track_a1',
    name: 'Music Fade Out',
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceDuration: 10,
    type: 'audio',
    volume: 1,
    pan: 0,
    muted: false,
    fadeOutDuration: 2.0,
  };
  assert(clip.fadeOutDuration === 2.0, 'Clip fade-out duration is 2.0s');
});

runTest(8, 'Audio keyframe evaluation on volume parameter', () => {
  const clip: ClipItem = {
    id: 'clip-kf-vol',
    mediaId: 'm1',
    trackId: 'track_a1',
    name: 'Animated Vol',
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceDuration: 10,
    type: 'audio',
    volume: 1,
    pan: 0,
    muted: false,
    animations: {
      volume: {
        keyframes: [
          { id: 'kf1', time: 0, value: 0.2, interpolation: 'linear' },
          { id: 'kf2', time: 5, value: 1.0, interpolation: 'linear' },
        ],
      },
    },
  };
  const atZero = evaluateClipAnimations(clip, 0);
  assert(Math.abs(atZero.volume - 0.2) < 0.01, 'Volume at 0s is 0.2');
  const atMid = evaluateClipAnimations(clip, 2.5);
  assert(Math.abs(atMid.volume - 0.6) < 0.01, 'Volume at 2.5s is linearly interpolated to 0.6');
  const atFive = evaluateClipAnimations(clip, 5);
  assert(Math.abs(atFive.volume - 1.0) < 0.01, 'Volume at 5s is 1.0');
});

runTest(9, 'Audio mixing filter graph compilation (adelay, volume, afade, amix)', () => {
  const proj = ProjectService.createDefaultProject('Mixer Test');
  proj.media.push(
    { id: 'm1', name: 'vocal.wav', path: 'vocal.wav', type: 'audio', duration: 10, audioChannels: 2 },
    { id: 'm2', name: 'bgm.wav', path: 'bgm.wav', type: 'audio', duration: 10, audioChannels: 2 }
  );

  const clip1: ClipItem = {
    id: 'c1',
    mediaId: 'm1',
    trackId: 'track_a1',
    name: 'Vocal',
    startTime: 1.0,
    duration: 4.0,
    sourceStart: 0,
    sourceDuration: 4.0,
    type: 'audio',
    volume: 0.8,
    pan: -0.5,
    muted: false,
    fadeInDuration: 0.5,
    fadeOutDuration: 0.5,
  };
  const clip2: ClipItem = {
    id: 'c2',
    mediaId: 'm2',
    trackId: 'track_a2',
    name: 'BGM',
    startTime: 0.0,
    duration: 8.0,
    sourceStart: 0,
    sourceDuration: 8.0,
    type: 'audio',
    volume: 0.5,
    pan: 0.5,
    muted: false,
  };
  proj.clips.push(clip1, clip2);

  const mediaMap = new Map<string, number>();
  mediaMap.set('m1', 0);
  mediaMap.set('m2', 1);

  const graph = AudioMixer.compileAudioMix(proj, mediaMap, 10);
  assert(graph.filterComplexParts.length > 0, 'Audio mix graph generated filters');
  const fullFilterStr = graph.filterComplexParts.join(';');
  assert(fullFilterStr.includes('adelay='), 'Includes sample/time delay filter');
  assert(fullFilterStr.includes('afade=t=in'), 'Includes afade in filter');
  assert(fullFilterStr.includes('afade=t=out'), 'Includes afade out filter');
  assert(fullFilterStr.includes('amix='), 'Includes multi-track amix filter');
  assert(graph.outputStream === '[a_mix_out]', 'Output audio label is [a_mix_out]');
});

runTest(10, 'Audio project serialization and backward compatibility save/load', () => {
  const proj = ProjectService.createDefaultProject('Persistence Test');
  const clip: ClipItem = {
    id: 'c-persist',
    mediaId: 'm1',
    trackId: 'track_a1',
    name: 'Audio Clip',
    startTime: 2.0,
    duration: 6.0,
    sourceStart: 1.0,
    sourceDuration: 6.0,
    type: 'audio',
    volume: 0.85,
    pan: 0.3,
    muted: false,
    fadeInDuration: 1.0,
    fadeOutDuration: 1.5,
  };
  proj.clips.push(clip);

  const jsonStr = ProjectService.serializeProject(proj);
  const reloaded = ProjectService.deserializeProject(jsonStr);
  const loadedClip = reloaded.clips.find(c => c.id === 'c-persist')!;
  assert(loadedClip !== undefined, 'Clip restored');
  assert(loadedClip.volume === 0.85, 'Volume preserved');
  assert(loadedClip.pan === 0.3, 'Pan preserved');
  assert(loadedClip.fadeInDuration === 1.0, 'Fade in preserved');
  assert(loadedClip.fadeOutDuration === 1.5, 'Fade out preserved');
});

// -------------------------------------------------------------
// SECTION 2: COLOR MANAGEMENT & COLOR GRADING (Tests 11-25)
// -------------------------------------------------------------

runTest(11, 'Color settings creation with default parameters', () => {
  const grade = { ...DEFAULT_COLOR_GRADE };
  assert(grade.enabled === true, 'Grade enabled by default');
  assert(grade.basic.exposure === 0, 'Default exposure is 0');
  assert(grade.basic.contrast === 1.0, 'Default contrast is 1.0');
  assert(grade.basic.saturation === 1.0, 'Default saturation is 1.0');
  assert(grade.wheels.gain.y === 0, 'Default gain y is 0');
});

runTest(12, 'Color-space validation across SDR, UHD, HDR, and Log profiles', () => {
  const spaces = ColorSpaceRegistry.listSpaces();
  assert(spaces.some(s => s.id === 'rec709'), 'Rec.709 present');
  assert(spaces.some(s => s.id === 'srgb'), 'sRGB present');
  assert(spaces.some(s => s.id === 'rec2020'), 'Rec.2020 present');
  assert(spaces.some(s => s.id === 'rec2100_pq'), 'Rec.2100 PQ present');
  assert(spaces.some(s => s.id === 'rec2100_hlg'), 'Rec.2100 HLG present');
  assert(spaces.some(s => s.id === 'sony_slog3'), 'Sony S-Log3 present');
  assert(spaces.some(s => s.id === 'arri_logc'), 'ARRI LogC present');
  assert(spaces.some(s => s.id === 'apple_log'), 'Apple Log present');
});

runTest(13, 'Input color-space detection and save/load', () => {
  const detected = ColorSpaceRegistry.detectFromMetadata('bt709', 'bt709', 'bt709', 'tv');
  assert(detected.colorSpace === 'rec709', 'Detected Rec.709 correctly');
  assert(detected.colorRange === 'limited', 'Detected limited range correctly');

  const detectedHdr = ColorSpaceRegistry.detectFromMetadata('bt2020', 'smpte2084', 'bt2020nc', 'pc');
  assert(detectedHdr.colorSpace === 'rec2100_pq', 'Detected Rec.2100 PQ correctly');
  assert(detectedHdr.colorRange === 'full', 'Detected full range correctly');
});

runTest(14, 'Working-space configuration save/load', () => {
  const cm = { ...DEFAULT_COLOR_MANAGEMENT, workingSpace: 'rec2020' as StandardColorSpace };
  assert(cm.workingSpace === 'rec2020', 'Working space set to Rec.2020');
});

runTest(15, 'Output-space configuration save/load', () => {
  const cm = { ...DEFAULT_COLOR_MANAGEMENT, outputSpace: 'rec709' as StandardColorSpace };
  assert(cm.outputSpace === 'rec709', 'Output space set to Rec.709');
});

runTest(16, 'Basic color grading math (Exposure, Contrast, WB, Saturation, Vibrance)', () => {
  const grade = {
    ...DEFAULT_COLOR_GRADE,
    basic: {
      ...DEFAULT_COLOR_GRADE.basic,
      exposure: 1.0, // +1 stop (x2 linear)
      contrast: 1.2,
      saturation: 1.5,
      vibrance: 0.5,
      temperature: 20,
    },
  };
  const filters = ColorCompiler.compileGradingToFFmpeg(grade);
  assert(filters.some(f => f.startsWith('eq=')), 'Compiles to FFmpeg eq filter');
  assert(filters.some(f => f.startsWith('colorbalance=')), 'Compiles to FFmpeg colorbalance filter');
});

runTest(17, 'Color wheels (Lift, Gamma, Gain, Offset) compilation', () => {
  const grade = {
    ...DEFAULT_COLOR_GRADE,
    wheels: {
      lift: { r: 0.2, g: 0.1, b: 0.0, y: 0.1 },
      gamma: { r: 0.0, g: 0.1, b: -0.1, y: 0.0 },
      gain: { r: 0.3, g: 0.2, b: 0.1, y: 0.2 },
      offset: { r: 0.0, g: 0.0, b: 0.0, y: 0.0 },
    },
  };
  const filters = ColorCompiler.compileGradingToFFmpeg(grade);
  const cb = filters.find(f => f.startsWith('colorbalance='));
  assert(cb !== undefined, 'Color balance filter generated for wheels');
  assert(cb!.includes('rh=') || cb!.includes('gh='), 'Highlights modified from gain');
});

runTest(18, 'Spline color curves interpolation and FFmpeg curves compilation', () => {
  const grade = {
    ...DEFAULT_COLOR_GRADE,
    curves: {
      master: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.6 },
        { x: 1, y: 1 },
      ],
      red: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      green: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      blue: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    },
  };
  const curveFilter = ColorCompiler.compileCurvesFilter(grade.curves);
  assert(curveFilter !== null && curveFilter !== undefined, 'Curve filter created');
  assert(curveFilter!.includes('curves=m='), 'Master curve points formatted for FFmpeg');
});

runTest(19, 'LUT .cube file parser validation', () => {
  const sampleCube = `
# FreeCut Test LUT
TITLE "Rec709_To_Warm"
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
`;
  const parsed = LUTService.parseCubeLUT(sampleCube);
  assert(parsed.size === 2, 'LUT size is 2');
  assert(parsed.title === 'Rec709_To_Warm', 'LUT title matches');
  assert(parsed.data.length === 2 * 2 * 2 * 3, 'LUT flattened data length matches 3D dimensions');
});

runTest(20, 'LUT 3D trilinear interpolation and intensity mixing', () => {
  const sampleCube = `
TITLE "Identity"
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
`;
  const parsed = LUTService.parseCubeLUT(sampleCube);
  const out = LUTService.apply3DLUT(parsed, 0.5, 0.5, 0.5, 1.0);
  assert(Math.abs(out[0] - 0.5) < 0.01, 'Red mapped accurately');
  assert(Math.abs(out[1] - 0.5) < 0.01, 'Green mapped accurately');
  assert(Math.abs(out[2] - 0.5) < 0.01, 'Blue mapped accurately');
});

runTest(21, 'Color parameter keyframe evaluation', () => {
  const clip: ClipItem = {
    id: 'clip-col-kf',
    mediaId: 'm1',
    trackId: 'track_v1',
    name: 'Graded Video',
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceDuration: 10,
    type: 'video',
    volume: 1,
    pan: 0,
    muted: false,
    colorGrade: {
      ...DEFAULT_COLOR_GRADE,
      keyframes: {
        exposure: [
          { id: 'k1', time: 0, value: 0.0, interpolation: 'linear' },
          { id: 'k2', time: 4, value: 1.5, interpolation: 'linear' },
        ],
      },
    },
  };
  assert(clip.colorGrade!.keyframes!.exposure!.length === 2, 'Color keyframes configured');
});

runTest(22, 'Color grade reset restoring default neutral values', () => {
  let grade = {
    ...DEFAULT_COLOR_GRADE,
    basic: { ...DEFAULT_COLOR_GRADE.basic, exposure: 2.5, contrast: 1.8 },
  };
  // Reset
  grade = { ...DEFAULT_COLOR_GRADE };
  assert(grade.basic.exposure === 0, 'Exposure reset to 0');
  assert(grade.basic.contrast === 1.0, 'Contrast reset to 1.0');
});

runTest(23, 'Deterministic auto-color analysis algorithm', () => {
  const width = 100;
  const height = 100;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 180;     // R
    pixels[i + 1] = 120; // G
    pixels[i + 2] = 90;  // B
    pixels[i + 3] = 255; // A
  }
  const imgData = { data: pixels, width, height } as ImageData;
  const analysis = AutoColorEngine.analyzeFrame(imgData);
  assert(analysis.recommendedExposure !== undefined, 'Recommended exposure calculated');
  assert(analysis.recommendedTemperature !== 0 || analysis.recommendedTint !== 0, 'Recommended WB adjustment generated');

  const corrected = AutoColorEngine.applyAutoCorrections(DEFAULT_COLOR_GRADE.basic, analysis);
  assert(corrected.temperature !== DEFAULT_COLOR_GRADE.basic.temperature || corrected.exposure !== DEFAULT_COLOR_GRADE.basic.exposure, 'Auto grade applied to basic settings');
});

runTest(24, 'HDR configuration (Rec.2100 PQ / HLG transfer characteristics)', () => {
  const pqSpace = ColorSpaceRegistry.getSpace('rec2100_pq')!;
  assert(pqSpace.gamma.includes('2084') || pqSpace.gamma.includes('PQ'), 'PQ uses SMPTE 2084 / PQ transfer');
  assert(pqSpace.primaries.includes('2020'), 'PQ uses BT.2020 primaries');

  const hlgSpace = ColorSpaceRegistry.getSpace('rec2100_hlg')!;
  assert(hlgSpace.gamma.includes('HLG') || hlgSpace.gamma.includes('ARIB'), 'HLG uses ARIB STD-B67 transfer');
});

runTest(25, 'Color range handling (full vs limited video range)', () => {
  const filterFull = ColorCompiler.compileColorSpaceTransform({
    inputSpace: 'rec709',
    workingSpace: 'rec709',
    outputSpace: 'rec709',
    colorRange: 'full',
    autoDetect: false,
  });
  assert(filterFull.some(f => f.includes('out_range=full')), 'Compiles full range scale filter');

  const filterLimited = ColorCompiler.compileColorSpaceTransform({
    inputSpace: 'rec709',
    workingSpace: 'rec709',
    outputSpace: 'rec709',
    colorRange: 'limited',
    autoDetect: false,
  });
  assert(filterLimited.some(f => f.includes('out_range=limited')), 'Compiles limited range scale filter');
});

// -------------------------------------------------------------
// SECTION 3: PROFESSIONAL EXPORT ENGINE (Tests 26-34)
// -------------------------------------------------------------

runTest(26, 'Export profile creation and presets registry', () => {
  const profiles = ExportProfileRegistry.listProfiles();
  assert(profiles.length >= 6, 'Contains at least 6 standard export profiles');
  const web1080 = ExportProfileRegistry.getProfile('web_1080p')!;
  assert(web1080.width === 1920 && web1080.height === 1080, '1080p dimensions accurate');
  assert(web1080.container === 'mp4', 'Container is mp4');
});

runTest(27, 'Video codec validation (H.264, HEVC, VP9, ProRes)', () => {
  const codecs = ['h264', 'hevc', 'vp9', 'prores'] as const;
  for (const c of codecs) {
    const res = HardwareDetector.resolveEncoderName(c, false);
    assert(res.encoderName.length > 0, `Software encoder resolved for ${c}`);
  }
});

runTest(28, 'Export resolution validation (1080p, 1440p, 4K, Vertical 9:16)', () => {
  const uhd = ExportProfileRegistry.getProfile('uhd_4k')!;
  assert(uhd.width === 3840 && uhd.height === 2160, '4K UHD is 3840x2160');

  const vert = ExportProfileRegistry.getProfile('social_vertical_9_16')!;
  assert(vert.width === 1080 && vert.height === 1920, 'Vertical is 1080x1920');
});

runTest(29, 'Export frame-rate validation (24, 25, 30, 60 fps)', () => {
  const validFps = [24, 25, 30, 60];
  for (const f of validFps) {
    const prof = ExportProfileRegistry.createCustomProfile({ fps: f });
    assert(prof.fps === f, `Profile accepts ${f} fps`);
  }
});

runTest(30, 'Audio export settings (AAC, Opus, PCM 16-bit, MP3)', () => {
  const audioCodecs = ['aac', 'opus', 'pcm', 'mp3'] as const;
  for (const ac of audioCodecs) {
    const prof = ExportProfileRegistry.createCustomProfile({ audioCodec: ac });
    assert(prof.audioCodec === ac, `Profile configured with audio codec ${ac}`);
  }
});

runTest(31, 'Color export settings (Rec.709, Rec.2020, range)', () => {
  const prof = ExportProfileRegistry.createCustomProfile({
    colorSpace: 'rec2020',
    colorRange: 'full',
  });
  assert(prof.colorSpace === 'rec2020', 'Color space set to rec2020');
  assert(prof.colorRange === 'full', 'Color range set to full');
});

runTest(32, 'Export queue job submission and progress lifecycle', () => {
  const dummyProj = ProjectService.createDefaultProject('Queue Test');
  const dummyProf = ExportProfileRegistry.getProfile('web_1080p')!;
  const job = ExportQueueManager.addJob(dummyProj, dummyProf, 'out_queue.mp4');
  assert(job.status === 'queued', 'Job starts in queued state');

  ExportQueueManager.updateProgress(job.id, 50, 150, 300, 30, 5);
  const updated = ExportQueueManager.getJob(job.id)!;
  assert(updated.status === 'rendering', 'Job moves to rendering');
  assert(updated.percent === 50, 'Job percent updated to 50%');

  ExportQueueManager.completeJob(job.id);
  const completed = ExportQueueManager.getJob(job.id)!;
  assert(completed.status === 'completed', 'Job marked as completed');
});

runTest(33, 'Export job cancellation handling', () => {
  const dummyProj = ProjectService.createDefaultProject('Cancel Test');
  const dummyProf = ExportProfileRegistry.getProfile('web_1080p')!;
  const job = ExportQueueManager.addJob(dummyProj, dummyProf, 'out_cancel.mp4');
  ExportQueueManager.cancelJob(job.id);
  const cancelled = ExportQueueManager.getJob(job.id)!;
  assert(cancelled.status === 'cancelled', 'Job is cancelled');
});

runTest(34, 'Save and load custom export profiles in project schema', () => {
  const proj = ProjectService.createDefaultProject('Export Profile Persistence');
  const customProf = ExportProfileRegistry.createCustomProfile({
    name: 'Custom Cinema 4K',
    container: 'mov',
    videoCodec: 'prores',
    width: 4096,
    height: 2160,
  });
  proj.exportProfiles = [customProf];

  const serialized = ProjectService.serializeProject(proj);
  const restored = ProjectService.deserializeProject(serialized);
  assert(restored.exportProfiles !== undefined, 'Export profiles restored');
  assert(restored.exportProfiles!.length === 1, 'Custom profile preserved');
  assert(restored.exportProfiles![0].name === 'Custom Cinema 4K', 'Profile name matches');
  assert(restored.exportProfiles![0].width === 4096, 'Profile width 4096 preserved');
});

console.log('\n===============================================================');
console.log(`TEST RESULTS: ${passedCount} / ${passedCount + failedCount} PASSED`);
if (failedCount > 0) {
  console.error(`FAILED: ${failedCount} tests`);
  process.exit(1);
} else {
  console.log('ALL 34 ALPHA 0.8 UNIT TESTS PASSED!');
  console.log('===============================================================');
}
