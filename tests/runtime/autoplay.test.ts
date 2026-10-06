/**
 * Autoplay (docs/ENGINE.md §5.12) and cancellation (§5.13).
 */

import { describe, expect, it } from 'vitest';
import { TIMINGS } from '../../src/config';
import type { CantoOutcome, ChoiceOptionView } from '../../src/runtime/contracts';
import { beat, colophonScene, createHarness, openingScene, scene, scriptText, until } from './helpers/harness';
import type { FakeWorldOptions } from './helpers/fakes';

const ID = 'inf98';
const PATH = `/tests/runtime/${ID}.md`;

const BODY = [
  openingScene(ID),
  scene(
    `${ID}.s1`,
    'One',
    beat(
      `${ID}.s1.b1`,
      'Walk',
      `@mode: play
NARRATION: He walked.
DO: Işık iner. {event:inf98.waited}`,
    ),
    beat(`${ID}.s1.b2`, 'Glade', '@mode: play\n@trigger: enter:inf98_glade\nNARRATION: The glade.'),
    beat(
      `${ID}.s1.b3`,
      'Measure',
      `@mode: play
CHOICE inf98.c1 minor systemic "Waiting"
OPTION a [Waited] when: event:inf98.waited
OPTION b [Hurried] when: else
END CHOICE`,
    ),
  ),
  scene(
    `${ID}.s2`,
    'Two',
    beat(
      `${ID}.s2.b1`,
      'Ask',
      `@mode: dialogue
@trigger: talk:VIRGIL
VIRGIL: Well?
CHOICE inf98.c2 major "The answer"
OPTION a [First.]
OPTION b [Second.]
OPTION c [Third.]
REVEAL canon=b timing=immediate
QUOTE POET (Inferno I, 136)
> Then he moved on, and I behind him followed.
NOTE: He moved on.
END CHOICE`,
    ),
  ),
  colophonScene(ID, 3),
].join('\n');

function manual(world: FakeWorldOptions = { places: ['inf98_glade'], npcs: ['VIRGIL'] }) {
  const h = createHarness({ texts: { [PATH]: scriptText(ID, BODY) }, presenter: { mode: 'manual' }, world });
  return { ...h, run: () => h.runner.runCanto(h.script(ID)) };
}

describe('autoplay', () => {
  it('skips every text, satisfies triggers through the world, emits DO events and answers canonically', async () => {
    const h = manual();
    h.session.setAutoplay({ textDelayMs: 5, triggerDelayMs: 5 });
    const out = await h.run();
    expect(out.status).toBe('completed');
    expect(h.presenter.skips).toBeGreaterThan(5);
    expect(h.world.of('satisfy').map((c) => c.args[0])).toEqual([
      { kind: 'enter', place: 'inf98_glade' },
      { kind: 'talk', speaker: 'VIRGIL' },
    ]);
    expect(h.store.state.choices['inf98.c1']?.letter).toBe('a');
    expect(h.store.state.choices['inf98.c2']?.letter).toBe('b');
    expect(h.logs('warn')).toEqual([]);
  });

  it.each([
    ['first', 'a'],
    ['last', 'c'],
  ] as const)('answers %s', async (policy, letter) => {
    const h = manual();
    h.session.setAutoplay({ choices: policy, textDelayMs: 0, triggerDelayMs: 0 });
    await h.run();
    expect(h.store.state.choices['inf98.c2']?.letter).toBe(letter);
  });

  it('answers from a per-choice map, falling back to the canonical option', async () => {
    const h = manual();
    h.session.setAutoplay({ choices: { 'inf98.c2': 'c' }, textDelayMs: 0, triggerDelayMs: 0 });
    await h.run();
    expect(h.store.state.choices['inf98.c2']?.letter).toBe('c');
  });

  it('with events none, systemic choices measure nothing', async () => {
    const h = manual();
    h.session.setAutoplay({ events: 'none', textDelayMs: 0, triggerDelayMs: 0 });
    await h.run();
    expect(h.store.state.choices['inf98.c1']?.letter).toBe('b');
  });

  it('fires triggers the world cannot produce after the autoplay delay, not the slow fallback', async () => {
    const h = manual({});
    h.session.setAutoplay({ textDelayMs: 1, triggerDelayMs: 10 });
    let firedAt = -1;
    let armedAt = -1;
    h.bus.on('beat:armed', (p) => {
      if (p.armed.some((a) => a.beat === `${ID}.s1.b2`) && armedAt < 0) armedAt = h.clock.time;
    });
    h.bus.on('beat:start', (p) => {
      if (p.beat === `${ID}.s1.b2`) firedAt = h.clock.time;
    });
    await h.run();
    expect(firedAt - armedAt).toBeLessThan(TIMINGS.triggerFallbackMs);
  });

  it('stopAt pauses autoplay at a beat; turning it on again finishes the canto', async () => {
    const h = manual();
    h.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0, stopAt: `${ID}.s2.b1` });
    const run = h.run();
    await until(() => h.runner.autoplay === null && h.presenter.busy);
    expect(h.runner.beat?.id).toBe(`${ID}.s2.b1`);
    expect(h.store.state.choices['inf98.c2']).toBeUndefined();
    h.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0 });
    const out = await run;
    expect(out.status).toBe('completed');
  });

  it('can be turned on in the middle of a blocking line', async () => {
    const h = manual();
    const run = h.run();
    await until(() => h.presenter.busy);
    h.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0 });
    expect((await run).status).toBe('completed');
  });
});

describe('cancellation (§5.13)', () => {
  it('stop() during a blocking line settles everything and resolves stopped', async () => {
    const h = manual();
    const run = h.run();
    await until(() => h.presenter.busy);
    const callsBefore = h.presenter.calls.length;
    h.runner.stop('test');
    const out: CantoOutcome = await run;
    expect(out.status).toBe('stopped');
    expect(h.runner.status).toBe('stopped');
    expect(h.presenter.of('cancelAll')).toHaveLength(1);
    expect(h.world.of('cancel')).toHaveLength(1);
    // Nothing is shown after the stop but the cancel itself.
    expect(h.presenter.calls.slice(callsBefore).map((c) => c.method)).toEqual(['cancelAll']);
    expect(h.emitted('canto:end').at(-1)?.outcome.status).toBe('stopped');
  });

  it('stop() while waiting for a trigger', async () => {
    const h = manual();
    h.session.setAutoplay({ textDelayMs: 0, triggers: false });
    const run = h.run();
    await until(() => h.runner.status === 'waiting');
    h.runner.stop();
    expect((await run).status).toBe('stopped');
    expect(h.runner.armed()).toEqual([]);
  });

  it('stop() while a choice is open records nothing', async () => {
    const h = manual();
    h.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0, stopAt: `${ID}.s2.b1` });
    const run = h.run();
    // Autoplay pauses at s2.b1; the player reads Virgil's line, then the margin opens.
    await until(() => h.runner.autoplay === null && h.presenter.busy);
    h.presenter.skip();
    await until(() => h.presenter.choiceOpen);
    h.runner.stop();
    await run;
    expect(h.store.state.choices['inf98.c2']).toBeUndefined();
    expect((h.presenter.of('choose')[0]!.args[1] as ChoiceOptionView[]).length).toBe(3);
  });

  it('a new runCanto stops the old run first', async () => {
    const h = manual();
    const first = h.run();
    await until(() => h.presenter.busy);
    h.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0 });
    const second = h.run();
    expect((await first).status).toBe('stopped');
    expect((await second).status).toBe('completed');
  });
});
