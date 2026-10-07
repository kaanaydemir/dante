// Exploration driver (not part of the project). Usage:
//   node .scratch/play.mjs [--fixture] [--canto inf03] [--shots 6] [--every 2000] [--autoplay] [--keys]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const OUT = '.scratch/shots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const vite = await import('vite');
const server = await vite.createServer({ server: { port: 5417, strictPort: false, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const url = new URL(server.resolvedUrls.local[0]);
url.searchParams.set('debug', '1');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  if (flag('verbose') && (m.type() === 'warning' || m.type() === 'log')) console.log(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}\n${e.stack}`));
await page.goto(url.href, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__dante), null, { timeout: 15000 });
await sleep(1200);

const prefix = opt('name', 'run');
const canto = opt('canto', null);
const auto = flag('autoplay');
await page.evaluate(
  ({ fixture, canto, auto, delay }) => {
    if (auto) window.__dante.autoplay({ choices: 'canon', textDelayMs: Number(delay) });
    if (canto) window.__dante.newGame({ startAt: canto, ...(fixture ? { chapter: 'fixture' } : {}) });
    else window.__dante.newGame(fixture ? { chapter: 'fixture' } : {});
  },
  { fixture: flag('fixture'), canto, auto, delay: opt('delay', '300') },
);
const shots = Number(opt('shots', '6'));
const every = Number(opt('every', '2000'));
for (let i = 0; i < shots; i++) {
  await sleep(every);
  if (flag('keys')) {
    await page.keyboard.down('ArrowRight');
    await sleep(400);
    await page.keyboard.up('ArrowRight');
  }
  const s = await page.evaluate(() => ({
    status: window.__dante.status,
    beat: window.__dante.beat,
    mode: window.__dante.mode,
    runner: window.__dante.runnerStatus,
    errors: window.__dante.errors().length,
  }));
  console.log(`[${i}] ${JSON.stringify(s)}`);
  await page.screenshot({ path: `${OUT}/${prefix}-${String(i).padStart(2, '0')}.png` });
  if (s.status === 'chapter_complete') break;
}
const info = await page.evaluate(() => {
  const w = window.__dante.session.ports.world;
  return { world: w.debugInfo(), errors: window.__dante.errors(), events: window.__dante.events().filter((e) => e.type === 'debug:log').slice(-30), seen: window.__dante.state.seen.filter((x) => x.split('.').length === 3), evts: window.__dante.state.events, choices: Object.values(window.__dante.state.choices).map((c) => `${c.choice}=${c.letter}`) };
});
console.log(JSON.stringify(info.world, null, 1).slice(0, 3000));
console.log('ERRORS', info.errors);
console.log('SEEN', info.seen.join(' '));
console.log('EVENTS', info.evts.join(' '));
console.log('CHOICES', info.choices.join(' '));
for (const e of info.events) console.log('LOG', JSON.stringify(e.payload).slice(0, 300));
console.log('PROBLEMS', problems);
await browser.close();
await server.close();
