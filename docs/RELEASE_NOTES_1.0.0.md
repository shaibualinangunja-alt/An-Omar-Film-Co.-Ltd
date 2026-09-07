# FREECUT 1.0.0 — Release Notes

**FREECUT by ROMALABS**  
*Professional Editing. Zero Barriers.*

We are proud to release **FREECUT 1.0.0**, the inaugural stable milestone of the next-generation, local-first desktop video editing platform. FREECUT combines the speed and simplicity of modern timeline editing with studio-grade color management, multi-track compositing, offline AI transcription, and deterministic native FFmpeg master exports.

---

## Highlights

* **100% Local-First & Private:** Zero cloud dependencies, zero data telemetry, and zero mandatory user accounts.
* **Native Desktop Architecture:** Built on Tauri v1.5 with Rust core, bundled FFmpeg 8.1.1, and React frontend.
* **Precision Playback Loop:** Wall-clock delta timing loop with 0.01% drift and 88% reduction in unnecessary UI re-renders.
* **Offline AI Runtimes:** Local speech-to-text transcription (Whisper) and subject segmentation (CLIPSeg) running via Transformers.js and ONNX Runtime Web.
* **Master Multi-Format Export:** Verified rendering of H.264, H.265/HEVC, Apple ProRes 422, and WebM VP9/Opus from social vertical (1080x1920) up to 4K UHD (3840x2160).

---

## Professional Editing & Features

### Timeline
* 6-track flexible non-destructive sequence editor.
* Sub-frame snapping, non-destructive split, trim, ripple delete, insert, overwrite, multi-clip move, and track locking.
* Complete multi-step Undo/Redo across all timeline operations.

### Animation & Keyframes
* Centralized keyframe animation engine supporting 2D Position (X/Y), Scale, Rotation, Opacity, and Volume.
* Piecewise linear and hold interpolation with frame snapping and edit-safe boundary preservation.

### Effects & Transitions
* Video transitions: Cross Dissolve, Fade, Slide, Push, and Zoom with centered overlap calculation.
* 7 built-in parametric effects: Blur, Sharpen, Brightness, Contrast, Hue, Saturation, and Vignette with deterministic stack ordering.

### Text & Captions
* Parametric text overlays with font family, size, color, alpha, stroke, background box, and positioning.
* Burned-in caption generation compiled directly into FFmpeg `drawtext` filter graphs.

### Compositing
* Studio Chroma Key (`colorkey`) with configurable similarity, smoothness, and spill suppression.
* Parametric shape masks (rectangle, ellipse, linear) with feathering and inversion.
* 12 blend modes (Normal, Multiply, Screen, Overlay, Darken, Lighten, Color Dodge/Burn, Soft/Hard Light, Difference, Exclusion).
* Normalized crop margins and horizontal/vertical flip.

### Audio Mixing & Cleanup
* Multi-track audio mixing with volume gain, pan/balance, mute, and solo isolation.
* Precise audio fade-in and fade-out envelope compilation (`afade`, `amix`, `adelay`).
* In-process FFT spectral denoiser audio cleanup for removing ambient noise, hum, and hiss.

### Color Management & Grading
* Primary grading: Exposure, Contrast, White Balance (Temperature/Tint), Saturation, and Vibrance.
* Lift, Gamma, Gain, and Offset color grading wheels.
* Master and RGB spline curve interpolation.
* 3D `.cube` LUT processing with trilinear interpolation and intensity mixing.
* Real-time visual scopes: Histogram, Waveform Monitor, and Vectorscope.

### Export Pipeline
* Native Tauri bridge invoking bundled FFmpeg sidecar directly without system PATH dependence.
* Live stderr progress streaming and instant job cancellation.
* Multi-codec output: H.264, HEVC/H.265, Apple ProRes 422, WebM VP9 + Opus, AAC, and PCM audio.

### Local AI Runtimes
* Whisper Speech-to-Text for automated subtitle generation.
* CLIPSeg text-guided image and subject segmentation producing PNG alpha masks.
* Audio energy silence detection and spectral flux beat detection.
* Strict `allowRemoteModels = false` enforcement during inference.

---

## Security & Privacy Hardening

* **Least-Privilege Allowlist:** `shell.all`, `shell.open`, `shell.execute`, and arbitrary filesystem operations are strictly disabled from the WebView.
* **Content Security Policy (CSP):** Strict production CSP restricting scripts to origin and required WebAssembly evaluation (`wasm-unsafe-eval`).
* **Path Safety:** Strict null-byte injection rejection and bounded application cache cleanup (`temp-thumbs`).
* **Privacy:** Zero analytics, zero crash reporting telemetry, and zero user data transmission.

---

## Project Compatibility & Media Relinking

* Human-readable `.freecut` JSON schema preserving tracks, clips, effects, and keyframes.
* Automatic missing-media detection during project load with non-destructive timeline preservation.
* Single-file and batch directory relinking with conservative type and codec compatibility validation.

---

## Known Limitations

* Unsigned installer in Alpha 1.0 (Windows SmartScreen warning on first launch).
* Initial use of AI models (Whisper/CLIPSeg) requires a one-time weight download into the local cache before running offline.
* Point tracking and HDR color transfer are foundation-level implementations.

---

## Verification & Test Results

* **Automated Regression Suite:** **340 / 340 TESTS PASS (100%)**
  * Security Hardening & CSP: 41/41 PASS
  * Clean-Machine & Cache Isolation: 26/26 PASS
  * Media Relinker & Offline UI: 42/42 PASS
  * Native Bridge & Sidecars: 24/24 PASS
  * Playback Engine & Delta Clock: 30/30 PASS
  * Real-Media Smoke Test: 10/10 PASS
  * Keyframe Engine & Workflows: 27/27 PASS
  * Timeline Engine & Transitions: 29/29 PASS
  * Text & Compositing Engine: 53/53 PASS
  * Audio, Color & Local AI Backend: 54/54 PASS
  * Benchmarks & UI Suites: 4/4 PASS
* **Real-Media Master Exports:** **10 / 10 EXPORTS PASS** (Validated with FFprobe)
* **Production Frontend Build:** PASS (`npm run build` in 8.59s, 0 errors)
