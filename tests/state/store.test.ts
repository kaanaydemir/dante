import { describe, expect, it } from 'vitest';
import { RESOURCES, STORAGE_KEYS } from '../../src/config';
import { createEventBus } from '../../src/runtime/bus';
import { DEFAULT_SETTINGS, type GameEventName, type RevealCard } from '../../src/runtime/contracts';
import { createGameStateStore } from '../../src/state/store';
import { evaluateCondition } from '../../src/story/conditions';
import type { Condition } from '../../src/story/types';
import { MemoryStorage } from '../runtime/helpers/fakes';

function setup(storage: MemoryStorage | null = new MemoryStorage()) {
  const bus = createEventBus();
  const events: { type: GameEventName; payload: unknown }[] = [];
  bus.onAny((type, payload) => events.push({ type, payload }));
  const store = createGameStateStore({ bus, storage });
  const sys = { canto: 'inf01', beat: 'inf01.s1.b1' };
  return { bus, events, store, storage, sys, types: () => events.map((e) => e.type) };
}

const card = (choice: string, canto: string): RevealCard => ({
  choice,
  canto,
  recordTitle: 'T',
  heading: 'What Dante did',
  chosenLetter: 'a',
  chosenText: 'x',
  quotes: [],
  note: 'n',
  timing: 'deferred',
  deferred: true,
  highlightWords: [],
});

describe('GameStateStore: effects and events', () => {
  it('emits effect:applied, the specific event and state:changed', () => {
    const { store, types, sys, events } = setup();
    store.apply({ type: 'heart', side: 'pity', amount: 2, sin: 'limbo' }, sys);
    expect(types()).toEqual(['effect:applied', 'heart:changed', 'state:changed']);
    events.length = 0;
    store.apply({ type: 'trust', delta: 1 }, sys);
    expect(types()).toEqual(['effect:applied', 'trust:changed', 'state:changed']);
    events.length = 0;
    store.apply({ type: 'grace', delta: 1 }, sys);
    expect(types()).toEqual(['effect:applied', 'resources:changed', 'state:changed']);
    events.length = 0;
    store.apply({ type: 'flag', id: 'inf01.x' }, sys);
    store.apply({ type: 'flag', id: 'inf01.x' }, sys);
    expect(types()).toEqual(['effect:applied', 'state:changed', 'effect:applied']);
  });

  it('applyAll applies in order and returns every result', () => {
    const { store, sys } = setup();
    const results = store.applyAll(
      [
        { type: 'word', word: 'Hope' },
        { type: 'seal', word: 'Hope' },
        { type: 'word', word: 'Hope' },
      ],
      sys,
    );
    expect(results.map((r) => r.outcome)).toEqual(['applied', 'applied', 'unsealed']);
    expect(store.state.words.sealed).toEqual([]);
  });
});

describe('GameStateStore: conditions()', () => {
  it('answers every §2.8 predicate from the live state', () => {
    const { store, sys } = setup();
    const ctx = store.conditions();
    const ev = (c: Condition) => evaluateCondition(c, ctx);
    store.applyAll(
      [
        { type: 'flag', id: 'inf01.motive_gate' },
        { type: 'memory', id: 'inf05.paolo_francesca' },
        { type: 'codex', id: 'inf03.charon' },
        { type: 'word', word: 'Way' },
        { type: 'seal', word: 'Hope' },
        { type: 'heart', side: 'pity', amount: 3, sin: 'lust' },
        { type: 'heart', side: 'justice', amount: 1, sin: 'limbo' },
        { type: 'trust', delta: 3 },
        { type: 'virtue', virtue: 'prudence', amount: 1 },
      ],
      sys,
    );
    store.recordChoice({
      choice: 'inf05.c4',
      canto: 'inf05',
      beat: 'inf05.s6.b9',
      title: 'The verdict',
      weight: 'centre',
      systemic: false,
      letter: 'a',
      optionText: '[Weep with them.]',
      canon: ['a'],
      heading: 'As Dante did',
      note: 'n',
      order: 1,
    });
    store.markSeen('inf03.s2');
    store.recordEvent('inf01.waited_dawn');

    expect(ev({ type: 'flag', id: 'inf01.motive_gate' })).toBe(true);
    expect(ev({ type: 'flag', id: 'inf01.motive_souls' })).toBe(false);
    expect(ev({ type: 'memory', id: 'inf05.paolo_francesca' })).toBe(true);
    expect(ev({ type: 'codex', id: 'inf03.charon' })).toBe(true);
    expect(ev({ type: 'word', word: 'Way' })).toBe(true);
    expect(ev({ type: 'word', word: 'Hope' })).toBe(false);
    expect(ev({ type: 'sealed', word: 'Hope' })).toBe(true);
    expect(ev({ type: 'choice', choice: 'inf05.c4', letter: 'a' })).toBe(true);
    expect(ev({ type: 'choice', choice: 'inf05.c4', letter: 'b' })).toBe(false);
    expect(ev({ type: 'choice', choice: 'inf05.c3', letter: 'a' })).toBe(false);
    expect(ev({ type: 'seen', id: 'inf03.s2' })).toBe(true);
    expect(ev({ type: 'event', id: 'inf01.waited_dawn' })).toBe(true);
    expect(ctx.value({ kind: 'pity' })).toBe(3);
    expect(ctx.value({ kind: 'justice' })).toBe(1);
    expect(ctx.value({ kind: 'heart' })).toBe(2);
    expect(ctx.value({ kind: 'pity_at', sin: 'lust' })).toBe(3);
    expect(ctx.value({ kind: 'justice_at', sin: 'lust' })).toBe(0);
    expect(ctx.value({ kind: 'justice_at', sin: 'limbo' })).toBe(1);
    expect(ctx.value({ kind: 'trust' })).toBe(7);
    expect(ctx.value({ kind: 'virtue', virtue: 'prudence' })).toBe(1);
    expect(ctx.value({ kind: 'resolve' })).toBe(RESOURCES.resolveStart);
    expect(ctx.value({ kind: 'grace' })).toBe(RESOURCES.graceStart);
    expect(ev({ type: 'compare', variable: { kind: 'heart' }, op: '>=', value: 2 })).toBe(true);
  });

  it('stays live across reset and restore', () => {
    const { store, sys } = setup();
    const ctx = store.conditions();
    store.apply({ type: 'flag', id: 'inf01.a' }, sys);
    expect(ctx.hasFlag('inf01.a')).toBe(true);
    const snap = store.snapshot();
    store.reset();
    expect(ctx.hasFlag('inf01.a')).toBe(false);
    store.restore(snap);
    expect(ctx.hasFlag('inf01.a')).toBe(true);
  });
});

describe('GameStateStore: bookkeeping', () => {
  it('records seen ids and events once', () => {
    const { store } = setup();
    store.markSeen('inf01.s1');
    store.markSeen('inf01.s1');
    expect(store.state.seen).toEqual(['inf01.s1']);
    expect(store.recordEvent('inf01.e')).toBe(true);
    expect(store.recordEvent('inf01.e')).toBe(false);
  });

  it('merges lines seen as sorted unique numbers', () => {
    const { store } = setup();
    store.markLinesSeen('Inferno', 1, [12, 10, 11]);
    store.markLinesSeen('Inferno', 1, [11, 1, 0, -2, 2.5]);
    expect(store.state.linesSeen).toEqual({ 'Inferno:1': [1, 10, 11, 12] });
  });

  it('keeps pending reveals per canto and hands them out in order', () => {
    const { store } = setup();
    store.pushPendingReveal({ canto: 'inf05', card: card('inf05.c3', 'inf05') });
    store.pushPendingReveal({ canto: 'inf04', card: card('inf04.c1', 'inf04') });
    store.pushPendingReveal({ canto: 'inf05', card: card('inf05.c4', 'inf05') });
    expect(store.takePendingReveals('inf05').map((r) => r.card.choice)).toEqual(['inf05.c3', 'inf05.c4']);
    expect(store.takePendingReveals('inf05')).toEqual([]);
    expect(store.state.pendingReveals.map((r) => r.canto)).toEqual(['inf04']);
  });

  it('counts choices, keeps positions, hints, cantos, verses', () => {
    const { store } = setup();
    store.setPosition({ canto: 'inf02', scene: 'inf02.s1' });
    store.setPosition({ beat: 'inf02.s1.b2' });
    expect(store.state.position).toEqual({ canto: 'inf02', scene: 'inf02.s1', beat: 'inf02.s1.b2', checkpoint: null });
    store.setPosition({ checkpoint: { canto: 'inf02', place: 'inf02_hill', x: 3, y: 4 } });
    expect(store.state.position.checkpoint).toEqual({ canto: 'inf02', place: 'inf02_hill', x: 3, y: 4 });
    store.markHintUsed('inf02.s1.b2#0');
    store.markHintUsed('inf02.s1.b2#0');
    expect(store.state.hintsUsed).toEqual(['inf02.s1.b2#0']);
    store.completeCanto('inf01');
    store.completeCanto('inf01');
    expect(store.state.completedCantos).toEqual(['inf01']);
    const verse = { tercets: [['Way', 'Love', 'Away'] as const], coda: null };
    store.addVerse('inf02', verse);
    store.setEquippedVerse(verse);
    expect(store.state.verses).toEqual([{ canto: 'inf02', verse, order: 1 }]);
    expect(store.state.equippedVerse).toEqual(verse);
    store.recordFaint();
    expect(store.state.stats.faints).toBe(1);
  });
});

describe('GameStateStore: gameplay resources', () => {
  it('adjustResolve clamps, emits and ignores losses in easy mode', () => {
    const { store, types, events } = setup();
    expect(store.adjustResolve(-2.5, 'fear')).toBe(7.5);
    expect(types()).toContain('resources:changed');
    expect(store.adjustResolve(-20, 'fear')).toBe(0);
    store.refillResolve();
    expect(store.state.resolve).toBe(RESOURCES.resolveMax);
    store.updateSettings({ easyMode: true });
    events.length = 0;
    expect(store.adjustResolve(-3, 'fear')).toBe(RESOURCES.resolveMax);
    expect(types()).not.toContain('resources:changed');
  });

  it('adjustGrace stays within 0..gracemax', () => {
    const { store } = setup();
    expect(store.adjustGrace(10)).toBe(6);
    expect(store.adjustGrace(-1)).toBe(5);
    expect(store.adjustGrace(-10)).toBe(0);
  });
});

describe('GameStateStore: lifecycle and profiles', () => {
  it('reset(m0) applies the M0 kit as system effects', () => {
    const { store, events } = setup();
    store.reset('m0');
    const s = store.state;
    expect(s.profile).toBe('m0');
    expect(s.unlocks).toEqual(['words', 'book', 'verse', 'compose', 'heart', 'codex', 'remembrance']);
    expect(s.words.owned).toEqual(['Way', 'Love', 'Away']);
    expect(events.some((e) => e.type === 'state:restored')).toBe(true);
  });

  it('snapshot is a deep copy', () => {
    const { store, sys } = setup();
    const snap = store.snapshot();
    store.apply({ type: 'word', word: 'Way' }, sys);
    expect(snap.words.owned).toEqual([]);
  });

  it('restore ignores garbage', () => {
    const { store, sys } = setup();
    store.apply({ type: 'word', word: 'Way' }, sys);
    store.restore({ nonsense: true } as never);
    expect(store.state.words.owned).toEqual(['Way']);
  });
});

describe('GameStateStore: persistence', () => {
  it('saves and loads a versioned save file', () => {
    const { store, storage, sys } = setup();
    expect(store.hasSave()).toBe(false);
    store.apply({ type: 'word', word: 'Way' }, sys);
    store.setPosition({ canto: 'inf01', scene: 'inf01.s2' });
    expect(store.save()).toBe(true);
    const raw = JSON.parse(storage?.getItem(STORAGE_KEYS.save) ?? '{}') as { format: string; version: number };
    expect(raw.format).toBe('dante-save');
    expect(raw.version).toBe(1);
    expect(store.hasSave()).toBe(true);
    const loaded = store.load();
    expect(loaded?.words.owned).toEqual(['Way']);
    expect(loaded?.position.scene).toBe('inf01.s2');
    store.reset();
    expect(store.state.words.owned).toEqual([]);
    store.restore(loaded!);
    expect(store.state.words.owned).toEqual(['Way']);
    store.clearSave();
    expect(store.hasSave()).toBe(false);
  });

  it('works without storage and when storage throws', () => {
    const none = setup(null);
    expect(none.store.save()).toBe(false);
    expect(none.store.load()).toBeNull();
    expect(none.store.hasSave()).toBe(false);
    none.store.updateSettings({ fontScale: 1.3 });
    expect(none.store.settings.fontScale).toBe(1.3);

    const broken = new MemoryStorage();
    const b = setup(broken);
    broken.failWrites = true;
    expect(b.store.save()).toBe(false);
    b.store.updateSettings({ highContrast: true });
    expect(b.store.settings.highContrast).toBe(true);
    broken.failReads = true;
    expect(b.store.load()).toBeNull();
    expect(b.store.hasSave()).toBe(false);
  });

  it('a corrupt save loads as null', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.save, '{not json');
    const { store } = setup(storage);
    expect(store.load()).toBeNull();
    storage.setItem(STORAGE_KEYS.save, JSON.stringify({ format: 'dante-save', version: 99, state: {} }));
    expect(store.load()).toBeNull();
  });

  it('settings persist apart from the save and survive a new game', () => {
    const storage = new MemoryStorage();
    const a = setup(storage);
    expect(a.store.settings).toEqual(DEFAULT_SETTINGS);
    a.store.updateSettings({ textSpeed: 'fast', revealTiming: 'end_of_canto', masterVolume: 3 });
    expect(a.store.settings.masterVolume).toBe(1);
    a.store.reset();
    expect(a.store.settings.textSpeed).toBe('fast');
    const b = setup(storage);
    expect(b.store.settings.textSpeed).toBe('fast');
    expect(b.store.settings.revealTiming).toBe('end_of_canto');
  });

  it('rejects invalid setting values', () => {
    const { store, events } = setup();
    store.updateSettings({ textSpeed: 'ludicrous' as never, fontScale: 2 as never, verseDisplay: 'all_at_once' });
    expect(store.settings.textSpeed).toBe('normal');
    expect(store.settings.fontScale).toBe(1);
    expect(store.settings.verseDisplay).toBe('all_at_once');
    expect(events.some((e) => e.type === 'settings:changed')).toBe(true);
  });
});
