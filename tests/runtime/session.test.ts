/**
 * The game session (docs/ENGINE.md §5.1): chapters, missing cantos, save and
 * continue, jump, the M0 profile, stop, autoplay options.
 */

import { describe, expect, it } from 'vitest';
import { TIMINGS } from '../../src/config';
import type { MissingCantoSpec, OpeningPageSpec } from '../../src/runtime/contracts';
import { beat, colophonScene, createHarness, openingScene, scene, scriptText, until } from './helpers/harness';
import { MemoryStorage } from './helpers/fakes';

/** A small canto: s1 applies counters, s2 waits for Virgil and applies trust. */
function canto(id: string, mechanics: string[] = ['move']): string {
  return scriptText(
    id,
    [
      openingScene(id),
      scene(
        `${id}.s1`,
        'First',
        beat(`${id}.s1.b1`, 'A', `@mode: dialogue\nNARRATION: ${id} one.\nEFFECTS: pity+1@limbo, trust+1, flag:${id}.one`),
      ),
      scene(
        `${id}.s2`,
        'Second',
        beat(`${id}.s2.b1`, 'B', `@mode: dialogue\n@trigger: talk:VIRGIL\nNARRATION: ${id} two.\nEFFECTS: trust+1`),
      ),
      colophonScene(id, 3),
    ].join('\n'),
    { mechanics },
  );
}

const path = (id: string) => `/docs/script/inferno-${id.slice(3)}.md`;

describe('newGame and the chapter loop', () => {
  it('shows a "still being written" page for every missing canto and completes the chapter', async () => {
    const h = createHarness();
    await h.session.newGame();
    const pages = h.presenter.args<MissingCantoSpec>('missingCanto');
    expect(pages.map((p) => [p.cantoId, p.cantoLabel, p.title, p.status])).toEqual([
      ['inf01', 'CANTO I', 'The Dark Wood', 'missing'],
      ['inf02', 'CANTO II', 'The Evening of Doubt', 'missing'],
      ['inf03', 'CANTO III', 'The Gate', 'missing'],
      ['inf04', 'CANTO IV', 'Limbo', 'missing'],
      ['inf05', 'CANTO V', 'The Infernal Hurricane', 'missing'],
    ]);
    expect(pages[0]!.message).toBe('This canto is still being written.');
    expect(h.emitted('canto:missing').map((e) => e.canto)).toEqual(['inf01', 'inf02', 'inf03', 'inf04', 'inf05']);
    expect(h.session.status).toBe('chapter_complete');
    expect(h.emitted('session:status').map((s) => s.status)).toEqual(['playing', 'chapter_complete']);
    expect(h.presenter.of('showTitle')).toHaveLength(1);
  });

  it('an unplayable script is reported as invalid and skipped', async () => {
    const h = createHarness({ texts: { [path('inf02')]: 'no front matter, no scenes' } });
    await h.session.newGame();
    const page = h.presenter.args<MissingCantoSpec>('missingCanto').find((p) => p.cantoId === 'inf02');
    expect(page?.status).toBe('invalid');
    expect(h.session.status).toBe('chapter_complete');
  });

  it('plays the written cantos in order with talk triggers answered by the player', async () => {
    const h = createHarness({
      texts: { [path('inf01')]: canto('inf01'), [path('inf03')]: canto('inf03', ['faint']), [path('inf04')]: canto('inf04') },
      world: { npcs: ['VIRGIL'], onArmed: (_a, world) => setTimeout(() => world.talk('VIRGIL'), 0) },
    });
    await h.session.newGame();
    expect(h.presenter.args<string>('narration')).toEqual([
      'inf01 one.',
      'inf01 two.',
      'inf03 one.',
      'inf03 two.',
      'inf04 one.',
      'inf04 two.',
    ]);
    expect(h.store.state.completedCantos).toEqual(['inf01', 'inf03', 'inf04']);
    expect(h.store.state.trust).toBe(10);
    // Canto III lists `faint`: Canto IV opens with a waking epigraph; Canto III does not (II is missing, not a faint).
    const openings = h.presenter.args<OpeningPageSpec>('openPage').filter((p) => p.kind === 'opening');
    expect(openings.map((p) => [p.canto.id, p.awakening])).toEqual([
      ['inf01', false],
      ['inf03', false],
      ['inf04', true],
    ]);
    expect(h.session.status).toBe('chapter_complete');
    expect(h.session.cantoId).toBe('inf05');
  });

  it('a newer newGame supersedes the one in progress', async () => {
    const h = createHarness({ texts: { [path('inf01')]: canto('inf01') }, world: { npcs: ['VIRGIL'] } });
    const first = h.session.newGame();
    await until(() => h.runner.status === 'waiting');
    h.world.calls.length = 0;
    const second = h.session.newGame({ startAt: 'inf01.s2' });
    await until(() => h.runner.status === 'waiting');
    h.world.talk('VIRGIL');
    await Promise.all([first, second]);
    expect(h.session.status).toBe('chapter_complete');
    // The second game started fresh at s2: s1's effects never applied.
    expect(h.store.state.flags).toEqual([]);
    expect(h.store.state.trust).toBe(5);
  });
});

describe('save and continue', () => {
  it('continues from the saved scene start without applying any effect twice', async () => {
    const storage = new MemoryStorage();
    const a = createHarness({ texts: { [path('inf01')]: canto('inf01') }, world: { npcs: ['VIRGIL'] }, storage });
    expect(a.session.canContinue()).toBe(false);
    void a.session.newGame();
    await until(() => a.runner.cursor === 'inf01.s2.b1' && a.runner.status === 'waiting');
    expect(a.store.state.trust).toBe(5);
    expect(a.session.canContinue()).toBe(true);
    a.session.stop();
    expect(a.session.status).toBe('stopped');
    expect(a.presenter.of('cancelAll').length).toBeGreaterThan(0);

    // A fresh game (as after a reload) on the same storage.
    const b = createHarness({
      texts: { [path('inf01')]: canto('inf01') },
      world: { npcs: ['VIRGIL'], onArmed: (_a, world) => setTimeout(() => world.talk('VIRGIL'), 0) },
      storage,
    });
    expect(b.session.canContinue()).toBe(true);
    await b.session.continueGame();
    expect(b.presenter.args<string>('narration')).toEqual(['inf01 two.']);
    expect(b.presenter.of('openPage')).toHaveLength(0);
    expect(b.store.state.trust).toBe(6);
    expect(b.store.state.heart.pity).toBe(1);
    expect(b.store.state.flags).toEqual(['inf01.one']);
    expect(b.session.status).toBe('chapter_complete');
    // Cantos II–V are not written yet: the save waits at Canto II for a build that has it.
    expect(b.store.load()?.position.canto).toBe('inf02');
    expect(b.session.canContinue()).toBe(true);
  });

  it('a finished chapter leaves nothing to continue', async () => {
    const h = createHarness({ includeFixture: true });
    expect(h.session.canContinue()).toBe(false);
    await h.session.newGame({ chapter: 'fixture' });
    expect(h.session.status).toBe('chapter_complete');
    expect(h.store.hasSave()).toBe(true);
    expect(h.session.canContinue()).toBe(false);
  });

  it('after a completed canto, continue starts at the next canto', async () => {
    const storage = new MemoryStorage();
    const texts = { [path('inf01')]: canto('inf01'), [path('inf02')]: canto('inf02') };
    const a = createHarness({ texts, world: { npcs: ['VIRGIL'], onArmed: (_x, w) => setTimeout(() => w.talk('VIRGIL'), 0) }, storage });
    let stopped = false;
    a.bus.on('canto:start', (p) => {
      if (p.canto === 'inf02' && !stopped) {
        stopped = true;
        a.session.stop();
      }
    });
    await a.session.newGame();
    expect(a.store.load()?.completedCantos).toEqual(['inf01']);
    const b = createHarness({ texts, world: { npcs: ['VIRGIL'], onArmed: (_x, w) => setTimeout(() => w.talk('VIRGIL'), 0) }, storage });
    await b.session.continueGame();
    expect(b.presenter.args<string>('narration')).toEqual(['inf02 one.', 'inf02 two.']);
    expect(b.store.state.completedCantos).toEqual(['inf01', 'inf02']);
  });

  it('continue without a save starts a new game', async () => {
    const h = createHarness({ storage: null });
    await h.session.continueGame();
    expect(h.session.status).toBe('chapter_complete');
    expect(h.logs('warn').some((m) => m.includes('no saved game'))).toBe(true);
  });
});

describe('jump and the M0 profile', () => {
  it('jump keeps the state and plays on from a scene', async () => {
    const h = createHarness({
      texts: { [path('inf01')]: canto('inf01'), [path('inf02')]: canto('inf02') },
      world: { npcs: ['VIRGIL'], onArmed: (_a, w) => setTimeout(() => w.talk('VIRGIL'), 0) },
    });
    h.store.apply({ type: 'flag', id: 'inf01.kept' }, { canto: null, beat: null });
    await h.session.jump('inf02.s2');
    expect(h.presenter.args<string>('narration')).toEqual(['inf02 two.']);
    expect(h.store.state.flags).toContain('inf01.kept');
    expect(h.session.status).toBe('chapter_complete');
  });

  it('jump with profile m0 applies the missing kit first', async () => {
    const h = createHarness({ texts: { [path('inf05')]: canto('inf05') }, world: { npcs: ['VIRGIL'], onArmed: (_a, w) => setTimeout(() => w.talk('VIRGIL'), 0) } });
    h.store.apply({ type: 'word', word: 'Fear' }, { canto: null, beat: null });
    await h.session.jump('inf05', { profile: 'm0' });
    const s = h.store.state;
    expect(s.words.owned).toEqual(['Way', 'Love', 'Away']);
    expect(s.words.shed).toEqual(['Fear']);
    expect(s.unlocks).toEqual(expect.arrayContaining(['verse', 'compose', 'heart', 'codex', 'remembrance', 'words', 'book']));
  });

  it('newGame with m0 plays Canto I straight into Canto V, with the kit before V', async () => {
    const h = createHarness({
      texts: {
        [path('inf01')]: scriptText(
          'inf01',
          [
            openingScene('inf01'),
            scene(
              'inf01.s1',
              'Wood',
              beat(
                'inf01.s1.b1',
                'Fear',
                `@mode: play
QUOTE POET (Inferno I, 4–6)
> Ah me! how hard a thing it is to say
> What was this forest savage, rough, and stern,
> Which in the very thought renews the fear.
EFFECTS: unlock:words, word:Fear`,
              ),
            ),
            colophonScene('inf01', 2),
          ].join('\n'),
        ),
        [path('inf03')]: canto('inf03'),
        [path('inf05')]: scriptText('inf05', [openingScene('inf05'), scene('inf05.s1', 'X', beat('inf05.s1.b1', 'X', '@mode: dialogue\nIF word:Love and not word:Fear\nNARRATION: kit applied\nEND IF')), colophonScene('inf05', 2)].join('\n')),
      },
    });
    let unlocksAtStart: readonly string[] = [];
    h.bus.on('canto:start', (p) => {
      if (p.canto === 'inf01') unlocksAtStart = [...h.store.state.unlocks];
    });
    await h.session.newGame({ profile: 'm0' });
    expect(unlocksAtStart).toEqual([]);
    expect(h.store.state.profile).toBe('m0');
    expect(h.store.state.completedCantos).toEqual(['inf01', 'inf05']);
    expect(h.presenter.args<string>('narration')).toEqual(['kit applied']);
    expect(h.presenter.of('missingCanto')).toHaveLength(0);
  });
});

describe('stop and autoplay options', () => {
  it('stop settles everything and returns to the title; a new game works afterwards', async () => {
    const h = createHarness({ texts: { [path('inf01')]: canto('inf01') }, presenter: { mode: 'manual' } });
    const game = h.session.newGame();
    await until(() => h.presenter.busy);
    h.session.stop();
    await game;
    expect(h.session.status).toBe('stopped');
    expect(h.runner.status).toBe('stopped');
    expect(h.world.of('cancel')).toHaveLength(1);
    expect(h.presenter.of('showTitle')).toHaveLength(1);

    h.session.setAutoplay({ textDelayMs: 0 });
    await h.session.newGame({ startAt: 'inf01.s1' });
    expect(h.session.status).toBe('chapter_complete');
  });

  it('setAutoplay merges with the defaults and null turns it off', () => {
    const h = createHarness();
    const opts = h.session.setAutoplay({ choices: 'last' });
    expect(opts).toEqual({
      choices: 'last',
      textDelayMs: TIMINGS.autoplayTextMs,
      triggers: true,
      triggerDelayMs: TIMINGS.autoplayTriggerMs,
      events: 'all',
      stopAt: null,
    });
    expect(h.runner.autoplay).toEqual(opts);
    expect(h.session.setAutoplay(null)).toBeNull();
    expect(h.runner.autoplay).toBeNull();
  });
});
