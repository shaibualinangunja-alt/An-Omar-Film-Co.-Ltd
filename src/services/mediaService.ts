import { MediaAsset, MediaType } from '../types/project';
import { DesktopBridge } from '../native/desktopBridge';

export class MediaService {
  /**
   * Probes a local file path using native FFprobe and FFmpeg
   * Keeps permanent reference to the file path rather than temporary blob URLs.
   */
  static async probeLocalFile(filePath: string, customName?: string): Promise<MediaAsset> {
    const id = 'media_' + Math.random().toString(36).substring(2, 11);
    const normalizedPath = filePath.replace(/\\/g, '/');
    const pathBasename = normalizedPath.split('/').pop() || 'media_file';
    const name = customName || pathBasename;
    const ext = pathBasename.split('.').pop()?.toLowerCase() || '';

    let type: MediaType = 'video';
    if (['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'].includes(ext)) {
      type = 'audio';
    } else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
      type = 'image';
    } else {
      type = 'video';
    }

    try {
      const probeResult = await DesktopBridge.probeMedia(filePath);
      const videoStream = probeResult.streams.find(s => s.codec_type === 'video');
      const audioStream = probeResult.streams.find(s => s.codec_type === 'audio');

      if (!videoStream && audioStream) {
        type = 'audio';
      }

      let duration = 5;
      if (probeResult.format.duration) {
        duration = parseFloat(probeResult.format.duration);
      } else if (videoStream?.duration) {
        duration = parseFloat(videoStream.duration);
      } else if (audioStream?.duration) {
        duration = parseFloat(audioStream.duration);
      }

      let fps = 30;
      if (videoStream?.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        if (den && den > 0) fps = Math.round(num / den);
      }

      let thumbnailUrl = '';
      if (type === 'video') {
        try {
          thumbnailUrl = await DesktopBridge.generateThumbnail(filePath, Math.min(1.0, duration / 2));
        } catch (e) {
          console.warn('Thumbnail extraction failed:', e);
        }
      } else if (type === 'image') {
        thumbnailUrl = DesktopBridge.getMediaStreamUrl(filePath);
      }

      const size = probeResult.format.size ? parseInt(probeResult.format.size, 10) : 0;

      return {
        id,
        name,
        path: filePath,
        type,
        size,
        duration: type === 'image' ? 5 : duration,
        width: videoStream?.width,
        height: videoStream?.height,
        fps: type === 'video' ? fps : undefined,
        codec: videoStream?.codec_name || audioStream?.codec_name,
        audioChannels: audioStream?.channels,
        sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate, 10) : undefined,
        hasAudio: !!audioStream,
        thumbnailUrl,
        createdAt: Date.now(),
      };
    } catch (err) {
      console.error(`Native probe of ${filePath} failed:`, err);
      throw err;
    }
  }

  /**
   * Probes and ingests a browser File object into a FreeCut MediaAsset
   * Uses native FFprobe & FFmpeg when local path is available.
   */
  static async probeMediaFile(file: File): Promise<MediaAsset> {
    const localFilePath = (file as unknown as { path?: string }).path;
    if (localFilePath) {
      return this.probeLocalFile(localFilePath, file.name);
    }

    const id = 'media_' + Math.random().toString(36).substring(2, 11);
    const mime = file.type.toLowerCase();
    const name = file.name;
    const size = file.size;

    let type: MediaType = 'video';
    if (mime.startsWith('audio/')) {
      type = 'audio';
    } else if (mime.startsWith('image/')) {
      type = 'image';
    } else if (mime.startsWith('video/')) {
      type = 'video';
    } else {
      const ext = name.split('.').pop()?.toLowerCase() || '';
      if (['mp3', 'wav', 'aac', 'ogg', 'flac'].includes(ext)) type = 'audio';
      else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) type = 'image';
      else type = 'video';
    }

    const objectUrl = URL.createObjectURL(file);

    if (type === 'image') {
      const { width, height } = await this.probeImage(objectUrl);
      return {
        id,
        name,
        path: objectUrl,
        type,
        size,
        duration: 5,
        width,
        height,
        thumbnailUrl: objectUrl,
        createdAt: Date.now()
      };
    }

    if (type === 'audio') {
      const duration = await this.probeAudio(objectUrl);
      return {
        id,
        name,
        path: objectUrl,
        type,
        size,
        duration,
        audioChannels: 2,
        sampleRate: 48000,
        createdAt: Date.now()
      };
    }

    // Video browser fallback
    const { duration, width, height, thumbnailUrl } = await this.probeVideo(objectUrl);
    return {
      id,
      name,
      path: objectUrl,
      type,
      size,
      duration,
      width,
      height,
      fps: 30,
      thumbnailUrl,
      createdAt: Date.now()
    };
  }

  private static probeImage(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 1920, height: 1080 });
      img.src = url;
    });
  }

  private static probeAudio(url: string): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration || 10);
      };
      audio.onerror = () => resolve(10);
      audio.src = url;
    });
  }

  private static probeVideo(url: string): Promise<{ duration: number; width: number; height: number; thumbnailUrl: string }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      let resolved = false;
      const finish = (result: { duration: number; width: number; height: number; thumbnailUrl: string }) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        finish({
          duration: video.duration || 5,
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          thumbnailUrl: ''
        });
      }, 3500);

      const captureFrame = () => {
        try {
          const w = video.videoWidth || 320;
          const h = video.videoHeight || 180;
          const canvas = document.createElement('canvas');
          const targetW = 320;
          const targetH = Math.round((h / w) * targetW) || 180;
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
            clearTimeout(timer);
            finish({
              duration: video.duration || 5,
              width: w,
              height: h,
              thumbnailUrl
            });
            return;
          }
        } catch (e) {
          console.warn('Could not generate canvas thumbnail:', e);
        }
        clearTimeout(timer);
        finish({
          duration: video.duration || 5,
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          thumbnailUrl: ''
        });
      };

      video.onloadeddata = () => {
        const duration = video.duration || 5;
        const targetTime = Math.min(0.5, duration / 2);
        if (Math.abs(video.currentTime - targetTime) < 0.05) {
          captureFrame();
        } else {
          video.currentTime = targetTime;
        }
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onerror = () => {
        clearTimeout(timer);
        finish({ duration: 5, width: 1920, height: 1080, thumbnailUrl: '' });
      };

      video.src = url;
    });
  }
}
