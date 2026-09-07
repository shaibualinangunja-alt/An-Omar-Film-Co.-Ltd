/**
 * FreeCut Alpha 0.4 Keyframe Integration & Store Workflow Tests
 * Tests ProjectStore keyframe action flows, navigation, preview evaluation, and undo/redo.
 */

import { ProjectService } from './src/services/projectService';
import { projectStore } from './src/state/projectStore';
import { evaluateClipAnimations } from './src/animation';
import { snapToFrame } from './src/utils/timelineMath';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion Failed: ${msg}`);
}

function assertClose(a: number, b: number, eps = 0.001, msg = '') {
  if (Math.abs(a - b) > eps) throw new Error(`Assertion Failed: expected ${b}, got ${a}. ${msg}`);
}

console.log('=== RUNNING FREECUT ALPHA 0.4 KEYFRAME STORE WORKFLOW TESTS ===\n');

const store = projectStore;

  // 1. Setup a project with 1 clip on track_v1
  const proj = ProjectService.createDefaultProject('E2E Keyframe Test');
  const clipId = 'clip_test_1';
  proj.clips = [
    {
      id: clipId,
      mediaId: 'mock_media_1',
      trackId: 'track_v1',
      startTime: 2.0,
      duration: 10.0,
      sourceStart: 0,
      sourceDuration: 20,
      type: 'video',
      name: 'Video Clip 1',
      transform: {
        positionX: 0,
        positionY: 0,
        scale: 1.0,
        rotation: 0,
        opacity: 1.0,
      },
      volume: 1.0,
      muted: false,
    },
  ];

  store.setState({
    project: proj,
    selectedClipIds: [clipId],
    selectedClipId: clipId,
    currentTime: 2.0, // Playhead at clip start (relative 0.0s)
  });

  console.log('[STEP 1] Toggle Keyframe at Playhead');
  // At currentTime = 2.0s (relativeTime = 0.0s), add scale keyframe with value 1.0
  store.toggleKeyframe(clipId, 'scale', 1.0);

  let curClip = store.getState().project.clips[0];
  assert(curClip.animations?.scale?.keyframes.length === 1, 'Keyframe created');
  assertClose(curClip.animations!.scale!.keyframes[0].time, 0.0, 0.001, 'Time is relative 0.0s');
  assertClose(curClip.animations!.scale!.keyframes[0].value, 1.0, 0.001, 'Value is 1.0');
  console.log(' -> PASS: Keyframe created at relative 0.0s.\n');

  console.log('[STEP 2] Toggle Keyframe at Same Playhead removes keyframe');
  store.toggleKeyframe(clipId, 'scale');
  curClip = store.getState().project.clips[0];
  assert(curClip.animations?.scale === undefined || curClip.animations.scale.keyframes.length === 0, 'Keyframe removed');
  console.log(' -> PASS: Second toggle removes keyframe.\n');

  console.log('[STEP 3] Undo removes deletion, Redo deletes again');
  store.undo(); // Undo deletion -> keyframe back
  curClip = store.getState().project.clips[0];
  assert(curClip.animations?.scale?.keyframes.length === 1, 'Keyframe restored on undo');

  store.redo(); // Redo deletion -> keyframe gone
  curClip = store.getState().project.clips[0];
  assert(curClip.animations?.scale === undefined || curClip.animations.scale.keyframes.length === 0, 'Keyframe deleted on redo');

  store.undo(); // Undo deletion -> keyframe back for remaining tests
  console.log(' -> PASS: Undo/Redo verified on keyframe toggle.\n');

  console.log('[STEP 4] Add second keyframe at 5.0s project time (relative 3.0s)');
  store.setCurrentTime(5.0);
  store.setKeyframeValue(clipId, 'scale', 1.5);
  curClip = store.getState().project.clips[0];
  assert(curClip.animations?.scale?.keyframes.length === 2, 'Now 2 keyframes');
  assertClose(curClip.animations!.scale!.keyframes[1].time, 3.0, 0.001, 'Second keyframe at 3.0s relative');
  assertClose(curClip.animations!.scale!.keyframes[1].value, 1.5, 0.001, 'Second keyframe value 1.5');
  console.log(' -> PASS: Second keyframe added at relative 3.0s.\n');

  console.log('[STEP 5] Playhead Navigation (Previous / Next Keyframe)');
  // Playhead currently at 5.0s. Jump to previous keyframe:
  store.jumpToPrevKeyframe(clipId, 'scale');
  assertClose(store.getState().currentTime, 2.0, 0.001, 'Jumped to first keyframe at project 2.0s');

  // Jump to next keyframe:
  store.jumpToNextKeyframe(clipId, 'scale');
  assertClose(store.getState().currentTime, 5.0, 0.001, 'Jumped to second keyframe at project 5.0s');
  console.log(' -> PASS: Navigation jumps accurately between keyframes.\n');

  console.log('[STEP 6] Move Keyframe (Timeline Dragging)');
  const kfId = store.getState().project.clips[0].animations!.scale!.keyframes[1].id;
  // Move second keyframe from relative 3.0s to relative 4.0s
  store.moveKeyframe(clipId, 'scale', kfId, 4.0);
  curClip = store.getState().project.clips[0];
  assertClose(curClip.animations!.scale!.keyframes[1].time, 4.0, 0.001, 'Moved to 4.0s');

  // Preview evaluation at relative 2.0s (midpoint between 0s and 4s)
  const evalAt2 = evaluateClipAnimations(curClip, 2.0);
  assertClose(evalAt2.scale, 1.25, 0.001, 'Interpolated scale at 2s is 1.25');
  console.log(' -> PASS: Dragging keyframe updates timing and preview evaluation.\n');

  console.log('[STEP 7] Volume Animation via store');
  store.setCurrentTime(2.0); // relative 0.0s
  store.toggleKeyframe(clipId, 'volume', 1.0);
  store.setCurrentTime(6.0); // relative 4.0s
  store.updateClipVolume(clipId, 0.2); // updates keyframe at playhead

  curClip = store.getState().project.clips[0];
  assert(curClip.animations?.volume?.keyframes.length === 2, '2 volume keyframes');
  assertClose(evaluateClipAnimations(curClip, 2.0).volume, 0.6, 0.001, 'Volume at 2.0s is 0.6');
  console.log(' -> PASS: Volume animation evaluated smoothly.\n');

  console.log('ALL KEYFRAME INTEGRATION & STORE WORKFLOW TESTS PASSED!\n');

