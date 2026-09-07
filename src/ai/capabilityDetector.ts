import { AiCapabilities } from './types';

class CapabilityDetector {
  private capabilities: AiCapabilities | null = null;

  async detectCapabilities(): Promise<AiCapabilities> {
    if (this.capabilities) return this.capabilities;

    const webGpuAvailable = 'gpu' in navigator;
    
    // Simple WebGL check
    const canvas = document.createElement('canvas');
    const webGlAvailable = !!(window.WebGLRenderingContext && 
                             (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    
    const cpuCores = navigator.hardwareConcurrency || 4;
    
    // deviceMemory is in GB
    // @ts-ignore
    const deviceMemoryGb = navigator.deviceMemory || 8; 
    const memoryLimitMb = deviceMemoryGb * 1024;

    const preferredBackend = webGpuAvailable ? 'webgpu' : (webGlAvailable ? 'webgl' : 'wasm');
    const deviceString = webGpuAvailable ? 'GPU — WebGPU' : 'CPU — WASM Fallback';

    this.capabilities = {
      webGpuAvailable,
      webGlAvailable,
      cpuCores,
      memoryLimitMb,
      preferredBackend,
      deviceString
    };

    return this.capabilities;
  }

  getCapabilities(): AiCapabilities | null {
    return this.capabilities;
  }
}

export const capabilityDetector = new CapabilityDetector();
