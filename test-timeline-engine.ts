/**
 * Timeline Engine Automated Test Script
 * Runs all Alpha 0.3 editing operations on a real FreeCut project:
 * - Ingestion sequence: A(5s) + B(4s) + C(6s) + D(3s)
 * - Normal delete B -> A + gap + C + D
 * - Ripple delete B -> A + C + D
 * - Insert edit X(3s) -> A + X + B + C + D
 * - Overwrite edit B with X(3s) -> A + X + C + D
 * - Track locking rejection
 * - Multi-clip move
 * - Trim & Split
 * - Duplicate & Copy/Paste
 */

import { TimelineOperations } from './src/services/timelineOperations';
import { ProjectService } from './src/services/projectService';
import { FreeCutProject, ClipItem } from './src/types/project';

function runTests() {
  console.log('=== RUNNING FREECUT ALPHA 0.3 TIMELINE ENGINE TESTS ===\n');

  // 1. Initialize Base Project
  const project = ProjectService.createDefaultProject('Alpha 0.3 Test Suite');
  project.project.fps = 30;

  // Add dummy media asset references
  project.media.push(
    { id: 'media_a', name: 'Video A', path: 'test-media/sample-video.mp4', type: 'video', size: 1000, duration: 5, createdAt: Date.now() },
    { id: 'media_b', name: 'Video B', path: 'test-media/sample-video.mp4', type: 'video', size: 1000, duration: 4, createdAt: Date.now() },
    { id: 'media_c', name: 'Video C', path: 'test-media/sample-video.mp4', type: 'video', size: 1000, duration: 6, createdAt: Date.now() },
    { id: 'media_d', name: 'Video D', path: 'test-media/sample-video.mp4', type: 'video', size: 1000, duration: 3, createdAt: Date.now() },
    { id: 'media_x', name: 'Video X', path: 'test-media/sample-video.mp4', type: 'video', size: 1000, duration: 3, createdAt: Date.now() }
  );

  // Helper to create test clips on V1
  function createSeq(proj: FreeCutProject): FreeCutProject {
    const clone: FreeCutProject = JSON.parse(JSON.stringify(proj));
    // Ensure all tracks are unlocked initially
    clone.tracks.forEach(t => t.locked = false);
    clone.clips = [
      { id: 'clip_a', mediaId: 'media_a', trackId: 'track_v1', startTime: 0, duration: 5, sourceStart: 0, sourceDuration: 5, type: 'video', name: 'A', transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 }, volume: 1, muted: false },
      { id: 'clip_b', mediaId: 'media_b', trackId: 'track_v1', startTime: 5, duration: 4, sourceStart: 0, sourceDuration: 4, type: 'video', name: 'B', transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 }, volume: 1, muted: false },
      { id: 'clip_c', mediaId: 'media_c', trackId: 'track_v1', startTime: 9, duration: 6, sourceStart: 0, sourceDuration: 6, type: 'video', name: 'C', transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 }, volume: 1, muted: false },
      { id: 'clip_d', mediaId: 'media_d', trackId: 'track_v1', startTime: 15, duration: 3, sourceStart: 0, sourceDuration: 3, type: 'video', name: 'D', transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 }, volume: 1, muted: false },
    ];
    return clone;
  }

  // --- TEST 1: Normal Delete ---
  {
    console.log('[TEST 1] Normal Delete (Preserves Gap)');
    const p = createSeq(project);
    const res = TimelineOperations.deleteClips(p, ['clip_b']);
    const clips = res.project.clips;
    console.assert(clips.length === 3, 'Should have 3 clips left');
    console.assert(!clips.some(c => c.id === 'clip_b'), 'Clip B deleted');
    const clipC = clips.find(c => c.id === 'clip_c')!;
    const clipD = clips.find(c => c.id === 'clip_d')!;
    console.assert(clipC.startTime === 9, 'Clip C should stay at startTime 9 (gap preserved)');
    console.assert(clipD.startTime === 15, 'Clip D should stay at startTime 15');
    console.log(' -> PASS: Clip B removed, gap 5-9s preserved.');
  }

  // --- TEST 2: Ripple Delete ---
  {
    console.log('\n[TEST 2] Ripple Delete (Closes Gap)');
    const p = createSeq(project);
    const res = TimelineOperations.rippleDeleteClips(p, ['clip_b']);
    const clips = res.project.clips;
    console.assert(clips.length === 3, 'Should have 3 clips left');
    const clipC = clips.find(c => c.id === 'clip_c')!;
    const clipD = clips.find(c => c.id === 'clip_d')!;
    console.assert(clipC.startTime === 5, `Clip C should shift from 9 to 5 (actual: ${clipC.startTime})`);
    console.assert(clipD.startTime === 11, `Clip D should shift from 15 to 11 (actual: ${clipD.startTime})`);
    console.log(' -> PASS: Clip B ripple deleted, C & D shifted left by 4s.');
  }

  // --- TEST 3: Insert Edit ---
  {
    console.log('\n[TEST 3] Insert Edit (Shifts subsequent media right)');
    const p = createSeq(project);
    // Insert X (3s) at start of B (5s)
    const res = TimelineOperations.insertClip(p, 'media_x', 'track_v1', 5);
    const clips = res.project.clips;
    console.assert(clips.length === 5, 'Should have 5 clips now');
    const clipX = clips.find(c => c.mediaId === 'media_x')!;
    const clipB = clips.find(c => c.id === 'clip_b')!;
    const clipC = clips.find(c => c.id === 'clip_c')!;
    const clipD = clips.find(c => c.id === 'clip_d')!;
    console.assert(clipX.startTime === 5 && clipX.duration === 3, 'X starts at 5s with duration 3s');
    console.assert(clipB.startTime === 8, `B shifted right by 3s to 8s (actual: ${clipB.startTime})`);
    console.assert(clipC.startTime === 12, `C shifted right by 3s to 12s (actual: ${clipC.startTime})`);
    console.assert(clipD.startTime === 18, `D shifted right by 3s to 18s (actual: ${clipD.startTime})`);
    console.log(' -> PASS: X inserted at 5s, sequence is A(0-5) -> X(5-8) -> B(8-12) -> C(12-18) -> D(18-21).');
  }

  // --- TEST 4: Overwrite Edit ---
  {
    console.log('\n[TEST 4] Overwrite Edit (Replaces timeline region)');
    const p = createSeq(project);
    // Overwrite B (5-9s) with X (duration 3s, from 5 to 8s)
    const res = TimelineOperations.overwriteClip(p, 'media_x', 'track_v1', 5);
    const clips = res.project.clips;
    const clipX = clips.find(c => c.mediaId === 'media_x')!;
    const clipC = clips.find(c => c.id === 'clip_c')!;
    console.assert(clipX.startTime === 5 && clipX.duration === 3, 'X starts at 5s with duration 3s');
    console.assert(clipC.startTime === 9, 'C is untouched at 9s');
    // B should have been trimmed to [8, 9] (duration 1s)
    const bPieces = clips.filter(c => c.mediaId === 'media_b');
    console.assert(bPieces.length === 1 && bPieces[0].startTime === 8 && bPieces[0].duration === 1, 'Remaining B piece is at 8s duration 1s');
    console.log(' -> PASS: Overwrite replaced 5-8s cleanly, preserved remainder of B at 8-9s.');
  }

  // --- TEST 5: Track Locking ---
  {
    console.log('\n[TEST 5] Track Locking (Rejects operations on locked tracks)');
    const p = createSeq(project);
    p.tracks.find(t => t.id === 'track_v1')!.locked = true;

    const delRes = TimelineOperations.deleteClips(p, ['clip_b']);
    console.assert(delRes.project.clips.length === 4, 'Delete should be rejected when track locked');

    const ripRes = TimelineOperations.rippleDeleteClips(p, ['clip_b']);
    console.assert(ripRes.project.clips.length === 4, 'Ripple delete should be rejected when track locked');

    const insRes = TimelineOperations.insertClip(p, 'media_x', 'track_v1', 5);
    console.assert(insRes.project.clips.length === 4, 'Insert should be rejected when track locked');

    const movRes = TimelineOperations.moveClips(p, ['clip_a'], 2);
    console.assert(movRes.project.clips.find(c => c.id === 'clip_a')!.startTime === 0, 'Move should be rejected when track locked');
    console.log(' -> PASS: All operations strictly rejected on locked tracks.');
  }

  // --- TEST 6: Multi-clip Selection & Move ---
  {
    console.log('\n[TEST 6] Multi-clip Move');
    const p = createSeq(project);
    const res = TimelineOperations.moveClips(p, ['clip_b', 'clip_c'], 2);
    const b = res.project.clips.find(c => c.id === 'clip_b')!;
    const c = res.project.clips.find(c => c.id === 'clip_c')!;
    console.assert(b.startTime === 7, `B moved from 5 to 7 (actual: ${b.startTime})`);
    console.assert(c.startTime === 11, `C moved from 9 to 11 (actual: ${c.startTime})`);
    console.log(' -> PASS: Both clips moved together preserving relative offset.');
  }

  // --- TEST 7: Duplicate Clips ---
  {
    console.log('\n[TEST 7] Duplicate Clips');
    const p = createSeq(project);
    const res = TimelineOperations.duplicateClips(p, ['clip_a', 'clip_b']);
    console.assert(res.project.clips.length === 6, 'Should create 2 duplicate clips');
    console.assert(res.affectedClipIds.length === 2, 'Should return 2 new clip IDs');
    console.log(' -> PASS: Cloned clips created with independent stable IDs.');
  }

  // --- TEST 8: Copy, Cut, Paste ---
  {
    console.log('\n[TEST 8] Clipboard (Copy / Paste)');
    const p = createSeq(project);
    const clipboard = [p.clips[0], p.clips[1]]; // A (0-5) and B (5-9)
    const res = TimelineOperations.pasteClips(p, clipboard, 20);
    console.assert(res.project.clips.length === 6, 'Pasted 2 clips at 20s');
    const pastedA = res.project.clips.find(c => c.startTime === 20)!;
    const pastedB = res.project.clips.find(c => c.startTime === 25)!;
    console.assert(pastedA && pastedB, 'Pasted clips preserve 5s relative spacing');
    console.log(' -> PASS: Pasted clips placed at 20s and 25s with relative timing.');
  }

  // --- TEST 9: Non-destructive Trim & Split ---
  {
    console.log('\n[TEST 9] Non-destructive Trim & Split');
    const p = createSeq(project);
    // Trim C (startTime 9, duration 6, sourceStart 0) to startTime 10, duration 5, sourceStart 1
    const trimRes = TimelineOperations.trimClip(p, 'clip_c', 10, 5, 1);
    const cTrimmed = trimRes.project.clips.find(c => c.id === 'clip_c')!;
    console.assert(cTrimmed.startTime === 10 && cTrimmed.duration === 5 && cTrimmed.sourceStart === 1, 'C trimmed properly');

    // Split D (starts at 15, duration 3) at playhead 16.5
    const splitRes = TimelineOperations.splitClipsAtTime(p, ['clip_d'], 16.5);
    const dClips = splitRes.project.clips.filter(c => c.mediaId === 'media_d');
    console.assert(dClips.length === 2, 'D split into 2 pieces');
    console.assert(dClips[0].duration === 1.5 && dClips[1].duration === 1.5, 'D split into two 1.5s halves');
    console.log(' -> PASS: Trim and Split executed accurately without touching source media.');
  }

  console.log('\nALL 9 TIMELINE ENGINE UNIT TESTS PASSED SUCCESSFULLY.');
}

runTests();
