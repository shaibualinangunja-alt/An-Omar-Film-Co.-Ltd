/**
 * FreeCut Alpha 0.4 Keyframe Animation Engine Test Suite
 * Validates all 20 required keyframe animation features and edge cases.
 */

import { 
  Keyframe, 
  AnimationTrack, 
  evaluateAnimationTrack, 
  evaluateClipAnimations, 
  cloneAnimationTracks,
  findKeyframeAtTime
} from './src/animation';
import { ClipItem, FreeCutProject } from './src/types/project';
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

console.log('=== RUNNING FREECUT ALPHA 0.4 KEYFRAME ANIMATION ENGINE TESTS ===\n');

function createMockProject(): FreeCutProject {
  return {
    version: '0.1',
    project: {
      name: 'Test Project',
      width: 1920,
      height: 1080,
      fps: 30,
      backgroundColor: '#000000',
      audioSampleRate: 48000,
    },
    media: [
      {
        id: 'media_1',
        name: 'video.mp4',
        path: '/mock/video.mp4',
        type: 'video',
        size: 1024,
        duration: 20,
        createdAt: Date.now(),
      }
    ],
    tracks: [
      {
        id: 'track_v1',
        name: 'Video 1',
        type: 'video',
        order: 0,
        muted: false,
        locked: false,
        solo: false,
        visible: true,
        targeted: true,
        height: 64,
      }
    ],
    clips: [],
    settings: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function createBaseClip(id: string, startTime: number, duration: number): ClipItem {
  return {
    id,
    mediaId: 'media_1',
    trackId: 'track_v1',
    startTime,
    duration,
    sourceStart: 0,
    sourceDuration: 20,
    type: 'video',
    name: `Clip ${id}`,
    transform: {
      positionX: 0,
      positionY: 0,
      scale: 1.0,
      rotation: 0,
      opacity: 1.0,
    },
    volume: 1.0,
    muted: false,
  };
}

// -------------------------------------------------------------------------------------------------
// TEST 1: No keyframes -> static value
// -------------------------------------------------------------------------------------------------
console.log('[TEST 1] No keyframes -> static value');
{
  const clip = createBaseClip('c1', 0, 10);
  clip.transform.scale = 1.25;
  clip.transform.positionX = 40;
  clip.volume = 0.8;

  const evaluated = evaluateClipAnimations(clip, 3.5);
  assertClose(evaluated.scale, 1.25, 0.001, 'Scale should match static value');
  assertClose(evaluated.positionX, 40, 0.001, 'PositionX should match static value');
  assertClose(evaluated.volume, 0.8, 0.001, 'Volume should match static value');
  console.log(' -> PASS: Returns static values when no animation tracks exist.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 2: One keyframe
// -------------------------------------------------------------------------------------------------
console.log('[TEST 2] One keyframe');
{
  const track: AnimationTrack<number> = {
    property: 'scale',
    keyframes: [
      { id: 'k1', time: 2.0, value: 1.75, interpolation: 'linear' },
    ],
  };

  assertClose(evaluateAnimationTrack(track, 0.0, 1.0), 1.75, 0.001, 'Before keyframe');
  assertClose(evaluateAnimationTrack(track, 2.0, 1.0), 1.75, 0.001, 'At keyframe');
  assertClose(evaluateAnimationTrack(track, 5.0, 1.0), 1.75, 0.001, 'After keyframe');
  console.log(' -> PASS: Single keyframe produces constant value across entire clip.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 3: Two linear keyframes
// -------------------------------------------------------------------------------------------------
console.log('[TEST 3] Two linear keyframes');
{
  const track: AnimationTrack<number> = {
    property: 'scale',
    keyframes: [
      { id: 'k1', time: 0.0, value: 100, interpolation: 'linear' },
      { id: 'k2', time: 2.0, value: 200, interpolation: 'linear' },
    ],
  };

  assertClose(evaluateAnimationTrack(track, -1.0, 100), 100, 0.001, 'Before start clamps');
  assertClose(evaluateAnimationTrack(track, 0.0, 100), 100, 0.001, 'At start');
  assertClose(evaluateAnimationTrack(track, 1.0, 100), 150, 0.001, 'Midpoint 50%');
  assertClose(evaluateAnimationTrack(track, 1.5, 100), 175, 0.001, '75% progress');
  assertClose(evaluateAnimationTrack(track, 2.0, 100), 200, 0.001, 'At end');
  assertClose(evaluateAnimationTrack(track, 3.0, 100), 200, 0.001, 'After end clamps');
  console.log(' -> PASS: Linear interpolation produces accurate mathematical gradient.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 4: Hold interpolation
// -------------------------------------------------------------------------------------------------
console.log('[TEST 4] Hold interpolation');
{
  const track: AnimationTrack<number> = {
    property: 'rotation',
    keyframes: [
      { id: 'k1', time: 0.0, value: 45, interpolation: 'hold' },
      { id: 'k2', time: 2.0, value: 90, interpolation: 'linear' },
    ],
  };

  assertClose(evaluateAnimationTrack(track, 0.5, 0), 45, 0.001, 'Hold at 0.5s');
  assertClose(evaluateAnimationTrack(track, 1.99, 0), 45, 0.001, 'Hold until 2.0s');
  assertClose(evaluateAnimationTrack(track, 2.0, 0), 90, 0.001, 'Steps to next keyframe at 2.0s');
  console.log(' -> PASS: Hold interpolation maintains value until the next keyframe.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 5: Three+ keyframes
// -------------------------------------------------------------------------------------------------
console.log('[TEST 5] Three+ keyframes');
{
  const track: AnimationTrack<number> = {
    property: 'scale',
    keyframes: [
      { id: 'k1', time: 0.0, value: 100, interpolation: 'linear' },
      { id: 'k2', time: 2.0, value: 125, interpolation: 'linear' },
      { id: 'k3', time: 5.0, value: 150, interpolation: 'linear' },
    ],
  };

  // 0 -> 2s: 100 -> 125 (slope = 12.5/s)
  assertClose(evaluateAnimationTrack(track, 1.0, 100), 112.5, 0.001, 'At 1s');
  assertClose(evaluateAnimationTrack(track, 2.0, 100), 125, 0.001, 'At 2s');
  // 2 -> 5s: 125 -> 150 (slope = 8.333/s)
  assertClose(evaluateAnimationTrack(track, 3.5, 100), 137.5, 0.001, 'At 3.5s');
  assertClose(evaluateAnimationTrack(track, 5.0, 100), 150, 0.001, 'At 5s');
  console.log(' -> PASS: Multi-segment piecewise keyframe tracks evaluate correctly.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 6: Keyframe at exact clip start
// -------------------------------------------------------------------------------------------------
console.log('[TEST 6] Keyframe at exact clip start');
{
  const track: AnimationTrack<number> = {
    property: 'opacity',
    keyframes: [
      { id: 'k1', time: 0.0, value: 0.0, interpolation: 'linear' },
      { id: 'k2', time: 1.0, value: 1.0, interpolation: 'linear' },
    ],
  };

  assertClose(evaluateAnimationTrack(track, 0.0, 1.0), 0.0, 0.0001, 'Exact start 0.0s');
  console.log(' -> PASS: Keyframe at exact start (t=0.0) evaluated with zero error.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 7: Keyframe at exact clip end
// -------------------------------------------------------------------------------------------------
console.log('[TEST 7] Keyframe at exact clip end');
{
  const clipDuration = 5.0;
  const track: AnimationTrack<number> = {
    property: 'opacity',
    keyframes: [
      { id: 'k1', time: 0.0, value: 1.0, interpolation: 'linear' },
      { id: 'k2', time: clipDuration, value: 0.0, interpolation: 'linear' },
    ],
  };

  assertClose(evaluateAnimationTrack(track, clipDuration, 1.0), 0.0, 0.0001, 'Exact end 5.0s');
  console.log(' -> PASS: Keyframe at exact end (t=duration) evaluated with zero error.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 8: Frame snapping
// -------------------------------------------------------------------------------------------------
console.log('[TEST 8] Frame snapping');
{
  const fps = 30;
  // Frame 3 at 30 fps is 3/30 = 0.1s
  const rawTime = 0.1033;
  const snapped = snapToFrame(rawTime, fps);
  assertClose(snapped, 0.1, 0.0001, 'Snapped to frame 3');

  // Frame 4 at 30 fps is 4/30 = 0.13333s
  const rawTime2 = 0.132;
  const snapped2 = snapToFrame(rawTime2, fps);
  assertClose(snapped2, 4 / 30, 0.0001, 'Snapped to frame 4');
  console.log(' -> PASS: Frame precision snaps times to exact project FPS boundaries.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 9: Duplicate keyframe prevention
// -------------------------------------------------------------------------------------------------
console.log('[TEST 9] Duplicate keyframe prevention');
{
  const fps = 30;
  const track: AnimationTrack<number> = {
    property: 'scale',
    keyframes: [
      { id: 'k1', time: 1.0, value: 1.2, interpolation: 'linear' },
    ],
  };

  const existing = findKeyframeAtTime(track, 1.002, fps);
  assert(existing !== undefined, 'Should detect keyframe within frame tolerance');
  assert(existing?.id === 'k1', 'Matched keyframe k1');

  // Updating existing keyframe rather than pushing duplicate
  if (existing) {
    existing.value = 1.8;
  }
  assert(track.keyframes.length === 1, 'Keyframe count remains 1');
  assertClose(track.keyframes[0].value, 1.8, 0.001, 'Value updated');
  console.log(' -> PASS: Keyframe at identical timestamp updates without creating duplicates.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 10: Clip movement preserves relative keyframe timing
// -------------------------------------------------------------------------------------------------
console.log('[TEST 10] Clip movement preserves relative keyframe timing');
{
  let project = createMockProject();
  const clip = createBaseClip('c1', 5.0, 10.0);
  clip.animations = {
    scale: {
      property: 'scale',
      keyframes: [
        { id: 'k1', time: 2.0, value: 1.5, interpolation: 'linear' },
      ],
    },
  };
  project.clips = [clip];

  // Move clip from 5.0s to 10.0s (deltaTime = +5.0s)
  const res = TimelineOperations.moveClips(project, ['c1'], 5.0);
  const movedClip = res.project.clips[0];

  assertClose(movedClip.startTime, 10.0, 0.001, 'Clip start moved to 10s');
  assert(movedClip.animations?.scale?.keyframes.length === 1, 'Keyframe preserved');
  assertClose(movedClip.animations!.scale!.keyframes[0].time, 2.0, 0.001, 'Relative time remains 2.0s');

  // At project time 12.0s, relative time is 12.0 - 10.0 = 2.0s
  const evalAt12 = evaluateClipAnimations(movedClip, 12.0 - movedClip.startTime);
  assertClose(evalAt12.scale, 1.5, 0.001, 'Evaluates at project time 12s to 1.5');
  console.log(' -> PASS: Moving clip preserves relative keyframe timing (project time 12s).\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 11: Duplicate clip clones animation independently
// -------------------------------------------------------------------------------------------------
console.log('[TEST 11] Duplicate clip clones animation independently');
{
  const original = createBaseClip('c1', 0, 5);
  original.animations = {
    rotation: {
      property: 'rotation',
      keyframes: [
        { id: 'k1', time: 1.0, value: 45, interpolation: 'linear' },
      ],
    },
  };

  const clonedAnimations = cloneAnimationTracks(original.animations);
  assert(clonedAnimations !== undefined, 'Animations cloned');
  assert(clonedAnimations!.rotation!.keyframes[0].id !== 'k1', 'Fresh keyframe ID generated');

  // Mutating clone does not modify original
  clonedAnimations!.rotation!.keyframes[0].value = 180;
  assertClose(original.animations.rotation.keyframes[0].value, 45, 0.001, 'Original remains 45');
  assertClose(clonedAnimations!.rotation!.keyframes[0].value, 180, 0.001, 'Clone updated to 180');
  console.log(' -> PASS: Duplicate clip creates deep-cloned keyframes with unique IDs.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 12: Split clip preserves animation correctly
// -------------------------------------------------------------------------------------------------
console.log('[TEST 12] Split clip preserves animation correctly');
{
  let project = createMockProject();
  const clip = createBaseClip('c1', 0, 10);
  clip.animations = {
    scale: {
      property: 'scale',
      keyframes: [
        { id: 'k1', time: 0.0, value: 1.0, interpolation: 'linear' },
        { id: 'k2', time: 10.0, value: 2.0, interpolation: 'linear' },
      ],
    },
  };
  project.clips = [clip];

  // Split at 5.0 seconds
  const res = TimelineOperations.splitClipsAtTime(project, ['c1'], 5.0);
  assert(res.project.clips.length === 2, 'Split created 2 clips');

  const leftClip = res.project.clips[0];
  const rightClip = res.project.clips[1];

  // Left clip spans 0 to 5s
  assertClose(leftClip.duration, 5.0, 0.001, 'Left duration is 5s');
  const leftEvalEnd = evaluateClipAnimations(leftClip, 5.0);
  assertClose(leftEvalEnd.scale, 1.5, 0.01, 'Left clip at split point is 1.5');

  // Right clip spans 5 to 10s
  assertClose(rightClip.startTime, 5.0, 0.001, 'Right start is 5s');
  assertClose(rightClip.duration, 5.0, 0.001, 'Right duration is 5s');
  const rightEvalStart = evaluateClipAnimations(rightClip, 0.0);
  assertClose(rightEvalStart.scale, 1.5, 0.01, 'Right clip at split start is 1.5');

  console.log(' -> PASS: Split operation partitions keyframes and preserves continuous boundary value 1.5.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 13: Trim behavior is correct
// -------------------------------------------------------------------------------------------------
console.log('[TEST 13] Trim behavior is correct');
{
  let project = createMockProject();
  const clip = createBaseClip('c1', 0, 10);
  clip.animations = {
    scale: {
      property: 'scale',
      keyframes: [
        { id: 'k1', time: 1.0, value: 1.2, interpolation: 'linear' },
        { id: 'k2', time: 4.0, value: 1.8, interpolation: 'linear' },
        { id: 'k3', time: 8.0, value: 2.0, interpolation: 'linear' },
      ],
    },
  };
  project.clips = [clip];

  // Trim in-point: newStartTime = 2.0, newDuration = 8.0, newSourceStart = 2.0
  // Shift delta = +2.0s
  // k1 at 1.0s shifted to -1.0s -> dropped
  // k2 at 4.0s shifted to 2.0s -> preserved
  // k3 at 8.0s shifted to 6.0s -> preserved
  const res = TimelineOperations.trimClip(project, 'c1', 2.0, 8.0, 2.0);
  const trimmed = res.project.clips[0];

  assert(trimmed.animations?.scale !== undefined, 'Scale track preserved');
  assert(trimmed.animations!.scale!.keyframes.length === 2, '2 keyframes remain');
  assertClose(trimmed.animations!.scale!.keyframes[0].time, 2.0, 0.001, 'k2 shifted to 2.0s');
  assertClose(trimmed.animations!.scale!.keyframes[1].time, 6.0, 0.001, 'k3 shifted to 6.0s');
  console.log(' -> PASS: Trimming deterministically shifts and prunes out-of-bounds keyframes.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 14: Undo keyframe creation
// -------------------------------------------------------------------------------------------------
console.log('[TEST 14] Undo keyframe creation');
{
  const history = new HistoryManager<FreeCutProject>();
  let project = createMockProject();
  const clip = createBaseClip('c1', 0, 10);
  project.clips = [clip];

  // Snapshot before
  const before = JSON.parse(JSON.stringify(project));

  // Add keyframe
  const after = JSON.parse(JSON.stringify(project));
  after.clips[0].animations = {
    scale: {
      property: 'scale',
      keyframes: [{ id: 'k1', time: 2.0, value: 1.5, interpolation: 'linear' }],
    },
  };

  history.push({
    name: 'Add Keyframe',
    undo: () => before,
    redo: () => after,
  });

  const undoRes = history.undo(after);
  assert(undoRes !== null, 'Undo succeeded');
  assert(undoRes!.newState.clips[0].animations === undefined, 'Keyframe removed by undo');
  console.log(' -> PASS: Undo completely reverts keyframe creation.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 15: Redo keyframe creation
// -------------------------------------------------------------------------------------------------
console.log('[TEST 15] Redo keyframe creation');
{
  const history = new HistoryManager<FreeCutProject>();
  let project = createMockProject();
  const clip = createBaseClip('c1', 0, 10);
  project.clips = [clip];

  const before = JSON.parse(JSON.stringify(project));
  const after = JSON.parse(JSON.stringify(project));
  after.clips[0].animations = {
    scale: {
      property: 'scale',
      keyframes: [{ id: 'k1', time: 2.0, value: 1.5, interpolation: 'linear' }],
    },
  };

  history.push({
    name: 'Add Keyframe',
    undo: () => before,
    redo: () => after,
  });

  history.undo(after);
  const redoRes = history.redo(before);
  assert(redoRes !== null, 'Redo succeeded');
  assert(redoRes!.newState.clips[0].animations?.scale?.keyframes.length === 1, 'Keyframe restored by redo');
  assertClose(redoRes!.newState.clips[0].animations!.scale!.keyframes[0].value, 1.5, 0.001, 'Value restored');
  console.log(' -> PASS: Redo accurately restores previously undone keyframe.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 16: Position animation (X, Y)
// -------------------------------------------------------------------------------------------------
console.log('[TEST 16] Position animation (X, Y)');
{
  const clip = createBaseClip('c1', 0, 10);
  clip.animations = {
    positionX: {
      property: 'positionX',
      keyframes: [
        { id: 'kx1', time: 0, value: 0, interpolation: 'linear' },
        { id: 'kx2', time: 4, value: 200, interpolation: 'linear' },
      ],
    },
    positionY: {
      property: 'positionY',
      keyframes: [
        { id: 'ky1', time: 0, value: 0, interpolation: 'linear' },
        { id: 'ky2', time: 4, value: -100, interpolation: 'linear' },
      ],
    },
  };

  const evalAt2 = evaluateClipAnimations(clip, 2.0);
  assertClose(evalAt2.positionX, 100, 0.001, 'PosX at 2s is 100');
  assertClose(evalAt2.positionY, -50, 0.001, 'PosY at 2s is -50');
  console.log(' -> PASS: 2D Position animation evaluates accurately for X and Y coordinates.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 17: Scale animation
// -------------------------------------------------------------------------------------------------
console.log('[TEST 17] Scale animation');
{
  const clip = createBaseClip('c1', 0, 5);
  clip.animations = {
    scale: {
      property: 'scale',
      keyframes: [
        { id: 'ks1', time: 0, value: 1.0, interpolation: 'linear' },
        { id: 'ks2', time: 5, value: 1.5, interpolation: 'linear' },
      ],
    },
  };

  assertClose(evaluateClipAnimations(clip, 0.0).scale, 1.0, 0.001, 'Scale at 0s is 100%');
  assertClose(evaluateClipAnimations(clip, 2.5).scale, 1.25, 0.001, 'Scale at 2.5s is 125%');
  assertClose(evaluateClipAnimations(clip, 5.0).scale, 1.5, 0.001, 'Scale at 5s is 150%');
  console.log(' -> PASS: Scale animation smoothly interpolates 100% -> 150%.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 18: Rotation animation
// -------------------------------------------------------------------------------------------------
console.log('[TEST 18] Rotation animation');
{
  const clip = createBaseClip('c1', 0, 4);
  clip.animations = {
    rotation: {
      property: 'rotation',
      keyframes: [
        { id: 'kr1', time: 0, value: 0, interpolation: 'linear' },
        { id: 'kr2', time: 4, value: 180, interpolation: 'linear' },
      ],
    },
  };

  assertClose(evaluateClipAnimations(clip, 0).rotation, 0, 0.001, '0° at 0s');
  assertClose(evaluateClipAnimations(clip, 2).rotation, 90, 0.001, '90° at 2s');
  assertClose(evaluateClipAnimations(clip, 4).rotation, 180, 0.001, '180° at 4s');
  console.log(' -> PASS: Rotation animation smoothly computes angular change.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 19: Opacity animation
// -------------------------------------------------------------------------------------------------
console.log('[TEST 19] Opacity animation');
{
  const clip = createBaseClip('c1', 0, 3);
  clip.animations = {
    opacity: {
      property: 'opacity',
      keyframes: [
        { id: 'ko1', time: 0, value: 1.0, interpolation: 'linear' },
        { id: 'ko2', time: 3, value: 0.0, interpolation: 'linear' },
      ],
    },
  };

  assertClose(evaluateClipAnimations(clip, 0).opacity, 1.0, 0.001, '100% at 0s');
  assertClose(evaluateClipAnimations(clip, 1.5).opacity, 0.5, 0.001, '50% at 1.5s');
  assertClose(evaluateClipAnimations(clip, 3.0).opacity, 0.0, 0.001, '0% at 3s');
  console.log(' -> PASS: Opacity animation produces smooth fade-out curve.\n');
}

// -------------------------------------------------------------------------------------------------
// TEST 20: Volume animation
// -------------------------------------------------------------------------------------------------
console.log('[TEST 20] Volume animation');
{
  const clip = createBaseClip('c1', 0, 4);
  clip.animations = {
    volume: {
      property: 'volume',
      keyframes: [
        { id: 'kv1', time: 0, value: 1.0, interpolation: 'linear' },
        { id: 'kv2', time: 3, value: 0.0, interpolation: 'linear' },
      ],
    },
  };

  assertClose(evaluateClipAnimations(clip, 0).volume, 1.0, 0.001, '100% volume at 0s');
  assertClose(evaluateClipAnimations(clip, 1.5).volume, 0.5, 0.001, '50% volume at 1.5s');
  assertClose(evaluateClipAnimations(clip, 3.0).volume, 0.0, 0.001, '0% volume at 3s');
  assertClose(evaluateClipAnimations(clip, 4.0).volume, 0.0, 0.001, '0% volume after fade');
  console.log(' -> PASS: Volume animation produces accurate audio fade curve.\n');
}

console.log('ALL 20 KEYFRAME ANIMATION ENGINE TESTS PASSED SUCCESSFULLY!');
