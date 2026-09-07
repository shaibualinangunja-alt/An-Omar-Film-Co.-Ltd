# FREECUT Alpha 1.0 — Windows Desktop CI/CD Release Pipeline

## Pipeline Overview

This document defines the automated Windows Desktop continuous integration, packaging, and release pipeline for **FREECUT by ROMALABS** (Alpha 1.0). The pipeline ensures deterministic, reproducible builds of the production desktop application and installer outside any developer machine environment.

## 1. CI Platform & Infrastructure

* **CI Platform:** GitHub Actions
* **Configuration File:** `.github/workflows/windows-release.yml`
* **Workflow Triggers:**
  * Git pushes to `main` branch
  * Git tags following `v*` (e.g. `v1.0.0-rc1`)
  * Pull requests targeting `main`
  * Manual triggers via `workflow_dispatch`
* **Runner Environment:** `windows-latest` (Windows Server 2022 / 2025, x86_64 architecture)
* **Pre-installed Runner Toolchain:**
  * Microsoft Visual Studio 2022 Enterprise (MSVC C++ Build Tools, `link.exe`, `cl.exe`)
  * Windows 10/11 SDK
  * WiX Toolset v3 (for Windows Installer `.msi` packaging)

## 2. Required Build Dependencies

The pipeline explicitly provisions and isolates all build dependencies:
1. **Node.js Environment:**
   * Version: Node.js 20 LTS (via `actions/setup-node@v4`)
   * Package Manager: NPM with automated cache management (`npm ci`)
2. **Rust Compiler Toolchain:**
   * Version: Rust Stable (`dtolnay/rust-toolchain@stable`)
   * Target Architecture: `x86_64-pc-windows-msvc`
   * Cargo Compilation Cache: `Swatinem/rust-cache@v2`
3. **Tauri CLI:**
   * `@tauri-apps/cli@1` (Tauri v1.5 compatible build tool)

## 3. Sidecar Binary Packaging Strategy (FFmpeg / FFprobe)

* **Binaries Required:**
  * `ffmpeg-x86_64-pc-windows-msvc.exe`
  * `ffprobe-x86_64-pc-windows-msvc.exe`
* **Target Triple Placement:** `src-tauri/binaries/`
* **Source:** Official Gyan.dev Essentials build (FFmpeg v8.1.1, gcc 15.2.0, Rev13)
* **CI Verification Step:** The pipeline inspects `src-tauri/binaries/`. If binaries are missing or omitted from the repository tree, the pipeline automatically fetches the official release archive, verifies internal binaries, and populates the target-triple binaries before Tauri bundling.
* **PATH Independence:** Packaged applications invoke the sidecar binaries directly via Tauri's internal process API without relying on system PATH.

## 4. Build Commands & Packaging Execution

1. **Frontend Production Build:**
   ```bash
   npm run build
   ```
   Compiles TypeScript (`tsc`) and bundles optimized web assets into `dist/` via Vite.
2. **Security & Regression Gate:**
   Executes automated pre-packaging regression suites:
   * `test-security-hardening.ts`
   * `test-clean-machine-cache.ts`
   * `test-relink-media.ts`
   * `test-alpha10-step2-bridge.ts`
   * `test-playback-engine.ts`
   * `test-smoke-alpha10.ts`
3. **Tauri Packaging Command:**
   ```bash
   npx @tauri-apps/cli@1 build
   ```
   Invokes `cargo build --release` with MSVC linker, packages web assets from `dist/`, bundles sidecars from `src-tauri/binaries/`, and generates the Windows installer via WiX.

## 5. Artifact Outputs & Locations

* **Windows Installer (.msi):**
  `src-tauri/target/release/bundle/msi/FreeCut_1.0.0_x64_en-US.msi`
* **NSIS Setup Installer (.exe):**
  `src-tauri/target/release/bundle/nsis/FreeCut_1.0.0_x64-setup.exe` (where configured)
* **Standalone Binary:**
  `src-tauri/target/release/freecut.exe`
* **Checksum Manifest:**
  `src-tauri/target/release/RELEASE_ARTIFACT_HASHES.txt` (SHA-256 hashes generated post-build)

## 6. Code Signing Status

* **Status:** **UNCONFIGURED (Self-Signed / Test Sign in Alpha 1.0)**
* **Details:** Official EV (Extended Validation) code signing certificates require private hardware tokens (HSM / Azure Key Vault / DigiCert ONE). In Alpha 1.0, release artifacts are generated unsigned or test-signed. Code signing will be integrated in Beta production deployment.

## 7. Versioning Alignment

All manifests must maintain synchronized version strings:
* `package.json`: `"version": "1.0.0"` (or `1.0.0-rc1`)
* `src-tauri/Cargo.toml`: `version = "1.0.0"`
* `src-tauri/tauri.conf.json`: `"package": { "version": "1.0.0", "productName": "FreeCut" }`

## 8. Clean-Machine Installation Procedure

To validate a generated installer on an isolated Windows environment (e.g. Windows Sandbox or fresh Windows VM):
1. **Pre-condition:** Verify the test machine has NO Node.js, Rust, Git, or Antigravity installed.
2. **Transfer:** Copy `FreeCut_1.0.0_x64_en-US.msi` to the test machine.
3. **Run Installer:** Double-click the `.msi` package and complete installation.
4. **Launch:** Launch `FreeCut` from the Start Menu or Desktop shortcut.
5. **Verify Lifecycle:**
   * Confirm UI renders cleanly with zero developer console errors.
   * Ingest sample video (`.mp4`) and place on timeline.
   * Perform non-destructive splits and trims.
   * Save project (`.freecut`) and restart application.
   * Reopen project and verify timeline integrity.
   * Render real export (`.mp4`) and verify playback with Windows Media Player.

## 9. Troubleshooting & Diagnostics

* **Linker Error (`link.exe not found`):** Occurs when compiling locally without Visual Studio C++ Build Tools. Solution: Build on GitHub Actions `windows-latest` runner or install "Desktop development with C++" workload via Visual Studio Installer.
* **Sidecar Execution Rejection:** Verify that `src-tauri/binaries/` contains binaries with the exact target-triple suffix: `ffmpeg-x86_64-pc-windows-msvc.exe`.
