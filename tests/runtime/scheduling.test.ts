/**
 * Beat scheduling (docs/ENGINE.md §5.2–§5.3): canto lifecycle, triggers,
 * the armed set, out-of-order beats, the next scene's head, fallbacks.
 */

import { describe, expect, it } from 'vitest';
import { TIMINGS } from '../../src/config';
import type { ArmedBeat } from '../../src/runtime/contracts';
import { beat, colophonScene, createHarness, openingScene, scene, scriptText, until } from './helpers/harness';
import type { FakeWorld, FakeWorldOptions } from './helpers/fakes';

const ID = 'inf98';
const PATH = `/tests/runtime/${ID}.md`;

function harnessFor(body: string, world: FakeWorldOptions = {}) {
  const h = createHarness({ texts: { [PATH]: scriptText(ID, body) }, world });
  return { ...h, run: (at?: string) => h.runner.runCanto(h.script(ID), at ? { at } : {}) };
}

const narrations = (h: ReturnType<typeof harnessFor>) => h.presenter.args<string>('narration');

describe('canto lifecycle (§5.2)', () => {
  it('runs every scene in order and completes the canto', async () => {
    const h = harnessFor(
      [
        openingScene(ID),
        scene(
          `${ID}.s1`,
          'One',
          beat(`${ID}.s1.b1`, 'A', '@mode: cinematic\nNARRATION: First.'),
          beat(`${ID}.s1.b2`, 'B', '@mode: dialogue\nNARRATION: Second.'),
        ),
        scene(`${ID}.s2`, 'Two', beat(`${ID}.s2.b1`, 'C', '@mode: cinematic\nNARRATION: Third.')),
        colophonScene(ID, 3),
      ].join('\n'),
    );
    const outcome = await h.run();
    expect(outcome).toEqual({ canto: ID, status: 'completed', missed: [], chapterEnd: null });
    expect(narrations(h)).toEqual(['First.', 'Second.', 'Third.']);
    expect(h.runner.status).toBe('finished');

    const order = h.events
      .map((e) => e.type)
      .filter((t) => ['canto:start', 'scene:start', 'scene:end', 'canto:end'].includes(t));
    expect(order).toEqual([
      'canto:start',
      ...Array(4).fill(['scene:start', 'scene:end']).flat(),
      'canto:end',
    ]);
    const presenterOrder = h.presenter.calls.map((c) => c.method);
    expect(presenterOrder[0]).toBe('beginCanto');
    expect(presenterOrder.at(-1)).toBe('endCanto');
    expect(h.world.of('loadCanto')).toHaveLength(1);
    expect(h.store.state.completedCantos).toEqual([ID]);
    expect(h.store.state.seen).toEqual(
      expect.arrayContaining([`${ID}.s0`, `${ID}.s0.b1`, `${ID}.s1`, `${ID}.s1.b1`, `${ID}.s1.b2`, `${ID}.s3.b1`]),
    );
  });

  it('saves at every scene start, positioned at that scene', async () => {
    const h = harnessFor(
      [openingScene(ID), scene(`${ID}.s1`, 'One', beat(`${ID}.s1.b1`, 'A', '@mode: cinematic\nNARRATION: x')), colophonScene(ID, 2)].join(
        '\n',
      ),
    );
    const saves: (string | null)[] = [];
    h.bus.on('scene:start', () => saves.push(h.store.load()?.position.scene ?? null));
    await h.run();
    expect(saves).toEqual([`${ID}.s0`, `${ID}.s1`, `${ID}.s2`]);
  });

  it('starts at a scene or a beat (the beat runs regardless of its trigger)', async () => {
    const body = [
      openingScene(ID),
      scene(
        `${ID}.s1`,
        'One',
        beat(`${ID}.s1.b1`, 'A', '@mode: play\nNARRATION: A.'),
        beat(`${ID}.s1.b2`, 'B', '@mode: play\n@trigger: talk:VIRGIL\nNARRATION: B.'),
        beat(`${ID}.s1.b3`, 'C', '@mode: play\nNARRATION: C.'),
      ),
      colophonScene(ID, 2),
    ].join('\n');
    const h1 = harnessFor(body);
    await h1.run(`${ID}.s1`);
    expect(h1.presenter.of('openPage')).toHaveLength(0);
    expect(narrations(h1)).toEqual(['A.', 'B.', 'C.']);

    const h2 = harnessFor(body);
    const out = await h2.run(`${ID}.s1.b2`);
    expect(narrations(h2)).toEqual(['B.', 'C.']);
    expect(out.missed).toEqual([`${ID}.s1.b1`]);
    expect(h2.logs('warn')).toEqual([]);
  });
});

describe('triggers (§5.3)', () => {
  const body = [
    openingScene(ID),
    scene(
      `${ID}.s1`,
      'The Wood',
      beat(`${ID}.s1.b1`, 'Start', '@mode: play\n@place: inf98_wood\nNARRATION: Start.'),
      beat(`${ID}.s1.b2`, 'Clearing', '@mode: play\n@trigger: enter:inf98_clearing\nNARRATION: Clearing.'),
      beat(`${ID}.s1.b3`, 'Guide', '@mode: dialogue\n@trigger: talk:VIRGIL\nNARRATION: Guide.'),
      beat(`${ID}.s1.b4`, 'Event', '@mode: play\n@trigger: event:inf98.rang\nNARRATION: Bell.'),
      beat(`${ID}.s1.b5`, 'After', '@mode: play\n@trigger: after:inf98.s1.b4\nNARRATION: After.'),
    ),
    colophonScene(ID, 2),
  ].join('\n');

  it('waits for enter / talk / event, arms the right beats and hands control to the player', async () => {
    const armedLog: string[][] = [];
    const h = harnessFor(body, {
      places: ['inf98_wood', 'inf98_clearing'],
      npcs: ['VIRGIL'],
      emits: ['inf98.rang'],
      onArmed: (armed, world) => {
        armedLog.push(armed.map((a) => `${a.beat}${a.cursor ? '*' : ''}`));
        expect(world.control).toBe(true);
        const cursor = armed.find((a) => a.cursor) as ArmedBeat;
        setTimeout(() => world.satisfy(cursor.trigger), 0);
      },
    });
    const out = await h.run();
    expect(out.status).toBe('completed');
    expect(narrations(h)).toEqual(['Start.', 'Clearing.', 'Guide.', 'Bell.', 'After.']);
    expect(armedLog).toEqual([
      [`${ID}.s1.b2*`, `${ID}.s1.b3`, `${ID}.s1.b4`, `${ID}.s1.b5`],
      [`${ID}.s1.b3*`, `${ID}.s1.b4`, `${ID}.s1.b5`],
      [`${ID}.s1.b4*`, `${ID}.s1.b5`],
    ]);
    expect(h.logs('warn')).toEqual([]);
    expect(h.emitted('runner:status').map((s) => s.status)).toContain('waiting');
  });

  const direct = [
    openingScene(ID),
    scene(
      `${ID}.s1`,
      'The Wood',
      beat(`${ID}.s1.b1`, 'Start', '@mode: play\nDO: Zil çalar. {event:inf98.rang}\nNARRATION: Start.'),
      beat(`${ID}.s1.b2`, 'Clearing', '@mode: play\n@trigger: enter:inf98_clearing\nNARRATION: Clearing.'),
      beat(`${ID}.s1.b3`, 'Guide', '@mode: dialogue\n@trigger: talk:VIRGIL\nNARRATION: Guide.'),
      beat(`${ID}.s1.b4`, 'Bell', '@mode: play\n@trigger: event:inf98.rang\nNARRATION: Bell.'),
    ),
    colophonScene(ID, 2),
  ].join('\n');

  it('needs no wait when the trigger already holds: standing in the place, a talk during the preceding beat, an event earlier in the scene', async () => {
    const h = harnessFor(direct, {
      places: ['inf98_clearing'],
      npcs: ['VIRGIL'],
      emits: ['inf98.rang'],
      onDirect: (_stmt, _i, info, world) => {
        // During b1 the bell rings and the player walks into the clearing.
        if (info.beat.id === `${ID}.s1.b1`) {
          world.emit('inf98.rang');
          world.current = 'inf98_clearing';
        }
      },
    });
    // The player talks to Virgil while b2 runs: buffered, it fires b3 at the next wait.
    h.bus.on('beat:start', (p) => {
      if (p.beat === `${ID}.s1.b2`) h.world.talk('VIRGIL');
    });
    let armed = 0;
    h.bus.on('beat:armed', (p) => {
      if (p.armed.length > 0) armed++;
    });
    await h.run();
    expect(narrations(h)).toEqual(['Start.', 'Clearing.', 'Guide.', 'Bell.']);
    expect(armed).toBe(0);
    expect(h.store.state.events).toEqual(['inf98.rang']);
  });

  it('a later talk beat fires out of order while the cursor waits on', async () => {
    const h = harnessFor(direct, {
      places: ['inf98_clearing'],
      npcs: ['VIRGIL'],
      onArmed: (armed, world) => {
        if (armed.find((a) => a.cursor)?.beat === `${ID}.s1.b2`) setTimeout(() => world.talk('VIRGIL'), 0);
      },
    });
    let enterQueued = false;
    h.bus.on('beat:end', (p) => {
      if (p.beat === `${ID}.s1.b3` && !enterQueued) {
        enterQueued = true;
        setTimeout(() => h.world.enter('inf98_clearing'), 0);
      }
    });
    const out = await h.run();
    expect(out.missed).toEqual([]);
    // b4's event comes from no level: the runner's fallback fires it.
    expect(narrations(h)).toEqual(['Start.', 'Guide.', 'Clearing.', 'Bell.']);
  });

  it('a talk while nothing is armed for it is dropped (talk: needs an interaction while armed)', async () => {
    const body2 = [
      openingScene(ID),
      scene(
        `${ID}.s1`,
        'One',
        beat(`${ID}.s1.b1`, 'A', '@mode: play\nNARRATION: A.'),
        beat(`${ID}.s1.b2`, 'B', '@mode: play\n@trigger: enter:inf98_clearing\nNARRATION: B.'),
      ),
      scene(
        `${ID}.s2`,
        'Two',
        beat(`${ID}.s2.b1`, 'C', '@mode: dialogue\nNARRATION: C.'),
        beat(`${ID}.s2.b2`, 'D', '@mode: dialogue\n@trigger: talk:VIRGIL\nNARRATION: D.'),
      ),
      colophonScene(ID, 3),
    ].join('\n');
    let firedEarly = false;
    const h = harnessFor(body2, {
      places: ['inf98_clearing'],
      npcs: ['VIRGIL'],
      onArmed: (armed, world) => {
        const cursor = armed.find((a) => a.cursor)?.beat;
        if (cursor === `${ID}.s1.b2`) {
          world.talk('VIRGIL'); // nothing armed answers to Virgil yet
          setTimeout(() => world.enter('inf98_clearing'), 0);
        } else if (cursor === `${ID}.s2.b2`) {
          firedEarly = h.store.state.seen.includes(`${ID}.s2.b2`);
          setTimeout(() => world.talk('VIRGIL'), 0);
        }
      },
    });
    await h.run();
    expect(firedEarly).toBe(false);
    expect(narrations(h)).toEqual(['A.', 'B.', 'C.', 'D.']);
  });

  it('an out-of-order event beat fires as soon as its event comes (and its after: follower with it)', async () => {
    const h = harnessFor(body, {
      places: ['inf98_wood', 'inf98_clearing'],
      npcs: ['VIRGIL'],
      emits: ['inf98.rang'],
      onArmed: (armed, world) => {
        if (armed.find((a) => a.cursor)?.beat === `${ID}.s1.b2`) setTimeout(() => world.emit('inf98.rang'), 0);
      },
    });
    const out = await h.run();
    // b4 fired out of order, b5 (after:b4) ran with it and was the scene's last beat: b2, b3 missed.
    expect(narrations(h)).toEqual(['Start.', 'Bell.', 'After.']);
    expect(out.missed).toEqual([`${ID}.s1.b2`, `${ID}.s1.b3`]);
  });

  it('an event of an earlier scene does not satisfy a later scene (scene scope)', async () => {
    const b = [
      openingScene(ID),
      scene(`${ID}.s1`, 'One', beat(`${ID}.s1.b1`, 'A', '@mode: play\nDO: Zil çalar. {event:inf98.rang}\nNARRATION: A.')),
      scene(
        `${ID}.s2`,
        'Two',
        beat(`${ID}.s2.b1`, 'B', '@mode: play\nNARRATION: B.'),
        beat(`${ID}.s2.b2`, 'C', '@mode: play\n@trigger: event:inf98.rang\nNARRATION: C.'),
      ),
      colophonScene(ID, 3),
    ].join('\n');
    const h = harnessFor(b, {
      emits: ['inf98.rang'],
      onDirect: (_stmt, _i, _info, world) => world.emit('inf98.rang'),
      onArmed: (armed, world) => {
        // Only after the runner waits in s2 does the bell ring again.
        if (armed.some((a) => a.beat === `${ID}.s2.b2` && a.cursor)) setTimeout(() => world.emit('inf98.rang'), 0);
      },
    });
    let armedC = false;
    h.bus.on('beat:armed', (p) => {
      if (p.armed.some((a) => a.beat === `${ID}.s2.b2`)) armedC = true;
    });
    await h.run();
    expect(armedC).toBe(true);
    expect(narrations(h)).toEqual(['A.', 'B.', 'C.']);
  });
});

describe('optional and out-of-order beats', () => {
  const hub = [
    openingScene(ID),
    scene(
      `${ID}.s1`,
      'Hub',
      beat(`${ID}.s1.b1`, 'Arrive', '@mode: play\nNARRATION: Arrive.'),
      beat(`${ID}.s1.b2`, 'Homer', '@mode: dialogue\n@trigger: talk:HOMER\nNARRATION: Homer.'),
      beat(`${ID}.s1.b3`, 'Homer after', '@mode: dialogue\nNARRATION: Homer again.'),
      beat(`${ID}.s1.b4`, 'Horace', '@mode: dialogue\n@trigger: talk:HORACE\nNARRATION: Horace.'),
      beat(`${ID}.s1.b5`, 'Leave', '@mode: play\n@trigger: enter:inf98_gate\nNARRATION: Leave.'),
    ),
    colophonScene(ID, 2),
  ].join('\n');

  it('a later beat fires with the auto beats after it; the cursor stays; the last beat ends the scene', async () => {
    const steps: (() => void)[] = [];
    const h = harnessFor(hub, {
      places: ['inf98_gate'],
      npcs: ['HOMER', 'HORACE'],
      onArmed: () => {
        const next = steps.shift();
        if (next) setTimeout(next, 0);
      },
    });
    steps.push(
      () => h.world.talk('HORACE'), // out of order: b4 (no auto beats after it)
      () => h.world.enter('inf98_gate'), // b5 is the last beat: the scene ends, b2 and b3 are missed
    );
    const out = await h.run();
    expect(narrations(h)).toEqual(['Arrive.', 'Horace.', 'Leave.']);
    expect(out.missed).toEqual([`${ID}.s1.b2`, `${ID}.s1.b3`]);
    const sceneEnd = h.emitted('scene:end').find((e) => e.scene === `${ID}.s1`);
    expect(sceneEnd?.missed).toEqual([`${ID}.s1.b2`, `${ID}.s1.b3`]);
  });

  it('the cursor beat fires and its auto follower runs with it', async () => {
    const steps: (() => void)[] = [];
    const h = harnessFor(hub, {
      places: ['inf98_gate'],
      npcs: ['HOMER', 'HORACE'],
      onArmed: () => {
        const next = steps.shift();
        if (next) setTimeout(next, 0);
      },
    });
    steps.push(
      () => h.world.talk('HOMER'),
      () => h.world.talk('HORACE'),
      () => h.world.enter('inf98_gate'),
    );
    const out = await h.run();
    expect(narrations(h)).toEqual(['Arrive.', 'Homer.', 'Homer again.', 'Horace.', 'Leave.']);
    expect(out.missed).toEqual([]);
  });

  it('when several armed beats are satisfied at once, the earliest in file order fires', async () => {
    const steps: (() => void)[] = [];
    const h = harnessFor(hub, {
      places: ['inf98_gate'],
      npcs: ['HOMER', 'HORACE'],
      onArmed: () => {
        const next = steps.shift();
        if (next) setTimeout(next, 0);
      },
    });
    steps.push(
      () => {
        h.world.enter('inf98_gate');
        h.world.talk('HORACE');
        h.world.talk('HOMER');
      },
      () => h.world.talk('HORACE'),
      () => h.world.enter('inf98_gate'),
    );
    await h.run();
    expect(narrations(h)).toEqual(['Arrive.', 'Homer.', 'Homer again.', 'Horace.', 'Leave.']);
  });

  it("the next scene's head ends the scene; unrun beats are missed", async () => {
    const body = [
      openingScene(ID),
      scene(
        `${ID}.s1`,
        'One',
        beat(`${ID}.s1.b1`, 'A', '@mode: play\nNARRATION: A.'),
        beat(`${ID}.s1.b2`, 'Optional', '@mode: play\n@trigger: event:inf98.optional\nNARRATION: Optional.'),
      ),
      scene(
        `${ID}.s2`,
        'Two',
        beat(`${ID}.s2.b1`, 'Head', '@mode: play\n@trigger: enter:inf98_road\nNARRATION: Road.'),
        beat(`${ID}.s2.b2`, 'More', '@mode: play\nNARRATION: More.'),
      ),
      colophonScene(ID, 3),
    ].join('\n');
    const armed: string[][] = [];
    const h = harnessFor(body, {
      places: ['inf98_road'],
      emits: ['inf98.optional'],
      onArmed: (a, world) => {
        armed.push(a.map((x) => `${x.beat}${x.nextScene ? '>' : ''}`));
        setTimeout(() => world.enter('inf98_road'), 0);
      },
    });
    const out = await h.run();
    expect(armed[0]).toEqual([`${ID}.s1.b2`, `${ID}.s2.b1>`]);
    expect(narrations(h)).toEqual(['A.', 'Road.', 'More.']);
    expect(out.missed).toEqual([`${ID}.s1.b2`]);
  });
});

describe('fallback (§5.3)', () => {
  it('fires a trigger the level cannot produce after TIMINGS.triggerFallbackMs, with a warning', async () => {
    const body = [
      openingScene(ID),
      scene(
        `${ID}.s1`,
        'One',
        beat(`${ID}.s1.b1`, 'A', '@mode: play\nNARRATION: A.'),
        beat(`${ID}.s1.b2`, 'B', '@mode: play\n@trigger: enter:inf98_nowhere\nNARRATION: B.'),
      ),
      colophonScene(ID, 2),
    ].join('\n');
    const h = harnessFor(body);
    let firedAt = -1;
    h.bus.on('beat:start', (p) => {
      if (p.beat === `${ID}.s1.b2`) firedAt = h.clock.time;
    });
    await h.run();
    expect(narrations(h)).toEqual(['A.', 'B.']);
    expect(firedAt).toBe(TIMINGS.triggerFallbackMs);
    expect(h.logs('warn').some((m) => m.includes('enter:inf98_nowhere'))).toBe(true);
  });

  it('waits while the Book is open: the story never moves on behind the pause menu', async () => {
    const body = [
      openingScene(ID),
      scene(
        `${ID}.s1`,
        'One',
        beat(`${ID}.s1.b1`, 'A', '@mode: play\nNARRATION: A.'),
        beat(`${ID}.s1.b2`, 'B', '@mode: play\n@trigger: enter:inf98_nowhere\nNARRATION: B.'),
      ),
      colophonScene(ID, 2),
    ].join('\n');
    const h = harnessFor(body);
    h.bus.on('beat:armed', (p) => {
      if (p.armed.length > 0) h.bus.emit('ui:book', { open: true, tab: 'words' });
    });
    const run = h.run();
    // The fallback timer has run out…
    await until(() => h.clock.time >= TIMINGS.triggerFallbackMs && h.clock.pending === 0);
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
    // …but the beat waits for the Book to close.
    expect(h.runner.status).toBe('waiting');
    expect(h.store.state.seen).not.toContain(`${ID}.s1.b2`);
    h.bus.emit('ui:book', { open: false });
    await run;
    expect(narrations(h)).toEqual(['A.', 'B.']);
  });

  it('does not fire a trigger the level can produce', async () => {
    const body = [
      openingScene(ID),
      scene(
        `${ID}.s1`,
        'One',
        beat(`${ID}.s1.b1`, 'A', '@mode: play\nNARRATION: A.'),
        beat(`${ID}.s1.b2`, 'B', '@mode: play\n@trigger: talk:VIRGIL\nNARRATION: B.'),
      ),
      colophonScene(ID, 2),
    ].join('\n');
    let world: FakeWorld | null = null;
    const h = harnessFor(body, {
      npcs: ['VIRGIL'],
      onArmed: (_a, w) => {
        world = w;
      },
    });
    const run = h.run();
    // Let plenty of virtual time pass: nothing fires by itself.
    await new Promise((r) => setTimeout(r, 30));
    expect(h.runner.status).toBe('waiting');
    expect(h.runner.cursor).toBe(`${ID}.s1.b2`);
    expect(h.runner.armed().map((a) => a.beat)).toEqual([`${ID}.s1.b2`]);
    (world as unknown as FakeWorld).talk('VIRGIL');
    await run;
    expect(narrations(h)).toEqual(['A.', 'B.']);
  });
});
