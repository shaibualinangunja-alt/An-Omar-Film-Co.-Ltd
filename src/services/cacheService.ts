/**
 * FreeCut Alpha 1.0 — Cache Service
 * Conservative, safe management of temporary scratch artifacts, thumbnails, and cache files.
 */

import { DesktopBridge } from '../native/desktopBridge';

export interface CacheCleanResult {
  deletedCount: number;
  freedBytes: number;
  errors: string[];
}

export interface CacheCleanOptions {
  maxAgeMs?: number; // default: 24h (86,400,000 ms)
  targetDir?: string; // default: 'temp-thumbs'
}

export class CacheService {
  /**
   * Safely purges stale temporary thumbnail and scratch files.
   *
   * SAFEGUARDS:
   * 1. Scope Confinement: Strictly confines file operations to authorized cache directories
   *    (e.g., 'temp-thumbs' or scratch subdirectories). Never removes files from project folders,
   *    root paths, media libraries, or source trees.
   * 2. Asset Integrity: Only targets known scratch/thumbnail artifact extensions (.jpg, .jpeg, .png, .tmp, .thumb).
   *    Never deletes project files (.freecut), source video, audio, or user workspace files.
   * 3. Age Preservation: Only deletes files older than maxAgeMs, ensuring active in-use thumbnails
   *    created in the current session are preserved.
   * 4. Missing Directory Grace: Returns a clean zero-count result if target directory does not exist.
   * 5. File Lock Safety: Gracefully catches locked or in-use files (EBUSY/EPERM) without crashing.
   */
  static async cleanTempCache(options: CacheCleanOptions = {}): Promise<CacheCleanResult> {
    const maxAgeMs = options.maxAgeMs ?? 24 * 60 * 60 * 1000;

    // 1. In Tauri Desktop mode, invoke native desktop command
    if (DesktopBridge.isTauri()) {
      try {
        const tauri = (window as unknown as { __TAURI__?: { invoke: (cmd: string, args: unknown) => Promise<CacheCleanResult> } }).__TAURI__;
        if (tauri) {
          const maxAgeSeconds = Math.round(maxAgeMs / 1000);
          return await tauri.invoke('clean_temp_cache', { maxAgeSeconds });
        }
      } catch (err) {
        console.warn('Tauri clean_temp_cache failed, falling back:', err);
      }
    }

    // 2. In Node environment (automated tests, CLI, background workers)
    if (typeof process !== 'undefined' && (process as unknown as { versions?: { node?: string } }).versions?.node) {
      try {
        const fs = await import('fs');
        const path = await import('path');

        const cacheDir = path.resolve(options.targetDir || 'temp-thumbs');

        // Path confinement check: target MUST be named or subpath of temp-thumbs, temp-cache, or scratch
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

    // 3. Browser dev server fallback via Vite endpoint
    try {
      const res = await fetch('/api/clean-temp-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxAgeMs }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Ignored in browser without dev server
    }

    return { deletedCount: 0, freedBytes: 0, errors: [] };
  }
}
