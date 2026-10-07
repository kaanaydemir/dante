// Robustness driver: chapter end -> title -> new game, jumps mid-moment, Book open/close, continue.
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const vite = await import('vite');
const url0 = process.env.URL;
let server = null;
let base = url0;
if (!base) {
  server = await vite.createServer({ server: { port: 5420, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
  await server.listen();
  base = server.resolvedUrls.local[0];
}
const url = new URL(base);
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
await sleep(800);

const status = () => page.evaluate(() => ({ status: window.__dante.status, beat: window.__dante.beat, runner: window.__dante.runnerStatus }));
const waitFor = async (pred, ms) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await status();
    if (pred(s)) return s;
    await sleep(250);
  }
  return null;
};

console.log('1. fixture autoplay to the end');
await page.evaluate(() => {
  window.__dante.autoplay({ choices: 'canon', textDelayMs: 30 });
  window.__dante.newGame({ chapter: 'fixture' });
});
console.log('   ->', JSON.stringify(await waitFor((s) => s.status === 'chapter_complete' || s.status === 'title', 120000)));
await sleep(1500);
console.log('   after end:', JSON.stringify(await status()));

console.log('2. new chapter game, jump mid-canto twice');
await page.evaluate(() => window.__dante.newGame({}));
console.log('   ->', JSON.stringify(await waitFor((s) => (s.beat ?? '').startsWith('inf01.s3'), 90000)));
await page.evaluate(() => window.__dante.jump('inf03.s3'));
await sleep(3000);
console.log('   after jump inf03.s3:', JSON.stringify(await status()));
await page.evaluate(() => window.__dante.jump('inf05.s3'));
await sleep(3000);
console.log('   after jump inf05.s3:', JSON.stringify(await status()));

console.log('3. Book open / close while autoplay waits');
await page.evaluate(() => window.__dante.autoplay(false));
await sleep(1500);
await page.keyboard.press('Tab');
await sleep(1200);
await page.keyboard.press('Escape');
await sleep(1200);
console.log('   after book:', JSON.stringify(await status()));

console.log('3b. jumps in and out of live moments (no autoplay)');
for (const target of ['inf05.s4', 'inf05.s5', 'inf05.s2', 'inf02.s6', 'inf01.s4', 'inf03.s5', 'inf04.s3', 'inf05.s7']) {
  await page.evaluate((t) => window.__dante.jump(t), target);
  await sleep(4500);
  const s = await status();
  const errs = await page.evaluate(() => window.__dante.errors().length);
  console.log(`   after jump ${target}:`, JSON.stringify(s), 'errors', errs);
}

console.log('4. stop and continue');
await page.evaluate(() => window.__dante.session.stop());
await sleep(800);
await page.evaluate(() => window.__dante.continueGame());
await sleep(4000);
console.log('   after continue:', JSON.stringify(await status()));
const world = await page.evaluate(() => window.__dante.session.ports.world.debugInfo());
console.log('   world canto:', world.world?.canto, 'level:', world.world?.level, 'places:', (world.world?.places ?? []).length);

console.log('5. autoplay the rest of the chapter');
await page.evaluate(() => window.__dante.autoplay({ choices: 'first', textDelayMs: 30 }));
console.log('   ->', JSON.stringify(await waitFor((s) => s.status === 'chapter_complete' || s.status === 'title', 240000)));

const errors = await page.evaluate(() => window.__dante.errors());
console.log('ERRORS', errors);
console.log('PROBLEMS', problems);
await browser.close();
if (server) await server.close();
