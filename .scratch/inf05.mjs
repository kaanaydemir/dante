// Exploration driver for the Canto V moments (not part of the project).
// Usage: node .scratch/inf05.mjs [--url http://localhost:4400/] [--part court|line|lovers|fall|all]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const OUT = '.scratch/shots';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = opt('url', 'http://localhost:4400/');
const part = opt('part', 'all');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
const url = new URL(base);
url.searchParams.set('debug', '1');
await page.goto(url.href, { waitUntil: 'load' });
await page.waitForFunction(() => Boolean(window.__dante), null, { timeout: 30000 });
await sleep(1500);

const st = () =>
  page.evaluate(() => {
    const d = window.__dante;
    const w = d.session.ports.world.debugInfo().world ?? {};
    const mech = Object.fromEntries((w.mechanics ?? []).map((m) => [m.id, m]));
    return {
      beat: d.beat,
      status: d.runnerStatus,
      busy: d.session.ports.presenter.busy,
      player: w.player,
      virgil: w.virgil,
      inside: w.inside,
      armed: w.armed,
      control: w.control?.playable,
      resolve: Math.round(d.state.resolve * 100) / 100,
      emitted: w.emitted,
      mech,
    };
  });
const brief = (s) => JSON.stringify({ beat: s.beat, status: s.status, busy: s.busy, player: s.player, inside: s.inside, armed: s.armed, playable: s.control, resolve: s.resolve, emitted: s.emitted });
const log = async (label, extra = (s) => '') => {
  const s = await st();
  console.log(label, brief(s), extra(s));
  return s;
};
const shot = async (name) => page.screenshot({ path: `${OUT}/v-${name}.png` });
const hold = async (key, ms) => {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
};
const press = async (key) => {
  await page.keyboard.down(key);
  await sleep(90);
  await page.keyboard.up(key);
  await sleep(120);
};
const clearText = async (n = 20) => {
  for (let i = 0; i < n; i++) {
    const s = await st();
    if (!s.busy) return;
    await press('KeyE');
    await sleep(300);
  }
};
const waitFor = async (pred, ms = 30000, clear = true) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await st();
    if (pred(s)) return s;
    if (clear && s.busy) await press('KeyE');
    await sleep(300);
  }
  return null;
};
const teleportPlace = (id) => page.evaluate((id) => window.__dante.teleport(id), id);
/** Walk Dante to (x, y) with the arrow keys (feedback loop; time-based movement copes with low fps). */
const walkTo = async (tx, ty, tol = 6, maxMs = 25000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const s = await st();
    if (s.busy) await press('KeyE');
    const p = s.player;
    if (!p) return false;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= tol) return true;
    const keys = [];
    if (Math.abs(dx) > tol / 2) keys.push(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    if (Math.abs(dy) > tol / 2) keys.push(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    for (const k of keys) await page.keyboard.down(k);
    await sleep(Math.max(60, Math.min(500, (d / 72) * 1000 * 0.6)));
    for (const k of keys) await page.keyboard.up(k);
    await sleep(80);
  }
  return false;
};
const start = async (at) => {
  await page.evaluate((at) => window.__dante.newGame({ startAt: at }), at);
  await sleep(2500);
};

async function court() {
  await start('inf05.s2');
  let s = await waitFor((s) => s.status === 'waiting', 60000);
  await log('court waiting', (s) => JSON.stringify(s.mech.tail));
  await shot('court');
  // Stand in the court a while: the tail should strike.
  const r0 = (await st()).resolve;
  await sleep(9000);
  s = await log('after 9s in court', (s) => JSON.stringify(s.mech.tail));
  console.log('resolve change', r0, '->', s.resolve);
  // To the bench.
  await teleportPlace('inf05_court_bench');
  s = await waitFor((s) => s.beat === 'inf05.s2.b3' || s.armed?.some((a) => a.startsWith('inf05.s2.b4')), 30000);
  await clearText();
  s = await waitFor((s) => s.status === 'waiting', 30000);
  await log('at bench', (s) => '');
  console.log('walked to bench', await walkTo(840, 146, 5));
  await sleep(500);
  await shot('bench-prompt');
  await press('KeyE');
  s = await waitFor((s) => s.beat === 'inf05.s2.b4', 15000, false);
  await log('after E at bench');
  // The court game: 2, 3, 9 (selected starts at 5).
  const choose = async (target) => {
    const c = await waitFor((s) => s.mech.court?.choosing === true, 60000);
    if (!c) {
      console.log('no choosing state');
      return;
    }
    const sel = c.mech.court.selected;
    const key = target < sel ? 'ArrowLeft' : 'ArrowRight';
    for (let i = 0; i < Math.abs(target - sel); i++) {
      await press(key);
      await sleep(260);
    }
    await shot(`court-choose-${target}`);
    await press('KeyE');
    await sleep(500);
    await log(`chose ${target}`, (s) => JSON.stringify(s.mech.court));
  };
  await choose(2);
  await choose(3);
  await choose(9);
  s = await waitFor((s) => s.beat !== 'inf05.s2.b4' || s.status === 'waiting', 60000);
  await log('after court', (s) => JSON.stringify(s.mech.court));
  await shot('after-court');
}

async function line() {
  await start('inf05.s4');
  let s = await waitFor((s) => s.status === 'waiting', 60000);
  await log('line waiting');
  await shot('line-1');
  const pos1 = await page.evaluate(() => window.__dante.session.ports.world.debugInfo().world.player);
  await sleep(3000);
  await shot('line-2');
  // Step away from Virgil, come back, press E.
  const v = (await st()).virgil;
  console.log('virgil', JSON.stringify(v), 'player', JSON.stringify(pos1));
  console.log('away', await walkTo(v.x - 70, v.y + 10, 8));
  await sleep(400);
  console.log('back', await walkTo(v.x - 12, v.y + 6, 6));
  await sleep(400);
  await shot('line-virgil');
  await press('KeyE');
  s = await waitFor((s) => s.emitted?.includes('inf05.line_passed'), 10000, false);
  await log('after E at Virgil');
  s = await waitFor((s) => s.beat?.startsWith('inf05.s5'), 30000);
  await log('to s5?');
}

async function lovers() {
  await start('inf05.s5');
  let s = await waitFor((s) => s.status === 'waiting' && s.armed?.some((a) => a.startsWith('inf05.s5.b3')), 60000);
  await log('lovers waiting');
  // Stand at the west end of their loop, call early (should scatter), then at the right time.
  await teleportPlace('inf05_lee_edge');
  console.log('to the edge', await walkTo(2652, 196, 6));
  await sleep(600);
  await press('KeyE');
  await sleep(400);
  await shot('lovers-early');
  await log('after early call');
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    await press('KeyE');
    await sleep(500);
    s = await st();
    if (s.emitted?.includes('inf05.called_them')) break;
  }
  await log('after calls');
  await shot('lovers-called');
  s = await waitFor((s) => s.beat === 'inf05.s5.b4' || s.beat?.startsWith('inf05.s6'), 60000);
  await log('s5.b4?', (s) => JSON.stringify(s.mech.wind));
  s = await waitFor((s) => s.beat?.startsWith('inf05.s6'), 120000);
  await log('s6', (s) => JSON.stringify(s.mech.wind));
  await shot('lovers-hover');
}

async function fall() {
  await start('inf05.s7');
  let s = await waitFor((s) => s.status === 'waiting' || s.beat === 'inf05.s7.b2', 60000, false);
  await log('fall waiting');
  await hold('ArrowRight', 600);
  s = await waitFor((s) => s.emitted?.includes('inf05.dante_falters'), 15000, false);
  await log('after step');
  s = await waitFor((s) => s.beat === 'inf05.s7.b2' || s.beat?.startsWith('inf05.s8'), 20000);
  await log('fallen');
  await shot('fallen');
}

try {
  if (part === 'court' || part === 'all') await court();
  if (part === 'line' || part === 'all') await line();
  if (part === 'lovers' || part === 'all') await lovers();
  if (part === 'fall' || part === 'all') await fall();
} catch (e) {
  console.log('DRIVER ERROR', e);
}
console.log('PROBLEMS', problems);
console.log('ERRORS', JSON.stringify(await page.evaluate(() => window.__dante.errors())));
await browser.close();
