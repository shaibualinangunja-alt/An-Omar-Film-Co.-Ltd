# FREECUT Alpha 1.0 — Manual QA Checklist

This checklist provides a structured end-to-end verification plan for manual quality assurance of the packaged Windows desktop application.

---

### 1. Launch & Initialization
* [ ] **Install:** Run `FreeCut_1.0.0_x64_en-US.msi` and verify successful setup.
* [ ] **Launch:** Open FreeCut from Desktop shortcut; verify window renders at 1400x900 without white flashes or crashes.
* [ ] **Create Project:** Click "New Project"; verify blank 6-track timeline initializes at 0.0s.

### 2. Media Ingest & Preview
* [ ] **Import Media:** Drag and drop MP4 video and WAV audio into Media Library.
* [ ] **Preview:** Play video in preview player; verify smooth playback without stutter.
* [ ] **Seek:** Scrub playhead across timeline; confirm instant preview updating.
* [ ] **Frame Step:** Use Left/Right arrow keys; verify frame-by-frame advancement.

### 3. Timeline Editing Operations
* [ ] **Trim:** Drag in/out clip handles; verify duration updates non-destructively.
* [ ] **Split:** Position playhead at 2.0s and press Split (`Ctrl+B`); verify 2 separate clips.
* [ ] **Move:** Drag clip to another track or offset; verify relative timing is preserved.
* [ ] **Ripple Delete:** Delete middle clip; verify trailing clips close the gap.
* [ ] **Undo:** Press `Ctrl+Z`; verify previous action is reversed cleanly.
* [ ] **Redo:** Press `Ctrl+Y` / `Ctrl+Shift+Z`; verify action is restored.

### 4. Creative Overlays & Effects
* [ ] **Text:** Add text overlay; customize font, size, fill color, and border.
* [ ] **Captions:** Add subtitle blocks; verify timing alignment with dialogue.
* [ ] **Keyframes:** Add scale/opacity keyframes at 1s and 3s; verify smooth motion during playback.
* [ ] **Effects:** Apply Gaussian Blur; adjust radius slider and verify real-time preview.
* [ ] **Transitions:** Add Cross Dissolve between adjacent clips; check smooth blending.
* [ ] **Mask:** Apply Ellipse Mask; verify shape cutout and feather slider.
* [ ] **Chroma Key:** Import green screen clip; pick green color and adjust similarity.
* [ ] **Blend Mode:** Set overlay track to "Screen"; check luminance blending.
* [ ] **Crop / Flip:** Adjust crop margins and toggle horizontal flip (`hflip`).

### 5. Audio Mixing & Cleanup
* [ ] **Volume:** Adjust clip dB gain slider; verify volume adjustment during playback.
* [ ] **Fade:** Drag audio fade handles; verify smooth audio fade-in/out.
* [ ] **Mixing:** Play concurrent music and speech tracks; verify proper summing.
* [ ] **Cleanup:** Enable Audio Cleanup (spectral denoiser); verify reduction of background hiss.

### 6. Color Grading & Scopes
* [ ] **Quick Grade:** Click Auto-Color; verify balanced contrast and exposure.
* [ ] **Color Wheels:** Adjust Lift (shadows) and Gain (highlights) color wheels.
* [ ] **Curves:** Adjust Master and RGB spline curve points.
* [ ] **HSL:** Shift saturation and hue for specific color ranges (e.g. greens).
* [ ] **LUT:** Load a `.cube` 3D LUT file; verify trilinear color transform.
* [ ] **Scopes:** Toggle Histogram, Waveform Monitor, and Vectorscope panels.

### 7. Local Offline AI Tools
* [ ] **Transcription:** Run speech-to-text; verify transcript segments and timestamps.
* [ ] **Caption Generation:** Convert transcript segments into timeline captions.
* [ ] **Silence Detection:** Run silence analysis; verify detected quiet zones.
* [ ] **Scene Detection:** Run scene cut detection; verify split markers.
* [ ] **Beat Detection:** Run beat detection; verify audio tempo markers on timeline.
* [ ] **Subject Segmentation:** Generate subject mask using CLIPSeg; verify PNG alpha mask.

### 8. Project Persistence & Relinking
* [ ] **Save:** Save project to `.freecut` file; confirm file is written to disk.
* [ ] **Close:** Completely exit FreeCut.
* [ ] **Reopen:** Launch FreeCut and open the saved project; verify all 6 tracks, clips, and edits restore.
* [ ] **Relink Missing Media:** Move a source media file; reopen project, verify `[OFFLINE]` warning, and relink via Relink Modal.

### 9. Export & Verification
* [ ] **Export:** Configure 1080p H.264 export; start render and verify live progress percentage.
* [ ] **Verify Output:** Play rendered video in Windows Media Player; verify video/audio sync.
* [ ] **Cancel Export:** Start a long export and click Cancel; verify immediate termination and clean exit.
