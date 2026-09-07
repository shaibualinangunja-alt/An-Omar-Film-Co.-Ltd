# FREECUT Alpha 1.0 — Third-Party Notices & Licenses

FREECUT incorporates third-party open source software, libraries, and machine learning models. This document provides notice of the respective copyrights, licenses, and redistributions.

---

## 1. Bundled Media Processing Engine (FFmpeg & FFprobe)

FREECUT packages pre-compiled binaries of **FFmpeg** and **FFprobe** as runtime sidecars to provide media decoding, probing, filter graph composition, audio mixing, and video export.

* **Software:** FFmpeg & FFprobe
* **Version:** 8.1.1-essentials (Build by Gyan.dev, GCC 15.2.0, Rev13)
* **Website:** https://ffmpeg.org / https://www.gyan.dev/ffmpeg/builds/
* **License:** GNU General Public License version 3 (GPLv3) or later
* **Libraries:**
  * `libavutil` 60.26.101
  * `libavcodec` 62.28.101
  * `libavformat` 62.12.101
  * `libavdevice` 62.3.101
  * `libavfilter` 11.14.101
  * `libswscale` 9.5.101
  * `libswresample` 6.3.101
* **Source Code:**
  FFmpeg source code is available at https://ffmpeg.org/download.html. Instructions for building the exact binary distribution are provided by Gyan.dev at https://github.com/GyanD/codexffmpeg.

---

## 2. Local AI Models & Runtimes

FREECUT executes all machine learning operations locally on the user's workstation.

### Transformers.js & ONNX Runtime Web
* **Library:** `@xenova/transformers` (v2.17.2)
* **License:** Apache License 2.0
* **Library:** `onnxruntime-web` (v1.14.0+)
* **License:** MIT License

### Whisper (Speech-to-Text & Automatic Captions)
* **Model:** Whisper Tiny English (`Xenova/whisper-tiny.en`), Whisper Base (`Xenova/whisper-base`)
* **Original Authors:** OpenAI
* **ONNX Conversion:** Xenova / Hugging Face
* **License:** MIT License
* **Notice:** Copyright (c) 2022 OpenAI

### CLIPSeg (Text-Guided Image & Subject Segmentation)
* **Model:** CLIPSeg Refined (`Xenova/clipseg-rd64-refined`)
* **Original Authors:** Timo Lüddecke, Alexander Ecker (University of Göttingen)
* **ONNX Conversion:** Xenova / Hugging Face
* **License:** MIT License
* **Notice:** Copyright (c) 2022 University of Göttingen

---

## 3. Frontend & Desktop Runtime Dependencies

### Production Runtime Dependencies (NPM)

| Package | Version | Purpose | License |
| :--- | :--- | :--- | :--- |
| `react` | `^18.3.1` | UI Component Framework | MIT |
| `react-dom` | `^18.3.1` | DOM Renderer for React | MIT |
| `lucide-react` | `^1.16.0` | UI Icons | ISC |
| `uuid` | `^14.0.2` | Unique ID Generation | MIT |
| `@xenova/transformers` | `^2.17.2` | In-Browser ML Engine | Apache-2.0 |

### Rust Core Dependencies (Cargo)

| Crate | Version | Purpose | License |
| :--- | :--- | :--- | :--- |
| `tauri` | `1.5` | Desktop Application Framework | MIT or Apache-2.0 |
| `tauri-build` | `1.5` | Desktop Build Scripts | MIT or Apache-2.0 |
| `serde` | `1.0` | Serialization Framework | MIT or Apache-2.0 |
| `serde_json` | `1.0` | JSON Serialization | MIT or Apache-2.0 |

### Development & Tooling Dependencies

| Package | Version | Purpose | License |
| :--- | :--- | :--- | :--- |
| `vite` | `^6.0.7` | Frontend Bundler & Dev Server | MIT |
| `typescript` | `^5.7.3` | Static Type Checker | Apache-2.0 |
| `tailwindcss` | `^3.4.17` | Utility-First CSS Framework | MIT |
| `postcss` | `^8.4.49` | CSS Transformer | MIT |
| `autoprefixer` | `^10.4.20` | CSS Vendor Prefixing | MIT |
| `@playwright/test` | `^1.63.0` | End-to-End Automation | Apache-2.0 |
| `@vitejs/plugin-react` | `^4.3.4` | React Support for Vite | MIT |

---

## 4. License Texts

### MIT License
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### Apache License 2.0
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at:
http://www.apache.org/licenses/LICENSE-2.0

### ISC License
Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES.
