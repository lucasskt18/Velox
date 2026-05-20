# Velox

Real-time speech transcription and translation overlay for Windows and macOS.

## Stack

- **Desktop**: Tauri 2 (Rust + React + TypeScript)
- **Audio**: cpal (microphone capture) + rubato (resample to 16 kHz mono)

## Current status (Phase 1)

- Microphone capture with device selection
- Live waveform + input level meter
- Resample pipeline to 16 kHz mono PCM (ready for streaming STT)

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

1. Phase 1 — Audio capture (current)
2. Phase 2 — Deepgram streaming STT
3. Phase 3 — Always-on-top overlay
4. Phase 4 — Translation layer
