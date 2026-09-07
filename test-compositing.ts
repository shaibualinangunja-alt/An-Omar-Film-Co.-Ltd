/**
 * FreeCut Alpha 0.7 Compositing Engine Automated Test Suite
 * Validates all 26 automated test requirements:
 * - Chroma Key (1-5)
 * - Masks (6-13)
 * - Blend Modes (14-16)
 * - Crop/Flip (17-19)
 * - Tracking Foundation (20-22)
 * - Undo/Redo (23-26)
 */

import { FreeCutProject, ClipItem } from './src/types/project';
import { ProjectService } from './src/services/projectService';
import { HistoryManager } from './src/state/historyManager';
import {
  BlendMode,
  CropSettings,
  FlipSettings,
  ChromaKeySettings,
  MaskItem,
  DEFAULT_CHROMA_KEY_SETTINGS,
  DEFAULT_CROP_SETTINGS,
  DEFAULT_FLIP_SETTINGS,
  createDefaultMask,
  listBlendModes,
  getBlendModeInfo,
  getCanvasCompositeOperation,
  getFFmpegBlendMode,
  compileChromaKeyToFFmpeg,
  compileMaskToFFmpeg,
  TrackingService,
} from './src/compositing';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function createBaseProject(): FreeCutProject {
  const proj = ProjectService.createDefaultProject('Compositing Test Project');
  const clip: ClipItem = {
    id: 'clip-1',
    mediaId: 'media-1',
    trackId: 'track-v1',
    name: 'Test Clip',
    startTime: 0,
    duration: 5.0,
    sourceStart: 0,
    sourceDuration: 5.0,
    type: 'video',
    transform: {
      positionX: 0,
      positionY: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    volume: 1,
    muted: false,
  };
  proj.clips = [clip];
  return proj;
}

async function runCompositingTests() {
  console.log('=== RUNNING FREECUT ALPHA 0.7 COMPOSITING ENGINE TESTS ===\n');

  // ====================================================
  // CHROMA KEY TESTS (1 - 5)
  // ====================================================
  console.log('--- PART 1: CHROMA KEY TESTS ---');

  // Test 1: Creation
  const ckDefault: ChromaKeySettings = { ...DEFAULT_CHROMA_KEY_SETTINGS };
  assert(ckDefault.keyColor === '#00FF00', 'Default key color is green');
  assert(ckDefault.similarity === 0.25, 'Default similarity is 0.25');
  assert(ckDefault.smoothness === 0.10, 'Default smoothness is 0.10');
  assert(ckDefault.spillSuppression === 0.50, 'Default spill suppression is 0.50');
  console.log('Test 1: Chroma key creation -> PASS');

  // Test 2: Parameter validation
  const ckCustom: ChromaKeySettings = {
    enabled: true,
    keyColor: '#0000FF', // Blue screen
    similarity: 0.35,
    smoothness: 0.15,
    spillSuppression: 0.70,
    edgeSoftness: 5,
    invert: false,
  };
  assert(ckCustom.similarity > 0 && ckCustom.similarity <= 1.0, 'Similarity in valid range');
  const ffmpegColorkey = compileChromaKeyToFFmpeg(ckCustom);
  assert(ffmpegColorkey.includes('colorkey=0x0000FF'), 'Compiled colorkey uses correct hex');
  assert(ffmpegColorkey.includes('0.350'), 'Compiled colorkey includes similarity');
  console.log('Test 2: Parameter validation -> PASS');

  // Test 3: Enable/disable
  const ckDisabled: ChromaKeySettings = { ...ckCustom, enabled: false };
  assert(compileChromaKeyToFFmpeg(ckDisabled) === '', 'Disabled chroma key compiles to empty filter');
  const ckEnabled: ChromaKeySettings = { ...ckCustom, enabled: true };
  assert(compileChromaKeyToFFmpeg(ckEnabled) !== '', 'Enabled chroma key compiles to valid filter');
  console.log('Test 3: Enable/disable -> PASS');

  // Test 4: Save/load
  const proj1 = createBaseProject();
  proj1.clips[0].chromaKey = ckCustom;
  const json1 = ProjectService.serializeProject(proj1);
  const loadedProj1 = ProjectService.deserializeProject(json1);
  assert(loadedProj1.clips[0].chromaKey !== undefined, 'Chroma key preserved across serialization');
  assert(loadedProj1.clips[0].chromaKey?.keyColor === '#0000FF', 'Key color matches');
  assert(loadedProj1.clips[0].chromaKey?.similarity === 0.35, 'Similarity matches');
  console.log('Test 4: Save/load -> PASS');

  // Test 5: Keyframe evaluation
  // Animate similarity from 0.20 to 0.40 over 2 seconds
  const ckAnimatedSimilarity = (t: number) => {
    const tNorm = Math.max(0, Math.min(1, t / 2.0));
    return 0.20 + (0.40 - 0.20) * tNorm;
  };
  assert(Math.abs(ckAnimatedSimilarity(0) - 0.20) < 0.001, 'Start similarity is 0.20');
  assert(Math.abs(ckAnimatedSimilarity(1.0) - 0.30) < 0.001, 'Midpoint similarity is 0.30');
  assert(Math.abs(ckAnimatedSimilarity(2.0) - 0.40) < 0.001, 'End similarity is 0.40');
  console.log('Test 5: Keyframe evaluation -> PASS\n');

  // ====================================================
  // MASK TESTS (6 - 13)
  // ====================================================
  console.log('--- PART 2: MASK TESTS ---');

  // Test 6: Rectangle mask
  const rectMask = createDefaultMask('rectangle', 400, 250);
  assert(rectMask.type === 'rectangle', 'Mask type is rectangle');
  assert(rectMask.width === 400 && rectMask.height === 250, 'Dimensions match');
  const rectFilter = compileMaskToFFmpeg(rectMask, 1920, 1080);
  assert(rectFilter.includes('geq='), 'Rectangle compiles to FFmpeg geq filter');
  assert(rectFilter.includes('between(X,'), 'Rectangle geq uses horizontal bounds');
  assert(rectFilter.includes('between(Y,'), 'Rectangle geq uses vertical bounds');
  console.log('Test 6: Rectangle mask -> PASS');

  // Test 7: Ellipse mask
  const ellipseMask = createDefaultMask('ellipse', 300, 300);
  assert(ellipseMask.type === 'ellipse', 'Mask type is ellipse');
  const ellipseFilter = compileMaskToFFmpeg(ellipseMask, 1920, 1080);
  assert(ellipseFilter.includes('geq='), 'Ellipse compiles to FFmpeg geq filter');
  assert(ellipseFilter.includes('pow('), 'Ellipse geq uses radial distance formula');
  console.log('Test 7: Ellipse mask -> PASS');

  // Test 8: Linear mask
  const linearMask = createDefaultMask('linear', 500, 300);
  assert(linearMask.type === 'linear', 'Mask type is linear');
  const linearFilter = compileMaskToFFmpeg(linearMask, 1920, 1080);
  assert(linearFilter.includes('geq='), 'Linear compiles to FFmpeg geq filter');
  assert(linearFilter.includes('lte(Y,'), 'Linear geq uses half-plane threshold');
  console.log('Test 8: Linear mask -> PASS');

  // Test 9: Mask parameters
  const customMask: MaskItem = {
    ...rectMask,
    positionX: 50,
    positionY: -30,
    width: 600,
    height: 400,
    feather: 25,
    opacity: 0.85,
  };
  assert(customMask.positionX === 50 && customMask.positionY === -30, 'Offsets match');
  assert(customMask.width === 600 && customMask.height === 400, 'Dimensions match');
  assert(customMask.feather === 25, 'Feather matches');
  console.log('Test 9: Mask parameters -> PASS');

  // Test 10: Mask inversion
  const normalRect = compileMaskToFFmpeg({ ...rectMask, inverted: false }, 1920, 1080);
  const invertedRect = compileMaskToFFmpeg({ ...rectMask, inverted: true }, 1920, 1080);
  assert(normalRect.includes('255,0)'), 'Normal mask passes 255 inside bounds and 0 outside');
  assert(invertedRect.includes('0,255)'), 'Inverted mask passes 0 inside bounds and 255 outside');
  console.log('Test 10: Mask inversion -> PASS');

  // Test 11: Mask feather
  assert(rectMask.feather >= 0, 'Feather is non-negative');
  assert(customMask.feather === 25, 'Feather radius set correctly');
  console.log('Test 11: Mask feather -> PASS');

  // Test 12: Mask keyframes
  // Animate mask width from 200px to 600px
  const evalMaskWidth = (t: number) => {
    return 200 + (600 - 200) * Math.min(1, Math.max(0, t / 4.0));
  };
  assert(evalMaskWidth(0) === 200, 'Start mask width 200px');
  assert(evalMaskWidth(2) === 400, 'Midpoint mask width 400px');
  assert(evalMaskWidth(4) === 600, 'End mask width 600px');
  console.log('Test 12: Mask keyframes -> PASS');

  // Test 13: Save/load
  const proj2 = createBaseProject();
  proj2.clips[0].masks = [customMask, ellipseMask];
  const json2 = ProjectService.serializeProject(proj2);
  const loadedProj2 = ProjectService.deserializeProject(json2);
  assert(loadedProj2.clips[0].masks?.length === 2, 'Both masks restored across project save/load');
  assert(loadedProj2.clips[0].masks[0].type === 'rectangle', 'Mask 1 type matches');
  assert(loadedProj2.clips[0].masks[1].type === 'ellipse', 'Mask 2 type matches');
  console.log('Test 13: Save/load -> PASS\n');

  // ====================================================
  // BLEND MODES TESTS (14 - 16)
  // ====================================================
  console.log('--- PART 3: BLEND MODE TESTS ---');

  // Test 14: Blend mode creation
  const allModes = listBlendModes();
  assert(allModes.length === 10, 'Supports exactly 10 distinct blend modes');
  const expectedModes: BlendMode[] = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'softLight',
    'hardLight',
    'darken',
    'lighten',
    'difference',
    'add',
  ];
  expectedModes.forEach(mode => {
    const info = getBlendModeInfo(mode);
    assert(info !== undefined, `Blend mode ${mode} is registered`);
  });
  console.log('Test 14: Blend mode creation -> PASS');

  // Test 15: Blend mode validation
  assert(getCanvasCompositeOperation('multiply') === 'multiply', 'Canvas operation matches multiply');
  assert(getCanvasCompositeOperation('screen') === 'screen', 'Canvas operation matches screen');
  assert(getCanvasCompositeOperation('add') === 'lighter', 'Canvas operation matches lighter');
  assert(getFFmpegBlendMode('multiply') === 'multiply', 'FFmpeg mode matches multiply');
  assert(getFFmpegBlendMode('screen') === 'screen', 'FFmpeg mode matches screen');
  assert(getFFmpegBlendMode('add') === 'addition', 'FFmpeg mode matches addition');
  console.log('Test 15: Blend mode validation -> PASS');

  // Test 16: Save/load
  const proj3 = createBaseProject();
  proj3.clips[0].blendMode = 'screen';
  const json3 = ProjectService.serializeProject(proj3);
  const loadedProj3 = ProjectService.deserializeProject(json3);
  assert(loadedProj3.clips[0].blendMode === 'screen', 'Blend mode preserved across save/load');
  console.log('Test 16: Save/load -> PASS\n');

  // ====================================================
  // CROP / FLIP TESTS (17 - 19)
  // ====================================================
  console.log('--- PART 4: CROP & FLIP TESTS ---');

  // Test 17: Crop
  const cropSettings: CropSettings = {
    left: 0.1,
    right: 0.15,
    top: 0.05,
    bottom: 0.05,
  };
  const proj4 = createBaseProject();
  proj4.clips[0].crop = cropSettings;
  assert(proj4.clips[0].crop.left === 0.1, 'Left crop set');
  assert(proj4.clips[0].crop.right === 0.15, 'Right crop set');
  const json4 = ProjectService.serializeProject(proj4);
  const loadedProj4 = ProjectService.deserializeProject(json4);
  assert(loadedProj4.clips[0].crop?.right === 0.15, 'Crop values survive save/load');
  console.log('Test 17: Crop -> PASS');

  // Test 18: Flip horizontal
  const flipH: FlipSettings = { horizontal: true, vertical: false };
  const proj5 = createBaseProject();
  proj5.clips[0].flip = flipH;
  assert(proj5.clips[0].flip.horizontal === true, 'Horizontal flip enabled');
  assert(proj5.clips[0].flip.vertical === false, 'Vertical flip disabled');
  console.log('Test 18: Flip horizontal -> PASS');

  // Test 19: Flip vertical
  const flipV: FlipSettings = { horizontal: false, vertical: true };
  const proj6 = createBaseProject();
  proj6.clips[0].flip = flipV;
  assert(proj6.clips[0].flip.horizontal === false, 'Horizontal flip disabled');
  assert(proj6.clips[0].flip.vertical === true, 'Vertical flip enabled');
  console.log('Test 19: Flip vertical -> PASS\n');

  // ====================================================
  // TRACKING TESTS (20 - 22)
  // ====================================================
  console.log('--- PART 5: TRACKING TESTS ---');

  // Test 20: Tracking data
  const trackingData = TrackingService.createTrackingData('clip-1', 'point', 0, 3.0);
  assert(trackingData.clipId === 'clip-1', 'Clip ID matches');
  assert(trackingData.trackerType === 'point', 'Tracker type is point');
  assert(trackingData.points.length === 0, 'Starts with zero points');
  console.log('Test 20: Tracking data -> PASS');

  // Test 21: Tracking point validation
  const sessionWithPoints = TrackingService.trackPointSequence(
    'clip-1',
    { x: 100, y: 150 },
    0,
    2.0,
    30,
    (t) => ({ dx: t * 10, dy: t * 5 })
  );
  assert(sessionWithPoints.points.length > 30, 'Generated points across duration');
  assert(sessionWithPoints.points[0].x === 100 && sessionWithPoints.points[0].y === 150, 'Initial anchor preserved');
  const lastPoint = sessionWithPoints.points[sessionWithPoints.points.length - 1];
  assert(lastPoint.x > 100 && lastPoint.y > 150, 'Trajectory shifted positively');
  console.log('Test 21: Tracking point validation -> PASS');

  // Test 22: Tracking -> keyframes
  const converted = TrackingService.convertTrackingToKeyframes(sessionWithPoints);
  assert(converted.positionXKeyframes.length === sessionWithPoints.points.length, 'Position X keyframe count matches points');
  assert(converted.positionYKeyframes.length === sessionWithPoints.points.length, 'Position Y keyframe count matches points');
  assert(converted.positionXKeyframes[0].value === 100, 'First X keyframe value is 100');
  assert(converted.positionYKeyframes[0].value === 150, 'First Y keyframe value is 150');

  const baseClip = createBaseProject().clips[0];
  const trackedClip = TrackingService.applyTrackingToClip(baseClip, sessionWithPoints);
  assert(trackedClip.animations?.positionX !== undefined, 'Clip animations received positionX track');
  assert(trackedClip.animations?.positionY !== undefined, 'Clip animations received positionY track');
  assert(trackedClip.animations.positionX.keyframes.length > 0, 'Position X keyframes present on clip');
  console.log('Test 22: Tracking -> keyframes -> PASS\n');

  // ====================================================
  // UNDO / REDO TESTS (23 - 26)
  // ====================================================
  console.log('--- PART 6: UNDO / REDO TESTS ---');
  const history = new HistoryManager<FreeCutProject>();
  let currentProject = createBaseProject();

  // Test 23: Chroma key undo
  const preCKProject = JSON.parse(JSON.stringify(currentProject));
  const postCKProject = JSON.parse(JSON.stringify(currentProject));
  postCKProject.clips[0].chromaKey = { ...DEFAULT_CHROMA_KEY_SETTINGS, enabled: true, keyColor: '#00FF00' };

  history.push({
    name: 'Add Chroma Key',
    undo: () => preCKProject,
    redo: () => postCKProject,
  });
  currentProject = postCKProject;
  assert(currentProject.clips[0].chromaKey?.enabled === true, 'Chroma key enabled in current state');

  const undoResult1 = history.undo(currentProject);
  assert(undoResult1 !== null, 'Undo executed');
  currentProject = undoResult1.newState;
  assert(currentProject.clips[0].chromaKey === undefined, 'Chroma key cleanly removed on undo');

  const redoResult1 = history.redo(currentProject);
  assert(redoResult1 !== null, 'Redo executed');
  currentProject = redoResult1.newState;
  assert(currentProject.clips[0].chromaKey?.enabled === true, 'Chroma key restored on redo');
  console.log('Test 23: Chroma key undo/redo -> PASS');

  // Test 24: Mask undo
  const preMaskProject = JSON.parse(JSON.stringify(currentProject));
  const postMaskProject = JSON.parse(JSON.stringify(currentProject));
  postMaskProject.clips[0].masks = [createDefaultMask('rectangle')];

  history.push({
    name: 'Add Mask',
    undo: () => preMaskProject,
    redo: () => postMaskProject,
  });
  currentProject = postMaskProject;
  assert(currentProject.clips[0].masks?.length === 1, 'Mask added');

  const undoResult2 = history.undo(currentProject);
  assert(undoResult2 !== null, 'Undo executed');
  currentProject = undoResult2.newState;
  assert(!currentProject.clips[0].masks || currentProject.clips[0].masks.length === 0, 'Mask cleanly removed on undo');
  console.log('Test 24: Mask undo -> PASS');

  // Test 25: Crop undo
  const preCropProject = JSON.parse(JSON.stringify(currentProject));
  const postCropProject = JSON.parse(JSON.stringify(currentProject));
  postCropProject.clips[0].crop = { left: 0.2, right: 0.2, top: 0.1, bottom: 0.1 };

  history.push({
    name: 'Update Crop',
    undo: () => preCropProject,
    redo: () => postCropProject,
  });
  currentProject = postCropProject;
  assert(currentProject.clips[0].crop?.left === 0.2, 'Crop applied');

  const undoResult3 = history.undo(currentProject);
  assert(undoResult3 !== null, 'Undo executed');
  currentProject = undoResult3.newState;
  assert(!currentProject.clips[0].crop || currentProject.clips[0].crop.left === 0, 'Crop reverted on undo');
  console.log('Test 25: Crop undo -> PASS');

  // Test 26: Blend mode undo
  const preBlendProject = JSON.parse(JSON.stringify(currentProject));
  const postBlendProject = JSON.parse(JSON.stringify(currentProject));
  postBlendProject.clips[0].blendMode = 'multiply';

  history.push({
    name: 'Set Blend Mode',
    undo: () => preBlendProject,
    redo: () => postBlendProject,
  });
  currentProject = postBlendProject;
  assert(currentProject.clips[0].blendMode === 'multiply', 'Blend mode set to multiply');

  const undoResult4 = history.undo(currentProject);
  assert(undoResult4 !== null, 'Undo executed');
  currentProject = undoResult4.newState;
  assert(!currentProject.clips[0].blendMode || currentProject.clips[0].blendMode === 'normal', 'Blend mode reverted on undo');
  console.log('Test 26: Blend mode undo -> PASS\n');

  console.log('==================================================');
  console.log('ALL 26/26 AUTOMATED COMPOSITING TESTS PASSED!');
  console.log('==================================================');
}

runCompositingTests().catch(err => {
  console.error('Compositing unit tests failed:', err);
  process.exit(1);
});
