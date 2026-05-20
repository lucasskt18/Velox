# Velox

Real-time speech transcription and translation overlay for Windows and macOS.

## Stack

- **Desktop**: Tauri 2 (Rust + React + TypeScript)
- **Audio**: cpal (microphone capture) + rubato (resample to 16 kHz mono)

## Current status (Phase 2.2)

- Microphone capture with device selection
- Live waveform + input level meter
- Resample pipeline to 16 kHz mono PCM
- Audio chunk aggregation (500 ms windows)
- Whisper model download script (`ggml-base-q5_1.bin`)

## Whisper model (one-time setup)

```bash
npm run download-model
```

This downloads ~57 MB to `models/ggml-base-q5_1.bin` (not committed to git).

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install)
- macOS: Xcode Command Line Tools (for native builds)

## Development

```bash
npm install
npm run tauri dev
```

On first run, macOS will ask for **Microphone** permission — required for capture.

## Project structure

```
src/                 React frontend
src-tauri/src/audio/ Rust audio engine (capture + resample)
```

## Roadmap

1. Phase 1 — Audio capture ✅
2. Phase 2.1 — Chunk pipeline ✅
3. Phase 2.2 — Model download ✅
4. Phase 2.3 — Whisper transcription
5. Phase 3 — Always-on-top overlay
6. Phase 4 — Translation layer
