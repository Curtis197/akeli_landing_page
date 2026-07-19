// One-off export tool for the Google Play app icon (512×512).
// The source logo file is a square JPEG (despite its .png extension), so this
// drives headless Chrome via playwright-core to draw it onto a 512×512
// canvas and screenshot that — no new image-processing dependency needed.
// Run: node scripts/export-app-icon.mjs
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(__dirname, '..', 'public', 'store-screenshots', 'assets', 'logo', 'Akeli_Logo.png');
const outPath = path.join(__dirname, '..', 'store-exports', 'google', 'icon', 'icon-512.png');
// Written next to the source so the page loads as file:// (matching origin) —
// page.setContent() produces an about:blank document, and Chromium blocks
// local file:// resource loads from a non-file:// origin, so the <img> never fires.
const tmpHtmlPath = path.join(path.dirname(srcPath), '__icon-export-tmp.html');

async function main() {
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  await fs.writeFile(tmpHtmlPath, `<!doctype html><html><body style="margin:0;">
    <canvas id="c" width="512" height="512"></canvas>
    <script>
      const img = new Image();
      img.onload = () => {
        document.getElementById('c').getContext('2d').drawImage(img, 0, 0, 512, 512);
        document.title = 'ready';
      };
      img.src = 'Akeli_Logo.png';
    </script>
  </body></html>`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

  await page.goto(pathToFileURL(tmpHtmlPath).href, { waitUntil: 'load' });
  await page.waitForFunction(() => document.title === 'ready');

  const canvas = await page.$('#c');
  await canvas.screenshot({ path: outPath });
  await browser.close();
  await fs.unlink(tmpHtmlPath);

  console.log(`✓ icon-512.png -> ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
