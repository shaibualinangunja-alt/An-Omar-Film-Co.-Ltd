import { FreeCutProject, TimelineTrack } from '../types/project';
import { DesktopBridge } from '../native/desktopBridge';

export class ProjectService {
  /**
   * Creates a fresh default FreeCut project
   */
  static createDefaultProject(name: string = "Untitled Project"): FreeCutProject {
    const defaultTracks: TimelineTrack[] = [
      { id: 'track_v2', name: 'Video 2 (Overlay)', type: 'video', order: 0, muted: false, locked: false, solo: false, visible: true, targeted: false, height: 48 },
      { id: 'track_v1', name: 'Video 1 (Main)', type: 'video', order: 1, muted: false, locked: false, solo: false, visible: true, targeted: true, height: 56 },
      { id: 'track_a1', name: 'Audio 1 (Dialogue)', type: 'audio', order: 2, muted: false, locked: false, solo: false, pan: 0, volume: 1, targeted: true, height: 44 },
      { id: 'track_a2', name: 'Audio 2 (Music)', type: 'audio', order: 3, muted: false, locked: false, solo: false, pan: 0, volume: 1, targeted: false, height: 44 },
      { id: 'track_a3', name: 'Audio 3 (SFX)', type: 'audio', order: 4, muted: false, locked: false, solo: false, pan: 0, volume: 1, targeted: false, height: 44 },
      { id: 'track_a4', name: 'Audio 4 (Ambience)', type: 'audio', order: 5, muted: false, locked: false, solo: false, pan: 0, volume: 1, targeted: false, height: 44 },
    ];

    return {
      version: "0.1",
      project: {
        name,
        width: 1920,
        height: 1080,
        fps: 30,
        backgroundColor: '#000000',
        audioSampleRate: 48000,
        colorManagement: {
          inputColorSpace: 'rec709',
          workingColorSpace: 'rec709',
          outputColorSpace: 'rec709',
          colorRange: 'limited',
          autoDetect: true,
        },
      },
      media: [],
      tracks: defaultTracks,
      clips: [],
      settings: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  static serializeProject(project: FreeCutProject): string {
    return JSON.stringify(project, null, 2);
  }

  static deserializeProject(jsonStr: string): FreeCutProject {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.version || !parsed.project || !Array.isArray(parsed.tracks)) {
      throw new Error("Invalid FreeCut project file format");
    }

    // Migrate defaults for backward compatibility with Alpha 0.1-0.7
    parsed.tracks = parsed.tracks.map((t: TimelineTrack) => ({
      ...t,
      solo: !!t.solo,
      pan: t.pan ?? 0,
      volume: t.volume ?? 1.0,
    }));

    parsed.clips = (parsed.clips || []).map((c: any) => ({
      ...c,
      volume: c.volume ?? 1.0,
      muted: !!c.muted,
      pan: c.pan ?? 0,
      audioEnabled: c.audioEnabled !== false,
      fadeInDuration: c.fadeInDuration ?? 0,
      fadeOutDuration: c.fadeOutDuration ?? 0,
    }));

    return parsed as FreeCutProject;
  }

  /**
   * Checks whether media files are accessible, marking missing or corrupt files as isMissing = true
   * without deleting them or modifying clips.
   * Completely decoupled from Vite dev server in desktop mode.
   */
  static async verifyMediaAvailability(project: FreeCutProject): Promise<FreeCutProject> {
    const updatedMedia = await Promise.all(
      project.media.map(async (m) => {
        if (!m.path || m.path.startsWith('blob:') || m.path.startsWith('data:')) {
          return m;
        }
        try {
          const check = await DesktopBridge.verifyMediaFile(m.path, m.type);
          return {
            ...m,
            isMissing: !check.accessible,
          };
        } catch {
          return {
            ...m,
            isMissing: true,
          };
        }
      })
    );

    return {
      ...project,
      media: updatedMedia,
    };
  }
}

