// Manual-play driver for the fixture demo level (exploration only).
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT = '.scratch/shots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const vite = await import('vite');
const server = await vite.createServer({ server: { port: 5418, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const url = new URL(server.resolvedUrls.local[0]);
url.searchParams.set('debug', '1');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
await page.goto(url.href, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__dante), null, { timeout: 15000 });
await sleep(1000);

const st = () =>
  page.evaluate(() => {
    const w = window.__dante.session.ports.world.debugInfo().world;
    return {
      beat: window.__dante.beat,
      status: window.__dante.runnerStatus,
      busy: window.__dante.session.ports.presenter.busy,
      player: w?.player,
      inside: w?.inside,
      resolve: Math.round(window.__dante.state.resolve * 100) / 100,
      events: window.__dante.state.events.join(','),
    };
  });
const log = async (label) => console.log(label, JSON.stringify(await st()));
const shot = async (name) => page.screenshot({ path: `${OUT}/man-${name}.png` });
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
};
const press = async (key) => {
  await page.keyboard.press(key);
  await sleep(150);
};
/** Press E / Enter until the presenter is no longer busy (max n times). */
const clearText = async (n = 12) => {
  for (let i = 0; i < n; i++) {
    const s = await st();
    if (!s.busy) return;
    await press('KeyE');
    await sleep(350);
  }
};
const waitBeat = async (id, ms = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await st();
    if (s.beat === id) return true;
    await sleep(200);
  }
  return false;
};

await page.evaluate(() => window.__dante.newGame({ chapter: 'fixture' }));
await sleep(3800);
await shot('00-opening');
await clearText();
await sleep(1500);
await log('after opening');
await shot('01-wood');
// Walk right through the wood to the clearing.
for (let i = 0; i < 12; i++) {
  await hold('ArrowRight', 500);
  await clearText(3);
  const s = await st();
  if (s.inside?.includes('inf99_clearing')) break;
}
await log('at clearing?');
await shot('02-clearing');
await clearText();
await sleep(500);
// Look back (hold R).
await hold('KeyR', 1800);
await sleep(600);
await log('after look back');
await shot('03-lookback');
await clearText();
// Walk on to the slope and the ascent.
for (let i = 0; i < 30; i++) {
  await hold('ArrowRight', 500);
  await clearText(2);
  const s = await st();
  if (s.beat === 'inf99.s2.b1' || s.inside?.includes('inf99_ascent')) break;
}
await log('at ascent?');
await clearText();
await shot('04-ascent');
// Stand still for the dawn.
await sleep(9500);
await log('after waiting');
await shot('05-dawn');
await clearText();
await sleep(1000);
await log('end');
await shot('06-end');
console.log('PROBLEMS', problems);
const errors = await page.evaluate(() => window.__dante.errors());
console.log('ERRORS', errors);
await browser.close();
await server.close();
