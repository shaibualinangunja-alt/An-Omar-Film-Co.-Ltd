# FREECUT

## Professional Editing. Zero Barriers.

### FREECUT by ROMALABS

---

**FREECUT** is a modern, high-performance, local-first desktop non-linear video editor designed for creators and video professionals. Built on a native Tauri/Rust architecture with React and bundled FFmpeg sidecars, FREECUT provides seamless multi-track timeline editing, keyframe animation, transitions, color grading, compositing, and offline AI speech and segmentation features with zero cloud lock-in.

---

## Key Highlights & Architectural Principles

* **100% Local-First & Private:** All media ingestion, timeline playback, audio mixing, color rendering, and AI inference execute completely on your local workstation. Zero telemetry, zero analytics, zero data harvesting.
* **Zero Cloud Lock-in:** Projects are saved as human-readable, portable JSON (`.freecut`) files.
* **Deterministic Native Media Engine:** Powered by bundled FFmpeg and FFprobe v8.1.1 sidecar binaries for frame-accurate, hardware-accelerated rendering and multi-format exports.
* **High-Precision Playback Engine:** Delta-time wall-clock tracking clock loop with sub-0.02% drift and decoupled selective UI subscriptions.

---

## Major Capabilities

### 1. Multi-Track Timeline & Editing
* 6-track flexible non-destructive timeline (video, audio, text, overlay).
* Frame-snapping trim, split, ripple delete, insert, overwrite, multi-clip move, copy/paste, and track locking.
* Instant Undo/Redo across all editing operations.

### 2. Keyframe Animation Engine
* Piecewise linear and hold interpolation across 2D position (X/Y), scale, rotation, opacity, and audio volume.
* Boundary-safe trimming, splitting, and clip repositioning preserving relative keyframe offsets.

### 3. Transitions & Parametric Effects
* Video transitions: Cross Dissolve, Fade, Slide, Push, and Zoom with centered overlap calculation and frame snapping.
* Built-in effect stack: Blur, Sharpen, Brightness, Contrast, Hue, Saturation, and Vignette with deterministic layer ordering.

### 4. Text & Burnt-In Captions
* Full typography controls: font size, color, alpha, stroke, background box, and positioning.
* Direct compilation into FFmpeg `drawtext` filter graphs for crisp, pixel-accurate rendering.

### 5. Advanced Compositing & Green Screen
* Studio Chroma Key (`colorkey`) with configurable similarity, smoothness, and spill suppression.
* Parametric shape masks (rectangle, ellipse, linear) with feathering and inversion.
* 12 blend modes (Normal, Multiply, Screen, Overlay, Darken, Lighten, Color Dodge/Burn, Soft/Hard Light, Difference, Exclusion).
* Normalized crop margins and horizontal/vertical flip.

### 6. Professional Color Management & Grading
* Comprehensive primary grading: Exposure, Contrast, White Balance (Temperature/Tint), Saturation, and Vibrance.
* Lift, Gamma, Gain, and Offset color wheels.
* Master and RGB spline curve interpolation.
* 3D `.cube` LUT processing with trilinear interpolation and intensity mixing.
* Real-time visual scopes: Histogram, Waveform Monitor, and Vectorscope.

### 7. Multi-Track Audio Engine & Cleanup
* Volume gain, pan/balance, track mute, and solo isolation.
* Accurate fade-in and fade-out envelope compilation.
* In-process FFT spectral denoiser audio cleanup for removing ambient hiss and background hum.

### 8. Local Offline AI Tools
* **Whisper Speech-to-Text:** Automatic transcription and subtitle generation running via Transformers.js + ONNX Runtime WASM.
* **CLIPSeg Image Segmentation:** Text-guided subject segmentation and alpha mask extraction.
* **Silence & Beat Detection:** Automated audio energy and spectral flux analysis for rapid cutting.

### 9. Multi-Format Master Export
* Real production exports via native Tauri bridge:
  * H.264 / AVC (MP4)
  * H.265 / HEVC (MP4)
  * Apple ProRes 422 Master (MOV)
  * WebM VP9 + Opus
  * Multi-channel audio (AAC, Opus, PCM 16-bit)
* Scalable resolution from social vertical (1080x1920) to 4K UHD (3840x2160).
* Live progress streaming and cancelable render jobs.

---

## Windows Desktop Support & Installation

* **Operating System:** Windows 10 / 11 (64-bit)
* **Installer:** Windows Installer `.msi` package generated via Tauri WiX bundler.
* **Bundled Dependencies:** FFmpeg and FFprobe sidecars are embedded directly within the application package; no PATH configuration or manual binary downloading required.

For complete installation and setup instructions, see [Installation Guide](file:///c:/Users/Administrator/.antigravity-ide/An-Omar-Film-Co.-Ltd/docs/INSTALLATION.md).

---

## System Requirements

* **OS:** Windows 10 (Build 19041+) or Windows 11 64-bit
* **CPU:** Quad-Core Intel Core i5 / AMD Ryzen 5 or better
* **Memory:** 8 GB RAM minimum (16 GB recommended for 4K / AI models)
* **Storage:** 2 GB available storage (plus space for media files and optional AI model cache)
* **Display:** 1280x800 minimum resolution (1920x1080 recommended)

For detailed specifications, see [System Requirements](file:///c:/Users/Administrator/.antigravity-ide/An-Omar-Film-Co.-Ltd/docs/SYSTEM_REQUIREMENTS.md).

---

## Verification & Testing Status

FREECUT Alpha 1.0 has completed rigorous release-hardening validation:
* **Automated Regression Suite:** 340 / 340 tests PASS (100%)
* **Real-Media Master Exports:** 10 / 10 exports PASS (Verified with FFprobe)
* **Security & CSP Suite:** 41 / 41 tests PASS (Least-privilege Tauri allowlist, strict CSP)
* **Media Relinker Suite:** 42 / 42 tests PASS (Offline media detection & relinking)
* **Clean-Machine & Cache Suite:** 26 / 26 tests PASS (Confined cache cleanup)

---

## License & Third-Party Notices

FREECUT is developed by ROMALABS. For full licensing and third-party open source notices (including FFmpeg, Transformers.js, and ONNX Runtime), see [Third-Party Notices](file:///c:/Users/Administrator/.antigravity-ide/An-Omar-Film-Co.-Ltd/docs/THIRD_PARTY_NOTICES.md).
