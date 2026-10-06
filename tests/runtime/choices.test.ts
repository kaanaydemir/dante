/**
 * Choices and "What Dante did" cards (docs/ENGINE.md §5.6, bible §2.9, §2.11).
 */

import { describe, expect, it } from 'vitest';
import type { ChoiceOptionView, ChoiceSpec, RevealCard, SayLine } from '../../src/runtime/contracts';
import type { OptionLetter } from '../../src/story/types';
import { beat, colophonScene, createHarness, openingScene, scene, scriptText } from './helpers/harness';
import type { FakePresenterOptions } from './helpers/fakes';

const ID = 'inf98';
const PATH = `/tests/runtime/${ID}.md`;

const DIALOGUE = `@mode: dialogue
EFFECTS: word:Hope
CHOICE inf98.c1 major "Why Dante goes"
PROMPT: Virgil waited for an answer.
OPTION a ["Lead me out of this wood."]
EFFECTS: virtue:prudence+1, flag:inf98.motive_escape
OPTION b ["Take me to the gate."]
VIRGIL (gentle): Then we have a long walk ahead.
EFFECTS: trust+1, flag:inf98.motive_gate
OPTION c [Say nothing.] requires: word:Love
EFFECTS: grace+1
REVEAL canon=b timing=immediate
QUOTE DANTE (Inferno I, 134)
> That I may see the portal of Saint Peter,
NOTE: He asked to see Saint Peter's gate.
END CHOICE
NARRATION: Virgil turned toward the low ground.`;

function run(lines: string, opts: { choose?: OptionLetter; presenter?: FakePresenterOptions; reveal?: 'after_choice' | 'end_of_canto' | 'book_only'; events?: string[] } = {}) {
  const body = [openingScene(ID), scene(`${ID}.s1`, 'One', beat(`${ID}.s1.b1`, 'Choose', lines)), colophonScene(ID, 2)].join('\n');
  const h = createHarness({
    texts: { [PATH]: scriptText(ID, body) },
    presenter: opts.presenter ?? {
      choose: (_spec: ChoiceSpec, options: readonly ChoiceOptionView[]) =>
        opts.choose && options.some((o) => o.letter === opts.choose) ? opts.choose : (options[0]?.letter ?? 'a'),
    },
    world: {
      onDirect: (_stmt, _i, _info, world) => {
        for (const e of opts.events ?? []) world.emit(e);
      },
    },
  });
  if (opts.reveal) h.store.updateSettings({ revealTiming: opts.reveal });
  return { h, done: h.runner.runCanto(h.script(ID)) };
}

describe('dialogue choices', () => {
  it('shows the visible options with the prompt; never numbers or system terms', async () => {
    const { h, done } = run(DIALOGUE);
    await done;
    const [spec, options] = h.presenter.of('choose')[0]!.args as [ChoiceSpec, ChoiceOptionView[]];
    expect(spec).toEqual({ id: 'inf98.c1', title: 'Why Dante goes', weight: 'major', prompt: 'Virgil waited for an answer.', mode: 'dialogue' });
    // c requires word:Love, which Dante does not have.
    expect(options).toEqual([
      { letter: 'a', text: '"Lead me out of this wood."', spoken: true },
      { letter: 'b', text: '"Take me to the gate."', spoken: true },
    ]);
  });

  it('a spoken option is also Dante’s balloon; the option body runs; the record, log and event are written', async () => {
    const { h, done } = run(DIALOGUE, { choose: 'b' });
    await done;
    const says = h.presenter.args<SayLine>('say');
    expect(says[0]).toEqual({ speaker: 'DANTE', name: 'Dante', tag: null, text: 'Take me to the gate.', mode: 'dialogue', fromChoice: true });
    expect(says[1]).toMatchObject({ speaker: 'VIRGIL', text: 'Then we have a long walk ahead.', fromChoice: false });
    const s = h.store.state;
    expect(s.flags).toEqual(['inf98.motive_gate']);
    expect(s.trust).toBe(5);
    expect(s.choices['inf98.c1']).toEqual({
      choice: 'inf98.c1',
      canto: ID,
      beat: `${ID}.s1.b1`,
      title: 'Why Dante goes',
      weight: 'major',
      systemic: false,
      letter: 'b',
      optionText: '"Take me to the gate."',
      canon: ['b'],
      heading: 'As Dante did',
      note: "He asked to see Saint Peter's gate.",
      order: 1,
    });
    expect(h.emitted('choice:made')).toEqual([{ choice: 'inf98.c1', letter: 'b', systemic: false, heading: 'As Dante did' }]);
    expect(s.log.find((e) => e.kind === 'choice')).toMatchObject({ choice: 'inf98.c1', letter: 'b', heading: 'As Dante did' });
    expect(h.presenter.args<string>('narration')).toEqual(['Virgil turned toward the low ground.']);
  });

  it('the immediate card comes after the option lines, before the rest of the beat', async () => {
    const { h, done } = run(DIALOGUE, { choose: 'a' });
    await done;
    const methods = h.presenter.calls.map((c) => c.method);
    expect(methods.indexOf('reveal')).toBeGreaterThan(methods.indexOf('choose'));
    expect(methods.indexOf('reveal')).toBeLessThan(methods.indexOf('narration'));
    const card = h.presenter.args<RevealCard>('reveal')[0]!;
    expect(card).toMatchObject({
      choice: 'inf98.c1',
      canto: ID,
      recordTitle: 'Why Dante goes',
      heading: 'What Dante did',
      chosenLetter: 'a',
      chosenText: '"Lead me out of this wood."',
      note: "He asked to see Saint Peter's gate.",
      timing: 'immediate',
      deferred: false,
      highlightWords: [],
    });
    expect(card.quotes[0]).toMatchObject({ voice: 'DANTE', citationText: 'Inferno I, 134', lineNumbers: [134], context: 'card' });
    expect(h.store.state.linesSeen['Inferno:1']).toContain(134);
  });

  it('with fewer than two visible options, all are shown (with a warning)', async () => {
    const lines = `@mode: dialogue
CHOICE inf98.c1 minor "Hidden"
OPTION a [One.] requires: flag:inf98.never
OPTION b [Two.] requires: flag:inf98.never
REVEAL canon=a timing=immediate
QUOTE POET (Inferno I, 136)
> Then he moved on, and I behind him followed.
NOTE: He moved on.
END CHOICE`;
    const { h, done } = run(lines);
    await done;
    expect((h.presenter.of('choose')[0]!.args[1] as ChoiceOptionView[]).map((o) => o.letter)).toEqual(['a', 'b']);
    expect(h.logs('warn').some((m) => m.includes('fewer than two'))).toBe(true);
  });

  it('heading: canon=all is always "As Dante did", canon=none never', async () => {
    const make = (canon: string) => `@mode: dialogue
CHOICE inf98.c1 minor "T"
OPTION a [One.]
OPTION b [Two.]
REVEAL canon=${canon} timing=immediate
QUOTE POET (Inferno I, 136)
> Then he moved on, and I behind him followed.
NOTE: He moved on.
END CHOICE`;
    for (const [canon, letter, heading] of [
      ['all', 'b', 'As Dante did'],
      ['none', 'a', 'What Dante did'],
      ['a,b', 'b', 'As Dante did'],
    ] as const) {
      const { h, done } = run(make(canon), { choose: letter });
      await done;
      expect(h.presenter.args<RevealCard>('reveal')[0]!.heading).toBe(heading);
    }
  });
});

describe('reveal timing and the reader setting (§1.6)', () => {
  it('end_of_canto defers every card to the colophon', async () => {
    const { h, done } = run(DIALOGUE, { reveal: 'end_of_canto' });
    await done;
    expect(h.presenter.of('reveal')).toHaveLength(0);
    const colophon = h.presenter.args<{ reveals: RevealCard[] }>('colophon')[0]!;
    expect(colophon.reveals.map((r) => [r.choice, r.deferred])).toEqual([['inf98.c1', true]]);
    expect(h.store.state.pendingReveals).toEqual([]);
  });

  it('book_only shows no card in play; the record keeps the note', async () => {
    const { h, done } = run(DIALOGUE, { reveal: 'book_only' });
    await done;
    expect(h.presenter.of('reveal')).toHaveLength(0);
    expect(h.presenter.args<{ reveals: RevealCard[] }>('colophon')[0]!.reveals).toEqual([]);
    expect(h.store.state.choices['inf98.c1']?.note).toBe("He asked to see Saint Peter's gate.");
  });

  it('timing=deferred waits for the colophon even after each choice', async () => {
    const { h, done } = run(DIALOGUE.replace('timing=immediate', 'timing=deferred'));
    await done;
    expect(h.presenter.of('reveal')).toHaveLength(0);
    expect(h.presenter.args<{ reveals: RevealCard[] }>('colophon')[0]!.reveals).toHaveLength(1);
  });
});

describe('systemic choices', () => {
  const SYSTEMIC = `@mode: play
DO: Pars dans eder. {event:inf98.waited_dawn}
CHOICE inf98.c2 minor systemic "The panther"
OPTION a [Waited for the dawn] when: event:inf98.waited_dawn
EFFECTS: virtue:temperance+1
OPTION b [Slipped past her] when: else
EFFECTS: resolve-1
REVEAL canon=a timing=immediate
QUOTE POET (Inferno I, 37–38)
> The time was the beginning of the morning,
> And up the sun was mounting with those stars
NOTE: Dante waited.
END CHOICE`;

  it('takes the first option whose when: holds, with no menu, when the event came in the same scene', async () => {
    const { h, done } = run(SYSTEMIC, { events: ['inf98.waited_dawn'] });
    await done;
    expect(h.presenter.of('choose')).toHaveLength(0);
    expect(h.store.state.choices['inf98.c2']).toMatchObject({ letter: 'a', systemic: true, heading: 'As Dante did', optionText: 'Waited for the dawn' });
    expect(h.store.state.virtues.temperance).toBe(1);
    expect(h.presenter.args<RevealCard>('reveal')[0]!.heading).toBe('As Dante did');
  });

  it('falls to when: else otherwise', async () => {
    const { h, done } = run(SYSTEMIC);
    await done;
    expect(h.store.state.choices['inf98.c2']).toMatchObject({ letter: 'b', heading: 'What Dante did' });
    expect(h.store.state.resolve).toBe(9);
  });

  it('a systemic choice in a beat that never runs stays unresolved', async () => {
    const body = [
      openingScene(ID),
      scene(
        `${ID}.s1`,
        'One',
        beat(`${ID}.s1.b1`, 'A', '@mode: play\nNARRATION: a'),
        beat(
          `${ID}.s1.b2`,
          'Optional',
          `@mode: play
@trigger: event:inf98.never
CHOICE inf98.c3 minor systemic "Optional"
OPTION a [Did] when: else
END CHOICE`,
        ),
        beat(`${ID}.s1.b3`, 'End', '@mode: play\n@trigger: enter:inf98_end\nIF choice:inf98.c3=a\nNARRATION: resolved\nELSE\nNARRATION: unresolved\nEND IF'),
      ),
      colophonScene(ID, 2),
    ].join('\n');
    const h = createHarness({
      texts: { [PATH]: scriptText(ID, body) },
      world: {
        places: ['inf98_end'],
        emits: ['inf98.never'],
        onArmed: (_a, world) => setTimeout(() => world.enter('inf98_end'), 0),
      },
    });
    const out = await h.runner.runCanto(h.script(ID));
    expect(out.missed).toEqual([`${ID}.s1.b2`]);
    expect(h.store.state.choices['inf98.c3']).toBeUndefined();
    expect(h.presenter.args<string>('narration')).toEqual(['a', 'unresolved']);
  });
});
