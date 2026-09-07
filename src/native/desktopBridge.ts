/**
 * Desktop Bridge
 * Abstraction layer connecting FreeCut to Tauri native desktop APIs or local desktop dev bridge.
 */

import { MediaEngineStatus, NativeProbeResult } from '../types/mediaEngine';

export interface OpenFileDialogOptions {
  title?: string;
  multiple?: boolean;
  filters?: { name: string; extensions: string[] }[];
}

export class DesktopBridge {
  static isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_IPC__' in window;
  }

  static getMediaStreamUrl(pathOrUrl: string): string {
    if (!pathOrUrl) return '';
    if (
      pathOrUrl.startsWith('blob:') ||
      pathOrUrl.startsWith('data:') ||
      pathOrUrl.startsWith('http://') ||
      pathOrUrl.startsWith('https://')
    ) {
      return pathOrUrl;
    }

    if (this.isTauri()) {
      try {
        const tauriApi = (window as unknown as { __TAURI__?: { tauri?: { convertFileSrc?: (p: string) => string } } }).__TAURI__;
        if (tauriApi?.tauri?.convertFileSrc) {
          return tauriApi.tauri.convertFileSrc(pathOrUrl);
        }
      } catch (e) {
        console.warn('Tauri convertFileSrc failed:', e);
      }
    }

    // Local stream route via secure partial content stream
    return `/api/media-stream?path=${encodeURIComponent(pathOrUrl)}`;
  }

  static async selectFiles(options: OpenFileDialogOptions = {}): Promise<File[] | string[]> {
    if (this.isTauri()) {
      try {
        const dialog = (window as unknown as { __TAURI__?: { dialog: { open: (opts: unknown) => Promise<string | string[] | null> } } }).__TAURI__?.dialog;
        if (dialog) {
          const selected = await dialog.open({
            multiple: options.multiple ?? true,
            filters: options.filters,
            title: options.title || 'Select Media Files'
          });
          if (!selected) return [];
          return Array.isArray(selected) ? selected : [selected];
        }
      } catch (err) {
        console.warn('Tauri dialog failed, falling back to Web File Picker:', err);
      }
    }

    // Standard HTML5 File Picker fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.multiple ?? true;
      if (options.filters && options.filters.length > 0) {
        const exts = options.filters.flatMap(f => f.extensions.map(e => `.${e}`)).join(',');
        input.accept = exts;
      }
      input.onchange = () => {
        if (input.files) {
          resolve(Array.from(input.files));
        } else {
          resolve([]);
        }
      };
      input.click();
    });
  }

  static async selectDirectory(title: string = 'Select Directory to Search'): Promise<string | File[] | null> {
    if (this.isTauri()) {
      try {
        const dialog = (window as unknown as { __TAURI__?: { dialog: { open: (opts: unknown) => Promise<string | string[] | null> } } }).__TAURI__?.dialog;
        if (dialog) {
          const selected = await dialog.open({
            directory: true,
            multiple: false,
            title,
          });
          if (!selected) return null;
          return Array.isArray(selected) ? selected[0] : selected;
        }
      } catch (err) {
        console.warn('Tauri directory dialog failed, falling back to Web folder picker:', err);
      }
    }

    // HTML5 folder picker fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      (input as unknown as { webkitdirectory: boolean }).webkitdirectory = true;
      input.onchange = () => {
        if (input.files && input.files.length > 0) {
          resolve(Array.from(input.files));
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }

  static async saveProjectFile(data: string, defaultName: string = 'Untitled.freecut'): Promise<boolean> {
    // Sanitize default filename to prevent illegal filesystem characters
    const sanitizedName = defaultName.replace(/[<>:"/\\|?*\0]/g, '_');

    if (this.isTauri()) {
      try {
        const dialog = (window as unknown as { __TAURI__?: { dialog: { save: (opts: unknown) => Promise<string | null> } } }).__TAURI__?.dialog;
        const fs = (window as unknown as { __TAURI__?: { fs: { writeTextFile: (path: string, content: string) => Promise<void> } } }).__TAURI__?.fs;
        if (dialog && fs) {
          const path = await dialog.save({
            defaultPath: sanitizedName,
            filters: [{ name: 'FreeCut Project', extensions: ['freecut', 'json'] }]
          });
          if (path) {
            await fs.writeTextFile(path, data);
            return true;
          }
          return false;
        }
      } catch (err) {
        console.warn('Tauri save failed, falling back to browser download:', err);
      }
    }

    // Browser download fallback
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizedName.endsWith('.freecut') ? sanitizedName : `${sanitizedName}.freecut`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  /**
   * Safely reads project file content across Tauri desktop, Node, and browser runtimes.
   */
  static async readProjectFile(fileOrPath: File | string): Promise<string> {
    if (fileOrPath instanceof File) {
      return await fileOrPath.text();
    }

    if (typeof fileOrPath === 'string') {
      if (fileOrPath.includes('\0')) {
        throw new Error('Invalid project file path: contains null byte');
      }

      // 1. In Tauri Desktop mode
      if (this.isTauri()) {
        try {
          const fs = (window as unknown as { __TAURI__?: { fs?: { readTextFile?: (path: string) => Promise<string> } } }).__TAURI__?.fs;
          if (fs?.readTextFile) {
            return await fs.readTextFile(fileOrPath);
          }
        } catch (err) {
          console.warn('Tauri fs.readTextFile failed, falling back:', err);
        }
      }

      // 2. In Node environment (automated tests, CLI)
      if (typeof process !== 'undefined' && (process as unknown as { versions?: { node?: string } }).versions?.node) {
        const fs = await import('fs');
        return fs.readFileSync(fileOrPath, 'utf8');
      }

      // 3. Web fetch if URL or relative path
      const res = await fetch(fileOrPath);
      if (!res.ok) {
        throw new Error(`Failed to load project file: HTTP ${res.status}`);
      }
      return await res.text();
    }

    throw new Error('Unsupported project file format or path');
  }

  /**
   * Diagnostic: Query native Media Engine status (FFmpeg / FFprobe availability, paths, versions)
   */
  static async getMediaEngineStatus(): Promise<MediaEngineStatus> {
    if (this.isTauri()) {
      try {
        const tauri = (window as unknown as { __TAURI__?: { invoke: (cmd: string) => Promise<MediaEngineStatus> } }).__TAURI__;
        if (tauri) {
          return await tauri.invoke('get_media_engine_status');
        }
      } catch (err) {
        console.warn('Tauri get_media_engine_status failed, trying dev bridge:', err);
      }
    }

    try {
      const res = await fetch('/api/media-engine-status');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Dev bridge media-engine-status error:', e);
    }

    return {
      ffmpegAvailable: false,
      ffmpegPath: '',
      ffmpegVersion: '',
      ffprobeAvailable: false,
      ffprobePath: '',
      ffprobeVersion: '',
    };
  }

  /**
   * Probe media using native FFprobe
   */
  static async probeMedia(filePath: string): Promise<NativeProbeResult> {
    if (!filePath || typeof filePath !== 'string' || filePath.includes('\0')) {
      throw new Error('Invalid file path: path must be a non-empty string without null bytes');
    }

    if (this.isTauri()) {
      try {
        const tauri = (window as unknown as { __TAURI__?: { invoke: (cmd: string, args: unknown) => Promise<string> } }).__TAURI__;
        if (tauri) {
          const jsonStr = await tauri.invoke('probe_media', { filePath });
          return JSON.parse(jsonStr);
        }
      } catch (err) {
        console.warn('Tauri probe_media failed, trying dev bridge:', err);
      }
    }

    // 2. Node.js environment (automated tests / clean-machine headless)
    if (typeof process !== 'undefined' && (process as unknown as { versions?: { node?: string } }).versions?.node) {
      try {
        const { execFile } = await import('child_process');
        const path = await import('path');
        const fs = await import('fs');

        const probeCandidates = [
          path.resolve('src-tauri/binaries/ffprobe.exe'),
          path.resolve('binaries/ffprobe.exe'),
        ];
        const probeBin = probeCandidates.find(p => fs.existsSync(p));
        if (probeBin) {
          return new Promise<NativeProbeResult>((resolve, reject) => {
            execFile(probeBin, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath], (err, stdout, _stderr) => {
              if (err) {
                return reject(new Error(`FreeCut could not probe this media file: ${err.message}`));
              }
              try {
                resolve(JSON.parse(stdout));
              } catch (parseErr) {
                reject(parseErr);
              }
            });
          });
        }
      } catch (nodeErr) {
        console.warn('Node direct ffprobe execution failed:', nodeErr);
      }
    }

    // 3. Browser development fallback via Vite dev server
    try {
      const fetchUrl = typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/api/probe-media`
        : 'http://localhost:5173/api/probe-media';

      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[DesktopBridge Error in probe_media]:', errorData);
        if (res.status === 404) {
          throw new Error('FreeCut could not find the specified media file.');
        }
        throw new Error('FreeCut could not probe this media file. The format may be unsupported or corrupted.');
      }

      return await res.json();
    } catch (e) {
      console.error('[DesktopBridge probeMedia exception]:', e);
      throw e;
    }
  }

  /**
   * Extract video thumbnail using native FFmpeg
   */
  static async generateThumbnail(videoPath: string, timeSeconds: number = 1): Promise<string> {
    if (!videoPath || typeof videoPath !== 'string' || videoPath.includes('\0')) {
      throw new Error('Invalid video path: path must be a non-empty string without null bytes');
    }

    if (this.isTauri()) {
      try {
        const tauri = (window as unknown as { __TAURI__?: { invoke: (cmd: string, args: unknown) => Promise<string> } }).__TAURI__;
        if (tauri) {
          return await tauri.invoke('generate_thumbnail', { videoPath, timeSeconds });
        }
      } catch (err) {
        console.warn('Tauri generate_thumbnail failed, trying dev bridge:', err);
      }
    }

    // Node.js environment
    if (typeof process !== 'undefined' && (process as unknown as { versions?: { node?: string } }).versions?.node) {
      try {
        const { execFile } = await import('child_process');
        const path = await import('path');
        const fs = await import('fs');

        const tempDir = path.resolve('temp-thumbs');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const outFileName = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
        const outFilePath = path.join(tempDir, outFileName);

        const ffmpegCandidates = [
          path.resolve('src-tauri/binaries/ffmpeg.exe'),
          path.resolve('binaries/ffmpeg.exe'),
        ];
        const ffmpegBin = ffmpegCandidates.find(p => fs.existsSync(p));
        if (ffmpegBin) {
          return new Promise<string>((resolve, reject) => {
            execFile(ffmpegBin, ['-y', '-ss', Number(timeSeconds).toFixed(3), '-i', videoPath, '-vframes', '1', '-q:v', '2', outFilePath], (err) => {
              if (err) return reject(err);
              resolve(outFilePath);
            });
          });
        }
      } catch (nodeErr) {
        console.warn('Node direct thumbnail extraction failed:', nodeErr);
      }
    }

    try {
      const fetchUrl = typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/api/generate-thumbnail`
        : 'http://localhost:5173/api/generate-thumbnail';

      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath, timeSeconds }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[DesktopBridge Error in generate_thumbnail]:', errorData);
        throw new Error('FreeCut could not extract thumbnail from this video.');
      }

      const data = await res.json();
      return data.dataUrl;
    } catch (e) {
      console.error('[DesktopBridge generateThumbnail exception]:', e);
      throw e;
    }
  }

  /**
   * Verifies if a file path exists on disk.
   * Completely independent of Vite dev server in desktop / native mode.
   */
  static async verifyPathExists(filePath: string): Promise<boolean> {
    if (!filePath || filePath.startsWith('blob:') || filePath.startsWith('data:')) {
      return true;
    }

    if (typeof filePath !== 'string' || filePath.includes('\0')) {
      return false;
    }

    // 1. Tauri desktop mode
    if (this.isTauri()) {
      try {
        const tauri = (window as unknown as { __TAURI__?: { invoke: (cmd: string, args: unknown) => Promise<boolean> } }).__TAURI__;
        if (tauri) {
          return await tauri.invoke('verify_path_exists', { filePath });
        }
      } catch (err) {
        console.warn('Tauri verify_path_exists failed, falling back:', err);
      }
    }

    // 2. Node.js environment (automated test runner / server)
    if (typeof process !== 'undefined' && (process as unknown as { versions?: { node?: string } }).versions?.node) {
      try {
        const fs = await import('fs');
        return fs.existsSync(filePath);
      } catch {}
    }

    // 3. Browser development mode fallback
    try {
      const res = await fetch(`/api/media-stream?path=${encodeURIComponent(filePath)}`, {
        method: 'HEAD',
      });
      return res.ok && res.status !== 404;
    } catch {
      return false;
    }
  }

  /**
   * Verifies media accessibility and stream integrity without requiring Vite middleware.
   * Detects:
   * - Missing paths
   * - Inaccessible files
   * - 0-byte or corrupted containers
   * - Missing audio/video streams
   */
  static async verifyMediaFile(
    filePath: string,
    mediaType?: string
  ): Promise<{ accessible: boolean; reason?: string }> {
    if (!filePath) {
      return { accessible: false, reason: 'Empty file path' };
    }

    if (filePath.startsWith('blob:') || filePath.startsWith('data:')) {
      return { accessible: true };
    }

    // 1. Verify existence
    const exists = await this.verifyPathExists(filePath);
    if (!exists) {
      return { accessible: false, reason: 'File does not exist on disk' };
    }

    // 2. For video & audio files, probe stream integrity to detect corrupted/unreadable containers
    if (mediaType === 'video' || mediaType === 'audio') {
      try {
        const probe = await this.probeMedia(filePath);
        if (!probe || !Array.isArray(probe.streams) || probe.streams.length === 0) {
          return { accessible: false, reason: 'Media container has no valid audio/video streams' };
        }

        if (mediaType === 'video') {
          const hasVideo = probe.streams.some((s) => s.codec_type === 'video');
          if (!hasVideo) {
            return { accessible: false, reason: 'Expected video stream but none found in container' };
          }
        } else if (mediaType === 'audio') {
          const hasAudio = probe.streams.some((s) => s.codec_type === 'audio');
          if (!hasAudio) {
            return { accessible: false, reason: 'Expected audio stream but none found in container' };
          }
        }

        return { accessible: true };
      } catch (probeErr: unknown) {
        const errText = probeErr instanceof Error ? probeErr.message : String(probeErr);
        return { accessible: false, reason: `Corrupt or unreadable media: ${errText}` };
      }
    }

    // Images or other valid files
    return { accessible: true };
  }

  /**
   * Safely purges stale temporary thumbnail and scratch files.
   * Never touches project source media or files outside the cache scope.
   */
  static async cleanTempCache(options: { maxAgeMs?: number; targetDir?: string } = {}): Promise<{
    deletedCount: number;
    freedBytes: number;
    errors: string[];
  }> {
    const maxAgeMs = options.maxAgeMs ?? 24 * 60 * 60 * 1000;

    // 1. In Tauri Desktop mode
    if (this.isTauri()) {
      try {
        const tauri = (window as unknown as { __TAURI__?: { invoke: (cmd: string, args: unknown) => Promise<any> } }).__TAURI__;
        if (tauri) {
          const maxAgeSeconds = Math.round(maxAgeMs / 1000);
          return await tauri.invoke('clean_temp_cache', { maxAgeSeconds });
        }
      } catch (err) {
        console.warn('Tauri clean_temp_cache failed, falling back:', err);
      }
    }

    // 2. In Node environment
    if (typeof process !== 'undefined' && (process as unknown as { versions?: { node?: string } }).versions?.node) {
      try {
        const fs = await import('fs');
        const path = await import('path');

        const cacheDir = path.resolve(options.targetDir || 'temp-thumbs');
        const normalized = cacheDir.replace(/\\/g, '/').toLowerCase();
        const base = path.basename(cacheDir).toLowerCase();
        const isCacheScope =
          normalized.includes('/temp-thumbs') ||
          normalized.endsWith('temp-thumbs') ||
          normalized.includes('/temp-cache') ||
          normalized.endsWith('temp-cache') ||
          normalized.includes('/scratch') ||
          normalized.endsWith('scratch') ||
          base.includes('temp') ||
          base.includes('thumb') ||
          base.includes('cache');

        if (!isCacheScope) {
          return {
            deletedCount: 0,
            freedBytes: 0,
            errors: [`Safety rejection: Target directory "${cacheDir}" is outside authorized cache scope.`],
          };
        }

        if (!fs.existsSync(cacheDir)) {
          return { deletedCount: 0, freedBytes: 0, errors: [] };
        }

        const now = Date.now();
        let deletedCount = 0;
        let freedBytes = 0;
        const errors: string[] = [];

        const files = fs.readdirSync(cacheDir);
        for (const file of files) {
          const filePath = path.join(cacheDir, file);
          const ext = path.extname(file).toLowerCase();

          // Strict extension filter: only cache artifacts
          if (!['.jpg', '.jpeg', '.png', '.tmp', '.thumb'].includes(ext)) {
            continue;
          }

          try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) continue;

            const ageMs = now - stat.mtimeMs;
            if (ageMs >= maxAgeMs) {
              const size = stat.size;
              fs.unlinkSync(filePath);
              deletedCount++;
              freedBytes += size;
            }
          } catch (fileErr: unknown) {
            const msg = fileErr instanceof Error ? fileErr.message : String(fileErr);
            errors.push(`Failed to remove ${file}: ${msg}`);
          }
        }

        return { deletedCount, freedBytes, errors };
      } catch (nodeErr: unknown) {
        const msg = nodeErr instanceof Error ? nodeErr.message : String(nodeErr);
        return {
          deletedCount: 0,
          freedBytes: 0,
          errors: [msg],
        };
      }
    }

    // 3. Dev server fallback
    try {
      const res = await fetch('/api/clean-temp-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxAgeMs }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return { deletedCount: 0, freedBytes: 0, errors: [] };
  }

  private static activeNodeProcesses = new Map<string, any>();

  /**
   * Executes native FFmpeg export process.
   * In Tauri desktop runtime: invokes native Rust command with real-time progress events.
   * In Node runtime: executes bundled sidecar directly with real-time progress streaming.
   * In Browser development: falls back to Vite media engine middleware.
   */
  static async renderExport(
    argsOrOptions: string[] | { args: string[]; jobId?: string; onProgressLine?: (line: string) => void },
    maybeJobId?: string,
    maybeOnProgressLine?: (line: string) => void
  ): Promise<{ success: boolean; exitCode?: number; error?: string; stderr?: string; stdout?: string }> {
    let args: string[];
    let jobId: string | undefined;
    let onProgressLine: ((line: string) => void) | undefined;

    if (Array.isArray(argsOrOptions)) {
      args = argsOrOptions;
      jobId = maybeJobId;
      onProgressLine = maybeOnProgressLine;
    } else {
      args = argsOrOptions.args;
      jobId = argsOrOptions.jobId;
      onProgressLine = argsOrOptions.onProgressLine;
    }

    if (this.isTauri()) {
      let unlisten: (() => void) | undefined;
      try {
        const tauri = (window as unknown as {
          __TAURI__?: {
            invoke: (cmd: string, args: unknown) => Promise<any>;
            event?: { listen: (event: string, handler: (e: any) => void) => Promise<() => void> };
          };
        }).__TAURI__;

        if (tauri) {
          if (tauri.event && onProgressLine) {
            try {
              unlisten = await tauri.event.listen('export-progress', (event: any) => {
                const payload = event?.payload;
                if (!payload) return;
                if (!jobId || payload.jobId === jobId) {
                  onProgressLine?.(payload.line || '');
                }
              });
            } catch (eventErr) {
              console.warn('Tauri progress event listener failed:', eventErr);
            }
          }

          const result = await tauri.invoke('render_export', { jobId, args });
          if (unlisten) {
            try { unlisten(); } catch (_) {}
          }

          if (!result.success) {
            const errDetail = result.error || result.stderr || 'Native FFmpeg export failed';
            throw new Error(errDetail);
          }

          return result;
        }
      } catch (tauriErr) {
        if (unlisten) {
          try { unlisten(); } catch (_) {}
        }
        console.error('[DesktopBridge Tauri render_export error]:', tauriErr);
        throw tauriErr;
      }
    }

    // 2. Node.js environment (automated tests / headless clean-machine)
    if (typeof process !== 'undefined' && (process as unknown as { versions?: { node?: string } }).versions?.node) {
      try {
        const { spawn } = await import('child_process');
        const path = await import('path');
        const fs = await import('fs');

        const ffmpegCandidates = [
          path.resolve('src-tauri/binaries/ffmpeg.exe'),
          path.resolve('binaries/ffmpeg.exe'),
        ];
        const ffmpegBin = ffmpegCandidates.find(p => fs.existsSync(p));
        if (ffmpegBin) {
          return new Promise((resolve, reject) => {
            const child = spawn(ffmpegBin, args);
            let stderrBuffer = '';

            if (jobId) {
              DesktopBridge.activeNodeProcesses.set(jobId, child);
            }

            child.stderr?.on('data', (data) => {
              const text = data.toString();
              stderrBuffer += text;
              if (onProgressLine) {
                const lines = text.split('\n');
                for (const line of lines) {
                  if (line.trim()) onProgressLine(line.trim());
                }
              }
            });

            child.on('close', (code) => {
              if (jobId) {
                DesktopBridge.activeNodeProcesses.delete(jobId);
              }
              if (code === 0) {
                resolve({ success: true, exitCode: 0, stderr: stderrBuffer });
              } else {
                reject(new Error(`Command failed: ${ffmpegBin} ${args.join(' ')}\n${stderrBuffer}`));
              }
            });

            child.on('error', (err) => {
              if (jobId) {
                DesktopBridge.activeNodeProcesses.delete(jobId);
              }
              reject(err);
            });
          });
        }
      } catch (nodeErr) {
        console.warn('Node direct renderExport failed, falling back:', nodeErr);
      }
    }

    // 3. Browser development fallback via Vite dev server
    try {
      const fetchUrl = typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/api/render-export`
        : 'http://localhost:5173/api/render-export';

      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ args, jobId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.details || `Export render failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success === false) {
        throw new Error(data.error || data.details || 'Export render failed');
      }

      return data;
    } catch (e) {
      console.error('[DesktopBridge renderExport exception]:', e);
      throw e;
    }
  }

  /**
   * Cancels a currently running export process
   */
  static async cancelExport(jobId: string): Promise<boolean> {
    if (this.isTauri()) {
      try {
        const tauri = (window as unknown as { __TAURI__?: { invoke: (cmd: string, args: unknown) => Promise<boolean> } }).__TAURI__;
        if (tauri) {
          return await tauri.invoke('cancel_export', { jobId });
        }
      } catch (err) {
        console.warn('Tauri cancel_export error:', err);
      }
    }

    // Node.js runtime process termination
    if (DesktopBridge.activeNodeProcesses.has(jobId)) {
      const proc = DesktopBridge.activeNodeProcesses.get(jobId);
      DesktopBridge.activeNodeProcesses.delete(jobId);
      if (proc) {
        try {
          proc.kill();
          return true;
        } catch {
          return false;
        }
      }
    }

    try {
      const fetchUrl = typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/api/cancel-export`
        : 'http://localhost:5173/api/cancel-export';

      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.success;
      }
    } catch (_) {}

    return false;
  }
}
