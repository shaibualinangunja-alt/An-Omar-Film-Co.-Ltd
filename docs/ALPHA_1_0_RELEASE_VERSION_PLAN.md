# FREECUT Alpha 1.0 — Release Version Transition Plan

## Overview

This plan defines the explicit transition process from Release Candidate 1 (`1.0.0-rc1`) to the Final General Availability release (`1.0.0`) of **FREECUT by ROMALABS**.

Per the release governance rules, the codebase remains designated under candidate validation until final release sign-off. This document maps all manifests, configuration files, and documentation that govern version identity.

---

## Current Version State (RC1 Baseline)

| Component / Manifest | Current Configured Value | SemVer Format |
| :--- | :--- | :--- |
| `package.json` (`version`) | `"1.0.0"` | Base SemVer (RC1 Tag) |
| `src-tauri/Cargo.toml` (`version`) | `"1.0.0"` | Cargo SemVer |
| `src-tauri/tauri.conf.json` (`package.version`) | `"1.0.0"` | Tauri Packager SemVer |
| Release Candidate Designation | `1.0.0-rc1` | Release Git Tag / Release Candidate |
| Desktop Window Title | `FreeCut - Professional Editing. Zero Barriers.` | Display Title |
| Target Product Identifier | `com.freecut.editor` | Reverse-DNS Bundle ID |

---

## Release Transition Map (RC1 → 1.0.0 Final)

When the final release decision is executed, the following files and metadata fields will be updated and locked:

### 1. Frontend Application Manifest
* **File:** [`package.json`](file:///c:/Users/Administrator/.antigravity-ide/An-Omar-Film-Co.-Ltd/package.json)
* **Current:** `"version": "1.0.0"`
* **Final Target:** `"version": "1.0.0"` (Locked production release)

### 2. Rust Core Manifest
* **File:** [`src-tauri/Cargo.toml`](file:///c:/Users/Administrator/.antigravity-ide/An-Omar-Film-Co.-Ltd/src-tauri/Cargo.toml)
* **Current:** `version = "1.0.0"`
* **Final Target:** `version = "1.0.0"`

### 3. Tauri Desktop Configuration
* **File:** [`src-tauri/tauri.conf.json`](file:///c:/Users/Administrator/.antigravity-ide/An-Omar-Film-Co.-Ltd/src-tauri/tauri.conf.json)
* **Field:** `"package": { "version": "1.0.0", "productName": "FreeCut" }`
* **Final Target:** `"1.0.0"` (Ensures Windows Installer MSI product version `1.0.0`)

### 4. Git Release Tag
* **Current:** Branch `main` with Candidate Tag `v1.0.0-rc1`
* **Final Target:** Release Tag `v1.0.0` pushed to GitHub remote `origin`

### 5. Windows CI/CD Output Packages
* **Installer:** `FreeCut_1.0.0_x64_en-US.msi`
* **Standalone Executable:** `freecut.exe`
* **Checksum Manifest:** `RELEASE_ARTIFACT_HASHES.txt`

---

## Transition Verification Checklist

Before locking the release tag `v1.0.0`:
1. [x] Full automated regression test suite passes (340/340 PASS).
2. [x] All 10 real media exports pass verification with FFprobe.
3. [x] Production bundle builds cleanly (`npm run build`).
4. [x] Bundled FFmpeg and FFprobe binaries are present in `src-tauri/binaries/`.
5. [x] Security allowlists remain strictly restricted (least privilege).
6. [x] Content Security Policy (CSP) is active and verified.
7. [x] Privacy audit confirms zero remote telemetry or tracking endpoints.
8. [ ] Execute Git tag creation: `git tag -a v1.0.0 -m "FREECUT Alpha 1.0 General Availability"` (Post-sign-off).
