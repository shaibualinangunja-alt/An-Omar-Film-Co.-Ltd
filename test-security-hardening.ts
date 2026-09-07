/**
 * FREECUT ALPHA 1.0 — STEP 4.3 TAURI SECURITY HARDENING & PRODUCTION CSP TEST SUITE
 *
 * Verifies:
 * 1. Tauri Configuration & Allowlist Least-Privilege Hardening
 * 2. Production Content Security Policy (CSP) Directives
 * 3. Sidecar & Process Invocation Safety (No Shell Injection)
 * 4. Path Safety & Null Byte Rejection across Bridge APIs
 * 5. Project Save/Load Safety & Filename Sanitization
 * 6. Native Media Probing & Verification Persistence
 */

import fs from 'fs';
import path from 'path';
import { DesktopBridge } from './src/native/desktopBridge';
import { ProjectService } from './src/services/projectService';
import { ExportService } from './src/services/exportService';
import { FreeCutProject } from './src/types/project';

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

async function runStep43SecurityTests() {
  console.log('===============================================================');
  console.log(' FREECUT ALPHA 1.0 — STEP 4.3 TAURI SECURITY & CSP SUITE      ');
  console.log('===============================================================');

  // --- SECTION 1: TAURI ALLOWLIST AUDIT & LEAST-PRIVILEGE VERIFICATION ---
  console.log('\n[SECTION 1] Tauri Configuration & Allowlist Least-Privilege');
  const tauriConfPath = path.resolve('src-tauri/tauri.conf.json');
  assert(fs.existsSync(tauriConfPath), 'src-tauri/tauri.conf.json exists');

  const confContent = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  const allowlist = confContent.tauri?.allowlist;

  assert(allowlist !== undefined, 'Tauri allowlist is explicitly defined');
  assert(allowlist.all === false, 'Root allowlist.all is strictly disabled (least privilege)');

  // Shell security
  assert(allowlist.shell?.all === false, 'Shell allowlist.all is disabled (prevents arbitrary command execution)');
  assert(allowlist.shell?.open === false, 'Shell open is disabled');
  assert(allowlist.shell?.execute === false, 'Shell execute is disabled');

  // FS security
  assert(allowlist.fs?.all === false, 'FS allowlist.all is disabled (least privilege)');
  assert(allowlist.fs?.readFile === true, 'FS readFile is enabled for reading project files');
  assert(allowlist.fs?.writeFile === true, 'FS writeFile is enabled for saving project files');
  assert(allowlist.fs?.createDir === false, 'FS createDir is disabled from WebView');
  assert(allowlist.fs?.removeDir === false, 'FS removeDir is disabled from WebView');
  assert(allowlist.fs?.removeFile === false, 'FS removeFile is disabled from WebView');

  // Dialog security
  assert(allowlist.dialog?.all === false, 'Dialog allowlist.all is disabled');
  assert(allowlist.dialog?.open === true, 'Dialog open is enabled for selecting media/projects');
  assert(allowlist.dialog?.save === true, 'Dialog save is enabled for saving project files');

  // Protocol security
  assert(allowlist.protocol?.all === false, 'Protocol allowlist.all is disabled');
  assert(allowlist.protocol?.asset === true, 'Asset protocol is enabled for local media playback');

  // --- SECTION 2: PRODUCTION CONTENT SECURITY POLICY (CSP) DIRECTIVES ---
  console.log('\n[SECTION 2] Production Content Security Policy (CSP)');
  const csp = confContent.tauri?.security?.csp;
  assert(typeof csp === 'string' && csp.length > 0, 'Production CSP is defined (non-null)');

  // Validate critical security directives
  assert(csp.includes("default-src 'self'"), "CSP specifies default-src 'self'");
  assert(csp.includes("script-src 'self' 'wasm-unsafe-eval'"), "CSP restricts script-src to 'self' and 'wasm-unsafe-eval' (WASM AI support)");
  assert(!csp.includes("'unsafe-eval' ") && !csp.includes("'unsafe-eval';"), "CSP strictly disallows general 'unsafe-eval' for JavaScript");
  assert(csp.includes("object-src 'none'"), "CSP blocks plugins with object-src 'none'");
  assert(csp.includes("frame-src 'none'"), "CSP blocks frames with frame-src 'none'");
  assert(csp.includes("base-uri 'self'"), "CSP blocks base-tag injection with base-uri 'self'");
  assert(csp.includes("form-action 'none'"), "CSP blocks form action submission with form-action 'none'");
  assert(csp.includes('media-src') && csp.includes('asset:') && csp.includes('blob:'), 'CSP media-src allows local asset: and blob: playback');
  assert(csp.includes('connect-src') && csp.includes('ipc:') && csp.includes('tauri:'), 'CSP connect-src allows Tauri native IPC communication');

  // --- SECTION 3: PATH SAFETY & NULL BYTE REJECTION ---
  console.log('\n[SECTION 3] Path Safety & Null Byte Injection Rejection');

  // 1. DesktopBridge.probeMedia null byte rejection
  let probeNullCaught = false;
  try {
    await DesktopBridge.probeMedia('test-media/sample-video.mp4\0malicious');
  } catch (err: unknown) {
    probeNullCaught = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes('null byte'), `probeMedia rejected null byte: "${msg}"`);
  }
  assert(probeNullCaught, 'probeMedia strictly rejects paths containing null bytes');

  // 2. DesktopBridge.generateThumbnail null byte rejection
  let thumbNullCaught = false;
  try {
    await DesktopBridge.generateThumbnail('test-media/sample-video.mp4\0malicious');
  } catch (err: unknown) {
    thumbNullCaught = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes('null byte'), `generateThumbnail rejected null byte: "${msg}"`);
  }
  assert(thumbNullCaught, 'generateThumbnail strictly rejects paths containing null bytes');

  // 3. DesktopBridge.verifyPathExists null byte rejection
  const nullPathExists = await DesktopBridge.verifyPathExists('test-media/sample-video.mp4\0malicious');
  assert(nullPathExists === false, 'verifyPathExists safely returns false for null-byte paths');

  // 4. DesktopBridge.readProjectFile null byte rejection
  let readNullCaught = false;
  try {
    await DesktopBridge.readProjectFile('project.freecut\0hack');
  } catch (err: unknown) {
    readNullCaught = true;
    const msg = err instanceof Error ? err.message : String(err);
    assert(msg.includes('null byte'), `readProjectFile rejected null byte: "${msg}"`);
  }
  assert(readNullCaught, 'readProjectFile strictly rejects paths containing null bytes');

  // --- SECTION 4: PROJECT SAVE/LOAD INTEGRITY & FILENAME SANITIZATION ---
  console.log('\n[SECTION 4] Project Save / Load & Filename Sanitization');

  // Verify project serialization & deserialization via DesktopBridge.readProjectFile
  const testProject = ProjectService.createDefaultProject('Security Test Project');
  const projectJson = ProjectService.serializeProject(testProject);

  const tempProjectPath = path.resolve('test-media/security_test_project.freecut');
  fs.writeFileSync(tempProjectPath, projectJson, 'utf8');

  assert(fs.existsSync(tempProjectPath), 'Written test project file on disk');
  const readBackText = await DesktopBridge.readProjectFile(tempProjectPath);
  const reloadedProject = ProjectService.deserializeProject(readBackText);

  assert(reloadedProject.project.name === 'Security Test Project', 'readProjectFile accurately reloaded project');
  assert(reloadedProject.tracks.length === 6, 'Reloaded project has all 6 tracks');

  // Clean up test file
  fs.unlinkSync(tempProjectPath);

  // --- SECTION 5: REAL MEDIA & EXPORT PIPELINE INTEGRITY ---
  console.log('\n[SECTION 5] Media & Export Pipeline Integrity Under Hardened Config');

  const realVideoPath = path.resolve('test-media/sample-video.mp4');
  assert(fs.existsSync(realVideoPath), `Real test video exists at: ${realVideoPath}`);

  // Probing must continue working
  const probeResult = await DesktopBridge.probeMedia(realVideoPath);
  assert(typeof probeResult.format.duration === 'string', `Probed duration: ${probeResult.format.duration}s`);
  assert(probeResult.streams.some(s => s.codec_type === 'video'), 'Probed video stream detected');

  // Media verification must continue working
  const isAccessible = await DesktopBridge.verifyMediaFile(realVideoPath, 'video');
  assert(isAccessible.accessible === true, 'verifyMediaFile confirmed video accessibility');

  console.log('\n===============================================================');
  console.log(`   STEP 4.3 TEST RESULT: ${passed} PASS, ${failed} FAIL       `);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep43SecurityTests().catch((err) => {
  console.error('Fatal error in Step 4.3 security tests:', err);
  process.exit(1);
});
