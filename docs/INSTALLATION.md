# FREECUT Alpha 1.0 — Installation & Setup Guide

## Overview

FREECUT is distributed as a standalone, self-contained Windows desktop application. This guide covers installation, first-run initialization, offline operation, and troubleshooting.

---

## 1. System Requirements Check

Before installing FREECUT, verify your workstation meets the following minimum requirements:
* **Operating System:** Windows 10 (version 2004 / build 19041 or higher) or Windows 11 (64-bit).
* **Architecture:** x86_64 (64-bit).
* **RAM:** 8 GB minimum (16 GB recommended for 4K video or AI workflows).
* **Storage:** 2 GB available disk space for the application and bundled FFmpeg/FFprobe binaries.
* **WebView2 Runtime:** Pre-installed on Windows 10/11; automatically updated by Windows Update.

---

## 2. Application Installation

### Standard Windows Installer (.msi)

1. Download the official installer: `FreeCut_1.0.0_x64_en-US.msi`.
2. Double-click the `.msi` file to start the FreeCut Setup Wizard.
3. Follow the on-screen prompts. By default, the application installs to:
   ```
   C:\Program Files\FreeCut\
   ```
4. Once completed, FreeCut can be launched from the Start Menu or the Desktop shortcut.

### Embedded Media Engine (FFmpeg / FFprobe)

* **Zero Configuration:** FREECUT bundles official, self-contained Gyan.dev builds of FFmpeg and FFprobe directly in its application directory (`binaries/`).
* **No PATH Modification:** You do NOT need to install FFmpeg separately or configure your system environment variables. The native Tauri bridge resolves and executes the bundled sidecars automatically.

---

## 3. First Launch & Project Setup

1. Launch **FreeCut** from the Start Menu.
2. The initial window will open at a default resolution of 1400x900 (minimum 1024x700).
3. Click **"New Project"** in the top navigation bar to initialize a blank 6-track project.
4. **Project Storage:**
   * Projects are stored locally as human-readable `.freecut` JSON files.
   * You can save your project anywhere in your user profile (e.g., `Documents\FreeCut Projects`).
   * When sharing projects, ensure your media files are maintained alongside the project file or utilize the **Media Relinker** if media has moved.

---

## 4. Cache & Temporary Directories

FREECUT maintains deterministic cache locations to ensure responsive playback and clean disk usage:
* **Waveform & Thumbnail Cache:** Cached within your user application data directory:
  ```
  %LOCALAPPDATA%\FreeCut\temp-thumbs\
  ```
* **Cache Cleanup:** FreeCut includes an automated cache pruner. Thumbnails older than 24 hours are safely removed without deleting project files or source media assets.

---

## 5. Local AI Features: Installation vs. Optional Model Weights

> [!IMPORTANT]
> **Clear Distinction:**
> 1. **Application Installation:** Installing FreeCut gives you the complete editing suite, timeline, color grading, compositing, audio mixing, and export engine immediately without any network requirement.
> 2. **Optional AI Model Download:** Machine learning features (speech transcription, automated subtitles, and subject segmentation) use neural networks (Whisper and CLIPSeg) running locally via WebAssembly and ONNX Runtime.

### First-Run Model Download Workflow
* If you choose to use the AI Transcription or Subject Segmentation tools, FreeCut will prompt you to download the model weights on first use:
  * **Whisper Tiny English:** ~75 MB
  * **Whisper Base English:** ~145 MB
  * **CLIPSeg Refined:** ~150 MB
* **Offline Execution:** Once downloaded, model weights are stored permanently in the local browser cache / filesystem cache.
* **Network Independence:** Once cached, all subsequent AI inference runs **100% offline** with `allowRemoteModels = false`. No audio, video, or timeline data is ever uploaded to the internet.

---

## 6. Troubleshooting & Common Questions

### 1. Windows SmartScreen Warning
Because Alpha 1.0 builds are distributed without an Extended Validation (EV) code-signing certificate:
* If Windows SmartScreen displays a blue banner ("Windows protected your PC"):
  * Click **"More info"**.
  * Click **"Run anyway"**.

### 2. Missing Media / Red Clip Warnings
* If you moved your video or audio files after saving a project, FreeCut will display an `[OFFLINE]` warning on the affected clips.
* Open the **Relink Media Modal** from the Media Library, select the new folder or replacement file, and FreeCut will re-verify the media duration and restore timeline playback.

### 3. Export Render Errors
* Ensure you have write permissions to your chosen export destination.
* FreeCut validates disk write access and will display specific stderr diagnostics if an export target path is locked by another program.

---

## 7. Uninstallation

1. Open **Windows Settings** -> **Apps** -> **Installed apps**.
2. Locate **FreeCut**.
3. Click the three dots menu and select **Uninstall**.
4. The uninstaller will remove all application binaries and sidecars. Your saved `.freecut` project files and media will remain untouched.
