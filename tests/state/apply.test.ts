import { describe, expect, it } from 'vitest';
import { RESOURCES } from '../../src/config';
import { applyEffectTo } from '../../src/state/apply';
import { createInitialState } from '../../src/state/initial';
import type { Effect } from '../../src/story/types';

const normal = { easyMode: false };

function fresh() {
  return createInitialState('full', 0);
}

describe('applyEffectTo: heart (bible §3.1)', () => {
  it('adds to the counter and the sin ledger', () => {
    const s = fresh();
    const r = applyEffectTo(s, { type: 'heart', side: 'pity', amount: 2, sin: 'limbo' }, normal);
    expect(r).toMatchObject({ outcome: 'applied', changed: true, heart: true });
    applyEffectTo(s, { type: 'heart', side: 'justice', amount: 3, sin: 'lust' }, normal);
    applyEffectTo(s, { type: 'heart', side: 'pity', amount: 1, sin: 'lust' }, normal);
    expect(s.heart.pity).toBe(3);
    expect(s.heart.justice).toBe(3);
    expect(s.heart.ledger).toEqual({ limbo: { pity: 2, justice: 0 }, lust: { pity: 1, justice: 3 } });
  });

  it('never subtracts: non-positive amounts are ignored', () => {
    const s = fresh();
    expect(applyEffectTo(s, { type: 'heart', side: 'pity', amount: -1, sin: 'lust' }, normal).outcome).toBe('ignored');
    expect(applyEffectTo(s, { type: 'heart', side: 'pity', amount: 0, sin: 'lust' }, normal).outcome).toBe('ignored');
    expect(s.heart.pity).toBe(0);
  });

  it('counts a malformed (untagged) heart effect without a ledger entry', () => {
    const s = fresh();
    applyEffectTo(s, { type: 'heart', side: 'justice', amount: 1, sin: null }, normal);
    expect(s.heart.justice).toBe(1);
    expect(s.heart.ledger).toEqual({});
  });
});

describe('applyEffectTo: trust (bible §3.3)', () => {
  it('starts at 4 and clamps to 0–10', () => {
    const s = fresh();
    expect(s.trust).toBe(4);
    expect(applyEffectTo(s, { type: 'trust', delta: 1 }, normal)).toMatchObject({ outcome: 'applied', trustDelta: 1 });
    expect(s.trust).toBe(5);
    expect(applyEffectTo(s, { type: 'trust', delta: 9 }, normal)).toMatchObject({ outcome: 'clamped', changed: true, trustDelta: 5 });
    expect(s.trust).toBe(10);
    expect(applyEffectTo(s, { type: 'trust', delta: 1 }, normal)).toMatchObject({ outcome: 'clamped', changed: false, trustDelta: 0 });
    applyEffectTo(s, { type: 'trust', delta: -20 }, normal);
    expect(s.trust).toBe(0);
  });
});

describe('applyEffectTo: virtues', () => {
  it('only grow', () => {
    const s = fresh();
    applyEffectTo(s, { type: 'virtue', virtue: 'fortitude', amount: 1 }, normal);
    applyEffectTo(s, { type: 'virtue', virtue: 'fortitude', amount: 1 }, normal);
    expect(applyEffectTo(s, { type: 'virtue', virtue: 'prudence', amount: -1 }, normal).outcome).toBe('ignored');
    expect(s.virtues).toEqual({ prudence: 0, justice: 0, fortitude: 2, temperance: 0 });
  });
});

describe('applyEffectTo: words (bible §2.10, §3.4.2)', () => {
  it('gives a word once', () => {
    const s = fresh();
    expect(applyEffectTo(s, { type: 'word', word: 'Way' }, normal).outcome).toBe('applied');
    expect(applyEffectTo(s, { type: 'word', word: 'Way' }, normal).outcome).toBe('duplicate');
    expect(s.words.owned).toEqual(['Way']);
  });

  it('seals and unseals', () => {
    const s = fresh();
    applyEffectTo(s, { type: 'word', word: 'Hope' }, normal);
    expect(applyEffectTo(s, { type: 'seal', word: 'Hope' }, normal).outcome).toBe('applied');
    expect(s.words).toEqual({ owned: ['Hope'], sealed: ['Hope'], shed: [] });
    expect(applyEffectTo(s, { type: 'seal', word: 'Hope' }, normal).outcome).toBe('duplicate');
    expect(applyEffectTo(s, { type: 'word', word: 'Hope' }, normal).outcome).toBe('unsealed');
    expect(s.words).toEqual({ owned: ['Hope'], sealed: [], shed: [] });
  });

  it('seal adds a missing word (sealed)', () => {
    const s = fresh();
    applyEffectTo(s, { type: 'seal', word: 'Hope' }, normal);
    expect(s.words).toEqual({ owned: ['Hope'], sealed: ['Hope'], shed: [] });
  });

  it('shed drops a held word for good; it never returns', () => {
    const s = fresh();
    applyEffectTo(s, { type: 'word', word: 'Fear' }, normal);
    expect(applyEffectTo(s, { type: 'shed', word: 'Fear' }, normal).outcome).toBe('applied');
    expect(s.words).toEqual({ owned: [], sealed: [], shed: ['Fear'] });
    expect(applyEffectTo(s, { type: 'shed', word: 'Fear' }, normal).outcome).toBe('duplicate');
    expect(applyEffectTo(s, { type: 'word', word: 'Fear' }, normal).outcome).toBe('ignored');
    expect(applyEffectTo(s, { type: 'seal', word: 'Fear' }, normal).outcome).toBe('ignored');
    expect(s.words.owned).toEqual([]);
  });

  it('shed of a word not held is ignored', () => {
    const s = fresh();
    expect(applyEffectTo(s, { type: 'shed', word: 'Fear' }, normal).outcome).toBe('ignored');
    expect(s.words.shed).toEqual([]);
  });
});

describe('applyEffectTo: once-per-playthrough ids', () => {
  it.each([
    [{ type: 'memory', id: 'inf05.paolo_francesca' }, 'memories'],
    [{ type: 'codex', id: 'inf03.charon' }, 'codex'],
    [{ type: 'flag', id: 'inf03.left_hope' }, 'flags'],
    [{ type: 'unlock', feature: 'heart' }, 'unlocks'],
  ] as const)('%o is added once', (effect, key) => {
    const s = fresh();
    expect(applyEffectTo(s, effect as Effect, normal).outcome).toBe('applied');
    expect(applyEffectTo(s, effect as Effect, normal).outcome).toBe('duplicate');
    expect((s[key] as readonly string[]).length).toBe(1);
  });
});

describe('applyEffectTo: resources (bar units)', () => {
  it('resolve is capped at the bar and a scripted loss never goes below 1 unit', () => {
    const s = fresh();
    expect(s.resolve).toBe(RESOURCES.resolveStart);
    expect(applyEffectTo(s, { type: 'resolve', delta: 1 }, normal)).toMatchObject({ outcome: 'clamped', changed: false });
    applyEffectTo(s, { type: 'resolve', delta: -3 }, normal);
    expect(s.resolve).toBe(7);
    s.resolve = 1.5;
    expect(applyEffectTo(s, { type: 'resolve', delta: -3 }, normal)).toMatchObject({ outcome: 'clamped', changed: true });
    expect(s.resolve).toBe(1);
    s.resolve = 0.4;
    expect(applyEffectTo(s, { type: 'resolve', delta: -1 }, normal)).toMatchObject({ changed: false });
    expect(s.resolve).toBe(0.4);
  });

  it('easy mode ignores resolve losses', () => {
    const s = fresh();
    expect(applyEffectTo(s, { type: 'resolve', delta: -2 }, { easyMode: true }).outcome).toBe('ignored');
    expect(s.resolve).toBe(RESOURCES.resolveStart);
  });

  it('grace stays within 0..gracemax; gracemax grows to its limit and caps grace', () => {
    const s = fresh();
    expect(s.grace).toBe(3);
    expect(s.gracemax).toBe(6);
    applyEffectTo(s, { type: 'grace', delta: 10 }, normal);
    expect(s.grace).toBe(6);
    applyEffectTo(s, { type: 'gracemax', delta: 1 }, normal);
    expect(s.gracemax).toBe(7);
    applyEffectTo(s, { type: 'gracemax', delta: 10 }, normal);
    expect(s.gracemax).toBe(RESOURCES.graceMaxLimit);
    applyEffectTo(s, { type: 'grace', delta: -20 }, normal);
    expect(s.grace).toBe(0);
    s.grace = 9;
    applyEffectTo(s, { type: 'gracemax', delta: -5 }, normal);
    expect(s.gracemax).toBe(5);
    expect(s.grace).toBe(5);
  });

  it('reports resource changes', () => {
    const s = fresh();
    expect(applyEffectTo(s, { type: 'grace', delta: 1 }, normal).resources).toBe(true);
    expect(applyEffectTo(s, { type: 'flag', id: 'x.y' }, normal).resources).toBe(false);
  });
});
