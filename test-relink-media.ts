/**
 * FREECUT ALPHA 1.0 — STEP 4.1 MEDIA RELINKER TEST SUITE
 * Validates single-file relinking, batch relinking, conservative type validation,
 * corrupted file rejection, timeline clip preservation, save/load, and undo/redo.
 */

import { projectStore } from './src/state/projectStore';
import { ProjectService } from './src/services/projectService';
import { MediaAsset, ClipItem } from './src/types/project';
import * as fs from 'fs';
import * as path from 'path';

// Polyfill relative fetch for Node runtime against active dev server
const originalFetch = globalThis.fetch;
globalThis.fetch = (input: any, init?: any) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    input = 'http://localhost:5173' + input;
  }
  return originalFetch(input, init);
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runStep41Tests() {
  console.log('\n======================================================');
  console.log('   FREECUT ALPHA 1.0 — STEP 4.1 MEDIA RELINKER SUITE   ');
  console.log('======================================================\n');

  // Find real media samples in test-media directory
  const realVideoPath = path.resolve('test-media/sample-video.mp4');
  const realAudioPath = path.resolve('test-media/dialogue_sample.wav');
  const fakeMissingPath1 = 'C:/Users/OldUser/Videos/sample-video.mp4';
  const fakeMissingPath2 = 'C:/Users/OldUser/Audio/dialogue_sample.wav';
  const fakeMissingPath3 = 'C:/Users/OldUser/Graphics/overlay.png';

  // --- SECTION 1: INITIAL STATE & MISSING MEDIA DETECTION ---
  console.log('[TEST 1] Project Setup with Missing / Offline Media Assets');
  
  // Reset project
  projectStore.setProject(ProjectService.createDefaultProject('Relinker Test Project'));

  // Ingest synthetic assets where paths are missing
  const missingAsset1: MediaAsset = {
    id: 'media_v1_missing',
    name: 'sample-video.mp4',
    path: fakeMissingPath1,
    type: 'video',
    size: 2000000,
    duration: 8.0,
    width: 864,
    height: 496,
    fps: 30,
    isMissing: true,
    createdAt: Date.now(),
  };

  const missingAsset2: MediaAsset = {
    id: 'media_a1_missing',
    name: 'sample-audio.wav',
    path: fakeMissingPath2,
    type: 'audio',
    size: 500000,
    duration: 4.0,
    audioChannels: 2,
    sampleRate: 48000,
    isMissing: true,
    createdAt: Date.now(),
  };

  const missingAsset3: MediaAsset = {
    id: 'media_img_missing',
    name: 'overlay.png',
    path: fakeMissingPath3,
    type: 'image',
    size: 100000,
    duration: 5.0,
    width: 1920,
    height: 1080,
    isMissing: true,
    createdAt: Date.now(),
  };

  projectStore.addMedia(missingAsset1);
  projectStore.addMedia(missingAsset2);
  projectStore.addMedia(missingAsset3);

  // Place clips on timeline that depend on missingAsset1 and missingAsset2
  projectStore.addClipToTimeline('media_v1_missing', 'track_v1', 0);
  projectStore.addClipToTimeline('media_a1_missing', 'track_a1', 1.5);

  const initialMissing = projectStore.findMissingMedia();
  assert(initialMissing.length === 3, `Detected 3 missing media assets (found: ${initialMissing.length})`);
  assert(initialMissing.some(m => m.id === 'media_v1_missing'), 'media_v1_missing is flagged as isMissing');
  assert(initialMissing.some(m => m.id === 'media_a1_missing'), 'media_a1_missing is flagged as isMissing');
  assert(initialMissing.some(m => m.id === 'media_img_missing'), 'media_img_missing is flagged as isMissing');

  const clipsBefore = projectStore.getState().project.clips;
  assert(clipsBefore.length === 2, `Timeline has 2 dependent clips (found: ${clipsBefore.length})`);

  // --- SECTION 2: CONSERVATIVE VALIDATION & ERROR REJECTION ---
  console.log('\n[TEST 2] Rejection of Non-existent & Incompatible Files');

  // Attempt to relink to a non-existent file
  const nonExistentResult = await projectStore.relinkMedia('media_v1_missing', 'C:/Invalid/definitely_not_a_file_404.mp4');
  assert(!nonExistentResult.success, 'Non-existent file correctly rejected');
  assert(nonExistentResult.error !== undefined, `Reported error: ${nonExistentResult.error}`);
  assert(projectStore.getState().project.media.find(m => m.id === 'media_v1_missing')?.isMissing === true, 'media_v1_missing remains isMissing: true');

  // Attempt to relink video asset with an audio file (Type Incompatibility)
  if (fs.existsSync(realAudioPath)) {
    const incompatibleResult = await projectStore.relinkMedia('media_v1_missing', realAudioPath);
    assert(!incompatibleResult.success, 'Incompatible media type (video -> audio) strictly rejected');
    assert(incompatibleResult.error?.includes('Incompatible media type') === true, `Error reports incompatibility: "${incompatibleResult.error}"`);
    assert(projectStore.getState().project.media.find(m => m.id === 'media_v1_missing')?.isMissing === true, 'media_v1_missing remains isMissing: true');
  }

  // --- SECTION 3: SUCCESSFUL SINGLE-FILE RELINKING ---
  console.log('\n[TEST 3] Single-File Relinking with Metadata Probing');

  assert(fs.existsSync(realVideoPath), `Real video exists at: ${realVideoPath}`);
  const singleRelinkResult = await projectStore.relinkMedia('media_v1_missing', realVideoPath);
  assert(singleRelinkResult.success, 'Single file relink returned success: true');

  const relinkedAsset1 = projectStore.getState().project.media.find(m => m.id === 'media_v1_missing');
  assert(relinkedAsset1 !== undefined, 'Target asset found in project');
  assert(relinkedAsset1?.isMissing === false, 'isMissing flag successfully cleared to false');
  assert(relinkedAsset1?.path === realVideoPath, `Asset path updated to real video path: ${relinkedAsset1?.path}`);
  assert((relinkedAsset1?.duration || 0) > 7.0, `Asset duration probed correctly: ${relinkedAsset1?.duration}s`);
  assert(relinkedAsset1?.width === 864 && relinkedAsset1?.height === 496, `Probed dimensions: ${relinkedAsset1?.width}x${relinkedAsset1?.height}`);

  // Verify timeline clips remained completely intact
  const clipsAfterSingle = projectStore.getState().project.clips;
  const clip1 = clipsAfterSingle.find(c => c.mediaId === 'media_v1_missing');
  assert(clip1 !== undefined, 'Clip referencing relinked media is preserved on timeline');
  assert(clip1?.trackId === 'track_v1', 'Clip remains on track_v1');
  assert(clip1?.startTime === 0, 'Clip remains at startTime: 0');

  const missingAfterSingle = projectStore.findMissingMedia();
  assert(missingAfterSingle.length === 2, `Remaining missing files count is 2 (found: ${missingAfterSingle.length})`);

  // --- SECTION 4: BATCH RELINKING WORKFLOW ---
  console.log('\n[TEST 4] Batch Directory / Multi-File Relinking');

  // Attempt batch relink with one valid match (realAudioPath) and one unmatched/invalid match
  assert(fs.existsSync(realAudioPath), `Real audio exists at: ${realAudioPath}`);

  const batchMatches = [
    { mediaId: 'media_a1_missing', newPathOrFile: realAudioPath },
    { mediaId: 'media_img_missing', newPathOrFile: 'C:/NonExistent/overlay.png' },
  ];

  const batchResult = await projectStore.batchRelinkMedia(batchMatches);
  assert(batchResult.matchedCount === 1, `Batch relinked 1 valid match (got: ${batchResult.matchedCount})`);
  assert(batchResult.failedCount === 1, `Batch safely rejected 1 invalid match (got: ${batchResult.failedCount})`);
  assert(batchResult.errors.length === 1, 'Batch returned 1 error diagnostic');
  assert(batchResult.errors[0].mediaId === 'media_img_missing', 'Error correctly flagged on media_img_missing');

  const relinkedAsset2 = projectStore.getState().project.media.find(m => m.id === 'media_a1_missing');
  assert(relinkedAsset2?.isMissing === false, 'media_a1_missing is now isMissing: false');
  assert(relinkedAsset2?.path === realAudioPath, `media_a1_missing path updated to: ${relinkedAsset2?.path}`);

  const unlinkedAsset3 = projectStore.getState().project.media.find(m => m.id === 'media_img_missing');
  assert(unlinkedAsset3?.isMissing === true, 'Failed media_img_missing safely remains isMissing: true');

  const finalMissing = projectStore.findMissingMedia();
  assert(finalMissing.length === 1, `Only 1 missing file remains in project (found: ${finalMissing.length})`);

  // --- SECTION 5: UNDO / REDO OF RELINKING ---
  console.log('\n[TEST 5] Undo / Redo of Relink Operation');

  // Undo the batch relink
  projectStore.undo();
  const asset2AfterUndo = projectStore.getState().project.media.find(m => m.id === 'media_a1_missing');
  assert(asset2AfterUndo?.isMissing === true, 'Undo successfully reverted media_a1_missing back to isMissing: true');
  assert(asset2AfterUndo?.path === fakeMissingPath2, `Undo restored original missing path: ${asset2AfterUndo?.path}`);

  // Redo the batch relink
  projectStore.redo();
  const asset2AfterRedo = projectStore.getState().project.media.find(m => m.id === 'media_a1_missing');
  assert(asset2AfterRedo?.isMissing === false, 'Redo successfully restored media_a1_missing to isMissing: false');
  assert(asset2AfterRedo?.path === realAudioPath, `Redo restored validated path: ${asset2AfterRedo?.path}`);

  // --- SECTION 6: PROJECT SERIALIZATION / DESERIALIZATION ---
  console.log('\n[TEST 6] Project Save / Load Preservation of Relinked State');

  const savedJson = ProjectService.serializeProject(projectStore.getState().project);
  assert(savedJson.length > 500, 'Project serialized to JSON');

  const loadedProject = ProjectService.deserializeProject(savedJson);
  assert(loadedProject.media.length === 3, `Deserialized project has 3 media items (got: ${loadedProject.media.length})`);

  const loadedVideo = loadedProject.media.find(m => m.id === 'media_v1_missing');
  assert(loadedVideo?.isMissing === false, 'Saved & reloaded video retains isMissing: false');
  assert(loadedVideo?.path === realVideoPath, `Saved & reloaded video retains path: ${loadedVideo?.path}`);

  const loadedAudio = loadedProject.media.find(m => m.id === 'media_a1_missing');
  assert(loadedAudio?.isMissing === false, 'Saved & reloaded audio retains isMissing: false');
  assert(loadedAudio?.path === realAudioPath, `Saved & reloaded audio retains path: ${loadedAudio?.path}`);

  const loadedImage = loadedProject.media.find(m => m.id === 'media_img_missing');
  assert(loadedImage?.isMissing === true, 'Saved & reloaded image retains isMissing: true');

  console.log('\n======================================================');
  console.log(`   TEST RESULT: ${passed} PASS, ${failed} FAIL       `);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep41Tests().catch((err) => {
  console.error('Fatal error in Step 4.1 test suite:', err);
  process.exit(1);
});
