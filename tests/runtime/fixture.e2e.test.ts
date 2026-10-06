/**
 * End to end: the engine fixture (tests/fixtures/test-canto.md, canto inf99)
 * played through the real parser, store, runner and session, with different
 * players; then every real canto script that exists.
 */

import { describe, expect, it } from 'vitest';
import type { ColophonSpec, GameStateView, RevealCard } from '../../src/runtime/contracts';
import { RAW_SCRIPTS } from '../../src/story/load';
import type { OptionLetter } from '../../src/story/types';
import { createHarness, until } from './helpers/harness';
import { MemoryStorage, type FakeWorldOptions } from './helpers/fakes';

/** The parts of the state a playthrough decides. */
function outcome(s: GameStateView) {
  return {
    words: s.words,
    flags: s.flags,
    choices: Object.fromEntries(Object.values(s.choices).map((c) => [c.choice, `${c.letter} ${c.heading}`])),
    heart: s.heart,
    trust: s.trust,
    virtues: s.virtues,
    resolve: s.resolve,
    grace: s.grace,
    gracemax: s.gracemax,
    unlocks: s.unlocks,
    codex: s.codex,
    memories: s.memories,
    completed: s.completedCantos,
    pending: s.pendingReveals.length,
  };
}

function fixture(opts: { world?: FakeWorldOptions; choose?: Record<string, OptionLetter>; storage?: MemoryStorage } = {}) {
  return createHarness({
    includeFixture: true,
    presenter: opts.choose
      ? { choose: (spec, options) => opts.choose?.[spec.id] ?? options[0]?.letter ?? 'a' }
      : { mode: 'manual' },
    ...(opts.world ? { world: opts.world } : {}),
    ...(opts.storage ? { storage: opts.storage } : {}),
  });
}

describe('fixture: the canonical reader (autoplay, canon choices, every DO event)', () => {
  it('reaches the chapter end with the expected state', async () => {
    const h = fixture();
    h.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0 });
    await h.session.newGame({ chapter: 'fixture' });
    expect(h.session.status).toBe('chapter_complete');
    expect(h.logs('error')).toEqual([]);
    expect(outcome(h.store.state)).toEqual({
      words: { owned: ['Way', 'Hope', 'Love'], sealed: [], shed: ['Fear'] },
      flags: ['inf99.motive_escape', 'ch1.heart_even'],
      choices: {
        'inf99.c1': 'a As Dante did',
        'inf99.c2': 'a As Dante did',
        'inf99.c3': 'a What Dante did',
        'inf99.c4': 'a As Dante did',
      },
      heart: { pity: 1, justice: 0, ledger: { limbo: { pity: 1, justice: 0 } } },
      trust: 4,
      virtues: { prudence: 1, justice: 0, fortitude: 1, temperance: 1 },
      resolve: 10,
      // 3 + 1 per word taken from its line (Way, Hope, Love) + 0.5 for talking to Virgil, capped at 6 then.
      grace: 6,
      gracemax: 7,
      unlocks: ['words', 'codex', 'heart', 'remembrance', 'compose', 'verse', 'chain', 'book'],
      codex: ['inf99.dark_wood', 'inf99.panther', 'inf99.virgil'],
      memories: ['inf99.virgil_mantua'],
      completed: ['inf99'],
      pending: 0,
    });
    // Words were taken from their lines (Fear by itself).
    const gained = h.presenter.args<{ word: string; collected: boolean }>('wordGained').filter((w) => w.collected);
    expect(gained.map((w) => w.word)).toEqual(['Fear', 'Way', 'Hope', 'Love']);
    // The GOTO diamond skipped s3.b3; the immediate cards came in play, the deferred ones at the colophon.
    expect(h.presenter.texts).not.toContain('The gate first. Whatever lies before it.');
    expect(h.presenter.texts).toContain('You looked back. It does not help.');
    expect(h.presenter.args<RevealCard>('reveal').map((c) => c.choice)).toEqual(['inf99.c1', 'inf99.c2']);
    const colophon = h.presenter.args<ColophonSpec>('colophon')[0]!;
    expect(colophon.reveals.map((c) => `${c.choice} ${c.heading}`)).toEqual(['inf99.c3 What Dante did', 'inf99.c4 As Dante did']);
    expect(colophon.closing?.lines).toEqual(['Then he moved on, and I behind him followed.']);
    expect(colophon.words.map((w) => `${w.word}:${w.change}`)).toEqual(['Fear:gained', 'Way:gained', 'Hope:gained', 'Love:gained', 'Fear:shed']);
    expect(h.store.state.events).toEqual(['inf99.waited_dawn', 'inf99.panther_gone', 'inf99.asked_home']);
    // Every quote of the fixture resolved to its source lines.
    for (const entry of h.store.state.log) {
      if (entry.kind === 'quote') expect(entry.lineNumbers.filter((n) => n === null).length).toBe(entry.lines.filter((l) => l === '…').length);
    }
  });
});

describe('fixture: another reader (gate, the stern question, hope put away)', () => {
  it('plays the other branches: no GOTO, the cross-canto flag default, the unsealing IF', async () => {
    const h = fixture({ choose: { 'inf99.c2': 'b', 'inf99.c3': 'b', 'inf99.c4': 'c' } });
    await h.session.newGame({ chapter: 'fixture' });
    expect(h.session.status).toBe('chapter_complete');
    const texts = h.presenter.texts;
    expect(texts).toContain('Then we have a long walk ahead.');
    expect(texts).toContain('Virgil turned toward the low ground, where the road began.');
    expect(texts).toContain('The gate first. Whatever lies before it.');
    expect(texts).toContain('That is a question for the road, not for this hillside.');
    expect(texts).toContain('Not yet. You will need it before the night is out.');
    expect(outcome(h.store.state)).toMatchObject({
      words: { owned: ['Fear', 'Way', 'Hope', 'Love'], sealed: [], shed: [] },
      flags: ['inf99.motive_gate', 'inf99.hope_put_away', 'ch1.heart_even'],
      choices: {
        'inf99.c1': 'b What Dante did',
        'inf99.c2': 'b As Dante did',
        'inf99.c3': 'b What Dante did',
        'inf99.c4': 'c What Dante did',
      },
      heart: { pity: 0, justice: 1 },
      trust: 5,
      virtues: { prudence: 0, justice: 1, fortitude: 0, temperance: 0 },
      resolve: 9,
      // Capped at 6 by reading, then grace-1 for putting hope away.
      grace: 5,
    });
    const words = h.presenter.args<{ word: string; change: string }>('wordGained').map((w) => `${w.word}:${w.change}`);
    expect(words).toEqual(['Fear:gained', 'Way:gained', 'Hope:gained', 'Love:gained', 'Hope:sealed', 'Hope:unsealed']);
  });
});

describe('fixture: a player in a level that produces every trigger', () => {
  it('needs no fallback; skips the optional look back; meets Virgil with hope', async () => {
    const h = fixture({
      choose: {},
      world: {
        places: ['inf99_wood', 'inf99_clearing', 'inf99_slope', 'inf99_ascent', 'inf99_glade', 'inf99_road'],
        npcs: ['VIRGIL'],
        emits: ['inf99.looked_back', 'inf99.waited_dawn', 'inf99.panther_gone', 'inf99.asked_home'],
        onArmed: (armed, world) => {
          const cursor = armed.find((a) => a.cursor);
          if (!cursor) return;
          setTimeout(() => {
            const t = cursor.trigger;
            if (t.kind === 'enter') world.enter(t.place);
            else if (t.kind === 'talk') world.talk(t.speaker);
            else if (t.kind === 'event' && t.id === 'inf99.looked_back') world.enter('inf99_slope'); // walks on instead
            else if (t.kind === 'event' && t.id === 'inf99.panther_gone') {
              world.emit('inf99.waited_dawn');
              world.emit('inf99.panther_gone');
            }
          }, 0);
        },
      },
    });
    await h.session.newGame({ chapter: 'fixture' });
    expect(h.session.status).toBe('chapter_complete');
    expect(h.logs('warn')).toEqual([]);
    expect(h.presenter.texts).toContain('The morning gave you something. Keep it close.');
    expect(h.store.state.seen).not.toContain('inf99.s1.b3');
    expect(h.store.state.choices['inf99.c1']?.letter).toBe('a');
    const misses = h.emitted('scene:end').flatMap((e) => e.missed);
    expect(misses).toEqual(['inf99.s1.b3', 'inf99.s3.b3']);
  });
});

describe('fixture: save and continue', () => {
  it('a game stopped in the middle and continued ends exactly like an uninterrupted one', async () => {
    const straight = fixture();
    straight.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0 });
    await straight.session.newGame({ chapter: 'fixture' });

    const storage = new MemoryStorage();
    const first = fixture({ storage });
    first.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0 });
    let stopped = false;
    first.bus.on('scene:start', (p) => {
      if (p.scene === 'inf99.s4' && !stopped) {
        stopped = true;
        first.session.stop();
      }
    });
    await first.session.newGame({ chapter: 'fixture' });
    expect(first.session.status).toBe('stopped');
    expect(first.store.load()?.position.scene).toBe('inf99.s4');

    const second = fixture({ storage });
    second.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0 });
    await second.session.continueGame();
    expect(second.session.status).toBe('chapter_complete');
    expect(outcome(second.store.state)).toEqual(outcome(straight.store.state));
    // The deferred card of s3 survived the reload and opened at the colophon.
    const colophon = second.presenter.args<ColophonSpec>('colophon')[0]!;
    expect(colophon.reveals.map((c) => c.choice)).toEqual(['inf99.c3', 'inf99.c4']);
  });
});

describe('fixture: Ask Virgil while waiting in the wood', () => {
  it('gives the scene hint, then its short form', async () => {
    const h = fixture({ choose: {}, world: { places: ['inf99_clearing'] } });
    const game = h.session.newGame({ chapter: 'fixture' });
    await until(() => h.runner.cursor === 'inf99.s1.b2' && h.runner.status === 'waiting');
    expect(h.session.askVirgil()?.text).toBe('Walk east, toward the grey light between the trees.');
    expect(h.session.askVirgil()?.text).toBe('East, toward the light.');
    h.world.enter('inf99_clearing');
    await game;
    expect(h.session.status).toBe('chapter_complete');
  });
});

const REAL = Object.keys(RAW_SCRIPTS);

describe.skipIf(REAL.length === 0)('the real Chapter 1 scripts', () => {
  it('autoplay reads the whole chapter without an engine error', async () => {
    const h = createHarness({ texts: RAW_SCRIPTS, presenter: { mode: 'manual' } });
    h.session.setAutoplay({ textDelayMs: 0, triggerDelayMs: 0 });
    await h.session.newGame();
    expect(h.session.status).toBe('chapter_complete');
    const engineErrors = h.logs('error').filter((m) => /failed|crashed/.test(m));
    expect(engineErrors).toEqual([]);
    const playable = h.story.cantoIds.filter((id) => h.story.canto(id).status === 'ok');
    expect(h.store.state.completedCantos).toEqual(playable.filter((id) => id.startsWith('inf0')));
  }, 30_000);
});
