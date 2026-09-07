/**
 * FreeCut Alpha 0.5 Transition Engine + Effect Foundation Test Suite
 * Validates all 20 required tests for Transitions (1-11) and Effects (12-20).
 */

import { ClipItem, FreeCutProject } from './src/types/project';
import {
  TransitionRegistry,
  validateTransition,
  getTransitionTiming,
  getTransitionProgress,
  findActiveTransitionAtTime,
  generateTransitionId,
} from './src/transitions';
import {
  EffectRegistry,
  generateEffectId,
  cloneEffects,
  evaluateEffectParameters,
  getCanvasFilterString,
  compileEffectsToFFmpeg,
} from './src/effects';
import { snapToFrame } from './src/utils/timelineMath';
import { TimelineOperations } from './src/services/timelineOperations';
import { HistoryManager } from './src/state/historyManager';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertClose(a: number, b: number, epsilon: number = 0.001, message: string = '') {
  if (Math.abs(a - b) > epsilon) {
    throw new Error(`Assertion Failed: expected ${b}, got ${a}. ${message}`);
  }
}

console.log('=== RUNNING FREECUT ALPHA 0.5 TRANSITION & EFFECT ENGINE TESTS ===\n');

function createMockProject(): FreeCutProject {
  return {
    version: '0.1',
    project: {
      name: 'Alpha 0.5 Test Project',
      width: 1920,
      height: 1080,
      fps: 30,
      backgroundColor: '#000000',
      audioSampleRate: 48000,
    },
    media: [
      {
        id: 'media_1',
        name: 'clipA.mp4',
        path: '/mock/clipA.mp4',
        type: 'video',
        size: 1024,
        duration: 10,
        createdAt: Date.now(),
      },
      {
        id: 'media_2',
        name: 'clipB.mp4',
        path: '/mock/clipB.mp4',
        type: 'video',
        size: 2048,
        duration: 10,
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
      {
        id: 'track_v2',
        name: 'Video 2',
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
        id: 'clip_a',
        trackId: 'track_v1',
        mediaId: 'media_1',
        name: 'Clip A',
        startTime: 0,
        duration: 4.0,
        sourceStart: 0,
        sourceDuration: 4.0,
        type: 'video',
      },
      {
        id: 'clip_b',
        trackId: 'track_v1',
        mediaId: 'media_2',
        name: 'Clip B',
        startTime: 4.0,
        duration: 4.0,
        sourceStart: 0,
        sourceDuration: 4.0,
        type: 'video',
      },
    ],
    transitions: [],
  };
}

let testsPassed = 0;

// ==========================================
// PART A — TRANSITION TESTS (1 to 11)
// ==========================================

// Test 1: Transition creation
console.log('Test 1: Transition creation');
{
  const proj = createMockProject();
  const clipA = proj.clips[0];
  const clipB = proj.clips[1];
  const validation = validateTransition(clipA, clipB, 1.0, 30);
  assert(validation.valid, 'Validation should pass for adjacent clips on same track');

  const transitionId = generateTransitionId();
  proj.transitions = [
    {
      id: transitionId,
      trackId: clipA.trackId,
      fromClipId: clipA.id,
      toClipId: clipB.id,
      type: 'crossDissolve',
      duration: validation.clampedDuration,
      enabled: true,
      parameters: {},
    },
  ];

  assert(proj.transitions.length === 1, 'Transition should be added to project');
  assert(proj.transitions[0].fromClipId === 'clip_a', 'From clip matches');
  assert(proj.transitions[0].toClipId === 'clip_b', 'To clip matches');
  assert(proj.transitions[0].type === 'crossDissolve', 'Type matches');
  assert(proj.transitions[0].duration === 1.0, 'Duration matches');
  testsPassed++;
  console.log('  -> PASS: Transition created with valid metadata and connection.\n');
}

// Test 2: Transition removal
console.log('Test 2: Transition removal');
{
  const proj = createMockProject();
  proj.transitions = [
    {
      id: 'tr_test_1',
      trackId: 'track_v1',
      fromClipId: 'clip_a',
      toClipId: 'clip_b',
      type: 'fade',
      duration: 1.0,
      enabled: true,
    },
  ];
  assert(proj.transitions.length === 1, 'Initially 1 transition');

  // Remove transition
  proj.transitions = proj.transitions.filter(t => t.id !== 'tr_test_1');
  assert(proj.transitions.length === 0, 'Transition should be removed');
  testsPassed++;
  console.log('  -> PASS: Transition successfully removed.\n');
}

// Test 3: Duration validation
console.log('Test 3: Duration validation');
{
  const proj = createMockProject();
  const clipA = proj.clips[0];
  const clipB = proj.clips[1];

  // Requesting excessively large transition (e.g. 10s for 4s clips)
  const excessiveVal = validateTransition(clipA, clipB, 10.0, 30);
  assert(excessiveVal.valid, 'Validation succeeds but clamps duration');
  assert(excessiveVal.clampedDuration < 4.0, 'Duration is safely clamped below clip limit');
  assertClose(excessiveVal.clampedDuration, 3.8, 0.05, 'Clamped to 95% of shorter clip');

  // Non-adjacent clips (gap between them)
  const gappedClipB = { ...clipB, startTime: 6.0 };
  const gappedVal = validateTransition(clipA, gappedClipB, 1.0, 30);
  assert(!gappedVal.valid, 'Should reject clips with gap between them');

  // Clips on different tracks
  const diffTrackClipB = { ...clipB, trackId: 'track_v2' };
  const diffTrackVal = validateTransition(clipA, diffTrackClipB, 1.0, 30);
  assert(!diffTrackVal.valid, 'Should reject clips on different tracks');
  testsPassed++;
  console.log('  -> PASS: Invalid durations and configurations prevented.\n');
}

// Test 4: Frame snapping
console.log('Test 4: Frame snapping');
{
  const proj = createMockProject();
  const clipA = proj.clips[0];
  const clipB = proj.clips[1];
  const fps = 30;

  // Non-snapped request: 1.0333...s
  const validation = validateTransition(clipA, clipB, 1.018, fps);
  const durationInFrames = validation.clampedDuration * fps;
  assertClose(durationInFrames, Math.round(durationInFrames), 0.0001, 'Duration must be exact integer frames');

  const timing = getTransitionTiming(
    { id: 'tr1', trackId: 'track_v1', fromClipId: clipA.id, toClipId: clipB.id, type: 'crossDissolve', duration: validation.clampedDuration, enabled: true },
    clipA,
    clipB,
    fps
  );

  assertClose(timing.startTime * fps, Math.round(timing.startTime * fps), 0.0001, 'Start time snaps to frame');
  assertClose(timing.endTime * fps, Math.round(timing.endTime * fps), 0.0001, 'End time snaps to frame');
  testsPassed++;
  console.log('  -> PASS: All transition boundaries strictly snapped to frame boundaries.\n');
}

// Test 5: Cross dissolve timing
console.log('Test 5: Cross dissolve timing');
{
  const proj = createMockProject();
  const clipA = proj.clips[0]; // 0 to 4s
  const clipB = proj.clips[1]; // 4 to 8s
  const tr = {
    id: 'tr_dissolve',
    trackId: 'track_v1',
    fromClipId: clipA.id,
    toClipId: clipB.id,
    type: 'crossDissolve' as const,
    duration: 1.0, // window: 3.5s to 4.5s
    enabled: true,
  };

  // Before transition
  assert(getTransitionProgress(tr, clipA, clipB, 3.4, 30) === null, 'Before start returns null');
  // At start (3.5s)
  assertClose(getTransitionProgress(tr, clipA, clipB, 3.5, 30)!, 0.0, 0.001, 'At start progress is 0.0');
  // At midpoint cut (4.0s)
  assertClose(getTransitionProgress(tr, clipA, clipB, 4.0, 30)!, 0.5, 0.001, 'At midpoint progress is 0.5');
  // At end (4.5s)
  assertClose(getTransitionProgress(tr, clipA, clipB, 4.5, 30)!, 1.0, 0.001, 'At end progress is 1.0');
  // After transition
  assert(getTransitionProgress(tr, clipA, clipB, 4.6, 30) === null, 'After end returns null');

  // Verify findActiveTransitionAtTime helper
  const activeAtCut = findActiveTransitionAtTime([tr], proj.clips, 'track_v1', 4.0, 30);
  assert(activeAtCut !== null, 'Active transition detected at 4.0s');
  assertClose(activeAtCut!.progress, 0.5, 0.001, 'Progress is 0.5');
  testsPassed++;
  console.log('  -> PASS: Cross dissolve timing correctly spans centered overlap window.\n');
}

// Test 6: Fade timing
console.log('Test 6: Fade timing');
{
  const proj = createMockProject();
  const clipA = proj.clips[0];
  const clipB = proj.clips[1];
  const tr = {
    id: 'tr_fade',
    trackId: 'track_v1',
    fromClipId: clipA.id,
    toClipId: clipB.id,
    type: 'fade' as const,
    duration: 2.0, // window: 3.0s to 5.0s
    enabled: true,
  };

  assertClose(getTransitionProgress(tr, clipA, clipB, 3.0, 30)!, 0.0, 0.001);
  assertClose(getTransitionProgress(tr, clipA, clipB, 3.5, 30)!, 0.25, 0.001);
  assertClose(getTransitionProgress(tr, clipA, clipB, 4.0, 30)!, 0.5, 0.001);
  assertClose(getTransitionProgress(tr, clipA, clipB, 4.5, 30)!, 0.75, 0.001);
  assertClose(getTransitionProgress(tr, clipA, clipB, 5.0, 30)!, 1.0, 0.001);
  testsPassed++;
  console.log('  -> PASS: Fade timing linear progression validated.\n');
}

// Test 7: Slide timing
console.log('Test 7: Slide timing');
{
  const proj = createMockProject();
  const clipA = proj.clips[0];
  const clipB = proj.clips[1];
  const trLeft = {
    id: 'tr_slide_left',
    trackId: 'track_v1',
    fromClipId: clipA.id,
    toClipId: clipB.id,
    type: 'slideLeft' as const,
    duration: 1.0,
    enabled: true,
  };
  const trRight = {
    id: 'tr_slide_right',
    trackId: 'track_v1',
    fromClipId: clipA.id,
    toClipId: clipB.id,
    type: 'slideRight' as const,
    duration: 1.0,
    enabled: true,
  };

  assertClose(getTransitionProgress(trLeft, clipA, clipB, 4.0, 30)!, 0.5, 0.001);
  assertClose(getTransitionProgress(trRight, clipA, clipB, 4.0, 30)!, 0.5, 0.001);
  assert(TransitionRegistry.getTransition('slideLeft') !== undefined, 'Descriptor registered');
  assert(TransitionRegistry.getTransition('slideRight') !== undefined, 'Descriptor registered');
  testsPassed++;
  console.log('  -> PASS: Slide left and slide right transition timing verified.\n');
}

// Test 8: Push timing
console.log('Test 8: Push timing');
{
  const proj = createMockProject();
  const clipA = proj.clips[0];
  const clipB = proj.clips[1];
  const trPush = {
    id: 'tr_push_up',
    trackId: 'track_v1',
    fromClipId: clipA.id,
    toClipId: clipB.id,
    type: 'pushUp' as const,
    duration: 1.0,
    enabled: true,
  };

  assertClose(getTransitionProgress(trPush, clipA, clipB, 3.75, 30)!, 0.25, 0.001);
  assertClose(getTransitionProgress(trPush, clipA, clipB, 4.25, 30)!, 0.75, 0.001);
  assert(TransitionRegistry.getTransition('pushUp') !== undefined, 'Descriptor registered');
  assert(TransitionRegistry.getTransition('pushDown') !== undefined, 'Descriptor registered');
  testsPassed++;
  console.log('  -> PASS: Push transition timing verified.\n');
}

// Test 9: Zoom timing
console.log('Test 9: Zoom timing');
{
  const proj = createMockProject();
  const clipA = proj.clips[0];
  const clipB = proj.clips[1];
  const trZoomIn = {
    id: 'tr_zoom_in',
    trackId: 'track_v1',
    fromClipId: clipA.id,
    toClipId: clipB.id,
    type: 'zoomIn' as const,
    duration: 1.0,
    enabled: true,
  };
  const trZoomOut = {
    id: 'tr_zoom_out',
    trackId: 'track_v1',
    fromClipId: clipA.id,
    toClipId: clipB.id,
    type: 'zoomOut' as const,
    duration: 1.0,
    enabled: true,
  };

  assertClose(getTransitionProgress(trZoomIn, clipA, clipB, 4.0, 30)!, 0.5, 0.001);
  assertClose(getTransitionProgress(trZoomOut, clipA, clipB, 4.0, 30)!, 0.5, 0.001);
  assert(TransitionRegistry.getTransition('zoomIn') !== undefined, 'Descriptor registered');
  assert(TransitionRegistry.getTransition('zoomOut') !== undefined, 'Descriptor registered');
  testsPassed++;
  console.log('  -> PASS: Zoom transitions timing verified.\n');
}

// Test 10: Transition undo
console.log('Test 10: Transition undo');
{
  const history = new HistoryManager<FreeCutProject>();
  const initial = createMockProject();
  const withTr: FreeCutProject = {
    ...initial,
    transitions: [
      {
        id: 'tr_undo_test',
        trackId: 'track_v1',
        fromClipId: 'clip_a',
        toClipId: 'clip_b',
        type: 'crossDissolve',
        duration: 1.0,
        enabled: true,
      },
    ],
  };

  history.push({
    name: 'Add Transition',
    undo: () => initial,
    redo: () => withTr,
  });

  const undoRes = history.undo(withTr);
  assert(undoRes !== null, 'Undo succeeds');
  assert((undoRes!.newState.transitions || []).length === 0, 'Transition removed on undo');
  testsPassed++;
  console.log('  -> PASS: Transition add successfully undone.\n');
}

// Test 11: Transition redo
console.log('Test 11: Transition redo');
{
  const history = new HistoryManager<FreeCutProject>();
  const initial = createMockProject();
  const withTr: FreeCutProject = {
    ...initial,
    transitions: [
      {
        id: 'tr_redo_test',
        trackId: 'track_v1',
        fromClipId: 'clip_a',
        toClipId: 'clip_b',
        type: 'crossDissolve',
        duration: 1.5,
        enabled: true,
      },
    ],
  };

  history.push({
    name: 'Add Transition',
    undo: () => initial,
    redo: () => withTr,
  });

  const undoRes = history.undo(withTr);
  assert(undoRes !== null && (undoRes.newState.transitions || []).length === 0, 'Undone');

  const redoRes = history.redo(undoRes!.newState);
  assert(redoRes !== null, 'Redo succeeds');
  assert(redoRes!.newState.transitions!.length === 1, '1 transition restored');
  assert(redoRes!.newState.transitions![0].id === 'tr_redo_test', 'Exact ID restored');
  assert(redoRes!.newState.transitions![0].duration === 1.5, 'Exact duration restored');
  testsPassed++;
  console.log('  -> PASS: Transition redo restores exact state.\n');
}

// ==========================================
// PART B — EFFECT TESTS (12 to 20)
// ==========================================

// Test 12: Effect creation
console.log('Test 12: Effect creation');
{
  const descriptor = EffectRegistry.getEffect('blur');
  assert(descriptor !== undefined, 'Blur effect registered');

  const effectId = generateEffectId();
  const effectInstance = {
    id: effectId,
    effectType: 'blur' as const,
    enabled: true,
    parameters: { ...descriptor!.defaultParameters },
  };

  assert(effectInstance.id.startsWith('ef_'), 'Effect ID generated');
  assert(effectInstance.parameters.amount === 10, 'Default blur parameter is 10');
  testsPassed++;
  console.log('  -> PASS: Effect instance created with registered defaults.\n');
}

// Test 13: Effect removal
console.log('Test 13: Effect removal');
{
  const proj = createMockProject();
  proj.clips[0].effects = [
    { id: 'ef_1', effectType: 'blur', enabled: true, parameters: { amount: 5 } },
    { id: 'ef_2', effectType: 'brightness', enabled: true, parameters: { amount: 20 } },
  ];
  assert(proj.clips[0].effects.length === 2, 'Initially 2 effects');

  // Remove ef_1
  proj.clips[0].effects = proj.clips[0].effects.filter(e => e.id !== 'ef_1');
  assert(proj.clips[0].effects.length === 1, '1 effect left');
  assert(proj.clips[0].effects[0].id === 'ef_2', 'ef_2 remains');
  testsPassed++;
  console.log('  -> PASS: Effect successfully removed from clip stack.\n');
}

// Test 14: Effect enable/disable
console.log('Test 14: Effect enable/disable');
{
  const effects = [
    { id: 'ef_blur', effectType: 'blur' as const, enabled: false, parameters: { amount: 15 } },
  ];

  // When disabled, getCanvasFilterString returns 'none'
  const filterStr = getCanvasFilterString(effects, 0);
  assert(filterStr === 'none', 'Disabled effect produces no canvas filter');

  // When disabled, compileEffectsToFFmpeg returns empty array
  const ffmpegFilters = compileEffectsToFFmpeg(effects);
  assert(ffmpegFilters.length === 0, 'Disabled effect produces no FFmpeg filter');

  // Enable it
  effects[0].enabled = true;
  assert(getCanvasFilterString(effects, 0).includes('blur(15px)'), 'Enabled effect produces canvas filter');
  assert(compileEffectsToFFmpeg(effects)[0].includes('boxblur'), 'Enabled effect produces FFmpeg filter');
  testsPassed++;
  console.log('  -> PASS: Effect enable/disable toggle respected in preview and export.\n');
}

// Test 15: Effect parameters
console.log('Test 15: Effect parameters');
{
  const allEffects = EffectRegistry.listEffects();
  assert(allEffects.length >= 7, 'All 7 initial effects registered');

  // Verify parameter bounds and compilation for each
  const blurDesc = EffectRegistry.getEffect('blur')!;
  assert(blurDesc.compileFFmpeg({ amount: 25 }) === 'boxblur=25:1', 'Blur compilation');

  const brightDesc = EffectRegistry.getEffect('brightness')!;
  assert(brightDesc.compileFFmpeg({ amount: 30 }) === 'eq=brightness=0.30', 'Brightness compilation');

  const contrastDesc = EffectRegistry.getEffect('contrast')!;
  assert(contrastDesc.compileFFmpeg({ amount: 50 }) === 'eq=contrast=1.50', 'Contrast compilation');

  const satDesc = EffectRegistry.getEffect('saturation')!;
  assert(satDesc.compileFFmpeg({ amount: -50 }) === 'eq=saturation=0.50', 'Saturation compilation');

  const grayDesc = EffectRegistry.getEffect('grayscale')!;
  assert(grayDesc.compileFFmpeg({ amount: 100 }) === 'hue=s=0.00', 'Grayscale compilation');

  const sharpDesc = EffectRegistry.getEffect('sharpen')!;
  assert(sharpDesc.compileFFmpeg({ amount: 40 }).includes('unsharp'), 'Sharpen compilation');

  const vigDesc = EffectRegistry.getEffect('vignette')!;
  assert(vigDesc.compileFFmpeg({ amount: 60 }).includes('vignette'), 'Vignette compilation');
  testsPassed++;
  console.log('  -> PASS: All 7 effects validate and compile parameters correctly.\n');
}

// Test 16: Effect ordering
console.log('Test 16: Effect ordering');
{
  const effects = [
    { id: 'ef_blur', effectType: 'blur' as const, enabled: true, parameters: { amount: 10 } },
    { id: 'ef_bright', effectType: 'brightness' as const, enabled: true, parameters: { amount: 20 } },
  ];

  const ffmpeg1 = compileEffectsToFFmpeg(effects);
  assert(ffmpeg1[0].includes('boxblur') && ffmpeg1[1].includes('eq=brightness'), 'Order 1: blur then brightness');

  // Swap order
  const reordered = [effects[1], effects[0]];
  const ffmpeg2 = compileEffectsToFFmpeg(reordered);
  assert(ffmpeg2[0].includes('eq=brightness') && ffmpeg2[1].includes('boxblur'), 'Order 2: brightness then blur');
  testsPassed++;
  console.log('  -> PASS: Deterministic effect stack ordering preserved.\n');
}

// Test 17: Effect keyframes
console.log('Test 17: Effect keyframes');
{
  const effectWithKeyframes = {
    id: 'ef_anim_blur',
    effectType: 'blur' as const,
    enabled: true,
    parameters: { amount: 0 },
    animations: {
      amount: {
        id: 'track_blur_amount',
        property: 'amount',
        interpolation: 'linear' as const,
        keyframes: [
          { id: 'kf1', time: 0.0, value: 0 },
          { id: 'kf2', time: 2.0, value: 40 },
        ],
      },
    },
  };

  // Evaluate at relative time 0s, 1s, 2s
  const p0 = evaluateEffectParameters(effectWithKeyframes, 0.0);
  assertClose(Number(p0.amount), 0, 0.001, 'At 0s amount is 0');

  const p1 = evaluateEffectParameters(effectWithKeyframes, 1.0);
  assertClose(Number(p1.amount), 20, 0.001, 'At 1s amount is 20 (linear interp)');

  const p2 = evaluateEffectParameters(effectWithKeyframes, 2.0);
  assertClose(Number(p2.amount), 40, 0.001, 'At 2s amount is 40');

  // Dynamic canvas filter string at 1s
  const canvasFilter = getCanvasFilterString([effectWithKeyframes], 1.0);
  assert(canvasFilter.includes('blur(20px)'), 'Evaluated keyframe reflected in canvas filter string');
  testsPassed++;
  console.log('  -> PASS: Effect keyframe animation evaluated through centralized engine.\n');
}

// Test 18: Effect duplication
console.log('Test 18: Effect duplication');
{
  const proj = createMockProject();
  proj.clips[0].effects = [
    {
      id: 'ef_original',
      effectType: 'blur',
      enabled: true,
      parameters: { amount: 25 },
      animations: {
        amount: {
          id: 'trk1',
          property: 'amount',
          interpolation: 'linear',
          keyframes: [{ id: 'k1', time: 0, value: 10 }, { id: 'k2', time: 1, value: 30 }],
        },
      },
    },
  ];

  // Duplicate clip via TimelineOperations
  const dupResult = TimelineOperations.duplicateClips(proj, ['clip_a']);
  const duplicated = dupResult.project.clips;
  assert(duplicated.length === 3, 'Duplicated clip added');
  const dupClip = duplicated.find(c => c.id !== 'clip_a' && c.id !== 'clip_b')!;
  assert(dupClip !== undefined, 'Duplicated clip found');
  assert(dupClip.effects !== undefined && dupClip.effects.length === 1, 'Effects cloned');
  assert(dupClip.effects![0].id !== 'ef_original', 'Cloned effect receives fresh unique ID');
  assert(dupClip.effects![0].parameters.amount === 25, 'Parameters preserved');
  assert(dupClip.effects![0].animations!.amount.keyframes.length === 2, 'Keyframes preserved');
  assert(dupClip.effects![0].animations!.amount.keyframes[0].id !== 'k1', 'Keyframes receive fresh unique IDs');
  testsPassed++;
  console.log('  -> PASS: Clip duplication deep clones effect stack and keyframes.\n');
}

// Test 19: Effect undo
console.log('Test 19: Effect undo');
{
  const history = new HistoryManager<FreeCutProject>();
  const initial = createMockProject();
  const withEffect: FreeCutProject = {
    ...initial,
    clips: initial.clips.map(c =>
      c.id === 'clip_a'
        ? { ...c, effects: [{ id: 'ef_undo', effectType: 'vignette', enabled: true, parameters: { amount: 60, radius: 70 } }] }
        : c
    ),
  };

  history.push({
    name: 'Add Effect',
    undo: () => initial,
    redo: () => withEffect,
  });

  const undoRes = history.undo(withEffect);
  assert(undoRes !== null, 'Undo succeeds');
  assert(!undoRes!.newState.clips[0].effects || undoRes!.newState.clips[0].effects.length === 0, 'Effect removed on undo');
  testsPassed++;
  console.log('  -> PASS: Effect mutation correctly undone via HistoryManager.\n');
}

// Test 20: Effect redo
console.log('Test 20: Effect redo');
{
  const history = new HistoryManager<FreeCutProject>();
  const initial = createMockProject();
  const withEffect: FreeCutProject = {
    ...initial,
    clips: initial.clips.map(c =>
      c.id === 'clip_a'
        ? { ...c, effects: [{ id: 'ef_redo', effectType: 'sharpen', enabled: true, parameters: { amount: 50 } }] }
        : c
    ),
  };

  history.push({
    name: 'Add Effect',
    undo: () => initial,
    redo: () => withEffect,
  });

  const undoRes = history.undo(withEffect);
  assert(undoRes !== null, 'Undone');

  const redoRes = history.redo(undoRes!.newState);
  assert(redoRes !== null, 'Redo succeeds');
  assert(redoRes!.newState.clips[0].effects!.length === 1, 'Effect restored on redo');
  assert(redoRes!.newState.clips[0].effects![0].id === 'ef_redo', 'Exact effect ID restored');
  assert(redoRes!.newState.clips[0].effects![0].effectType === 'sharpen', 'Effect type preserved');
  testsPassed++;
  console.log('  -> PASS: Effect redo restores exact state.\n');
}

console.log(`\n==================================================`);
console.log(`ALL ${testsPassed}/20 AUTOMATED TESTS PASSED SUCCESSFULLY!`);
console.log(`==================================================\n`);
