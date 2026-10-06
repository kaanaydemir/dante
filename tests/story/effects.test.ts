import { describe, expect, it } from 'vitest';
import {
  formatEffect,
  formatEffects,
  parseEffects,
  parseEffectToken,
  sumEffects,
  validateEffect,
  validateEffects,
  validateOptionTotals,
} from '../../src/story/effects';
import type { Effect } from '../../src/story/types';

const one = (token: string): Effect => {
  const r = parseEffectToken(token);
  expect(r.error, token).toBeNull();
  return r.effect as Effect;
};

describe('parseEffectToken: the §2.10 vocabulary', () => {
  it('reads every token kind', () => {
    expect(one('pity+2@limbo')).toEqual({ type: 'heart', side: 'pity', amount: 2, sin: 'limbo' });
    expect(one('justice+3@lust')).toEqual({ type: 'heart', side: 'justice', amount: 3, sin: 'lust' });
    expect(one('trust+1')).toEqual({ type: 'trust', delta: 1 });
    expect(one('trust-1')).toEqual({ type: 'trust', delta: -1 });
    expect(one('virtue:fortitude+1')).toEqual({ type: 'virtue', virtue: 'fortitude', amount: 1 });
    expect(one('word:Stay')).toEqual({ type: 'word', word: 'Stay' });
    expect(one('seal:Hope')).toEqual({ type: 'seal', word: 'Hope' });
    expect(one('shed:Fear')).toEqual({ type: 'shed', word: 'Fear' });
    expect(one('memory:inf05.paolo_francesca')).toEqual({ type: 'memory', id: 'inf05.paolo_francesca' });
    expect(one('codex:inf03.charon')).toEqual({ type: 'codex', id: 'inf03.charon' });
    expect(one('flag:inf03.left_hope')).toEqual({ type: 'flag', id: 'inf03.left_hope' });
    expect(one('resolve-1')).toEqual({ type: 'resolve', delta: -1 });
    expect(one('resolve+2')).toEqual({ type: 'resolve', delta: 2 });
    expect(one('grace+1')).toEqual({ type: 'grace', delta: 1 });
    expect(one('grace-1')).toEqual({ type: 'grace', delta: -1 });
    expect(one('gracemax+1')).toEqual({ type: 'gracemax', delta: 1 });
    for (const f of ['book', 'words', 'verse', 'compose', 'heart', 'codex', 'remembrance', 'chain']) {
      expect(one(`unlock:${f}`)).toEqual({ type: 'unlock', feature: f });
    }
  });

  it('keeps a heart effect without sin tag (lint L13 reports it)', () => {
    expect(one('pity+1')).toEqual({ type: 'heart', side: 'pity', amount: 1, sin: null });
  });

  it('normalises the capitalisation of known words with a warning', () => {
    const r = parseEffectToken('word:love');
    expect(r.effect).toEqual({ type: 'word', word: 'Love' });
    expect(r.warning).toMatch(/Love/);
    expect(one('word:Unknownword')).toEqual({ type: 'word', word: 'Unknownword' });
  });

  it('rejects malformed tokens with a reason', () => {
    for (const token of [
      'pity-1@lust',
      'pity+0@lust',
      'pity+1@',
      'virtue:courage+1',
      'virtue:prudence-1',
      'word:not-a-word',
      'word:',
      'unlock:map',
      'gracemax-1',
      'event:inf01.waited_dawn',
      'heart+1',
      'flag:Inf03.x',
      'flag:inf03',
      'memory:paolo',
      'trust+0',
      'love',
      'codex',
    ]) {
      const r = parseEffectToken(token);
      expect(r.effect, token).toBeNull();
      expect(r.error, token).toBeTruthy();
    }
  });
});

describe('parseEffects: a whole EFFECTS line', () => {
  it('keeps the written order', () => {
    const r = parseEffects('word:Hope, shed:Fear, trust+1, flag:inf04.hope_returned');
    expect(r.diagnostics).toEqual([]);
    expect(r.effects.map(formatEffect)).toEqual(['word:Hope', 'shed:Fear', 'trust+1', 'flag:inf04.hope_returned']);
    expect(r.invalid).toEqual([]);
  });

  it('drops and reports invalid tokens (P20)', () => {
    const r = parseEffects('trust+1, nonsense, virtue:prudence+1', { line: 7 });
    expect(r.effects.map(formatEffect)).toEqual(['trust+1', 'virtue:prudence+1']);
    expect(r.invalid).toEqual(['nonsense']);
    expect(r.diagnostics).toEqual([expect.objectContaining({ severity: 'error', code: 'P20', pos: { line: 7 } })]);
  });

  it('normalises separators and spaces with a warning (P21)', () => {
    for (const text of ['trust+1,grace+1', 'trust+1 , grace+1', 'trust +1, grace+1', 'trust+1,  grace+1', 'trust+1; grace+1']) {
      const r = parseEffects(text);
      expect(r.effects.map(formatEffect), text).toEqual(['trust+1', 'grace+1']);
      expect(r.diagnostics.length, text).toBeGreaterThan(0);
      expect(r.diagnostics.every((d) => d.severity === 'warning'), text).toBe(true);
    }
    expect(parseEffects('trust+1, ').diagnostics.map((d) => d.code)).toContain('P21');
    expect(parseEffects('').effects).toEqual([]);
  });

  it('formats back to canonical text', () => {
    const text = 'pity+3@lust, memory:inf05.paolo_francesca, flag:inf05.verdict_pity, resolve-1, gracemax+1, unlock:chain';
    expect(formatEffects(parseEffects(text).effects)).toBe(text);
  });
});

describe('validation (lint L12 / L13)', () => {
  it('limits heart amounts by choice weight', () => {
    expect(validateEffect(one('pity+1@lust'), { weight: 'minor' })).toEqual([]);
    expect(validateEffect(one('pity+2@limbo'), { weight: 'minor' })[0]).toMatchObject({ severity: 'error', code: 'L12' });
    expect(validateEffect(one('pity+2@limbo'), { weight: 'major' })).toEqual([]);
    expect(validateEffect(one('justice+3@lust'), { weight: 'major' })[0]).toMatchObject({ code: 'L12' });
    expect(validateEffect(one('justice+3@lust'), { weight: 'centre' })).toEqual([]);
    expect(validateEffect(one('justice+4@lust'))[0]).toMatchObject({ code: 'L12' });
  });

  it('needs approval for trust ±2 and virtue +2', () => {
    expect(validateEffect(one('trust-2'))[0]).toMatchObject({ severity: 'warning', code: 'L12' });
    expect(validateEffect(one('trust+3'))[0]).toMatchObject({ severity: 'error' });
    expect(validateEffect(one('virtue:justice+2'))[0]).toMatchObject({ severity: 'warning' });
    expect(validateEffect(one('virtue:justice+3'))[0]).toMatchObject({ severity: 'error' });
  });

  it('limits resources (1–3 units; ±1 inside choices) and gracemax', () => {
    expect(validateEffect(one('resolve-3'))).toEqual([]);
    expect(validateEffect(one('resolve-4'))[0]).toMatchObject({ severity: 'error' });
    expect(validateEffect(one('grace+2'), { weight: 'major' })[0]).toMatchObject({ severity: 'error' });
    expect(validateEffect(one('gracemax+2'))[0]).toMatchObject({ severity: 'error' });
    expect(validateEffect(one('gracemax+1'))).toEqual([]);
  });

  it('checks sin tags (L13)', () => {
    expect(validateEffect(one('pity+1'))[0]).toMatchObject({ code: 'L13', severity: 'error' });
    expect(validateEffect(one('pity+1@greed'))[0]).toMatchObject({ code: 'L13', severity: 'error' });
    expect(validateEffect(one('pity+1@wrath'), { sinTags: ['limbo', 'lust'] })[0]).toMatchObject({ code: 'L13' });
    expect(validateEffect(one('pity+1@wrath'))).toEqual([]);
  });

  it('checks what one option does as a whole', () => {
    expect(validateOptionTotals(parseEffects('pity+1@lust, pity+1@lust').effects, 'minor')[0]).toMatchObject({ severity: 'error' });
    expect(validateOptionTotals(parseEffects('pity+3@lust, memory:inf05.paolo_francesca').effects, 'centre')).toEqual([]);
    expect(validateOptionTotals(parseEffects('trust+1, trust+1').effects, 'minor')[0]).toMatchObject({ severity: 'warning' });
    expect(validateOptionTotals(parseEffects('grace+1, grace+1').effects, 'major')[0]).toMatchObject({ severity: 'error' });
  });

  it('positions diagnostics', () => {
    expect(validateEffects(parseEffects('pity+1').effects, {}, { line: 3 })[0]?.pos).toEqual({ line: 3 });
  });
});

describe('sumEffects', () => {
  it('adds up signed values and collects ids in order', () => {
    const t = sumEffects(
      parseEffects(
        'pity+2@limbo, justice+1@lust, trust+1, trust-1, trust+1, virtue:prudence+1, resolve-1, grace+1, gracemax+1, word:Way, seal:Hope, shed:Fear, memory:inf05.paolo_francesca, codex:inf03.gate, flag:inf03.left_hope, unlock:heart',
      ).effects,
    );
    expect(t).toMatchObject({
      pity: 2,
      justice: 1,
      heart: 1,
      trust: 1,
      resolve: -1,
      grace: 1,
      gracemax: 1,
      words: ['Way'],
      seals: ['Hope'],
      sheds: ['Fear'],
      memories: ['inf05.paolo_francesca'],
      codex: ['inf03.gate'],
      flags: ['inf03.left_hope'],
      unlocks: ['heart'],
    });
    expect(t.virtues.prudence).toBe(1);
  });
});
