# Web Recorder

A simple web recorder for your landing page website or any other website that has huge height, for your social media or just documenting your job.

Record ultra-smooth, high-framerate website showcase videos (up to 250 FPS) for Instagram Reels, TikTok, Twitter/X, and portfolio product demos using Playwright and FFmpeg.

## Features

- **Buttery Smooth Scroll:** Uses native browser `window.requestAnimationFrame` loop, bypassing standard discrete timer jitter.
- **Ultra High Framerate:** Supports 60 FPS, 100 FPS, up to 150 FPS exports with H.264 / `yuv420p` mobile compatibility.
- **Social Media Ready Presets:**
  - `reels`: 1080x1920 (9:16 mobile)
  - `feed`: 1080x1080 (1:1 square)
  - `desktop`: 1280x800 (16:10 laptop/browser)
- **Zero Configuration for Projects:** Standalone CLI tool. Works on any local dev server (`localhost:5173`, `localhost:3000`) or public live URLs without modifying target projects.
- **Clean Output:** Automatically hides scrollbars and overrides conflicting CSS smooth scroll rules during capture.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [FFmpeg](https://ffmpeg.org/) installed and available in your `PATH`

## Installation

```bash
git clone https://github.com/your-username/web-recorder.git
cd web-recorder
npm install
npx playwright install chromium
```

To use it globally from anywhere:

```bash
chmod +x record.js
ln -s $(pwd)/record.js ~/.local/bin/web-record
```

## Usage

```bash
# Default: speed lambat & 150 FPS (Instagram Reels 9:16)
web-record http://localhost:5173 --preset reels

# Custom speed & FPS dalam satu line command
web-record http://localhost:5173 --preset reels --speed lumayan --fps 200

# Kecepatan cepat dengan 250 FPS super halus
web-record http://localhost:5173 --preset reels --speed cepat --fps 250

# Custom output destination
web-record http://localhost:5173 --preset reels --speed lambat --fps 150 --out ~/Videos/showcase.mp4
```

### CLI Options

| Option | Description | Choices / Default |
| --- | --- | --- |
| `--preset` | Aspect ratio presets | `reels` (9:16), `feed` (1:1), `desktop` (16:10) *(Default: `desktop`)* |
| `--speed` | Scroll speed preset | `lambat` (18s), `lumayan` (12s), `cepat` (7s) *(Default: `lambat`)* |
| `--fps` | Video output framerate | `100`, `150`, `200`, `250` *(Default: `150`)* |
| `--duration` | Custom duration in seconds (overrides `--speed`) | Optional *(e.g. `20`)* |
| `--easing` | Scroll curve | `linear`, `ease` *(Default: `linear`)* |
| `--pause-start`| Pause at top before scroll | `2` (seconds) |
| `--pause-end`  | Pause at bottom before ending | `2` (seconds) |
| `--scale` | Device scale factor (Retina 2x crispness) | `2` |
| `--out` | Output file path (`.mp4`) | `showcase_<preset>_<timestamp>.mp4` |

## License

[MIT](LICENSE)
