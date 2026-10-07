#!/usr/bin/env node
/**
 * Playwright smoke run (owner: integrator; the architect wrote this first cut).
 *
 *   npm run smoke                      dev server, title -> world -> Book, no console errors
 *   npm run smoke -- --dist            serve the production build in dist/ (run `npm run build` first)
 *   npm run smoke -- --url <url>       test an already running server
 *   npm run smoke -- --autoplay        also autoplay the chapter through window.__dante
 *   npm run smoke -- --autoplay --fixture   autoplay the fixture chapter (canto inf99) instead
 *   npm run smoke -- --timeout 600     autoplay timeout in seconds (default 420)
 *
 * The full Chapter 1 autoplay takes about 3 minutes on an idle 4-core machine
 * and longer on a busy one; the default timeout leaves room for that and still
 * catches a soft-lock. The dev server runs without file watching or HMR, so
 * editing files during a run cannot reload the page under the test.
 *
 * Screenshots go to test-results/smoke-*.png. Exit code 1 on any console
 * error, page error, window.__dante.errors() entry, or autoplay timeout.
 * Uses the preinstalled Chromium (PLAYWRIGHT_BROWSERS_PATH); never installs browsers.
 */

import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const OUT = 'test-results';
mkdirSync(OUT, { recursive: true });

async function startServer() {
  const external = option('url', null);
  if (external) return { url: external, close: async () => {} };
  const vite = await import('vite');
  if (flag('dist')) {
    const server = await vite.preview({ preview: { port: 4317, strictPort: false }, logLevel: 'error' });
    return { url: server.resolvedUrls.local[0], close: () => server.close() };
  }
  // No watcher, no HMR: the run tests the tree as it was when the page loaded.
  const server = await vite.createServer({
    server: { port: 5317, strictPort: false, hmr: false, watch: null },
    logLevel: 'error',
  });
  await server.listen();
  return { url: server.resolvedUrls.local[0], close: () => server.close() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const problems = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!url.startsWith('data:')) problems.push(`requestfailed: ${url} ${req.failure()?.errorText ?? ''}`);
  });

  const target = new URL(server.url);
  target.searchParams.set('debug', '1');
  console.log(`smoke: opening ${target.href}`);
  await page.goto(target.href, { waitUntil: 'load' });
  await page.waitForFunction(() => Boolean(window.__dante), null, { timeout: 15000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/smoke-title.png` });

  const info = await page.evaluate(() => ({
    scripts: window.__dante.story.cantoIds,
    status: window.__dante.status,
  }));
  console.log(`smoke: scripts found: ${info.scripts.join(', ') || '(none)'}; session status: ${info.status}`);

  if (flag('autoplay')) {
    const chapter = flag('fixture') ? 'fixture' : undefined;
    await page.evaluate((ch) => {
      window.__dante.autoplay({ choices: 'canon' });
      window.__dante.newGame(ch ? { chapter: ch } : {});
    }, chapter);
    const timeoutMs = Number(option('timeout', '420')) * 1000;
    const started = Date.now();
    let last = '';
    while (Date.now() - started < timeoutMs) {
      const s = await page.evaluate(() => ({ status: window.__dante.status, beat: window.__dante.beat }));
      const now = `${s.status} ${s.beat ?? ''}`;
      if (now !== last) {
        console.log(`smoke: ${now}`);
        last = now;
      }
      if (s.status === 'chapter_complete') break;
      await sleep(250);
    }
    await page.screenshot({ path: `${OUT}/smoke-autoplay-end.png` });
    const status = await page.evaluate(() => window.__dante.status);
    if (status !== 'chapter_complete') problems.push(`autoplay did not finish the chapter (status: ${status})`);
  } else {
    await page.keyboard.press('Enter');
    await sleep(1200);
    await page.screenshot({ path: `${OUT}/smoke-world.png` });
    await page.keyboard.down('ArrowRight');
    await sleep(500);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('Tab');
    await sleep(600);
    await page.screenshot({ path: `${OUT}/smoke-book.png` });
    await page.keyboard.press('Escape');
    await sleep(400);
  }

  const apiErrors = await page.evaluate(() => window.__dante.errors());
  problems.push(...apiErrors.map((e) => `__dante.errors: ${e}`));

  await browser.close();
  await server.close();

  if (problems.length > 0) {
    console.error(`smoke: FAILED with ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log('smoke: OK (no console errors). Screenshots in test-results/.');
}

main().catch((err) => {
  console.error('smoke: crashed:', err);
  process.exit(1);
});
