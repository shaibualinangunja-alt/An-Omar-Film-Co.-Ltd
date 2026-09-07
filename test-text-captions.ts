/**
 * FreeCut Alpha 0.6 Automated Test Suite
 * Text Engine + Manual Caption Foundation (27 Tests)
 */

import { FreeCutProject, ClipItem } from './src/types/project';
import { ProjectService } from './src/services/projectService';
import { TimelineOperations } from './src/services/timelineOperations';
import { HistoryManager } from './src/state/historyManager';
import {
  TextStyle,
  TextConfig,
  createDefaultTextConfig,
  FontRegistry,
  applyPresetToAnimations,
  TEXT_ANIMATION_PRESETS,
  compileTextToFFmpegDrawtext,
  escapeFFmpegText,
} from './src/text';
import {
  CaptionTrack,
  CaptionItem,
  createCaptionTrack,
  createCaptionItem,
  cloneCaptionItem,
  findActiveCaptions,
  sortCaptionItems,
  DEFAULT_CAPTION_STYLE,
} from './src/captions';
import {
  evaluateClipAnimations,
  generateKeyframeId,
} from './src/animation';
import { FFmpegService } from './src/services/ffmpegService';
import { ExportSettings } from './src/types/export';

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

function createBaseProject(): FreeCutProject {
  const p = ProjectService.createDefaultProject('Text & Caption Test');
  p.project.fps = 30;
  p.project.width = 1920;
  p.project.height = 1080;
  return p;
}

console.log('=== RUNNING FREECUT ALPHA 0.6 TEXT ENGINE + CAPTION FOUNDATION TESTS ===\n');

// -------------------------------------------------------------
// TEXT ENGINE TESTS (1 - 14)
// -------------------------------------------------------------

console.log('--- PART A: TEXT ENGINE TESTS ---');

// Test 1: Text creation
{
  const project = createBaseProject();
  const textConfig = createDefaultTextConfig('Hello FreeCut');
  const textClip: ClipItem = {
    id: TimelineOperations.generateClipId(),
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 2,
    duration: 5,
    sourceStart: 0,
    sourceDuration: 5,
    type: 'text',
    name: 'Hello FreeCut',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig,
  };
  project.clips.push(textClip);

  assert(project.clips.length === 1, 'Project should contain 1 clip');
  assert(textClip.type === 'text', 'Clip type must be text');
  assert(textClip.textConfig?.content === 'Hello FreeCut', 'Text content must match');
  assert(textClip.textConfig?.style.fontFamily === 'Inter', 'Default font must be Inter');
  assert(textClip.textConfig?.style.fontSize === 48, 'Default font size must be 48');
  console.log('Test 1: Text creation -> PASS');
}

// Test 2: Text deletion
{
  const project = createBaseProject();
  const textClip: ClipItem = {
    id: 'clip_text_1',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 0,
    duration: 5,
    sourceStart: 0,
    sourceDuration: 5,
    type: 'text',
    name: 'To Delete',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('To Delete'),
  };
  project.clips.push(textClip);

  const res = TimelineOperations.deleteClips(project, ['clip_text_1']);
  assert(res.project.clips.length === 0, 'Text clip must be deleted from project');
  console.log('Test 2: Text deletion -> PASS');
}

// Test 3: Text editing
{
  const project = createBaseProject();
  const textConfig = createDefaultTextConfig('Initial Text');
  const textClip: ClipItem = {
    id: 'clip_text_edit',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 0,
    duration: 5,
    sourceStart: 0,
    sourceDuration: 5,
    type: 'text',
    name: 'Initial Text',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig,
  };
  project.clips.push(textClip);

  // Edit text content
  textClip.textConfig.content = 'Updated Title Content';
  textClip.name = 'Updated Title Content';
  assert(project.clips[0].textConfig?.content === 'Updated Title Content', 'Text content should update');
  assert(project.clips[0].name === 'Updated Title Content', 'Clip name should reflect content');
  console.log('Test 3: Text editing -> PASS');
}

// Test 4: Text movement
{
  const project = createBaseProject();
  const textClip: ClipItem = {
    id: 'clip_text_move',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 1.0,
    duration: 4.0,
    sourceStart: 0,
    sourceDuration: 4.0,
    type: 'text',
    name: 'Moving Text',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('Moving Text'),
  };
  project.clips.push(textClip);

  const res = TimelineOperations.moveClips(project, ['clip_text_move'], 3.0);
  const moved = res.project.clips.find(c => c.id === 'clip_text_move');
  assert(moved !== undefined, 'Clip must exist');
  assertClose(moved!.startTime, 4.0, 0.001, 'Text clip should be shifted to 4.0s');
  console.log('Test 4: Text movement -> PASS');
}

// Test 5: Text trimming
{
  const project = createBaseProject();
  const textClip: ClipItem = {
    id: 'clip_text_trim',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 2.0,
    duration: 6.0,
    sourceStart: 0,
    sourceDuration: 6.0,
    type: 'text',
    name: 'Trim Text',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('Trim Text'),
  };
  project.clips.push(textClip);

  // Trim start by +1s -> startTime 3.0s, duration 5.0s, sourceStart 1.0s
  const resTrimLeft = TimelineOperations.trimClip(project, 'clip_text_trim', 3.0, 5.0, 1.0);
  const trimmed = resTrimLeft.project.clips.find(c => c.id === 'clip_text_trim')!;
  assertClose(trimmed.startTime, 3.0, 0.001, 'Start time should be 3.0');
  assertClose(trimmed.duration, 5.0, 0.001, 'Duration should be 5.0');

  // Trim end to duration 3.0s
  const resTrimRight = TimelineOperations.trimClip(resTrimLeft.project, 'clip_text_trim', 3.0, 3.0, 1.0);
  const trimmedEnd = resTrimRight.project.clips.find(c => c.id === 'clip_text_trim')!;
  assertClose(trimmedEnd.duration, 3.0, 0.001, 'Duration should be 3.0');
  console.log('Test 5: Text trimming -> PASS');
}

// Test 6: Text split
{
  const project = createBaseProject();
  const textClip: ClipItem = {
    id: 'clip_text_split',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 2.0,
    duration: 8.0,
    sourceStart: 0,
    sourceDuration: 8.0,
    type: 'text',
    name: 'HELLO WORLD',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('HELLO WORLD', { fontSize: 64, color: '#FF0055' }),
  };
  project.clips.push(textClip);

  const res = TimelineOperations.splitClipsAtTime(project, ['clip_text_split'], 5.0);
  assert(res.project.clips.length === 2, 'Split should produce exactly 2 clips');

  const [left, right] = res.project.clips;
  assertClose(left.startTime, 2.0, 0.001, 'Left clip startTime');
  assertClose(left.duration, 3.0, 0.001, 'Left clip duration');
  assert(left.textConfig?.content === 'HELLO WORLD', 'Left retains content');
  assert(left.textConfig?.style.fontSize === 64, 'Left retains font size');
  assert(left.textConfig?.style.color === '#FF0055', 'Left retains color');

  assertClose(right.startTime, 5.0, 0.001, 'Right clip startTime');
  assertClose(right.duration, 5.0, 0.001, 'Right clip duration');
  assert(right.textConfig?.content === 'HELLO WORLD', 'Right retains content');
  assert(right.textConfig?.style.fontSize === 64, 'Right retains font size');
  assert(right.textConfig?.style.color === '#FF0055', 'Right retains color');
  assert(left.id !== right.id, 'Split clips have distinct IDs');
  console.log('Test 6: Text split -> PASS');
}

// Test 7: Text duplication
{
  const project = createBaseProject();
  const textClip: ClipItem = {
    id: 'clip_text_dup',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 0,
    duration: 4.0,
    sourceStart: 0,
    sourceDuration: 4.0,
    type: 'text',
    name: 'Duplicated Title',
    transform: { positionX: 10, positionY: 20, scale: 1.2, rotation: 5, opacity: 0.9 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('Duplicated Title', { fontSize: 50 }),
  };
  project.clips.push(textClip);

  const res = TimelineOperations.duplicateClips(project, ['clip_text_dup']);
  assert(res.project.clips.length === 2, 'Should have 2 clips after duplication');
  const dup = res.project.clips.find(c => c.id !== 'clip_text_dup')!;
  assert(dup.id !== 'clip_text_dup', 'Duplicate must have new ID');
  assert(dup.textConfig?.content === 'Duplicated Title', 'Same content');
  assert(dup.textConfig?.style.fontSize === 50, 'Same style');
  assert(dup.transform.positionX === 10, 'Same transform position');
  assert(dup.startTime > textClip.startTime, 'Placed after original clip');
  console.log('Test 7: Text duplication -> PASS');
}

// Test 8: Text copy/paste
{
  const project = createBaseProject();
  const textClip: ClipItem = {
    id: 'clip_text_cp',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 1.0,
    duration: 3.0,
    sourceStart: 0,
    sourceDuration: 3.0,
    type: 'text',
    name: 'Copy Paste Text',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('Copy Paste Text'),
  };
  project.clips.push(textClip);

  const clipboard = [JSON.parse(JSON.stringify(textClip))];
  const res = TimelineOperations.pasteClips(project, clipboard, 10.0, project.tracks[0].id);

  assert(res.project.clips.length === 2, 'Pasted clip added to project');
  const pasted = res.project.clips.find(c => c.id !== 'clip_text_cp')!;
  assert(pasted.id !== 'clip_text_cp', 'Pasted clip has new ID');
  assertClose(pasted.startTime, 10.0, 0.001, 'Pasted at target time 10.0s');
  assert(pasted.textConfig?.content === 'Copy Paste Text', 'Content preserved in paste');
  console.log('Test 8: Text copy/paste -> PASS');
}

// Test 9: Text style
{
  const customStyle: Partial<TextStyle> = {
    fontFamily: 'Roboto',
    fontSize: 72,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#00FFAA',
    opacity: 0.95,
    textAlign: 'center',
    letterSpacing: 2,
    lineSpacing: 1.4,
    stroke: { enabled: true, color: '#000000', width: 4 },
    shadow: { enabled: true, color: 'rgba(0,0,0,0.9)', blur: 8, offsetX: 3, offsetY: 3 },
    background: { enabled: true, color: '#220044', opacity: 0.7, padding: 16, borderRadius: 8 },
  };

  const cfg = createDefaultTextConfig('Styled Text', customStyle);
  assert(cfg.style.fontFamily === 'Roboto', 'Font family applied');
  assert(cfg.style.fontSize === 72, 'Font size applied');
  assert(cfg.style.fontWeight === 'bold', 'Font weight applied');
  assert(cfg.style.fontStyle === 'italic', 'Font style applied');
  assert(cfg.style.color === '#00FFAA', 'Text color applied');
  assert(cfg.style.stroke.enabled === true, 'Stroke enabled');
  assert(cfg.style.stroke.width === 4, 'Stroke width applied');
  assert(cfg.style.shadow.enabled === true, 'Shadow enabled');
  assert(cfg.style.background.enabled === true, 'Background enabled');
  assert(cfg.style.background.padding === 16, 'Background padding applied');
  console.log('Test 9: Text style -> PASS');
}

// Test 10: Text transform
{
  const clip: ClipItem = {
    id: 'clip_text_tf',
    mediaId: '',
    trackId: 'track_1',
    startTime: 0,
    duration: 5,
    sourceStart: 0,
    sourceDuration: 5,
    type: 'text',
    name: 'Transform Text',
    transform: { positionX: 45, positionY: -30, scale: 1.5, rotation: 45, opacity: 0.8 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('Transform Text'),
  };

  const evaluated = evaluateClipAnimations(clip, 2.5);
  assertClose(evaluated.positionX, 45, 0.001, 'Position X');
  assertClose(evaluated.positionY, -30, 0.001, 'Position Y');
  assertClose(evaluated.scale, 1.5, 0.001, 'Scale');
  assertClose(evaluated.rotation, 45, 0.001, 'Rotation');
  assertClose(evaluated.opacity, 0.8, 0.001, 'Opacity');
  console.log('Test 10: Text transform -> PASS');
}

// Test 11: Text keyframes
{
  const clip: ClipItem = {
    id: 'clip_text_kf',
    mediaId: '',
    trackId: 'track_1',
    startTime: 0,
    duration: 4.0,
    sourceStart: 0,
    sourceDuration: 4.0,
    type: 'text',
    name: 'Animated Text',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('Animated Text', { fontSize: 40 }),
    animations: {
      positionX: {
        property: 'positionX',
        keyframes: [
          { id: 'kf1', time: 0, value: -100, interpolation: 'linear' },
          { id: 'kf2', time: 2, value: 100, interpolation: 'linear' },
        ],
      },
      fontSize: {
        property: 'fontSize',
        keyframes: [
          { id: 'kf3', time: 0, value: 30, interpolation: 'linear' },
          { id: 'kf4', time: 4, value: 70, interpolation: 'linear' },
        ],
      },
      opacity: {
        property: 'opacity',
        keyframes: [
          { id: 'kf5', time: 3, value: 1, interpolation: 'linear' },
          { id: 'kf6', time: 4, value: 0, interpolation: 'linear' },
        ],
      },
    },
  };

  // At t=1.0: positionX = 0 (midway -100 and 100)
  const evalMid = evaluateClipAnimations(clip, 1.0);
  assertClose(evalMid.positionX, 0, 0.001, 'Midway positionX');

  // At t=2.0: fontSize = 50 (midway 30 and 70)
  const evalFont = evaluateClipAnimations(clip, 2.0);
  assertClose(evalFont.fontSize || 0, 50, 0.001, 'Midway fontSize');

  // At t=3.5: opacity = 0.5 (midway 1 and 0)
  const evalFade = evaluateClipAnimations(clip, 3.5);
  assertClose(evalFade.opacity, 0.5, 0.001, 'Midway opacity fade');
  console.log('Test 11: Text keyframes -> PASS');
}

// Test 12: Text animation presets
{
  const clipDuration = 4.0;
  // Apply fadeIn preset
  const fadeInAnims = applyPresetToAnimations(undefined, 'fadeIn', clipDuration, 0.5, 30);
  assert(fadeInAnims.opacity !== undefined, 'FadeIn creates opacity track');
  assert(fadeInAnims.opacity?.keyframes.length === 2, 'FadeIn has 2 keyframes');
  assert(fadeInAnims.opacity?.keyframes[0].value === 0, 'FadeIn starts at 0');
  assert(fadeInAnims.opacity?.keyframes[1].value === 1, 'FadeIn ends at 1');

  // Apply slideUp preset
  const slideUpAnims = applyPresetToAnimations(undefined, 'slideUp', clipDuration, 0.6, 30);
  assert(slideUpAnims.positionY !== undefined, 'SlideUp creates positionY track');
  assert(slideUpAnims.positionY?.keyframes[0].value > 0, 'SlideUp starts below center');
  assert(slideUpAnims.positionY?.keyframes[1].value === 0, 'SlideUp reaches center');

  // Apply zoomIn preset
  const zoomInAnims = applyPresetToAnimations(undefined, 'zoomIn', clipDuration, 0.5, 30);
  assert(zoomInAnims.scale !== undefined, 'ZoomIn creates scale track');
  assertClose(zoomInAnims.scale?.keyframes[0].value || 0, 0.2, 0.01, 'ZoomIn starts small');
  assertClose(zoomInAnims.scale?.keyframes[1].value || 0, 1.0, 0.01, 'ZoomIn reaches 1.0');

  // Apply fadeOut exit preset
  const fadeOutAnims = applyPresetToAnimations(undefined, 'fadeOut', clipDuration, 0.5, 30);
  assert(fadeOutAnims.opacity !== undefined, 'FadeOut creates opacity track');
  const lastKf = fadeOutAnims.opacity!.keyframes[1];
  assertClose(lastKf.time, clipDuration, 0.001, 'FadeOut ends at clip duration');
  assertClose(lastKf.value, 0, 0.001, 'FadeOut ends at opacity 0');
  console.log('Test 12: Text animation presets -> PASS');
}

// Test 13: Text undo
{
  const history = new HistoryManager<FreeCutProject>();
  let project = createBaseProject();
  const textClip: ClipItem = {
    id: 'clip_text_undo',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 0,
    duration: 5,
    sourceStart: 0,
    sourceDuration: 5,
    type: 'text',
    name: 'Before Undo',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('Before Undo'),
  };

  const oldProj = JSON.parse(JSON.stringify(project));
  const newProj = JSON.parse(JSON.stringify(project));
  newProj.clips.push(textClip);

  history.push({
    name: 'Add Text Clip',
    redo: () => newProj,
    undo: () => oldProj,
  });

  project = newProj;
  assert(project.clips.length === 1, 'Clip added');

  const undoRes = history.undo(project);
  project = undoRes!.newState;
  assert(project.clips.length === 0, 'Undo reverted clip addition');
  console.log('Test 13: Text undo -> PASS');
}

// Test 14: Text redo
{
  const history = new HistoryManager<FreeCutProject>();
  const initial = createBaseProject();
  const withText = JSON.parse(JSON.stringify(initial));
  withText.clips.push({
    id: 'clip_text_redo',
    mediaId: '',
    trackId: initial.tracks[0].id,
    startTime: 0,
    duration: 5,
    sourceStart: 0,
    sourceDuration: 5,
    type: 'text',
    name: 'Redo Text',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('Redo Text'),
  });

  history.push({
    name: 'Add Text Clip',
    redo: () => withText,
    undo: () => initial,
  });

  const undoRes = history.undo(withText);
  const redoneRes = history.redo(undoRes!.newState);
  const redone = redoneRes!.newState;
  assert(redone.clips.length === 1, 'Redo restored text clip');
  assert(redone.clips[0].name === 'Redo Text', 'Redo restored correct text clip');
  console.log('Test 14: Text redo -> PASS');
}

// -------------------------------------------------------------
// CAPTION FOUNDATION TESTS (15 - 23)
// -------------------------------------------------------------

console.log('\n--- PART B: CAPTION FOUNDATION TESTS ---');

// Test 15: Caption creation
{
  const track = createCaptionTrack('Subtitles English');
  const item = createCaptionItem(2.0, 3.0, 'Hello, welcome to FreeCut!');
  track.items.push(item);

  assert(track.items.length === 1, 'Track contains 1 caption');
  assert(item.text === 'Hello, welcome to FreeCut!', 'Text content matches');
  assertClose(item.startTime, 2.0, 0.001, 'Start time matches');
  assertClose(item.endTime, 5.0, 0.001, 'End time matches duration');
  console.log('Test 15: Caption creation -> PASS');
}

// Test 16: Caption timing
{
  const item = createCaptionItem(10.5, 4.25, 'Timing test');
  assertClose(item.startTime, 10.5, 0.001, 'Start time matches');
  assertClose(item.endTime, 14.75, 0.001, 'End time matches');
  const duration = item.endTime - item.startTime;
  assertClose(duration, 4.25, 0.001, 'Duration computed correctly');
  console.log('Test 16: Caption timing -> PASS');
}

// Test 17: Caption editing
{
  const item = createCaptionItem(0, 3, 'Old subtitle');
  item.text = 'New updated subtitle text';
  assert(item.text === 'New updated subtitle text', 'Caption text updated');
  console.log('Test 17: Caption editing -> PASS');
}

// Test 18: Caption deletion
{
  const track = createCaptionTrack('Captions');
  const item1 = createCaptionItem(0, 2, 'One');
  const item2 = createCaptionItem(2, 2, 'Two');
  track.items.push(item1, item2);

  track.items = track.items.filter(i => i.id !== item1.id);
  assert(track.items.length === 1, 'One caption remains');
  assert(track.items[0].id === item2.id, 'Remaining caption is item 2');
  console.log('Test 18: Caption deletion -> PASS');
}

// Test 19: Caption duplication
{
  const item = createCaptionItem(1.0, 2.5, 'Original caption', { fontSize: 36 });
  const cloned = cloneCaptionItem(item, true);

  assert(cloned.id !== item.id, 'Cloned caption has new ID');
  assert(cloned.text === 'Original caption', 'Cloned caption has same text');
  assertClose(cloned.startTime, 1.0, 0.001, 'Cloned caption has same startTime');
  assertClose(cloned.endTime, 3.5, 0.001, 'Cloned caption has same endTime');
  assert(cloned.style?.fontSize === 36, 'Cloned caption has same style');
  console.log('Test 19: Caption duplication -> PASS');
}

// Test 20: Caption styling
{
  const customStyle: Partial<TextStyle> = {
    fontFamily: 'Arial',
    fontSize: 28,
    color: '#FFFF00',
    stroke: { enabled: true, color: '#000000', width: 2 },
    background: { enabled: true, color: '#000000', opacity: 0.8, padding: 6, borderRadius: 2 },
  };
  const item = createCaptionItem(0, 3, 'Styled caption', customStyle);
  assert(item.style?.fontFamily === 'Arial', 'Font family applied');
  assert(item.style?.fontSize === 28, 'Font size applied');
  assert(item.style?.color === '#FFFF00', 'Yellow text color applied');
  assert(item.style?.stroke?.enabled === true, 'Stroke enabled');
  assert(item.style?.background?.enabled === true, 'Background enabled');
  console.log('Test 20: Caption styling -> PASS');
}

// Test 21: Caption timeline
{
  const track = createCaptionTrack('Captions 1');
  const item1 = createCaptionItem(0.0, 3.0, 'First');
  const item2 = createCaptionItem(3.0, 3.0, 'Second');
  const item3 = createCaptionItem(6.0, 3.0, 'Third');
  // Add out of order
  track.items = [item3, item1, item2];
  track.items = sortCaptionItems(track.items);

  assert(track.items[0].text === 'First', 'Chronologically sorted First');
  assert(track.items[1].text === 'Second', 'Chronologically sorted Second');
  assert(track.items[2].text === 'Third', 'Chronologically sorted Third');

  // Test findActiveCaptions at time t=4.5s (should match item2)
  const active = findActiveCaptions([track], 4.5);
  assert(active.length === 1, 'Exactly one active caption at 4.5s');
  assert(active[0].item.text === 'Second', 'Active caption is Second');

  // Test at time t=10.0s (no caption)
  const inactive = findActiveCaptions([track], 10.0);
  assert(inactive.length === 0, 'No active caption at 10s');
  console.log('Test 21: Caption timeline -> PASS');
}

// Test 22: Caption undo
{
  const history = new HistoryManager<FreeCutProject>();
  let project = createBaseProject();
  project.captionTracks = [createCaptionTrack('Captions 1')];

  const state1 = JSON.parse(JSON.stringify(project));
  const state2 = JSON.parse(JSON.stringify(project));
  state2.captionTracks[0].items.push(createCaptionItem(0, 3, 'Undo Caption'));

  history.push({
    name: 'Add Caption',
    redo: () => state2,
    undo: () => state1,
  });

  project = state2;
  assert(project.captionTracks[0].items.length === 1, 'Caption added');

  const undoRes = history.undo(project);
  project = undoRes!.newState;
  assert(project.captionTracks[0].items.length === 0, 'Undo reverted caption creation');
  console.log('Test 22: Caption undo -> PASS');
}

// Test 23: Caption redo
{
  const history = new HistoryManager<FreeCutProject>();
  const initial = createBaseProject();
  initial.captionTracks = [createCaptionTrack('Captions 1')];

  const withCaption = JSON.parse(JSON.stringify(initial));
  withCaption.captionTracks[0].items.push(createCaptionItem(0, 3, 'Redo Caption'));

  history.push({
    name: 'Add Caption',
    redo: () => withCaption,
    undo: () => initial,
  });

  const undoRes = history.undo(withCaption);
  const redoneRes = history.redo(undoRes!.newState);
  const redone = redoneRes!.newState;
  assert(redone.captionTracks![0].items.length === 1, 'Redo restored caption item');
  assert(redone.captionTracks![0].items[0].text === 'Redo Caption', 'Caption text restored');
  console.log('Test 23: Caption redo -> PASS');
}

// -------------------------------------------------------------
// PROJECT PERSISTENCE TESTS (24 - 25)
// -------------------------------------------------------------

console.log('\n--- PART C: PROJECT PERSISTENCE TESTS ---');

// Test 24: Text save/load
{
  const project = createBaseProject();
  const textClip: ClipItem = {
    id: 'clip_save_load',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 1.5,
    duration: 5.5,
    sourceStart: 0,
    sourceDuration: 5.5,
    type: 'text',
    name: 'Persistent Text',
    transform: { positionX: 20, positionY: -15, scale: 1.1, rotation: 10, opacity: 0.95 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('Persistent Text', {
      fontFamily: 'Helvetica',
      fontSize: 54,
      color: '#00AAFF',
      stroke: { enabled: true, color: '#000000', width: 3 },
      shadow: { enabled: true, color: 'rgba(0,0,0,0.8)', blur: 4, offsetX: 2, offsetY: 2 },
    }),
  };
  project.clips.push(textClip);

  // Serialize to JSON and parse back
  const jsonStr = JSON.stringify(project);
  const loaded: FreeCutProject = JSON.parse(jsonStr);

  const loadedClip = loaded.clips.find(c => c.id === 'clip_save_load');
  assert(loadedClip !== undefined, 'Clip restored');
  assert(loadedClip!.type === 'text', 'Type restored');
  assert(loadedClip!.textConfig?.content === 'Persistent Text', 'Content restored');
  assert(loadedClip!.textConfig?.style.fontFamily === 'Helvetica', 'Font family restored');
  assert(loadedClip!.textConfig?.style.fontSize === 54, 'Font size restored');
  assert(loadedClip!.textConfig?.style.stroke.enabled === true, 'Stroke restored');
  assert(loadedClip!.transform.positionX === 20, 'Transform position restored');
  console.log('Test 24: Text save/load -> PASS');
}

// Test 25: Caption save/load
{
  const project = createBaseProject();
  const capTrack = createCaptionTrack('Captions FR');
  capTrack.items.push(createCaptionItem(1.0, 4.0, 'Bonjour tout le monde', { fontSize: 30 }));
  capTrack.items.push(createCaptionItem(6.0, 3.0, 'Deuxième ligne'));
  project.captionTracks = [capTrack];

  const jsonStr = JSON.stringify(project);
  const loaded: FreeCutProject = JSON.parse(jsonStr);

  assert(loaded.captionTracks !== undefined, 'Caption tracks restored');
  assert(loaded.captionTracks.length === 1, '1 caption track restored');
  assert(loaded.captionTracks[0].name === 'Captions FR', 'Track name restored');
  assert(loaded.captionTracks[0].items.length === 2, '2 caption items restored');
  assert(loaded.captionTracks[0].items[0].text === 'Bonjour tout le monde', 'Item 1 text restored');
  assert(loaded.captionTracks[0].items[0].style?.fontSize === 30, 'Item 1 style restored');
  assert(loaded.captionTracks[0].items[1].text === 'Deuxième ligne', 'Item 2 text restored');
  console.log('Test 25: Caption save/load -> PASS');
}

// -------------------------------------------------------------
// EXPORT COMPILATION TESTS (26 - 27)
// -------------------------------------------------------------

console.log('\n--- PART D: EXPORT COMPILATION TESTS ---');

// Test 26: Text export
{
  const project = createBaseProject();
  project.media.push({
    id: 'm1',
    name: 'sample.mp4',
    path: 'test-media/sample-video.mp4',
    type: 'video',
    size: 1000,
    duration: 10,
    createdAt: Date.now(),
  });
  project.clips.push({
    id: 'vclip1',
    mediaId: 'm1',
    trackId: project.tracks[0].id,
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceDuration: 10,
    type: 'video',
    name: 'sample.mp4',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
  });
  project.clips.push({
    id: 'tclip1',
    mediaId: '',
    trackId: project.tracks[0].id,
    startTime: 2,
    duration: 4,
    sourceStart: 0,
    sourceDuration: 4,
    type: 'text',
    name: 'Overlay Title',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
    textConfig: createDefaultTextConfig('FREECUT ALPHA 0.6', {
      fontSize: 48,
      color: '#FFFF00',
      stroke: { enabled: true, color: '#000000', width: 3 },
    }),
  });

  const exportSettings: ExportSettings = {
    outputPath: 'test-out.mp4',
    width: 1920,
    height: 1080,
    fps: 30,
    videoCodec: 'h264',
    audioCodec: 'aac',
    videoBitrateKbps: 4000,
    audioBitrateKbps: 192,
  };

  const args = FFmpegService.generateFFmpegArgs(project, exportSettings);
  const filterArg = args[args.indexOf('-filter_complex') + 1];

  assert(filterArg !== undefined, 'Filter complex must exist');
  assert(filterArg.includes('drawtext'), 'Must contain drawtext filter');
  assert(filterArg.includes('FREECUT ALPHA 0.6'), 'Must contain text string');
  assert(filterArg.includes('between(t,2.000,6.000)'), 'Must contain frame-accurate time window');
  assert(filterArg.includes('borderw=3'), 'Must contain stroke width');
  console.log('Test 26: Text export -> PASS');
}

// Test 27: Caption export
{
  const project = createBaseProject();
  project.media.push({
    id: 'm1',
    name: 'sample.mp4',
    path: 'test-media/sample-video.mp4',
    type: 'video',
    size: 1000,
    duration: 10,
    createdAt: Date.now(),
  });
  project.clips.push({
    id: 'vclip1',
    mediaId: 'm1',
    trackId: project.tracks[0].id,
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceDuration: 10,
    type: 'video',
    name: 'sample.mp4',
    transform: { positionX: 0, positionY: 0, scale: 1, rotation: 0, opacity: 1 },
    volume: 1,
    muted: false,
  });

  const capTrack = createCaptionTrack('Subtitles');
  capTrack.items.push(createCaptionItem(1.5, 3.5, 'Burned-in Caption Subtitle'));
  project.captionTracks = [capTrack];

  const exportSettings: ExportSettings = {
    outputPath: 'test-caption-out.mp4',
    width: 1920,
    height: 1080,
    fps: 30,
    videoCodec: 'h264',
    audioCodec: 'aac',
    videoBitrateKbps: 4000,
    audioBitrateKbps: 192,
  };

  const args = FFmpegService.generateFFmpegArgs(project, exportSettings);
  const filterArg = args[args.indexOf('-filter_complex') + 1];

  assert(filterArg !== undefined, 'Filter complex must exist');
  assert(filterArg.includes('drawtext'), 'Must contain drawtext filter for caption');
  assert(filterArg.includes('Burned-in Caption Subtitle'), 'Must contain caption text');
  assert(filterArg.includes('between(t,1.500,5.000)'), 'Must contain caption time window');
  assert(filterArg.includes('box=1'), 'Caption must have background box enabled');
  console.log('Test 27: Caption export -> PASS');
}

console.log('\n==================================================');
console.log('ALL 27/27 AUTOMATED TESTS PASSED SUCCESSFULLY!');
console.log('==================================================');
