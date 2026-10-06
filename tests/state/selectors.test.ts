import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/state/initial';
import {
  cantosRead,
  heartBalance,
  heartTilt,
  linesSeenIn,
  logOfCanto,
  sinLedger,
  trustLabelOf,
  usableWords,
  virtueTier,
  wordStatus,
} from '../../src/state/selectors';

describe('state selectors', () => {
  it('heart balance and the clamped tilt', () => {
    const s = createInitialState();
    s.heart.pity = 9;
    s.heart.justice = 1;
    s.heart.ledger.lust = { pity: 6, justice: 0 };
    expect(heartBalance(s)).toBe(8);
    expect(heartTilt(s)).toBe(6);
    s.heart.justice = 20;
    expect(heartTilt(s)).toBe(-6);
    expect(sinLedger(s, 'lust')).toEqual({ pity: 6, justice: 0 });
    expect(sinLedger(s, 'limbo')).toEqual({ pity: 0, justice: 0 });
  });

  it('trust labels and virtue tiers', () => {
    const s = createInitialState();
    expect(trustLabelOf(s)).toBe('Steady');
    s.trust = 7;
    expect(trustLabelOf(s)).toBe('Faithful');
    s.trust = 2;
    expect(trustLabelOf(s)).toBe('Wayward');
    s.virtues.fortitude = 5;
    expect(virtueTier(s, 'fortitude')).toBe(2);
    expect(virtueTier(s, 'prudence')).toBe(0);
  });

  it('word status and usable words', () => {
    const s = createInitialState();
    s.words.owned.push('Way', 'Hope');
    s.words.sealed.push('Hope');
    s.words.shed.push('Fear');
    expect(wordStatus(s, 'Way')).toBe('owned');
    expect(wordStatus(s, 'Hope')).toBe('sealed');
    expect(wordStatus(s, 'Fear')).toBe('shed');
    expect(wordStatus(s, 'Love')).toBe('unknown');
    expect(usableWords(s)).toEqual(['Way']);
  });

  it('reading log by canto and lines seen', () => {
    const s = createInitialState();
    s.log.push(
      { kind: 'narration', canto: 'inf01', beat: 'inf01.s1.b1', text: 'a' },
      { kind: 'narration', canto: 'inf02', beat: 'inf02.s1.b1', text: 'b' },
      { kind: 'page', canto: 'inf01', beat: 'inf01.s2.b1', text: 'c' },
    );
    s.linesSeen['Inferno:1'] = [1, 2];
    expect(cantosRead(s)).toEqual(['inf01', 'inf02']);
    expect(logOfCanto(s, 'inf01').map((e) => e.kind)).toEqual(['narration', 'page']);
    expect(linesSeenIn(s, 'Inferno', 1)).toEqual([1, 2]);
    expect(linesSeenIn(s, 'Inferno', 2)).toEqual([]);
  });
});
