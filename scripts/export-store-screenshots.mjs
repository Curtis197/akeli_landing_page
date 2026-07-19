// One-off export tool for public/store-screenshots/index.html.
// Drives the local system Chrome (via playwright-core) headless, opens the
// board over file://, and screenshots each [data-frame] element straight to
// PNG at its exact store pixel size. Run: node scripts/export-store-screenshots.mjs
import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const boardPath = path.join(__dirname, '..', 'public', 'store-screenshots', 'index.html');
const outRoot = path.join(__dirname, '..', 'store-exports');

const STORES = ['apple', 'google'];
const LANGS = ['fr', 'en'];
const FRAME_SLUGS = {
  '01': '01-accueil',
  '02': '02-recette',
  '03': '03-planning',
  '04': '04-recettes',
  '05': '05-communaute',
  '06': '06-telecharger',
};

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });

  for (const store of STORES) {
    for (const lang of LANGS) {
      const url = pathToFileURL(boardPath).href + `?store=${store}&lang=${lang}`;
      await page.goto(url, { waitUntil: 'load' });
      // React screens mount synchronously on load, but let fonts/layout settle.
      await page.waitForTimeout(400);
      // The toolbar is position:fixed, so it stays viewport-anchored while
      // Playwright scrolls to each (much taller) frame and can bleed into
      // the crop. Hide it before capturing.
      await page.evaluate(() => {
        const toolbar = document.getElementById('toolbar');
        if (toolbar) toolbar.style.display = 'none';
      });

      const dir = path.join(outRoot, store, lang);
      await fs.mkdir(dir, { recursive: true });

      const frames = await page.$$('[data-frame]');
      for (const frame of frames) {
        const no = await frame.getAttribute('data-frame');
        const slug = FRAME_SLUGS[no] || `frame-${no}`;
        await frame.screenshot({ path: path.join(dir, `${slug}.png`) });
      }
      console.log(`✓ ${store}/${lang}: ${frames.length} frames -> ${dir}`);
    }
  }

  // Google Play feature graphic (1024×500) — one banner per language, not
  // store/size-specific.
  for (const lang of LANGS) {
    const url = pathToFileURL(boardPath).href + `?mode=feature&lang=${lang}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const toolbar = document.getElementById('toolbar');
      if (toolbar) toolbar.style.display = 'none';
    });
    const dir = path.join(outRoot, 'google', 'feature-graphic');
    await fs.mkdir(dir, { recursive: true });
    const frame = await page.$('[data-frame="feature"]');
    await frame.screenshot({ path: path.join(dir, `${lang}.png`) });
    console.log(`✓ feature-graphic/${lang}.png -> ${dir}`);
  }

  // Google Play tablet screenshots. The 1440×2560 canvas clears both the 7″
  // and 10″ minimum-side requirements, so the same files upload to either slot.
  for (const lang of LANGS) {
    const url = pathToFileURL(boardPath).href + `?store=google&size=tablet&lang=${lang}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const toolbar = document.getElementById('toolbar');
      if (toolbar) toolbar.style.display = 'none';
    });

    const dir = path.join(outRoot, 'google', 'tablet', lang);
    await fs.mkdir(dir, { recursive: true });

    const frames = await page.$$('[data-frame]');
    for (const frame of frames) {
      const no = await frame.getAttribute('data-frame');
      const slug = FRAME_SLUGS[no] || `frame-${no}`;
      await frame.screenshot({ path: path.join(dir, `${slug}.png`) });
    }
    console.log(`✓ tablet/${lang}: ${frames.length} frames -> ${dir} (upload to both the 7" and 10" tablet slots)`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
