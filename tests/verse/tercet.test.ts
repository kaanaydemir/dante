import { describe, expect, it } from 'vitest';
import type { ComposedVerse, Tercet, VerseContext } from '../../src/runtime/contracts';
import { createInitialState } from '../../src/state/initial';
import { centoLines, formatCento } from '../../src/verse/cento';
import { graceCostFor, VERSE_TUNING } from '../../src/verse/costs';
import { castPlan, evaluateVerse, listValidTercets, verseContextOf } from '../../src/verse/tercet';
import type { UnlockFeature, WordName } from '../../src/story/types';

const CH1_END: WordName[] = [
  'Way',
  'Hope',
  'Love',
  'Go',
  'Away',
  'Stay',
  'Desire',
  'Fire',
  'Light',
  'Wall',
  'Peace',
  'Judgment',
  'Pity',
];

function ctx(
  owned: WordName[] = CH1_END,
  unlocks: UnlockFeature[] = ['compose', 'verse', 'chain'],
  sealed: WordName[] = [],
  maxTercets = 2,
): VerseContext {
  return { owned, sealed, unlocks, maxTercets };
}

const t = (a: string, b: string, c: string): Tercet => [a, b, c];
const verse = (tercets: Tercet[], coda: string | null = null): ComposedVerse => ({ tercets, coda });
const codes = (v: ComposedVerse, c: VerseContext = ctx()) => evaluateVerse(v, c).issues.map((i) => i.code);

describe('a single tercet (bible §3.4.5)', () => {
  it('the first verse of Canto II: Way · Love · Away is a Force tercet', () => {
    const ev = evaluateVerse(verse([t('Way', 'Love', 'Away')]), ctx(['Fear', 'Way', 'Hope', 'Love', 'Go', 'Away'], ['compose', 'verse']));
    expect(ev.valid).toBe(true);
    expect(ev.issues).toEqual([]);
    expect(ev.tercets).toEqual([{ middle: 'Love', category: 'Force', strength: 1 }]);
    expect(ev.chainLength).toBe(1);
    expect(ev.coda).toBeNull();
    expect(ev.graceCost).toBe(VERSE_TUNING.gracePerTercet);
  });

  it('outer words of the middle category strengthen the effect', () => {
    // Desire (Swift, -ire) · Go (Swift, -ow) · Fire (Force, -ire): strength 1 + 1.
    const ev = evaluateVerse(verse([t('Desire', 'Go', 'Fire')]), ctx());
    expect(ev.valid).toBe(true);
    expect(ev.tercets[0]).toEqual({ middle: 'Go', category: 'Swift', strength: 2 });
  });

  it('accepts the closer in the middle', () => {
    expect(evaluateVerse(verse([t('Way', 'Judgment', 'Stay')]), ctx()).valid).toBe(true);
  });

  it.each([
    ['outer words that do not rhyme', t('Way', 'Love', 'Hope'), 'outer_not_rhyming'],
    ['the same outer word twice', t('Way', 'Love', 'Way'), 'outer_same_word'],
    ['a middle word of the outer family', t('Way', 'Stay', 'Away'), 'middle_same_family'],
    ['the closer outside the middle', t('Judgment', 'Love', 'Way'), 'closer_not_middle'],
    ['an unknown word', t('Way', 'Banana', 'Away'), 'unknown_word'],
    ['the burden', t('Way', 'Fear', 'Away'), 'burden'],
    ['an empty slot', t('Way', '', 'Away'), 'empty'],
  ])('rejects %s', (_label, tercet, code) => {
    const owned = [...CH1_END, 'Fear'];
    expect(codes(verse([tercet]), ctx(owned))).toContain(code);
  });

  it('rejects words not held, and sealed words', () => {
    expect(codes(verse([t('Way', 'Love', 'Away')]), ctx(['Way', 'Love']))).toEqual(['not_owned']);
    expect(codes(verse([t('Way', 'Hope', 'Away')]), ctx(CH1_END, ['compose'], ['Hope']))).toEqual(['sealed']);
  });

  it('reports locked and empty verses', () => {
    expect(codes(verse([t('Way', 'Love', 'Away')]), ctx(CH1_END, []))).toEqual(['locked']);
    expect(codes(verse([]))).toEqual(['empty']);
  });

  it('tells the issue slot and tercet', () => {
    const [issue] = evaluateVerse(verse([t('Way', 'Stay', 'Away')]), ctx()).issues;
    expect(issue).toMatchObject({ code: 'middle_same_family', tercet: 0, slot: 1, word: 'Stay' });
    expect(issue?.message.length).toBeGreaterThan(0);
  });
});

describe('chains (aba bcb) and the coda', () => {
  const firstChain = verse([t('Fire', 'Way', 'Desire'), t('Away', 'Love', 'Stay')]);

  it('the bible example chain is valid and reads as rhyming Longfellow', () => {
    const ev = evaluateVerse(firstChain, ctx());
    expect(ev.valid).toBe(true);
    expect(ev.chainLength).toBe(2);
    expect(ev.tercets.map((x) => x.category)).toEqual(['Reveal', 'Force']);
    expect(ev.graceCost).toBe(2 * VERSE_TUNING.gracePerTercet);
    expect(formatCento(ev.cento)).toBe(
      [
        'This side the summit, when I saw a fire (Inferno IV, 68)',
        'In which I had abandoned the true way. (Inferno I, 12)',
        'So that their fear is turned into desire. (Inferno III, 126)',
        'Weeping, her shining eyes she turned away; (Inferno II, 116)',
        'Avail me the long study and great love (Inferno I, 83)',
        'To thee, as soon as we our footsteps stay (Inferno III, 77)',
      ].join('\n'),
    );
  });

  it('needs unlock:chain and respects the chapter limit', () => {
    expect(codes(firstChain, ctx(CH1_END, ['compose', 'verse']))).toEqual(['chain_locked']);
    const three = verse([t('Fire', 'Way', 'Desire'), t('Away', 'Love', 'Stay'), t('Way', 'Peace', 'Away')]);
    expect(codes(three)).toContain('too_many_tercets');
  });

  it('the next outer words must rhyme with the previous middle', () => {
    expect(codes(verse([t('Fire', 'Love', 'Desire'), t('Way', 'Hope', 'Away')]))).toEqual(['chain_break']);
  });

  it('no word twice in a chain', () => {
    expect(codes(verse([t('Fire', 'Way', 'Desire'), t('Away', 'Love', 'Way')]))).toContain('chain_repeat');
  });

  it('nothing follows the closer', () => {
    expect(codes(verse([t('Way', 'Judgment', 'Stay'), t('Fire', 'Love', 'Desire')]))).toContain('chain_after_closer');
  });

  it('the first coda (bible §3.4.7): Fire · Way · Desire, coda Stay', () => {
    const ev = evaluateVerse(verse([t('Fire', 'Way', 'Desire')], 'Stay'), ctx());
    expect(ev.valid).toBe(true);
    expect(ev.coda).toEqual({ word: 'Stay', category: 'Still' });
    expect(ev.graceCost).toBe(graceCostFor(1, true));
    expect(ev.cento.map((l) => l.word)).toEqual(['Fire', 'Way', 'Desire', 'Stay']);
  });

  it('coda rules', () => {
    expect(codes(verse([t('Fire', 'Way', 'Desire')], 'Stay'), ctx(CH1_END, ['compose']))).toEqual(['coda_locked']);
    expect(codes(verse([t('Fire', 'Way', 'Desire')], 'Hope'))).toEqual(['coda_not_rhyming']);
    expect(codes(verse([t('Fire', 'Way', 'Desire')], 'Way'))).toEqual(['coda_reused']);
    expect(codes(verse([t('Way', 'Judgment', 'Stay')], 'Away'))).toEqual(['coda_not_rhyming']);
  });
});

describe('helpers', () => {
  it('castPlan rises along a chain and closes with the coda', () => {
    const ev = evaluateVerse(verse([t('Fire', 'Way', 'Desire'), t('Away', 'Love', 'Stay')], 'Go'), ctx());
    // Go (-ow) does not rhyme with Love (-ove): invalid, so nothing is cast.
    expect(ev.valid).toBe(false);
    expect(castPlan(ev)).toEqual([]);
    const ok = evaluateVerse(verse([t('Fire', 'Way', 'Desire')], 'Stay'), ctx());
    const plan = castPlan(ok);
    expect(plan.map((s) => [s.kind, s.word, s.category])).toEqual([
      ['tercet', 'Way', 'Reveal'],
      ['coda', 'Stay', 'Still'],
    ]);
    expect(plan[1]!.power).toBeGreaterThan(plan[0]!.power);
  });

  it('listValidTercets finds what can be composed now', () => {
    expect(listValidTercets(ctx(['Fear', 'Way', 'Hope', 'Love', 'Go', 'Away'], ['compose']))).toEqual([
      ['Way', 'Hope', 'Away'],
      ['Way', 'Love', 'Away'],
      ['Way', 'Go', 'Away'],
      ['Away', 'Hope', 'Way'],
      ['Away', 'Love', 'Way'],
      ['Away', 'Go', 'Way'],
    ]);
    expect(listValidTercets(ctx(['Way', 'Love', 'Away'], ['compose'], ['Love']))).toEqual([]);
  });

  it('verseContextOf reads the state', () => {
    const s = createInitialState();
    s.words.owned.push('Way');
    s.unlocks.push('compose');
    expect(verseContextOf(s)).toEqual({ owned: ['Way'], sealed: [], unlocks: ['compose'], maxTercets: 2 });
  });

  it('centoLines skips unknown words', () => {
    expect(centoLines(verse([t('Way', 'Nope', 'Away')])).map((l) => l.word)).toEqual(['Way', 'Away']);
  });
});
