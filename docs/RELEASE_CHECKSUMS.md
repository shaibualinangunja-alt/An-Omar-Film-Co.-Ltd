# FREECUT Alpha 1.0 — Release Verification & Checksums

## Overview

To guarantee binary integrity and protect users against transmission corruption or unauthorized tampering, FREECUT publishes SHA-256 cryptographic hashes for all official release artifacts.

---

## What is Hashed

The following files are hashed upon successful completion of the automated CI/CD release build:
1. **Windows Installer Package (.msi):**
   `FreeCut_1.0.0_x64_en-US.msi`
2. **NSIS Setup Package (.exe):**
   `FreeCut_1.0.0_x64-setup.exe` (where generated)
3. **Standalone Production Executable (.exe):**
   `freecut.exe`
4. **Bundled Media Engine Sidecars:**
   * `ffmpeg-x86_64-pc-windows-msvc.exe`
   * `ffprobe-x86_64-pc-windows-msvc.exe`

---

## When Hashes Are Generated

* Hashes are computed automatically by the release pipeline (`.github/workflows/windows-release.yml`) immediately after `npx @tauri-apps/cli@1 build` completes on the isolated Windows runner.
* The output is written to `RELEASE_ARTIFACT_HASHES.txt` and uploaded alongside the release binaries.

---

## How to Verify Downloaded Artifacts

Users and system administrators can verify downloaded files using standard command-line tools:

### Windows PowerShell

Run the following command in PowerShell targeting your downloaded file:

```powershell
Get-FileHash -Path .\FreeCut_1.0.0_x64_en-US.msi -Algorithm SHA256
```

Compare the printed `Hash` output against the published hash in `RELEASE_ARTIFACT_HASHES.txt`.

### Windows Command Prompt (`certutil`)

```cmd
certutil -hashfile FreeCut_1.0.0_x64_en-US.msi SHA256
```

### Linux / macOS (for cross-platform verification)

```bash
sha256sum FreeCut_1.0.0_x64_en-US.msi
# or on macOS:
shasum -a 256 FreeCut_1.0.0_x64_en-US.msi
```

---

## Baseline Hashes for Bundled Sidecars (Gyan.dev 8.1.1)

For reference, the verified SHA-256 hashes of the bundled sidecars in `src-tauri/binaries/` are:

* `ffmpeg-x86_64-pc-windows-msvc.exe`:
  `24806A3F987D0E6C4C319E306BCDA300E190875DE1F00F48DFF4558FBFCFF65E`
* `ffprobe-x86_64-pc-windows-msvc.exe`:
  `DFCE2109FD96DF3EF7FFBCB26FCD4753556FE170EB6252C327850D51CA5CCFF5`
