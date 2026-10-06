/**
 * Statements (docs/ENGINE.md §5.4–§5.5, §5.7, §5.8, §5.10, §5.11): what the
 * runner hands the presenter and the world for each line type.
 */

import { describe, expect, it } from 'vitest';
import type {
  BeatContext,
  CamCommand,
  CodexGain,
  HeartShift,
  NarrationOptions,
  OpeningPageSpec,
  QuoteSpec,
  SayLine,
  WordChange,
} from '../../src/runtime/contracts';
import { beat, colophonScene, createHarness, openingScene, scene, scriptText } from './helpers/harness';
import type { FakeWorldOptions } from './helpers/fakes';

const ID = 'inf98';
const PATH = `/tests/runtime/${ID}.md`;

function oneScene(lines: string, world: FakeWorldOptions = {}, more = '') {
  const body = [openingScene(ID), scene(`${ID}.s1`, 'One', beat(`${ID}.s1.b1`, 'Only', lines)), more, colophonScene(ID, more ? 3 : 2)].join(
    '\n',
  );
  const h = createHarness({ texts: { [PATH]: scriptText(ID, body) }, world });
  return { ...h, run: () => h.runner.runCanto(h.script(ID)) };
}

describe('text lines', () => {
  it('narration is blocking outside play mode and logged; page opens a text page; say names the speaker', async () => {
    const h = oneScene(`@mode: dialogue
NARRATION: The wood was dark.
VIRGIL (gentle): Keep close.
DANTE: I will.
PAGE: The sun stood higher now.`);
    await h.run();
    const [, opts] = h.presenter.of('narration')[0]!.args as [string, NarrationOptions];
    expect(opts).toEqual({ mode: 'dialogue', blocking: true });
    const says = h.presenter.args<SayLine>('say');
    expect(says).toEqual([
      { speaker: 'VIRGIL', name: 'Virgil', tag: 'gentle', text: 'Keep close.', mode: 'dialogue', fromChoice: false },
      { speaker: 'DANTE', name: 'Dante', tag: null, text: 'I will.', mode: 'dialogue', fromChoice: false },
    ]);
    const pages = h.presenter.args<{ kind: string; text?: string }>('openPage').filter((p) => p.kind === 'text');
    expect(pages.map((p) => p.text)).toEqual(['The sun stood higher now.']);
    expect(h.store.state.log.filter((e) => e.kind !== 'quote').map((e) => e.kind)).toEqual(['narration', 'page']);
  });

  it('narration in play mode does not block', async () => {
    const h = oneScene('@mode: play\nNARRATION: Walking.');
    await h.run();
    expect((h.presenter.of('narration')[0]!.args[1] as NarrationOptions).blocking).toBe(false);
  });

  it('bark and sfx are fire-and-forget', async () => {
    const h = oneScene('@mode: play\nBARK SHADE: —cold here—\nSFX: kuru yapraklar');
    await h.run();
    expect(h.presenter.of('bark')[0]!.args).toEqual(['SHADE', 'A Shade', '—cold here—']);
    expect(h.presenter.of('sfx')[0]!.args).toEqual(['kuru yapraklar']);
  });
});

describe('the opening page (§5.4)', () => {
  it('shows the epigraph on the opening page and logs it', async () => {
    const h = oneScene('@mode: cinematic\nNARRATION: x');
    await h.run();
    const page = h.presenter.args<OpeningPageSpec>('openPage')[0]!;
    expect(page).toMatchObject({
      kind: 'opening',
      canticleLabel: 'INFERNO',
      cantoLabel: 'CANTO XCVIII',
      vignette: `vignette-${ID}`,
      firstReading: true,
      awakening: false,
    });
    expect(page.epigraph).toMatchObject({
      voice: 'POET',
      speakerName: 'The Poet',
      citationText: 'Inferno I, 1–3',
      lineNumbers: [1, 2, 3],
      context: 'epigraph',
    });
    // The epigraph is on the page and the closing line on the colophon: no verse bubble at all.
    expect(h.presenter.of('quote')).toHaveLength(0);
    expect(h.store.state.log[0]).toMatchObject({ kind: 'quote', beat: `${ID}.s0.b1`, lineNumbers: [1, 2, 3] });
  });

  it('after a canto that ends in a faint, the epigraph is a waking line (§1.3.9)', async () => {
    const faintBody = [openingScene('inf97'), colophonScene('inf97', 1)].join('\n');
    const nextBody = [openingScene(ID), colophonScene(ID, 1)].join('\n');
    const h = createHarness({
      texts: {
        '/tests/runtime/inf97.md': scriptText('inf97', faintBody, { mechanics: ['faint'] }),
        [PATH]: scriptText(ID, nextBody),
      },
    });
    await h.impl.runCanto(h.script(ID), { order: ['inf97', ID] });
    expect(h.presenter.args<OpeningPageSpec>('openPage')[0]!.awakening).toBe(true);
  });
});

describe('quotes and collectible words (§5.8)', () => {
  it('builds the quote spec with resolved line numbers, skip lines and the gloss', async () => {
    const h = oneScene(`@mode: dialogue
QUOTE DANTE (Inferno I, 82–87)
> "O, of the other poets honour and light,
> Avail me the long study and great love
> That have impelled me to explore thy volume!
> …
> The beautiful style that has done honour to me.
GLOSS: Dante knows the poet's book by heart.`);
    await h.run();
    const spec = h.presenter.args<QuoteSpec>('quote')[0]!;
    expect(spec.lines).toEqual([
      '"O, of the other poets honour and light,',
      'Avail me the long study and great love',
      'That have impelled me to explore thy volume!',
      '…',
      'The beautiful style that has done honour to me.',
    ]);
    expect(spec.lineNumbers).toEqual([82, 83, 84, null, 87]);
    expect(spec.gloss).toBe("Dante knows the poet's book by heart.");
    expect(spec.citationText).toBe('Inferno I, 82–87');
    expect(spec.collectible).toEqual([]);
    expect(spec.context).toBe('bubble');
    expect(h.store.state.linesSeen['Inferno:1']).toEqual(expect.arrayContaining([82, 83, 84, 87]));
    expect(h.store.state.linesSeen['Inferno:1']).not.toContain(85);
  });

  it('a word: right after its origin line glows, is taken, and arrives as collected', async () => {
    const h = oneScene(`@mode: play
QUOTE POET (Inferno I, 10–12)
> I cannot well repeat how there I entered,
> So full was I of slumber at the moment
> In which I had abandoned the true way.
EFFECTS: word:Way, unlock:words`);
    await h.run();
    const spec = h.presenter.args<QuoteSpec>('quote')[0]!;
    expect(spec.collectible).toHaveLength(1);
    expect(spec.collectible[0]).toMatchObject({ word: 'Way', lineIndex: 2, auto: false });
    const { start, end } = spec.collectible[0]!;
    expect(spec.lines[2]!.slice(start, end)).toBe('way');
    const gained = h.presenter.args<WordChange>('wordGained');
    expect(gained).toEqual([expect.objectContaining({ word: 'Way', change: 'gained', collected: true, silent: false })]);
    // The quote resolves first (the take), then the EFFECTS line applies.
    const order = h.presenter.calls.map((c) => c.method);
    expect(order.indexOf('quote')).toBeLessThan(order.indexOf('wordGained'));
    expect(h.presenter.args<string>('unlock')).toEqual(['words']);
  });

  it('reading fills Grace: a word taken from its line, a beat opened by talking (GDD 2.3)', async () => {
    const h = oneScene(
      `@mode: play
QUOTE POET (Inferno I, 10–12)
> I cannot well repeat how there I entered,
> So full was I of slumber at the moment
> In which I had abandoned the true way.
EFFECTS: word:Way
EFFECTS: word:Hope`,
      { npcs: ['VIRGIL'], onArmed: (_a, world) => setTimeout(() => world.talk('VIRGIL'), 0) },
      scene(`${ID}.s2`, 'Two', beat(`${ID}.s2.b1`, 'Talk', '@mode: dialogue\n@trigger: talk:VIRGIL\nNARRATION: Talked.')),
    );
    await h.run();
    // 3 at the start, +1 for Way (taken from its line), +0 for Hope (just given), +0.5 for the talk.
    expect(h.store.state.grace).toBe(4.5);
  });

  it('the burden word sticks by itself (auto)', async () => {
    const h = oneScene(`@mode: play
QUOTE POET (Inferno I, 4–6)
> Ah me! how hard a thing it is to say
> What was this forest savage, rough, and stern,
> Which in the very thought renews the fear.
EFFECTS: unlock:words, word:Fear`);
    await h.run();
    expect(h.presenter.args<QuoteSpec>('quote')[0]!.collectible[0]).toMatchObject({ word: 'Fear', auto: true, lineIndex: 2 });
  });

  it('a word whose line is not in the quote, or that is already held, does not glow', async () => {
    const h = oneScene(`@mode: play
QUOTE POET (Inferno I, 4–6)
> Ah me! how hard a thing it is to say
> What was this forest savage, rough, and stern,
> Which in the very thought renews the fear.
EFFECTS: word:Way
QUOTE POET (Inferno I, 10–12)
> I cannot well repeat how there I entered,
> So full was I of slumber at the moment
> In which I had abandoned the true way.
EFFECTS: word:Way`);
    await h.run();
    const specs = h.presenter.args<QuoteSpec>('quote');
    expect(specs[0]!.collectible).toEqual([]);
    expect(specs[1]!.collectible).toEqual([]);
    const gained = h.presenter.args<WordChange>('wordGained');
    expect(gained).toEqual([expect.objectContaining({ word: 'Way', collected: false })]);
  });
});

describe('effects and feedback (§5.7)', () => {
  it('gives each kind of feedback once and nothing for duplicates', async () => {
    const h = oneScene(`@mode: dialogue
EFFECTS: pity+1@limbo, codex:inf01.virgil, trust+1, virtue:prudence+1, flag:inf98.marked, resolve-2, grace+1, gracemax+1, memory:inf05.paolo_francesca
EFFECTS: unlock:heart, unlock:codex, justice+2@lust, codex:inf01.lion, codex:inf01.virgil, flag:inf98.marked, seal:Hope, word:Hope, shed:Hope, word:Hope`);
    await h.run();
    const shifts = h.presenter.args<HeartShift>('heartShift');
    expect(shifts).toEqual([
      { side: 'pity', amount: 1, sin: 'limbo', pity: 1, justice: 0, visible: false },
      { side: 'justice', amount: 2, sin: 'lust', pity: 1, justice: 2, visible: true },
    ]);
    const codex = h.presenter.args<CodexGain>('codexGained');
    expect(codex.map((c) => [c.id, c.silent])).toEqual([
      ['inf01.virgil', true],
      ['inf01.lion', false],
    ]);
    expect(h.world.of('setVirgilTrust')[0]!.args).toEqual([5, 1]);
    expect(h.presenter.args<string>('unlock')).toEqual(['heart', 'codex']);
    expect(h.presenter.args<WordChange>('wordGained').map((w) => w.change)).toEqual(['sealed', 'unsealed', 'shed']);
    expect(h.presenter.of('memoryGained')).toHaveLength(1);
    const s = h.store.state;
    expect(s.resolve).toBe(8);
    expect(s.grace).toBe(4);
    expect(s.gracemax).toBe(7);
    expect(s.flags).toEqual(['inf98.marked']);
    expect(s.words).toEqual({ owned: [], sealed: [], shed: ['Hope'] });
    expect(h.emitted('effect:applied').every((e) => e.source.canto === ID)).toBe(true);
  });
});

describe('IF (§2.8, §5.5)', () => {
  it('runs the first true branch, nested two levels, else otherwise', async () => {
    const h = oneScene(`@mode: dialogue
EFFECTS: trust+1, word:Hope
IF flag:inf98.none
NARRATION: wrong 1
ELSE IF word:Hope and not sealed:Hope
IF trust>=6
NARRATION: wrong 2
ELSE
NARRATION: right
END IF
ELSE
NARRATION: wrong 3
END IF
IF seen:inf98.s1.b1 and seen:inf98.s0
NARRATION: seen works
END IF`);
    await h.run();
    expect(h.presenter.args<string>('narration')).toEqual(['right', 'seen works']);
  });
});

describe('GOTO (§5.5)', () => {
  const choiceGoto = (target: string) =>
    [
      openingScene(ID),
      scene(
        `${ID}.s1`,
        'One',
        beat(
          `${ID}.s1.b1`,
          'Ask',
          `@mode: dialogue
CHOICE inf98.c1 minor "The question"
OPTION a [Go on.]
GOTO ${target}
OPTION b [Stay.]
NARRATION: Stayed.
REVEAL canon=a timing=immediate
QUOTE POET (Inferno I, 136)
> Then he moved on, and I behind him followed.
NOTE: He went on.
END CHOICE
NARRATION: After the choice.`,
        ),
        beat(`${ID}.s1.b2`, 'Between', '@mode: dialogue\nNARRATION: Between.'),
        beat(`${ID}.s1.b3`, 'Target', '@mode: dialogue\n@trigger: talk:NOBODY\nNARRATION: Target.'),
        beat(`${ID}.s1.b4`, 'After', '@mode: dialogue\nNARRATION: After target.'),
      ),
      scene(`${ID}.s2`, 'Two', beat(`${ID}.s2.b1`, 'Other', '@mode: dialogue\nNARRATION: Other scene.')),
      colophonScene(ID, 3),
    ].join('\n');

  it('jumps within the scene: card first, beats between missed, target regardless of trigger', async () => {
    const h = createHarness({ texts: { [PATH]: scriptText(ID, choiceGoto(`${ID}.s1.b3`)) } });
    const out = await h.runner.runCanto(h.script(ID));
    expect(h.presenter.args<string>('narration')).toEqual(['Target.', 'After target.', 'Other scene.']);
    expect(out.missed).toEqual([`${ID}.s1.b2`]);
    const methods = h.presenter.calls.map((c) => c.method);
    expect(methods.indexOf('reveal')).toBeLessThan(methods.indexOf('narration'));
    expect(h.logs('warn')).toEqual([]);
  });

  it('a GOTO to another scene is ignored with an error log', async () => {
    const h = createHarness({ texts: { [PATH]: scriptText(ID, choiceGoto(`${ID}.s2.b1`)) } });
    await h.runner.runCanto(h.script(ID));
    expect(h.logs('error').some((m) => m.includes('GOTO inf98.s2.b1'))).toBe(true);
    expect(h.presenter.args<string>('narration')[0]).toBe('After the choice.');
  });

  it('guards against GOTO loops', async () => {
    const body = [
      openingScene(ID),
      scene(
        `${ID}.s1`,
        'Loop',
        beat(`${ID}.s1.b1`, 'Top', '@mode: dialogue\nNARRATION: Top.'),
        beat(
          `${ID}.s1.b2`,
          'Again',
          `@mode: dialogue
CHOICE inf98.c1 minor systemic "Loop"
OPTION a [Looped] when: else
GOTO ${ID}.s1.b1
END CHOICE`,
        ),
      ),
      colophonScene(ID, 2),
    ].join('\n');
    const h = createHarness({ texts: { [PATH]: scriptText(ID, body) } });
    const out = await h.runner.runCanto(h.script(ID));
    expect(out.status).toBe('completed');
    expect(h.presenter.args<string>('narration')).toHaveLength(51);
    expect(h.logs('error').filter((m) => m.includes('GOTOs'))).toHaveLength(1);
  });
});

describe('stage lines: DO, CAM, directives', () => {
  it('DO goes to the world with a stable index; tags give checkpoints and tutorials', async () => {
    const seen: [string, number][] = [];
    const h = oneScene(
      `@mode: play
DO: Birinci. {tutorial:move}
IF flag:inf98.never
DO: Hiç oynamaz.
END IF
DO: Üçüncü. {checkpoint} {event:inf98.thing}`,
      { onDirect: (stmt, index) => void seen.push([stmt.text, index]) },
    );
    await h.run();
    expect(seen).toEqual([
      ['Birinci.', 0],
      ['Üçüncü.', 2],
    ]);
    expect(h.presenter.args<string>('tutorial')).toEqual(['move']);
    expect(h.world.of('checkpoint')).toHaveLength(1);
    // Without autoplay, DO events are documentation: the level emits them.
    expect(h.store.state.events).toEqual([]);
  });

  it('CAM reaches both the presenter and the world', async () => {
    const h = oneScene('@mode: cinematic\nCAM: white-out — kızıl bir ışık\nCAM: pan');
    await h.run();
    expect(h.presenter.args<CamCommand>('camera').map((c) => [c.verb, c.text])).toEqual([
      ['white-out', 'kızıl bir ışık'],
      ['pan', ''],
    ]);
    expect(h.world.of('camera').map((c) => c.args[0])).toEqual(['white-out', 'pan']);
  });

  it('mid-beat @music / @ambience re-cue the presenter; @place teleports when elsewhere', async () => {
    const h = oneScene(
      `@mode: play
@music: alçak drone
NARRATION: one
@ambience: rüzgâr
@place: inf98_hill`,
      { places: ['inf98_hill'] },
    );
    await h.run();
    const modes = h.presenter.of('setMode').map((c) => c.args[1] as BeatContext).filter((c) => c.beatId === `${ID}.s1.b1`);
    expect(modes.map((m) => [m.music, m.ambience])).toEqual([
      ['alçak drone', null],
      ['alçak drone', 'rüzgâr'],
    ]);
    expect(h.world.of('teleport').map((c) => c.args[0])).toEqual(['inf98_hill']);
  });

  it('beats get mode, place and first-visit context; control follows the mode', async () => {
    const h = oneScene('@mode: play\n@place: inf98_wood\nNARRATION: x', { places: ['inf98_wood'] });
    await h.run();
    const ctx = h.presenter.of('setMode').map((c) => c.args[1] as BeatContext).find((c) => c.beatId === `${ID}.s1.b1`)!;
    expect(ctx).toMatchObject({ mode: 'play', place: 'inf98_wood', firstVisit: true, sceneTitle: 'One', beatTitle: 'Only' });
    expect(ctx.canto).toMatchObject({ id: ID, roman: 'XCVIII', location: 'The Test Place' });
    const control = h.world.of('setPlayerControl').map((c) => c.args[0]);
    expect(control).toEqual([false, true, false]);
  });
});

describe('hints: Ask Virgil (§5.10)', () => {
  const body = [
    openingScene(ID),
    scene(
      `${ID}.s1`,
      'One',
      beat(
        `${ID}.s1.b1`,
        'Hint',
        `@mode: play
HINT: Walk east, toward the grey light between the trees.
HINT-SHORT: East, toward the light.
NARRATION: x`,
      ),
      beat(`${ID}.s1.b2`, 'Wait', '@mode: play\n@trigger: talk:VIRGIL\nNARRATION: y'),
    ),
    scene(`${ID}.s2`, 'Two', beat(`${ID}.s2.b1`, 'Quiet', '@mode: play\n@trigger: talk:VIRGIL\nNARRATION: z')),
    colophonScene(ID, 3),
  ].join('\n');

  it('full the first time, short after; Wayward always short; silent in a new scene', async () => {
    const answers: (string | null)[] = [];
    const h = createHarness({
      texts: { [PATH]: scriptText(ID, body) },
      world: {
        npcs: ['VIRGIL'],
        onArmed: (armed, world) => {
          const cursor = armed.find((a) => a.cursor)?.beat;
          if (cursor === `${ID}.s1.b2`) {
            answers.push(h.session.askVirgil()?.text ?? null);
            const again = h.session.askVirgil();
            answers.push(again?.text ?? null);
            expect(again?.repeat).toBe(true);
            h.store.apply({ type: 'trust', delta: -3 }, { canto: ID, beat: null });
            answers.push(h.runner.currentHint()?.text ?? null);
          }
          if (cursor === `${ID}.s2.b1`) answers.push(h.session.askVirgil()?.text ?? null);
          setTimeout(() => world.talk('VIRGIL'), 0);
        },
      },
    });
    await h.runner.runCanto(h.script(ID));
    expect(answers).toEqual([
      'Walk east, toward the grey light between the trees.',
      'East, toward the light.',
      'East, toward the light.',
      null,
    ]);
    expect(h.store.state.hintsUsed).toEqual([`${ID}.s1.b1#0`]);
    expect(h.presenter.args<boolean>('hintAvailable')).toContain(true);
    expect(h.runner.currentHint()).toBeNull();
  });
});
