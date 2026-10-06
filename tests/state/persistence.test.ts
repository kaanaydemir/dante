import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/runtime/contracts';
import { createInitialState } from '../../src/state/initial';
import {
  normalizeSettings,
  normalizeState,
  parseSave,
  parseSettings,
  serializeSave,
  serializeSettings,
} from '../../src/state/persistence';
import { m0KitEffects } from '../../src/state/profile';

describe('save files', () => {
  it('round-trips a state', () => {
    const s = createInitialState('full', 123);
    s.words.owned.push('Way', 'Hope');
    s.words.sealed.push('Hope');
    s.heart.pity = 2;
    s.heart.ledger.limbo = { pity: 2, justice: 0 };
    s.choices['inf01.c4'] = {
      choice: 'inf01.c4',
      canto: 'inf01',
      beat: 'inf01.s8.b1',
      title: 'Why Dante goes',
      weight: 'major',
      systemic: false,
      letter: 'b',
      optionText: '["Lead me to Saint Peter\'s gate."]',
      canon: 'all',
      heading: 'As Dante did',
      note: 'He asked for all three.',
      order: 4,
    };
    s.log.push({ kind: 'narration', canto: 'inf01', beat: 'inf01.s1.b1', text: 'When he woke…' });
    s.linesSeen['Inferno:1'] = [1, 2, 3];
    s.verses.push({ canto: 'inf02', verse: { tercets: [['Way', 'Love', 'Away']], coda: null }, order: 1 });
    s.position = { canto: 'inf01', scene: 'inf01.s3', beat: null, checkpoint: { canto: 'inf01', place: null, x: 1, y: 2 } };
    const back = parseSave(serializeSave(s, 5));
    expect(back).toEqual(s);
  });

  it('accepts a bare version-1 state', () => {
    const s = createInitialState('m0', 7);
    expect(parseSave(JSON.stringify(s))?.profile).toBe('m0');
  });

  it('rejects empty, broken, foreign and newer saves', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('')).toBeNull();
    expect(parseSave('nope')).toBeNull();
    expect(parseSave('[]')).toBeNull();
    expect(parseSave(JSON.stringify({ format: 'dante-save', version: 2, state: createInitialState() }))).toBeNull();
    expect(parseSave(JSON.stringify({ format: 'dante-save', version: 1, state: 5 }))).toBeNull();
    expect(parseSave(JSON.stringify({ version: 3 }))).toBeNull();
  });

  it('repairs missing and mistyped fields', () => {
    const repaired = normalizeState({
      version: 1,
      trust: 99,
      resolve: 'lots',
      words: { owned: ['Way', 'Hope', 7, 'Way'], sealed: ['Hope', 'Love'], shed: ['Fear', 'Way'] },
      unlocks: ['heart', 'flying'],
      choices: { 'inf01.c1': { letter: 'z' }, 'inf01.c2': { letter: 'b', title: 'The lion' } },
      log: [{ kind: 'quote', canto: 'inf01', beat: 'b', lines: ['x'], lineNumbers: [-1] }, { kind: 'shout' }],
      linesSeen: { 'Inferno:1': [3, 1, 3, 'x'] },
    });
    expect(repaired).not.toBeNull();
    const r = repaired!;
    expect(r.trust).toBe(10);
    expect(r.resolve).toBe(10);
    expect(r.words).toEqual({ owned: ['Hope'], sealed: ['Hope'], shed: ['Fear', 'Way'] });
    expect(r.unlocks).toEqual(['heart']);
    expect(Object.keys(r.choices)).toEqual(['inf01.c2']);
    expect(r.choices['inf01.c2']?.weight).toBe('minor');
    expect(r.log).toHaveLength(1);
    expect(r.log[0]).toMatchObject({ kind: 'quote', lineNumbers: [null] });
    expect(r.linesSeen).toEqual({ 'Inferno:1': [1, 3] });
    expect(r.position).toEqual({ canto: null, scene: null, beat: null, checkpoint: null });
  });
});

describe('settings', () => {
  it('round-trip and validate', () => {
    const s = normalizeSettings({ ...DEFAULT_SETTINGS, textSpeed: 'instant', fontScale: 1.15 });
    expect(parseSettings(serializeSettings(s))).toEqual(s);
    expect(parseSettings('garbage')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ sfxVolume: -1, flashes: 'no' }).sfxVolume).toBe(0);
    expect(normalizeSettings({ flashes: 'no' }).flashes).toBe(true);
  });
});

describe('M0 kit (bible §7.5)', () => {
  it('lists only the missing parts, in order: unlocks, words, shed', () => {
    const s = createInitialState('m0');
    s.unlocks.push('words', 'heart');
    s.words.owned.push('Fear', 'Way', 'Hope', 'Away');
    s.words.sealed.push('Away');
    expect(m0KitEffects(s)).toEqual([
      { type: 'unlock', feature: 'book' },
      { type: 'unlock', feature: 'verse' },
      { type: 'unlock', feature: 'compose' },
      { type: 'unlock', feature: 'codex' },
      { type: 'unlock', feature: 'remembrance' },
      { type: 'word', word: 'Love' },
      { type: 'word', word: 'Away' },
      { type: 'shed', word: 'Fear' },
    ]);
  });
});
