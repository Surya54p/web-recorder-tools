# Web Recorder

A simple web recorder for your landing page website or any other website that has huge height, for your social media or just documenting your job.

Record ultra-smooth, high-framerate website showcase videos (up to 250 FPS) for Instagram Reels, TikTok, Twitter/X, and portfolio product demos using Playwright and FFmpeg.

## Features

- **Buttery Smooth Motion:** Uses native browser `window.requestAnimationFrame` loops, preventing micro-stutters and timer drift.
- **Ultra High Framerate:** Supports 100 FPS, 150 FPS, 200 FPS, and 250 FPS exports with H.264 / `yuv420p` mobile compatibility.
- **Clean CLI Experience:** Minimalist terminal UI with animated spinners and silent background FFmpeg transcoding.
- **Social Media Ready Presets:**
  - `reels`: 1080x1920 (9:16 vertical for Instagram Reels, TikTok, Shorts)
  - `feed`: 1080x1080 (1:1 square for Instagram Feed, Twitter/X)
  - `desktop`: 1280x800 (16:10 landscape for desktop & product showcase)
- **Zero Project Overhead:** Standalone tool. Point to any local dev server (`localhost:5173`, `localhost:3000`) or public URL without installing dependencies into your project codebase.
- **Automatic Style Cleanup:** Disables conflicting CSS `scroll-behavior: smooth` rules and hides scrollbars during recording for clean captures.

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

### Global CLI Setup (Recommended)

Link the executable to your local bin directory so you can run `web-record` anywhere:

```bash
chmod +x record.js
mkdir -p ~/.local/bin
ln -sf $(pwd)/record.js ~/.local/bin/web-record
```

Make sure `~/.local/bin` is in your system's `PATH`.

## Usage & Command Examples

### 1. Default Quick Record (150 FPS, Slow Pace)
```bash
web-record http://localhost:5173 --preset reels
```

### 1. Ultra-Smooth Butter Mode (Recommended for Zero-Jitter Showcases)
```bash
# Capture with deterministic frame-by-frame rendering (silky smooth, zero dropped frames)
web-record http://localhost:5173 --mode frame --preset reels --speed slow

# Custom 60 FPS or 120 FPS frame capture
web-record http://localhost:5173 --mode frame --preset reels --fps 60 --duration 15
```

### 2. Standard High-Framerate Social Media Presets
```bash
# Instagram Reels / TikTok (9:16 Vertical, 200 FPS, Medium Pace)
web-record http://localhost:5173 --preset reels --speed medium --fps 200

# Instagram Feed Square (1:1, 150 FPS, Slow Pace)
web-record http://localhost:5173 --preset feed --speed slow --fps 150

# Desktop / Landscape (16:10, 100 FPS, Fast Pace)
web-record http://localhost:5173 --preset desktop --speed fast --fps 100
```

### 3. Maximum Fluidity (250 FPS)
```bash
web-record http://localhost:5173 --preset reels --speed medium --fps 250
```

### 4. Custom Output Destination
```bash
web-record http://localhost:5173 --preset reels --out ~/Videos/star-courts-reels.mp4
```

### 5. Custom Exact Duration & Easing
```bash
# Custom 20-second linear scroll
web-record http://localhost:5173 --preset reels --duration 20 --easing linear

# Smooth ease-in-out deceleration
web-record http://localhost:5173 --preset reels --duration 15 --easing ease
```

### 6. Public Production Website
```bash
web-record https://example.com --preset reels --speed slow --fps 150
```

## CLI Reference

| Flag | Type | Choices / Default | Description |
| --- | --- | --- | --- |
| `<URL>` | `string` | *(Required)* | Target URL (`http://localhost:...` or `https://...`) |
| `--mode` | `string` | `realtime` (default), `frame` | Recording engine (`realtime` = Playwright screencast, `frame` = deterministic butter-smooth capture) |
| `--preset` | `string` | `desktop` (default), `reels`, `feed` | Viewport aspect ratio preset |
| `--speed` | `string` | `slow` (default), `medium`, `fast` | Preconfigured scroll duration (`slow`: 18s, `medium`: 12s, `fast`: 7s). Also accepts aliases: `lambat`, `lumayan`, `cepat`. |
| `--fps` | `number` | `100`, `150` (default), `200`, `250` | Video framerate output |
| `--duration` | `number` | Optional | Custom scroll duration in seconds (overrides `--speed`) |
| `--easing` | `string` | `linear` (default), `ease` | Scroll motion curve (`linear` for constant speed, `ease` for cubic in-out) |
| `--pause-start` | `number` | `2` (default) | Pause duration at the top before scrolling begins (seconds) |
| `--pause-end` | `number` | `2` (default) | Pause duration at the bottom before ending the video (seconds) |
| `--scale` | `number` | `2` (default), `1` | Device scale factor (Retina 2x resolution by default) |
| `--out` | `string` | `showcase_<preset>_<timestamp>.mp4` | Custom output file destination |
| `--help`, `-h` | - | - | Show command-line help menu |

## License

[MIT](LICENSE)
