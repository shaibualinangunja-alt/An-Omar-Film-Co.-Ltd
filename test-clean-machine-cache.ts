/**
 * FREECUT ALPHA 1.0 — STEP 4.2 VALIDATION SUITE
 * Clean-Machine Independence, Decoupled Desktop Media Verification & Cache Cleanup
 */

import { DesktopBridge } from './src/native/desktopBridge';
import { ProjectService } from './src/services/projectService';
import { CacheService } from './src/services/cacheService';
import { FreeCutProject, MediaAsset } from './src/types/project';
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

async function runStep42Tests() {
  console.log('\n===============================================================');
  console.log(' FREECUT ALPHA 1.0 — STEP 4.2 CLEAN-MACHINE & CACHE SUITE     ');
  console.log('===============================================================\n');

  const realVideoPath = path.resolve('test-media/sample-video.mp4');
  const realAudioPath = path.resolve('test-media/dialogue_sample.wav');
  const realImagePath = path.resolve('test-media/portrait_mask.png');
  const missingFilePath = path.resolve('test-media/non_existent_file_404.mp4');
  const corruptFilePath = path.resolve('test-media/corrupt_zero_byte.mp4');

  // Create a synthetic corrupt/empty file for negative testing
  fs.writeFileSync(corruptFilePath, Buffer.alloc(0));

  // --- SECTION 1: DESKTOP MEDIA VERIFICATION DECOUPLING ---
  console.log('[SECTION 1] Desktop Media Verification Decoupling (Without Vite Middleware)');

  // 1. Existing video verification
  const videoCheck = await DesktopBridge.verifyMediaFile(realVideoPath, 'video');
  assert(videoCheck.accessible, `Existing real video detected as accessible: ${realVideoPath}`);

  // 2. Existing audio verification
  const audioCheck = await DesktopBridge.verifyMediaFile(realAudioPath, 'audio');
  assert(audioCheck.accessible, `Existing real audio detected as accessible: ${realAudioPath}`);

  // 3. Existing image verification
  const imageCheck = await DesktopBridge.verifyMediaFile(realImagePath, 'image');
  assert(imageCheck.accessible, `Existing real image detected as accessible: ${realImagePath}`);

  // 4. Missing media verification
  const missingCheck = await DesktopBridge.verifyMediaFile(missingFilePath, 'video');
  assert(!missingCheck.accessible, 'Non-existent file correctly identified as NOT accessible');
  assert(missingCheck.reason?.includes('not exist') === true, `Reason reported: "${missingCheck.reason}"`);

  // 5. Corrupt / 0-byte media verification
  const corruptCheck = await DesktopBridge.verifyMediaFile(corruptFilePath, 'video');
  assert(!corruptCheck.accessible, 'Corrupt 0-byte file correctly identified as NOT accessible');
  assert(corruptCheck.reason?.includes('corrupt') || corruptCheck.reason?.includes('streams') || corruptCheck.reason?.includes('unreadable'),
    `Corrupt diagnostic reported: "${corruptCheck.reason}"`);

  // Clean up synthetic corrupt file
  if (fs.existsSync(corruptFilePath)) {
    fs.unlinkSync(corruptFilePath);
  }

  // 6. ProjectService.verifyMediaAvailability decoupled batch verification
  console.log('\n[SECTION 2] ProjectService Batch Media Availability Verification');

  const testProject: FreeCutProject = ProjectService.createDefaultProject('Verification Test');
  testProject.media = [
    {
      id: 'm_online_video',
      name: 'sample-video.mp4',
      path: realVideoPath,
      type: 'video',
      size: 4000000,
      duration: 8.0,
      createdAt: Date.now(),
    },
    {
      id: 'm_online_audio',
      name: 'dialogue_sample.wav',
      path: realAudioPath,
      type: 'audio',
      size: 480000,
      duration: 5.0,
      createdAt: Date.now(),
    },
    {
      id: 'm_missing_file',
      name: 'missing_clip.mp4',
      path: 'C:/Invalid/definitely_missing.mp4',
      type: 'video',
      size: 1000000,
      duration: 10.0,
      createdAt: Date.now(),
    },
    {
      id: 'm_blob_url',
      name: 'web_import.mp4',
      path: 'blob:http://localhost:5173/test-blob-uuid',
      type: 'video',
      size: 500000,
      duration: 2.0,
      createdAt: Date.now(),
    },
  ];

  const verifiedProject = await ProjectService.verifyMediaAvailability(testProject);
  assert(verifiedProject.media.length === 4, `All 4 media items preserved in project (got: ${verifiedProject.media.length})`);

  const onlineVideo = verifiedProject.media.find(m => m.id === 'm_online_video');
  assert(onlineVideo?.isMissing === false, 'Existing video verified with isMissing: false');

  const onlineAudio = verifiedProject.media.find(m => m.id === 'm_online_audio');
  assert(onlineAudio?.isMissing === false, 'Existing audio verified with isMissing: false');

  const missingMedia = verifiedProject.media.find(m => m.id === 'm_missing_file');
  assert(missingMedia?.isMissing === true, 'Missing media verified with isMissing: true');

  const blobMedia = verifiedProject.media.find(m => m.id === 'm_blob_url');
  assert(blobMedia?.isMissing === false || blobMedia?.isMissing === undefined, 'In-memory blob URL safely preserved without missing flag');

  // --- SECTION 3: TEMPORARY CACHE CLEANUP UTILITY ---
  console.log('\n[SECTION 3] Temporary Cache Cleanup Utility (temp-thumbs & Scratch)');

  const testCacheDir = path.resolve('temp-thumbs/test_sandbox_cache');
  if (!fs.existsSync(testCacheDir)) {
    fs.mkdirSync(testCacheDir, { recursive: true });
  }

  // Create mock files:
  // 1. Stale thumbnail (modified 2 days ago)
  const staleThumb = path.join(testCacheDir, 'thumb_stale_1.jpg');
  fs.writeFileSync(staleThumb, 'mock_stale_thumbnail_data');
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  fs.utimesSync(staleThumb, twoDaysAgo, twoDaysAgo);

  // 2. Active thumbnail (modified 2 minutes ago)
  const activeThumb = path.join(testCacheDir, 'thumb_active_2.jpg');
  fs.writeFileSync(activeThumb, 'mock_active_thumbnail_data');

  // 3. User project file or non-cache artifact (should NEVER be deleted)
  const protectedFile = path.join(testCacheDir, 'project_backup.freecut');
  fs.writeFileSync(protectedFile, '{"version":"0.1","project":{"name":"Protected"}}');
  fs.utimesSync(protectedFile, twoDaysAgo, twoDaysAgo);

  // Test stale cache removal with 24-hour threshold
  const cleanupResult = await CacheService.cleanTempCache({
    maxAgeMs: 24 * 60 * 60 * 1000,
    targetDir: 'temp-thumbs/test_sandbox_cache',
  });

  assert(cleanupResult.deletedCount >= 1, `Cleaned at least 1 stale thumbnail (deleted: ${cleanupResult.deletedCount})`);
  assert(cleanupResult.freedBytes > 0, `Freed bytes reported: ${cleanupResult.freedBytes} bytes`);
  assert(!fs.existsSync(staleThumb), 'Stale thumbnail older than 24h was safely removed');
  assert(fs.existsSync(activeThumb), 'Active recent thumbnail was safely preserved');
  assert(fs.existsSync(protectedFile), 'Non-cache file (.freecut) was strictly protected from deletion');

  // --- SECTION 4: CACHE SAFETY SAFEGUARDS ---
  console.log('\n[SECTION 4] Cache Safety Safeguards (Out-of-Scope Protection)');

  // 1. Rejection of directory outside cache scope
  const outOfScopeResult = await CacheService.cleanTempCache({
    targetDir: 'test-media',
  });
  assert(outOfScopeResult.deletedCount === 0, 'Attempt to clean out-of-scope "test-media" deleted 0 files');
  assert(outOfScopeResult.errors.length > 0, 'Safety guard emitted out-of-scope error');
  assert(outOfScopeResult.errors[0].includes('outside authorized cache scope'), `Guard diagnostic: "${outOfScopeResult.errors[0]}"`);

  // Verify real media assets in test-media remain completely untouched
  assert(fs.existsSync(realVideoPath), 'Real source video file in test-media untouched');
  assert(fs.existsSync(realAudioPath), 'Real source audio file in test-media untouched');

  // 2. Handling missing cache directory gracefully
  const missingDirResult = await CacheService.cleanTempCache({
    targetDir: 'temp-thumbs/definitely_missing_dir_404',
  });
  assert(missingDirResult.deletedCount === 0, 'Missing cache dir returns clean 0 deleted count');
  assert(missingDirResult.errors.length === 0, 'Missing cache dir produces 0 errors');

  // Clean up sandbox cache files
  if (fs.existsSync(activeThumb)) fs.unlinkSync(activeThumb);
  if (fs.existsSync(protectedFile)) fs.unlinkSync(protectedFile);
  if (fs.existsSync(testCacheDir)) fs.rmdirSync(testCacheDir);

  // --- SECTION 5: DESKTOPBRIDGE CLEAN-MACHINE INTEGRATION ---
  console.log('\n[SECTION 5] DesktopBridge Integration Verification');
  const bridgeClean = await DesktopBridge.cleanTempCache({ maxAgeMs: 7 * 24 * 60 * 60 * 1000 });
  assert(typeof bridgeClean.deletedCount === 'number', `DesktopBridge.cleanTempCache returned valid result (deleted: ${bridgeClean.deletedCount})`);
  assert(Array.isArray(bridgeClean.errors), 'DesktopBridge.cleanTempCache returned errors array');

  console.log('\n===============================================================');
  console.log(`   STEP 4.2 TEST RESULT: ${passed} PASS, ${failed} FAIL       `);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep42Tests().catch((err) => {
  console.error('Fatal error in Step 4.2 test suite:', err);
  process.exit(1);
});
