import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

function resolveBinary(name: string): string {
  // 1. Check bundled binaries in src-tauri/binaries
  const tauriBin = path.resolve('src-tauri/binaries', `${name}.exe`);
  if (fs.existsSync(tauriBin)) return tauriBin;

  const tauriTripleBin = path.resolve('src-tauri/binaries', `${name}-x86_64-pc-windows-msvc.exe`);
  if (fs.existsSync(tauriTripleBin)) return tauriTripleBin;

  // 2. Check WinGet link location
  const localAppData = process.env.LOCALAPPDATA || '';
  const wingetPath = path.join(localAppData, 'Microsoft', 'WinGet', 'Links', `${name}.exe`);
  if (fs.existsSync(wingetPath)) {
    return wingetPath;
  }

  return name;
}

function nativeMediaEnginePlugin(): Plugin {
  const activeProcesses = new Map<string, any>();

  return {
    name: 'native-media-engine-bridge',
    configureServer(server) {
      // Cancel Export Endpoint
      server.middlewares.use('/api/cancel-export', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { jobId } = JSON.parse(body);
            if (jobId && activeProcesses.has(jobId)) {
              const proc = activeProcesses.get(jobId);
              try { proc.kill('SIGKILL'); } catch (_) {}
              activeProcesses.delete(jobId);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, cancelled: true }));
              return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, message: 'Process not found' }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      });
      // Clean Temp Cache Endpoint
      server.middlewares.use('/api/clean-temp-cache', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { maxAgeMs = 86400000 } = JSON.parse(body || '{}');
            const cacheDir = path.resolve('temp-thumbs');
            if (!fs.existsSync(cacheDir)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ deletedCount: 0, freedBytes: 0, errors: [] }));
              return;
            }

            const now = Date.now();
            let deletedCount = 0;
            let freedBytes = 0;
            const errors: string[] = [];

            const files = fs.readdirSync(cacheDir);
            for (const file of files) {
              const filePath = path.join(cacheDir, file);
              const ext = path.extname(file).toLowerCase();
              if (!['.jpg', '.jpeg', '.png', '.tmp', '.thumb'].includes(ext)) continue;

              try {
                const stat = fs.statSync(filePath);
                if (stat.isFile() && (now - stat.mtimeMs >= maxAgeMs)) {
                  const size = stat.size;
                  fs.unlinkSync(filePath);
                  deletedCount++;
                  freedBytes += size;
                }
              } catch (e: any) {
                errors.push(`Failed to remove ${file}: ${e?.message}`);
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ deletedCount, freedBytes, errors }));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      });

      // 1. Media Engine Status Diagnostic Endpoint
      server.middlewares.use('/api/media-engine-status', (_req, res) => {
        const ffmpegBin = resolveBinary('ffmpeg');
        const ffprobeBin = resolveBinary('ffprobe');

        const status = {
          ffmpegAvailable: false,
          ffmpegPath: '',
          ffmpegVersion: '',
          ffprobeAvailable: false,
          ffprobePath: '',
          ffprobeVersion: '',
        };

        execFile(ffmpegBin, ['-version'], (err, stdout) => {
          if (!err && stdout) {
            status.ffmpegAvailable = true;
            status.ffmpegPath = ffmpegBin;
            status.ffmpegVersion = stdout.split('\n')[0].trim();
          }

          execFile(ffprobeBin, ['-version'], (probeErr, probeStdout) => {
            if (!probeErr && probeStdout) {
              status.ffprobeAvailable = true;
              status.ffprobePath = ffprobeBin;
              status.ffprobeVersion = probeStdout.split('\n')[0].trim();
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(status));
          });
        });
      });

      // 2. Media Probe Endpoint using FFprobe
      server.middlewares.use('/api/probe-media', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { filePath } = JSON.parse(body);
            if (!filePath || typeof filePath !== 'string') {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Valid filePath required' }));
              return;
            }

            const ffprobeBin = resolveBinary('ffprobe');
            const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];

            execFile(ffprobeBin, args, (err, stdout, stderr) => {
              res.setHeader('Content-Type', 'application/json');
              if (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message, details: stderr }));
                return;
              }
              res.end(stdout);
            });
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
          }
        });
      });

      // 3. Thumbnail Generation Endpoint using FFmpeg
      server.middlewares.use('/api/generate-thumbnail', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { videoPath, timeSeconds = 1 } = JSON.parse(body);
            if (!videoPath || typeof videoPath !== 'string') {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Valid videoPath required' }));
              return;
            }

            const tempDir = path.resolve('./temp-thumbs');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }

            const outFileName = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
            const outFilePath = path.join(tempDir, outFileName);

            const ffmpegBin = resolveBinary('ffmpeg');
            const args = [
              '-y',
              '-ss',
              Number(timeSeconds).toFixed(3),
              '-i',
              videoPath,
              '-vframes',
              '1',
              '-q:v',
              '2',
              outFilePath,
            ];

            execFile(ffmpegBin, args, (err, _stdout, stderr) => {
              if (err || !fs.existsSync(outFilePath)) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err ? err.message : 'Thumbnail generation failed', details: stderr }));
                return;
              }

              const imgBuffer = fs.readFileSync(outFilePath);
              const dataUrl = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;

              try { fs.unlinkSync(outFilePath); } catch (_) {}

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, dataUrl }));
            });
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
          }
        });
      });

      // 4. Secure Media Streaming Endpoint (HTTP 206 Range Streaming for Real Video Playback)
      server.middlewares.use('/api/media-stream', (req, res) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const mediaPath = url.searchParams.get('path');

        if (!mediaPath || !fs.existsSync(mediaPath)) {
          res.statusCode = 404;
          res.end('Media file not found');
          return;
        }

        const ext = path.extname(mediaPath).toLowerCase();
        const allowedExts = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.mp3', '.wav', '.aac', '.ogg', '.png', '.jpg', '.jpeg'];
        if (!allowedExts.includes(ext)) {
          res.statusCode = 403;
          res.end('Unauthorized media type');
          return;
        }

        const stat = fs.statSync(mediaPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        let contentType = 'video/mp4';
        if (ext === '.webm') contentType = 'video/webm';
        else if (ext === '.mov') contentType = 'video/quicktime';
        else if (ext === '.mp3') contentType = 'audio/mpeg';
        else if (ext === '.wav') contentType = 'audio/wav';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';

        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunkSize = (end - start) + 1;
          const fileStream = fs.createReadStream(mediaPath, { start, end });

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType,
          });
          fileStream.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
          });
          fs.createReadStream(mediaPath).pipe(res);
        }
      });

      // 5. Render Export Endpoint using FFmpeg
      server.middlewares.use('/api/render-export', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const { args, jobId } = JSON.parse(body);
            if (!Array.isArray(args)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Valid args array required' }));
              return;
            }

            const ffmpegBin = resolveBinary('ffmpeg');
            const proc = execFile(ffmpegBin, args, (err, stdout, stderr) => {
              if (jobId) activeProcesses.delete(jobId);
              if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message, details: stderr }));
                return;
              }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, stdout, stderr }));
            });

            if (jobId) {
              activeProcesses.set(jobId, proc);
            }
          } catch (e: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON payload: ' + e?.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), nativeMediaEnginePlugin()],
  server: {
    port: 5173,
    host: true,
  },
  clearScreen: false,
});
