# FREECUT Alpha 1.0 — System Requirements

## Overview

This specification defines the hardware and operating system requirements verified for **FREECUT by ROMALABS** (Alpha 1.0).

---

## Operating System

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 64-bit (Build 19041+) | Windows 11 64-bit (Build 22621+) |
| **Architecture** | x86_64 (64-bit Intel/AMD) | x86_64 (64-bit Intel/AMD) |
| **Windows Subsystem** | Microsoft Edge WebView2 Runtime | Microsoft Edge WebView2 Runtime |

*Note on ARM64:* Windows on ARM is currently running via x86_64 emulation; native ARM64 compilation is not formally benchmarked.

---

## Hardware Specifications

### Processor (CPU)
* **Minimum:** Quad-Core Intel Core i5 (8th Gen+) or AMD Ryzen 5 (2000 series+).
* **Recommended:** 6-Core / 12-Thread Intel Core i7 or AMD Ryzen 7 (or higher).
* **Reasoning:** Media decoding, audio filtering, spectral denoiser processing, and CPU-based ONNX/WASM AI inference utilize multi-core concurrency.

### Memory (RAM)
* **Minimum:** 8 GB RAM (sufficient for 1080p SDR timelines and light editing).
* **Recommended:** 16 GB to 32 GB RAM (required for 4K UHD video, multi-stream compositing, and running Whisper/CLIPSeg models in memory).

### Graphics Processing Unit (GPU)
* **Minimum:** Integrated Intel UHD Graphics 630 / AMD Radeon Vega Graphics with DirectX 11 support.
* **Recommended:** Dedicated GPU: NVIDIA GeForce GTX 1660 / RTX 3060 (6 GB+ VRAM) or AMD Radeon RX 6600 (or higher).
* **GPU Acceleration Status:** FFmpeg hardware acceleration (`h264_nvenc`, `hevc_nvenc`, `amf`, `dxva2`, `d3d11va`) is enabled in the bundled Gyan.dev FFmpeg binary and utilized automatically where hardware drivers support it.

### Storage
* **Application Installation:** ~2.0 GB free disk space (includes application bundle and ~200 MB of bundled FFmpeg/FFprobe binaries).
* **Optional AI Model Weights:**
  * Whisper Tiny English: ~75 MB
  * Whisper Base English: ~145 MB
  * CLIPSeg Segmentation: ~150 MB
* **Media & Scratch Drive:** High-speed NVMe PCIe SSD strongly recommended for 4K timeline scrubbing and multi-track audio playback.

### Display
* **Minimum Resolution:** 1280 x 800 pixels.
* **Recommended Resolution:** 1920 x 1080 (Full HD) or 2560 x 1440 (QHD) / 3840 x 2160 (4K).
* **Color Accuracy:** Standard sRGB 100% display recommended for primary color grading. HDR preview capabilities on standard SDR monitors are tone-mapped; native Rec.2100 PQ/HLG hardware displays are not formally benchmarked.

---

## Performance Notes & Limitations

* **30Hz Playback Loop:** Measured clock drift is under 0.02% with selective UI subscriptions.
* **Timeline Clip Concurrency:** Tested smoothly up to 50 active timeline clips across 6 tracks. Workloads with >200 concurrent clips are not formally benchmarked.
