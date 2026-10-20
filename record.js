#!/usr/bin/env node

/**
 * Web Recorder
 * A simple web recorder for your landing page website or any other website
 * that has huge height, for your social media or just documenting your job.
 * 
 * Uses Playwright + Native requestAnimationFrame + FFmpeg
 */

const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage:
  web-record <URL> [options]

Options:
  --mode <realtime|frame>          Recording method/engine (default: realtime)
                                   - realtime: Playwright native screencast
                                   - frame:    Deterministic frame-by-frame capture
                                               (ultra-smooth butter scroll, zero jitter)
  --preset <desktop|reels|feed>    Preset aspect ratio (default: desktop)
                                   - desktop: 1280x800 (16:10)
                                   - reels:   1080x1920 (9:16 mobile)
                                   - feed:    1080x1080 (1:1 square)
  --speed <slow|medium|fast>       Scroll speed preset (default: slow)
                                   - slow:   18s (leisurely pace, ideal for long pages)
                                   - medium: 12s (balanced speed)
                                   - fast:   7s  (quick & punchy)
                                   (also accepts: lambat, lumayan, cepat)
  --fps <number>                   Video output framerate (default: 150 for realtime, 60 for frame)
  --duration <seconds>             Custom duration in seconds (overrides --speed)
  --easing <linear|ease>           Scroll curve (default: linear)
  --pause-start <seconds>          Pause at top before scroll (default: 2)
  --pause-end <seconds>            Pause at bottom after scroll (default: 2)
  --scale <1|2>                    Device scale factor / Retina (default: 2)
  --out <filepath>                 Output .mp4 file path
  `);
  process.exit(0);
}

const targetUrl = args[0];

function getArgValue(flag, defaultValue) {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return defaultValue;
}

const modeArg = (getArgValue('--mode', '') || getArgValue('--method', '')).toLowerCase();
const isFrameMode = ['frame', 'frame-by-frame', 'deterministic', 'butter'].includes(modeArg) ||
                    args.includes('--frame-by-frame') ||
                    args.includes('--butter');
const mode = isFrameMode ? 'frame' : 'realtime';

const preset = getArgValue('--preset', 'desktop');

// Speed presets mapping (supports English & aliases)
const speedMap = {
  slow: 18,
  lambat: 18,
  medium: 12,
  lumayan: 12,
  fast: 7,
  cepat: 7,
};

const rawSpeedArg = getArgValue('--speed', 'slow').toLowerCase();
const speedKey = ['slow', 'lambat'].includes(rawSpeedArg)
  ? 'slow'
  : ['medium', 'lumayan'].includes(rawSpeedArg)
  ? 'medium'
  : ['fast', 'cepat'].includes(rawSpeedArg)
  ? 'fast'
  : 'slow';

const defaultDuration = speedMap[rawSpeedArg] !== undefined ? speedMap[rawSpeedArg] : 18;
const durationSec = parseFloat(getArgValue('--duration', defaultDuration.toString()));

const easingType = getArgValue('--easing', 'linear');
const pauseStartSec = parseFloat(getArgValue('--pause-start', '2'));
const pauseEndSec = parseFloat(getArgValue('--pause-end', '2'));

// Framerate: default 60 for frame mode, 150 for realtime mode
const rawFps = parseInt(getArgValue('--fps', isFrameMode ? '60' : '150'), 10);
const fps = isNaN(rawFps) || rawFps <= 0 ? (isFrameMode ? 60 : 150) : rawFps;

const scale = parseInt(getArgValue('--scale', '2'), 10);

const presets = {
  desktop: { width: 1280, height: 800 },
  reels: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1080 },
};

const viewport = presets[preset] || presets.desktop;

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const tempDir = path.resolve('/home/surya/.hermes/cache/scratch/recorder_' + timestamp);
fs.mkdirSync(tempDir, { recursive: true });

const defaultOutPath = path.resolve(process.cwd(), `showcase_${preset}_${timestamp}.mp4`);
const finalOutPath = path.resolve(getArgValue('--out', defaultOutPath));

// Terminal spinner helper
class TerminalSpinner {
  constructor(text) {
    this.text = text;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.frameIndex = 0;
    this.timer = null;
  }

  start() {
    process.stdout.write(`  ${this.frames[0]} ${this.text}`);
    this.timer = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      process.stdout.write(`\r  ${this.frames[this.frameIndex]} ${this.text}`);
    }, 80);
  }

  update(text) {
    this.text = text;
    process.stdout.write(`\r  ${this.frames[this.frameIndex]} ${this.text}\x1b[K`);
  }

  stop(symbol = '✔', finalMessage = null) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const msg = finalMessage || this.text;
    process.stdout.write(`\r  ${symbol} ${msg}\x1b[K\n`);
  }
}

(async () => {
  console.log(`\n● Web Recorder`);
  console.log(`  Target   : ${targetUrl}`);
  console.log(`  Preset   : ${preset} (${viewport.width}x${viewport.height}) @ ${scale}x Retina`);
  console.log(`  Settings : mode=${mode}${isFrameMode ? ' (frame-by-frame butter smooth)' : ''} | speed=${speedKey} (${durationSec}s) | fps=${fps} | easing=${easingType}\n`);

  const browserSpinner = new TerminalSpinner('Launching browser and loading page...');
  browserSpinner.start();

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-gpu-vsync',
      '--enable-gpu-rasterization',
      '--enable-zero-copy',
      '--ignore-gpu-blocklist',
      '--enable-features=VaapiVideoDecoder,CanvasOopRasterization',
      '--disable-frame-rate-limit',
      '--max-gum-fps=120',
    ],
  });

  const contextOptions = {
    viewport: viewport,
    deviceScaleFactor: scale,
  };
  if (!isFrameMode) {
    contextOptions.recordVideo = {
      dir: tempDir,
      size: viewport,
    };
  }
  const context = await browser.newContext(contextOptions);

  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    browserSpinner.stop('✔', 'Page loaded successfully');
  } catch (e) {
    browserSpinner.stop('▲', 'Page loaded (networkidle timed out, continuing anyway)');
  }

  // Force disable smooth scrolling and hide scrollbars
  await page.addStyleTag({
    content: `
      html, body, * {
        scroll-behavior: auto !important;
      }
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
    `
  });

  if (isFrameMode) {
    const pauseStartFrames = Math.max(0, Math.round(pauseStartSec * fps));
    const pauseEndFrames = Math.max(0, Math.round(pauseEndSec * fps));
    const scrollFrames = Math.max(2, Math.round(durationSec * fps));
    const totalFrames = pauseStartFrames + scrollFrames + pauseEndFrames;

    const recordSpinner = new TerminalSpinner(`Preparing frame-by-frame capture (${totalFrames} frames @ ${fps} FPS)...`);
    recordSpinner.start();

    // Pre-scroll slightly to trigger lazy-loaded assets, then return to top
    await page.evaluate(async () => {
      const doc = document.documentElement;
      const body = document.body;
      const h = Math.max(doc ? doc.scrollHeight : 0, body ? body.scrollHeight : 0);
      window.scrollTo(0, h);
      await new Promise(r => setTimeout(r, 250));
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 250));
    });

    const ffmpegArgs = [
      '-y',
      '-nostdin',
      '-loglevel', 'error',
      '-f', 'image2pipe',
      '-vcodec', 'png',
      '-r', fps.toString(),
      '-i', 'pipe:0',
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '12',
      '-pix_fmt', 'yuv420p',
      finalOutPath
    ];

    const ffmpegProc = spawn('ffmpeg', ffmpegArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
    let ffmpegErr = '';
    ffmpegProc.stderr.on('data', chunk => { ffmpegErr += chunk.toString(); });

    const writeFrame = async (buf) => {
      if (!ffmpegProc.stdin.write(buf)) {
        await new Promise(r => ffmpegProc.stdin.once('drain', r));
      }
    };

    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const setPageProgress = async (progress) => {
      await page.evaluate(({ progress }) => {
        const doc = document.documentElement;
        const body = document.body;
        let targetElement = document.querySelector('[data-web-recorder-target="true"]');
        if (!targetElement) {
          let maxScroll = Math.max(doc ? doc.scrollHeight : 0, body ? body.scrollHeight : 0);
          for (const el of document.querySelectorAll('*')) {
            if (el.scrollHeight > maxScroll) {
              const style = window.getComputedStyle(el);
              if (['auto', 'scroll'].includes(style.overflowY) || ['auto', 'scroll'].includes(style.overflow)) {
                maxScroll = el.scrollHeight;
                targetElement = el;
              }
            }
          }
          if (targetElement) {
            targetElement.setAttribute('data-web-recorder-target', 'true');
          }
        }

        const clientHeight = targetElement ? targetElement.clientHeight : window.innerHeight;
        const scrollHeight = targetElement ? targetElement.scrollHeight : Math.max(
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0,
          doc ? doc.clientHeight : 0,
          doc ? doc.scrollHeight : 0,
          doc ? doc.offsetHeight : 0
        );
        const maxScrollDist = Math.max(0, scrollHeight - clientHeight);
        const pos = maxScrollDist * progress;

        if (targetElement) {
          targetElement.scrollTop = pos;
        }
        window.scrollTo(0, pos);
        if (doc) doc.scrollTop = pos;
        if (body) body.scrollTop = pos;
      }, { progress });
    };

    let renderedFrames = 0;

    // 1. Initial pause at top
    await setPageProgress(0);
    const firstFrameBuf = await page.screenshot({ type: 'png' });
    for (let i = 0; i < pauseStartFrames; i++) {
      await writeFrame(firstFrameBuf);
      renderedFrames++;
      if (renderedFrames % 5 === 0 || renderedFrames === totalFrames) {
        recordSpinner.update(`Rendering frame-by-frame: frame ${renderedFrames}/${totalFrames} (${Math.round((renderedFrames / totalFrames) * 100)}%)...`);
      }
    }

    // 2. Continuous scroll frames
    let lastFrameBuf = firstFrameBuf;
    for (let i = 0; i < scrollFrames; i++) {
      const linearProgress = scrollFrames <= 1 ? 1 : i / (scrollFrames - 1);
      const progress = easingType === 'linear' ? linearProgress : easeInOutCubic(linearProgress);
      await setPageProgress(progress);
      lastFrameBuf = await page.screenshot({ type: 'png' });
      await writeFrame(lastFrameBuf);
      renderedFrames++;
      if (renderedFrames % 5 === 0 || renderedFrames === totalFrames) {
        recordSpinner.update(`Rendering frame-by-frame: frame ${renderedFrames}/${totalFrames} (${Math.round((renderedFrames / totalFrames) * 100)}%)...`);
      }
    }

    // 3. Pause at bottom
    for (let i = 0; i < pauseEndFrames; i++) {
      await writeFrame(lastFrameBuf);
      renderedFrames++;
      if (renderedFrames % 5 === 0 || renderedFrames === totalFrames) {
        recordSpinner.update(`Rendering frame-by-frame: frame ${renderedFrames}/${totalFrames} (${Math.round((renderedFrames / totalFrames) * 100)}%)...`);
      }
    }

    recordSpinner.update(`Finalizing high-fidelity MP4...`);
    ffmpegProc.stdin.end();

    await new Promise((resolve, reject) => {
      ffmpegProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with error code ${code}: ${ffmpegErr}`));
      });
      ffmpegProc.on('error', reject);
    });

    await page.close();
    await context.close();
    await browser.close();

    recordSpinner.stop('✔', `Rendered ${totalFrames} frames smoothly at ${fps} FPS`);
  } else {
    const recordSpinner = new TerminalSpinner(`Recording page scroll (${durationSec}s @ ${fps} FPS)...`);
    recordSpinner.start();

    // Initial pause at top
    if (pauseStartSec > 0) {
      await page.waitForTimeout(pauseStartSec * 1000);
    }

    // Perform smooth programmatic scroll
    const durationMs = durationSec * 1000;
    await page.evaluate(({ duration, easing }) => {
      return new Promise((resolve) => {
        const doc = document.documentElement;
        const body = document.body;

        let targetElement = null;
        let maxScroll = Math.max(doc.scrollHeight, body ? body.scrollHeight : 0);

        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          if (el.scrollHeight > maxScroll) {
            const style = window.getComputedStyle(el);
            if (['auto', 'scroll'].includes(style.overflowY) || ['auto', 'scroll'].includes(style.overflow)) {
              maxScroll = el.scrollHeight;
              targetElement = el;
            }
          }
        }

        const setScrollPos = (pos) => {
          if (targetElement) {
            targetElement.scrollTop = pos;
          }
          window.scrollTo(0, pos);
          if (doc) doc.scrollTop = pos;
          if (body) body.scrollTop = pos;
        };

        const easeInOutCubic = (t) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const startTime = performance.now();

        const step = (currentTime) => {
          const elapsed = currentTime - startTime;
          const linearProgress = Math.min(elapsed / duration, 1);
          const progress = easing === 'linear' ? linearProgress : easeInOutCubic(linearProgress);

          const currentClientHeight = targetElement ? targetElement.clientHeight : window.innerHeight;
          const currentScrollHeight = targetElement ? targetElement.scrollHeight : Math.max(
            body ? body.scrollHeight : 0,
            body ? body.offsetHeight : 0,
            doc.clientHeight,
            doc.scrollHeight,
            doc.offsetHeight
          );
          const maxScrollDist = Math.max(0, currentScrollHeight - currentClientHeight);

          setScrollPos(maxScrollDist * progress);

          if (linearProgress < 1) {
            window.requestAnimationFrame(step);
          } else {
            setScrollPos(maxScrollDist);
            resolve();
          }
        };

        window.requestAnimationFrame(step);
      });
    }, { duration: durationMs, easing: easingType });

    // Pause at bottom
    if (pauseEndSec > 0) {
      await page.waitForTimeout(pauseEndSec * 1000);
    }

    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    const tempVideoPath = await video.path();
    recordSpinner.stop('✔', 'Raw capture completed');

    // Transcoding via FFmpeg with spinner and clean progress
    const encodeSpinner = new TerminalSpinner(`Encoding high-fidelity MP4 (${fps} FPS)...`);
    encodeSpinner.start();

    const ffmpegArgs = [
      '-y',
      '-nostdin',
      '-loglevel', 'error',
      '-progress', 'pipe:1',
      '-i', tempVideoPath,
      '-filter:v', `fps=${fps}`,
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '12',
      '-pix_fmt', 'yuv420p',
      finalOutPath
    ];

    await new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', ffmpegArgs);

      proc.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('frame=')) {
            const frameNum = line.split('=')[1].trim();
            encodeSpinner.update(`Encoding high-fidelity MP4 (${fps} FPS)... frame ${frameNum}`);
          }
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with error code ${code}`));
        }
      });

      proc.on('error', reject);
    });

    encodeSpinner.stop('✔', `Encoding finished (${fps} FPS)`);
  }

  // Cleanup scratch temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log(`\n✔ Export completed!`);
  console.log(`  Saved to : ${finalOutPath}\n`);
})();
