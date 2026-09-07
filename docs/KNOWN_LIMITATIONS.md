# FREECUT Alpha 1.0 — Known Limitations

## Overview

This document provides a transparent, evidence-based disclosure of known limitations, deferred capabilities, and platform-specific behaviors in **FREECUT by ROMALABS** (Alpha 1.0).

---

## 1. Packaging & Code Signing Status

* **Unsigned Installer (SmartScreen Warning):**
  * In Alpha 1.0, the Windows `.msi` and executable binaries are not signed with a commercial Extended Validation (EV) code-signing certificate.
  * Windows SmartScreen will display an unrecognized publisher notification ("Windows protected your PC") on first launch. Users must click "More info" -> "Run anyway". Commercial certificate signing is scheduled for Beta 1.0.
* **Local Packaging Toolchain Requirement:**
  * Compiling the native `.msi` package locally requires the Microsoft Visual Studio C++ Build Tools (`link.exe` / Windows SDK). On headless development environments lacking MSVC, automated packaging is offloaded to the GitHub Actions `windows-latest` CI runner.
* **Windows Sandbox Automated Testing:**
  * Automated execution of the `.msi` inside a headless Windows Sandbox runner is pending CI infrastructure provisioning (P2 item).

---

## 2. Local AI & Machine Learning Architecture

* **First-Run Weight Download:**
  * To preserve a lightweight ~100 MB desktop installer, pre-trained neural network weights for Whisper (speech-to-text) and CLIPSeg (image segmentation) are not pre-baked into the installer.
  * On first use of these features, the application prompts the user to download the model weights (75 MB – 150 MB) once into the local browser / filesystem cache. After downloading, all inference is 100% offline.
* **CPU / WebAssembly Fallback:**
  * AI inference runs via ONNX Runtime Web using CPU WebAssembly multithreading. Dedicated DirectML / WebGPU neural acceleration will be benchmarked in future releases.
* **MODNet Incompatibility:**
  * Full background video matting via MODNet is superseded by CLIPSeg text-guided image segmentation due to model architecture compatibility constraints with Transformers.js v2.17.

---

## 3. Color Management & HDR

* **SDR Display Tone Mapping:**
  * While FREECUT compiles and exports Rec.2020 and Rec.2100 PQ/HLG color curves, previewing HDR wide color gamuts accurately on standard SDR monitors is bounded by display hardware.
* **ACES / OpenColorIO (OCIO):**
  * Full ACEScc / ACEScct color pipelines and native OpenColorIO configuration transforms are not implemented in Alpha 1.0; grading operates within Rec.709 / Rec.2020 spline and 3D LUT matrices.

---

## 4. Visual Effects & Compositing

* **Point Tracking:**
  * Motion point tracking exists as a foundation-level data structure and keyframe conversion layer; automated visual optical flow tracking will be expanded in Alpha 1.1.
* **Effect Stacking Limit:**
  * Tested smoothly with up to 10 stacked effects per clip. Complex chains exceeding 20 simultaneous filter layers may experience preview frame dropping on budget CPUs.

---

## 5. Media Codecs & Hardware Acceleration

* **Proprietary Codec Licensing:**
  * Exporting Apple ProRes (`prores`) and HEVC (`hevc`) utilizes the bundled FFmpeg encoders. High-throughput hardware-accelerated NVENC/AMF encoding depends on the presence of compatible graphics drivers on the user workstation.
* **Multi-Camera Sync:**
  * Automated audio waveform synchronization across multi-camera shoots is planned for post-1.0 milestones.
