# Web Recorder

CLI tool to record ultra-smooth, high-framerate website showcase videos (up to 150 FPS) for social media (Instagram Reels, TikTok, Twitter/X, and product demos) using Playwright and FFmpeg.

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
# Record Instagram Reels format (1080x1920, 150 FPS)
web-record http://localhost:5173 --preset reels

# Custom output destination
web-record http://localhost:5173 --preset reels --out ~/Videos/showcase.mp4

# Custom duration and framerate
web-record https://example.com --preset desktop --duration 12 --fps 100
```

### CLI Options

| Option | Description | Default |
| --- | --- | --- |
| `--preset` | Aspect ratio: `reels` (9:16), `feed` (1:1), `desktop` (16:10) | `desktop` |
| `--duration` | Scroll duration in seconds | `16` |
| `--fps` | Video output framerate | `150` |
| `--easing` | Scroll curve: `linear` or `ease` | `linear` |
| `--pause-start` | Initial pause at top before scroll (seconds) | `2` |
| `--pause-end` | Final pause at bottom before ending (seconds) | `2` |
| `--scale` | Device scale factor (Retina 2x crispness) | `2` |
| `--out` | Output file path (`.mp4`) | `showcase_<preset>_<timestamp>.mp4` |

## License

[MIT](LICENSE)
