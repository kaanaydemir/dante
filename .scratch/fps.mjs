import { chromium } from 'playwright';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const vite = await import('vite');
const server = await vite.createServer({ server: { port: 5419, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const url = new URL(server.resolvedUrls.local[0]);
url.searchParams.set('debug', '1');
const args = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, args });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url.href, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__dante), null, { timeout: 15000 });
await sleep(1000);
const fps = () => page.evaluate(() => {
  const g = window.__dante.session.ports.presenter.game ?? null;
  return null;
});
const info = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  return { renderer: gl ? (gl.getParameter(gl.RENDERER)) : 'none' };
});
console.log('renderer', info);
const measureEarly = () => page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
console.log('fps title', await measureEarly());
const target = process.env.START ?? 'inf99.s1';
await page.evaluate((t) => window.__dante.newGame(t.startsWith('inf99') ? { chapter: 'fixture', startAt: t } : { startAt: t }), target);
await sleep(5000);
await page.evaluate(() => window.__dante.skipText());
// measure frames via rAF
const measure = () => page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
console.log('fps in wood', await measure());
await browser.close();
await server.close();
