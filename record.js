#!/usr/bin/env node

/**
 * Web Recorder
 * A simple web recorder for your landing page website or any other website
 * that has huge height, for your social media or just documenting your job.
 * 
 * Uses Playwright + Native requestAnimationFrame + FFmpeg
 * 
 * Usage:
 *   node record.js <URL> [options]
 * 
 * Examples:
 *   node record.js http://localhost:5173
 *   node record.js https://example.com --preset reels --duration 8
 *   node record.js https://example.com --preset desktop --fps 60 --out /path/to/demo.mp4
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage:
  node record.js <URL> [options]

Options:
  --preset <desktop|reels|feed>    Preset aspect ratio (default: desktop)
                                   - desktop: 1280x800 (16:10)
                                   - reels:   1080x1920 (9:16 mobile)
                                   - feed:    1080x1080 (1:1 square)
  --speed <lambat|lumayan|cepat>   Scroll speed (default: lambat)
                                   - lambat:  18s (sangat santai, cocok showcase panjang)
                                   - lumayan: 12s (kecepatan sedang)
                                   - cepat:   7s  (singkat & dinamis)
  --fps <100|150|200|250>          Video output framerate (default: 150)
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

const preset = getArgValue('--preset', 'desktop');

// Mapping speed preset
const speedPresets = {
  lambat: 18,
  lumayan: 12,
  cepat: 7,
};

const speedArg = getArgValue('--speed', 'lambat').toLowerCase();
const defaultDuration = speedPresets[speedArg] !== undefined ? speedPresets[speedArg] : 18;
const durationSec = parseFloat(getArgValue('--duration', defaultDuration.toString()));

const easingType = getArgValue('--easing', 'linear');
const pauseStartSec = parseFloat(getArgValue('--pause-start', '2'));
const pauseEndSec = parseFloat(getArgValue('--pause-end', '2'));

// Allowed FPS: 100, 150, 200, 250 (default: 150)
const rawFps = parseInt(getArgValue('--fps', '150'), 10);
const fps = [100, 150, 200, 250].includes(rawFps) ? rawFps : (isNaN(rawFps) ? 150 : rawFps);

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

(async () => {
  console.log(`🎬 Memulai perekaman website: ${targetUrl}`);
  console.log(`📐 Preset: ${preset} (${viewport.width}x${viewport.height}), Scale: ${scale}x`);
  console.log(`⚡ Speed: ${speedArg} (${durationSec}s scroll) | FPS: ${fps} | Easing: ${easingType}`);
  console.log(`⏱️ Pause top: ${pauseStartSec}s | Pause bottom: ${pauseEndSec}s`);

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

  const context = await browser.newContext({
    viewport: viewport,
    recordVideo: {
      dir: tempDir,
      size: viewport,
    },
    deviceScaleFactor: scale,
  });

  const page = await context.newPage();

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`⚠️ Networkidle timeout, lanjut dengan status load saat ini...`);
  }

  // Sembunyikan scrollbar agar rekaman terlihat bersih
  // Matikan scroll-behavior: smooth bawaan CSS agar tidak berkonflik/melawan requestAnimationFrame loop!
  await page.addStyleTag({
    content: `
      html, body, * {
        scroll-behavior: auto !important;
      }
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
    `
  });

  // Pause di atas sebelum scroll
  if (pauseStartSec > 0) {
    await page.waitForTimeout(pauseStartSec * 1000);
  }

  // Smooth scroll down via requestAnimationFrame & robust container detection
  const durationMs = durationSec * 1000;
  await page.evaluate(({ duration, easing }) => {
    return new Promise((resolve) => {
      const doc = document.documentElement;
      const body = document.body;

      // Cari elemen dengan scrollHeight terbesar
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

      // Rumus Easing Cubic In-Out agar awal & akhir gerakan sangat lembut
      const easeInOutCubic = (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const startTime = performance.now();

      const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const linearProgress = Math.min(elapsed / duration, 1);
        const progress = easing === 'linear' ? linearProgress : easeInOutCubic(linearProgress);

        // Recalculate secara dinamis (mengantisipasi lazy loading / gambar yang baru render)
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
          // Pastikan di akhir benar-benar mentok ke bawah
          setScrollPos(maxScrollDist);
          resolve();
        }
      };

      window.requestAnimationFrame(step);
    });
  }, { duration: durationMs, easing: easingType });

  // Pause di bawah setelah selesai scroll
  if (pauseEndSec > 0) {
    await page.waitForTimeout(pauseEndSec * 1000);
  }

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  const tempVideoPath = await video.path();

  console.log(`⚙️ Mengonversi ke MP4 ${fps} FPS (Ultra Fluid Motion) via FFmpeg...`);
  // Preset medium/slow dengan CRF 12 pada 150 FPS menjamin setiap micro-frame sangat tajam dan mulus
  const ffmpegCmd = `ffmpeg -y -i "${tempVideoPath}" -filter:v "fps=${fps}" -c:v libx264 -preset medium -crf 12 -pix_fmt yuv420p "${finalOutPath}"`;

  execSync(ffmpegCmd, { stdio: 'inherit' });

  // Bersihkan temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log(`\n✅ Rekaman selesai!`);
  console.log(`📁 File tersimpan di: ${finalOutPath}`);
})();
