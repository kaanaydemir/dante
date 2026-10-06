/**
 * The colophon and the chapter end (docs/ENGINE.md §5.9, bible §1.3.8, §4.7, §7.5).
 */

import { describe, expect, it } from 'vitest';
import type { ChapterSummary, ColophonSpec, WordChange } from '../../src/runtime/contracts';
import type { OptionLetter } from '../../src/story/types';
import { beat, createHarness, openingScene, scene, scriptText } from './helpers/harness';

const ID = 'inf97';
const PATH = `/tests/runtime/${ID}.md`;

function body(extraEffects = ''): string {
  return [
    openingScene(ID),
    scene(
      `${ID}.s1`,
      'Francesca',
      beat(
        `${ID}.s1.b1`,
        'The verdict',
        `@mode: dialogue
EFFECTS: unlock:heart, codex:${ID}.francesca${extraEffects ? `, ${extraEffects}` : ''}
CHOICE ${ID}.c4 centre "The verdict"
PROMPT: The tale was over.
OPTION a [Weep with them.]
EFFECTS: pity+3@lust, memory:${ID}.two
OPTION b [Turn away from them.]
DANTE (stern): Love was the reason. It is not the excuse.
EFFECTS: justice+3@lust, word:Judgment
REVEAL canon=a timing=deferred
QUOTE POET (Inferno V, 139–141)
> And all the while one spirit uttered this,
> The other one did weep so, that, for pity,
> I swooned away as if I had been dying,
NOTE: Dante did not judge them aloud. He fainted for pity.
END CHOICE`,
      ),
    ),
    scene(
      `${ID}.s2`,
      'Colophon',
      beat(
        `${ID}.s2.b1`,
        'And fell',
        `@mode: colophon
@chapter_end: ch1
QUOTE POET (Inferno V, 142)
> And fell, even as a dead body falls.
EFFECTS: word:Pity`,
      ),
    ),
    `## Codex

\`\`\`codex
ID: ${ID}.francesca
TAB: souls
TITLE: Francesca
QUOTE FRANCESCA (Inferno V, 121–123)
> And she to me: "There is no greater sorrow
> Than to be mindful of the happy time
> In misery, and that thy Teacher knows.
NOTE: A test entry.
\`\`\`

## Memories

\`\`\`memory
ID: ${ID}.two
NAME: The two
KIND: kept
QUOTE FRANCESCA (Inferno V, 135)
> This one, who ne'er from me shall be divided,
NOTE: A test memory.
\`\`\``,
  ].join('\n');
}

async function play(letter: OptionLetter, extraEffects = '') {
  const h = createHarness({
    texts: { [PATH]: scriptText(ID, body(extraEffects), { title: 'The Test Hurricane', mechanics: ['faint'] }) },
    presenter: { choose: () => letter },
  });
  const outcome = await h.runner.runCanto(h.script(ID));
  const colophon = h.presenter.args<ColophonSpec>('colophon')[0]!;
  const summary = h.presenter.args<ChapterSummary>('chapterEnd')[0]!;
  return { h, outcome, colophon, summary };
}

describe('the colophon', () => {
  it('opens deferred cards, makes the colophon word glow on them, and lists the canto', async () => {
    const { h, colophon } = await play('a');
    expect(colophon.canticleLabel).toBe('INFERNO');
    expect(colophon.cantoLabel).toBe('CANTO XCVII');
    expect(colophon.closing).toMatchObject({ citationText: 'Inferno V, 142', lines: ['And fell, even as a dead body falls.'], context: 'colophon' });
    expect(colophon.choices).toEqual([
      {
        choice: `${ID}.c4`,
        title: 'The verdict',
        systemic: false,
        letter: 'a',
        chosenText: 'Weep with them.',
        heading: 'As Dante did',
        note: 'Dante did not judge them aloud. He fainted for pity.',
      },
    ]);
    expect(colophon.reveals).toHaveLength(1);
    const card = colophon.reveals[0]!;
    expect(card).toMatchObject({ choice: `${ID}.c4`, deferred: true, heading: 'As Dante did', highlightWords: ['Pity'] });
    expect(card.quotes[0]!.collectible).toEqual([
      expect.objectContaining({ word: 'Pity', lineIndex: 1, auto: false }),
    ]);
    const { start, end } = card.quotes[0]!.collectible[0]!;
    expect(card.quotes[0]!.lines[1]!.slice(start, end)).toBe('pity');
    expect(colophon.highlightWords).toEqual(['Pity']);
    expect(colophon.words.map((w: WordChange) => [w.word, w.change])).toEqual([['Pity', 'gained']]);
    expect(colophon.codex.map((c) => [c.id, c.entry?.title])).toEqual([[`${ID}.francesca`, 'Francesca']]);
    expect(colophon.memories.map((m) => [m.id, m.entry?.name])).toEqual([[`${ID}.two`, 'The two']]);
    expect(colophon.heart).toEqual({ pity: 3, justice: 0, visible: true });
    expect(colophon.fullTextUnlocked).toBe(true);
    expect(colophon.next).toBeNull();
    // The card's lines are now gold in the Book.
    expect(h.store.state.linesSeen['Inferno:5']).toEqual([139, 140, 141, 142]);
    // The colophon word arrives silently (the flourish is the take on the card).
    expect(h.presenter.args<WordChange>('wordGained')).toEqual([expect.objectContaining({ word: 'Pity', silent: true })]);
    expect(h.store.state.words.owned).toContain('Pity');
  });

  it('names the next canto of the chapter', async () => {
    const h = createHarness({ texts: { [PATH]: scriptText(ID, body()) } });
    await h.impl.runCanto(h.script(ID), { order: [ID, 'inf04'] });
    expect(h.presenter.args<ColophonSpec>('colophon')[0]!.next).toEqual({ cantoId: 'inf04', label: 'CANTO IV' });
  });
});

describe('the chapter end (§4.7)', () => {
  it('pity: heart_tender, the summary and the chapter:end event', async () => {
    const { h, outcome, summary } = await play('a');
    expect(outcome).toMatchObject({ status: 'completed', chapterEnd: 'ch1' });
    expect(summary.flags).toEqual(['ch1.heart_tender']);
    expect(h.store.state.flags).toEqual(['ch1.heart_tender']);
    expect(summary).toMatchObject({
      heart: { pity: 3, justice: 0 },
      trust: 4,
      trustLabel: 'Steady',
      words: ['Pity'],
      memories: [{ id: `${ID}.two`, entry: expect.objectContaining({ name: 'The two' }) }],
      verses: [],
    });
    expect(summary.chapter.id).toBe('ch1');
    expect(summary.cantos).toEqual([
      expect.objectContaining({ id: ID, title: 'The Test Hurricane', choices: [expect.objectContaining({ letter: 'a' })] }),
    ]);
    expect(h.emitted('chapter:end')).toEqual([{ chapter: 'ch1' }]);
    const methods = h.presenter.calls.map((c) => c.method);
    expect(methods.indexOf('chapterEnd')).toBeGreaterThan(methods.indexOf('colophon'));
    expect(methods.indexOf('chapterEnd')).toBeLessThan(methods.indexOf('endCanto'));
  });

  it('justice: heart_stern and the conditional word', async () => {
    const { summary, h } = await play('b');
    expect(summary.flags).toEqual(['ch1.heart_stern']);
    expect(h.store.state.words.owned).toEqual(['Judgment', 'Pity']);
    expect(summary.heart).toEqual({ pity: 0, justice: 3 });
  });

  it('trust thresholds: Faithful and Wayward', async () => {
    const faithful = await play('a', 'trust+3');
    expect(faithful.summary.flags).toEqual(['ch1.heart_tender', 'ch1.trust_faithful']);
    expect(faithful.summary.trustLabel).toBe('Faithful');
    const wayward = await play('a', 'trust-2');
    expect(wayward.summary.flags).toEqual(['ch1.heart_tender', 'ch1.trust_wayward']);
    expect(wayward.summary.trustLabel).toBe('Wayward');
  });

  it('a balanced heart is even', async () => {
    const { summary } = await play('a', 'justice+1@limbo');
    expect(summary.heart).toEqual({ pity: 3, justice: 1 });
    expect(summary.flags).toEqual(['ch1.heart_even']);
  });
});
