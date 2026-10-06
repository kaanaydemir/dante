import { describe, expect, it } from 'vitest';
import {
  conditionAtoms,
  conditionRefs,
  evaluateCondition,
  formatCondition,
  isConstFalse,
  parseCondition,
  parseVariable,
} from '../../src/story/conditions';
import type { Condition, ConditionContext, VariableRef } from '../../src/story/types';

const ok = (text: string): Condition => {
  const r = parseCondition(text);
  expect(r.diagnostics.filter((d) => d.severity === 'error'), `${text}: ${JSON.stringify(r.diagnostics)}`).toEqual([]);
  return r.condition;
};

const bad = (text: string, code: string): void => {
  const r = parseCondition(text);
  expect(isConstFalse(r.condition), text).toBe(true);
  expect(
    r.diagnostics.some((d) => d.severity === 'error' && d.code === code),
    `${text}: ${JSON.stringify(r.diagnostics)}`,
  ).toBe(true);
};

function ctx(state: {
  flags?: string[];
  memories?: string[];
  codex?: string[];
  words?: string[];
  sealed?: string[];
  choices?: Record<string, 'a' | 'b' | 'c'>;
  seen?: string[];
  events?: string[];
  values?: Partial<Record<string, number>>;
}): ConditionContext {
  const key = (v: VariableRef): string =>
    v.kind === 'pity_at' ? `pity@${v.sin}` : v.kind === 'justice_at' ? `justice@${v.sin}` : v.kind === 'virtue' ? `virtue:${v.virtue}` : v.kind;
  return {
    hasFlag: (id) => state.flags?.includes(id) ?? false,
    hasMemory: (id) => state.memories?.includes(id) ?? false,
    hasCodex: (id) => state.codex?.includes(id) ?? false,
    hasWord: (w) => (state.words?.includes(w) ?? false) && !(state.sealed?.includes(w) ?? false),
    isSealed: (w) => state.sealed?.includes(w) ?? false,
    choiceLetter: (c) => state.choices?.[c] ?? null,
    hasSeen: (id) => state.seen?.includes(id) ?? false,
    hasEvent: (id) => state.events?.includes(id) ?? false,
    value: (v) => state.values?.[key(v)] ?? 0,
  };
}

describe('parseCondition: predicates (bible §2.8)', () => {
  it('reads every predicate kind', () => {
    expect(ok('flag:inf03.left_hope')).toEqual({ type: 'flag', id: 'inf03.left_hope' });
    expect(ok('memory:inf05.paolo_francesca')).toEqual({ type: 'memory', id: 'inf05.paolo_francesca' });
    expect(ok('codex:inf03.charon')).toEqual({ type: 'codex', id: 'inf03.charon' });
    expect(ok('word:Hope')).toEqual({ type: 'word', word: 'Hope' });
    expect(ok('sealed:Hope')).toEqual({ type: 'sealed', word: 'Hope' });
    expect(ok('choice:inf05.c4=a')).toEqual({ type: 'choice', choice: 'inf05.c4', letter: 'a' });
    expect(ok('seen:inf03.s2')).toEqual({ type: 'seen', id: 'inf03.s2' });
    expect(ok('seen:inf03.s2.b4')).toEqual({ type: 'seen', id: 'inf03.s2.b4' });
    expect(ok('event:inf01.waited_dawn')).toEqual({ type: 'event', id: 'inf01.waited_dawn' });
    expect(ok('flag:ch1.heart_tender')).toEqual({ type: 'flag', id: 'ch1.heart_tender' });
  });

  it('reads comparisons with every variable and operator, including negative integers', () => {
    expect(ok('trust>=7')).toEqual({ type: 'compare', variable: { kind: 'trust' }, op: '>=', value: 7 });
    expect(ok('heart<=-3')).toEqual({ type: 'compare', variable: { kind: 'heart' }, op: '<=', value: -3 });
    expect(ok('pity>2')).toMatchObject({ variable: { kind: 'pity' }, op: '>', value: 2 });
    expect(ok('justice<1')).toMatchObject({ variable: { kind: 'justice' }, op: '<', value: 1 });
    expect(ok('resolve==10')).toMatchObject({ variable: { kind: 'resolve' }, op: '==', value: 10 });
    expect(ok('grace!=0')).toMatchObject({ variable: { kind: 'grace' }, op: '!=', value: 0 });
    expect(ok('pity@lust>=3')).toMatchObject({ variable: { kind: 'pity_at', sin: 'lust' } });
    expect(ok('justice@limbo>=2')).toMatchObject({ variable: { kind: 'justice_at', sin: 'limbo' } });
    for (const v of ['prudence', 'justice', 'fortitude', 'temperance']) {
      expect(ok(`virtue:${v}>=2`)).toMatchObject({ variable: { kind: 'virtue', virtue: v } });
    }
  });
});

describe('parseCondition: operators and precedence', () => {
  it('binds "and" tighter than "or"', () => {
    expect(ok('flag:inf01.alpha or flag:inf01.beta and flag:inf01.gamma')).toEqual({
      type: 'or',
      terms: [
        { type: 'flag', id: 'inf01.alpha' },
        {
          type: 'and',
          terms: [
            { type: 'flag', id: 'inf01.beta' },
            { type: 'flag', id: 'inf01.gamma' },
          ],
        },
      ],
    });
  });

  it('honours parentheses and "not"', () => {
    expect(ok('(flag:inf01.alpha or flag:inf01.beta) and not flag:inf01.gamma')).toEqual({
      type: 'and',
      terms: [
        {
          type: 'or',
          terms: [
            { type: 'flag', id: 'inf01.alpha' },
            { type: 'flag', id: 'inf01.beta' },
          ],
        },
        { type: 'not', term: { type: 'flag', id: 'inf01.gamma' } },
      ],
    });
    expect(ok('not (word:Hope and trust>=5)')).toEqual({
      type: 'not',
      term: {
        type: 'and',
        terms: [
          { type: 'word', word: 'Hope' },
          { type: 'compare', variable: { kind: 'trust' }, op: '>=', value: 5 },
        ],
      },
    });
    expect(ok('not not flag:inf01.alpha')).toEqual({ type: 'not', term: { type: 'not', term: { type: 'flag', id: 'inf01.alpha' } } });
  });

  it('keeps chains flat', () => {
    const c = ok('flag:inf01.alpha and flag:inf01.beta and flag:inf01.gamma');
    expect(c.type).toBe('and');
    expect(c.type === 'and' && c.terms.length).toBe(3);
  });

  it('reads the bible §2.8 example and the fixture requires: clause', () => {
    expect(ok('flag:inf02.courage_beatrice and not flag:inf03.left_hope')).toMatchObject({ type: 'and' });
    expect(ok('word:Hope or (codex:inf99.panther and not flag:inf99.motive_gate)')).toMatchObject({ type: 'or' });
  });
});

describe('parseCondition: malformed conditions degrade to false', () => {
  it('reports syntax errors (P10)', () => {
    bad('', 'P10');
    bad('(flag:inf01.alpha', 'P10');
    bad('flag:inf01.alpha)', 'P10');
    bad('flag:inf01.alpha and', 'P10');
    bad('or flag:inf01.alpha', 'P10');
    bad('flag:inf01.alpha flag:inf01.beta', 'P10');
    bad('()', 'P10');
    bad('trust=7', 'P10');
    bad('flag:inf01.alpha && flag:inf01.beta', 'P10');
    bad('else', 'P10');
    bad('trust', 'P10');
    bad('virtue:prudence', 'P10');
  });

  it('reports unknown predicates and variables (P11)', () => {
    bad('banana', 'P11');
    bad('mood>=3', 'P11');
    bad('virtue:courage>=1', 'P11');
    bad('item:inf01.xray', 'P11');
  });

  it('reports malformed ids and values (P12)', () => {
    bad('flag:left_hope', 'P12');
    bad('flag:inf03.Left', 'P12');
    bad('word:hope', 'P12');
    bad('choice:inf05.c4=d', 'P12');
    bad('choice:inf05.c4', 'P12');
    bad('seen:inf03', 'P12');
    bad('trust>=seven', 'P12');
    bad('flag:', 'P12');
  });

  it('never throws on garbage', () => {
    for (const text of ['((((', '))))', 'not', 'and or not', '!!!', '\u0000', 'a'.repeat(5000), '( ( ( flag:inf01.alpha ) ) )']) {
      expect(() => parseCondition(text)).not.toThrow();
    }
    expect(ok('( ( ( flag:inf01.alpha ) ) )')).toEqual({ type: 'flag', id: 'inf01.alpha' });
  });

  it('positions diagnostics at the given line', () => {
    const r = parseCondition('banana', { line: 42, file: '/x.md' });
    expect(r.diagnostics[0]?.pos).toEqual({ line: 42, file: '/x.md' });
  });
});

describe('parseCondition: harmless deviations are normalised with a warning (P13)', () => {
  it('joins predicates split by spaces', () => {
    for (const [text, expected] of [
      ['trust >= 7', 'trust>=7'],
      ['heart <= -3', 'heart<=-3'],
      ['flag: inf03.left_hope', 'flag:inf03.left_hope'],
      ['choice:inf05.c4 = a', 'choice:inf05.c4=a'],
    ] as const) {
      const r = parseCondition(text);
      expect(formatCondition(r.condition), text).toBe(expected);
      expect(r.diagnostics.map((d) => d.code)).toContain('P13');
    }
  });

  it('accepts upper-case keywords', () => {
    const r = parseCondition('flag:inf01.alpha AND NOT flag:inf01.beta');
    expect(formatCondition(r.condition)).toBe('flag:inf01.alpha and not flag:inf01.beta');
    expect(r.diagnostics.every((d) => d.severity === 'warning')).toBe(true);
  });

  it('warns about unknown sin tags but keeps the comparison', () => {
    const r = parseCondition('pity@greed>=1');
    expect(r.condition).toMatchObject({ type: 'compare', variable: { kind: 'pity_at', sin: 'greed' } });
    expect(r.diagnostics[0]?.severity).toBe('warning');
  });
});

describe('evaluateCondition', () => {
  const state = ctx({
    flags: ['inf03.left_hope'],
    memories: ['inf05.paolo_francesca'],
    codex: ['inf03.charon'],
    words: ['Hope', 'Way'],
    sealed: ['Hope'],
    choices: { 'inf05.c4': 'b' },
    seen: ['inf03.s2'],
    events: ['inf01.waited_dawn'],
    values: { trust: 7, heart: -3, pity: 1, justice: 4, 'pity@lust': 1, 'virtue:fortitude': 2, resolve: 10, grace: 3 },
  });
  const ev = (text: string): boolean => evaluateCondition(ok(text), state);

  it('evaluates predicates against the context', () => {
    expect(ev('flag:inf03.left_hope')).toBe(true);
    expect(ev('flag:inf01.motive_gate')).toBe(false);
    expect(ev('memory:inf05.paolo_francesca')).toBe(true);
    expect(ev('codex:inf03.charon')).toBe(true);
    expect(ev('word:Way')).toBe(true);
    expect(ev('word:Hope')).toBe(false);
    expect(ev('sealed:Hope')).toBe(true);
    expect(ev('choice:inf05.c4=b')).toBe(true);
    expect(ev('choice:inf05.c4=a')).toBe(false);
    expect(ev('choice:inf05.c3=a')).toBe(false);
    expect(ev('seen:inf03.s2')).toBe(true);
    expect(ev('event:inf01.waited_dawn')).toBe(true);
    expect(ev('event:inf01.held_ground')).toBe(false);
  });

  it('evaluates comparisons and boolean structure', () => {
    expect(ev('trust>=7')).toBe(true);
    expect(ev('trust>7')).toBe(false);
    expect(ev('heart<=-3')).toBe(true);
    expect(ev('heart==-3')).toBe(true);
    expect(ev('heart!=-3')).toBe(false);
    expect(ev('pity@lust>=1 and virtue:fortitude>=2')).toBe(true);
    expect(ev('justice@limbo>=1')).toBe(false);
    expect(ev('not flag:inf03.left_hope or trust>=7')).toBe(true);
    expect(ev('word:Hope or word:Way and not sealed:Way')).toBe(true);
    expect(ev('(word:Hope or word:Way) and sealed:Way')).toBe(false);
  });

  it('treats malformed conditions as false', () => {
    expect(evaluateCondition(parseCondition('banana').condition, state)).toBe(false);
    expect(evaluateCondition(parseCondition('not banana').condition, state)).toBe(false);
  });
});

describe('formatCondition and inspection', () => {
  it('round-trips through the parser', () => {
    for (const text of [
      'flag:inf01.alpha or flag:inf01.beta and flag:inf01.gamma',
      '(flag:inf01.alpha or flag:inf01.beta) and not flag:inf01.gamma',
      'not (word:Hope and trust>=5)',
      'heart<=-3 or pity@lust>=2 and choice:inf05.c4=a',
      'not not seen:inf03.s2.b4',
    ]) {
      const once = ok(text);
      expect(ok(formatCondition(once)), text).toEqual(once);
    }
    expect(formatCondition(ok('(flag:inf01.alpha or flag:inf01.beta) and flag:inf01.gamma'))).toBe('(flag:inf01.alpha or flag:inf01.beta) and flag:inf01.gamma');
  });

  it('lists atoms and references', () => {
    const c = ok('flag:inf01.alpha and (word:Hope or choice:inf05.c4=a) and not event:inf01.xray and trust>=3 and seen:inf03.s1');
    expect(conditionAtoms(c).map(formatCondition)).toEqual([
      'flag:inf01.alpha',
      'word:Hope',
      'choice:inf05.c4=a',
      'event:inf01.xray',
      'trust>=3',
      'seen:inf03.s1',
    ]);
    const refs = conditionRefs(c);
    expect(refs.flags).toEqual(['inf01.alpha']);
    expect(refs.words).toEqual(['Hope']);
    expect(refs.choices).toEqual([{ choice: 'inf05.c4', letter: 'a' }]);
    expect(refs.events).toEqual(['inf01.xray']);
    expect(refs.seen).toEqual(['inf03.s1']);
    expect(refs.variables).toEqual([{ kind: 'trust' }]);
  });

  it('parses variables on their own', () => {
    expect(parseVariable('pity@lust')).toEqual({ kind: 'pity_at', sin: 'lust' });
    expect(parseVariable('virtue:temperance')).toEqual({ kind: 'virtue', virtue: 'temperance' });
    expect(parseVariable('virtue:hope')).toBeNull();
    expect(parseVariable('mood')).toBeNull();
  });
});
