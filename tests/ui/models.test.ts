import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type ColophonSpec, type GameStateData } from '../../src/runtime/contracts';
import { createInitialState } from '../../src/state/initial';
import { parseSourceText } from '../../src/story/quotes';
import { getWord } from '../../src/story/words';
import type { CantoScript } from '../../src/story/types';
import { verseContextOf } from '../../src/verse/tercet';
import {
  BOOK_TABS,
  codexByTab,
  initialTab,
  lineRuns,
  mapCircles,
  playedCantos,
  versesSeen,
  visibleTabs,
  wholeCanto,
} from '../../src/ui/models/book';
import { ChoiceCursor, isSpokenText } from '../../src/ui/models/choice';
import { chapterBlocks, colophonBlocks, colophonWordRows, paginate } from '../../src/ui/models/colophon';
import { ComposerModel, composerWords, headlineIssue } from '../../src/ui/models/composer';
import { heartPhrase, starLevel, trustPhrase, tutorialCopy, unlockCopy } from '../../src/ui/models/copy';
import { fearIntensity, scalePose, segments } from '../../src/ui/models/hud';
import { SETTING_ROWS, choiceIndex, stepSetting, valueLabel } from '../../src/ui/models/settings';
import { themeFor } from '../../src/ui/theme';
import canto01 from '../../docs/source/inferno/canto-01.txt?raw';

function state(patch: Partial<GameStateData> = {}): GameStateData {
  return { ...createInitialState('full', 0), ...patch };
}

describe('ChoiceCursor', () => {
  const opts = [
    { letter: 'a' as const, text: 'Leave your fear at the gate.', spoken: false },
    { letter: 'b' as const, text: 'Leave your hope at the gate.', spoken: false },
    { letter: 'c' as const, text: '"Show me."', spoken: true },
  ];
  it('wraps and maps keys to options by screen position', () => {
    const c = new ChoiceCursor(opts);
    expect(c.letter).toBe('a');
    c.move(-1);
    expect(c.letter).toBe('c');
    c.move(1);
    expect(c.letter).toBe('a');
    expect(c.indexForNumber(2)).toBe(1);
    expect(c.indexForNumber(4)).toBe(-1);
    expect(c.indexOfLetter('c')).toBe(2);
    expect(isSpokenText('"Show me."')).toBe(true);
    expect(isSpokenText('Show me.')).toBe(false);
  });
});

describe('HUD maths', () => {
  it('fills resource segments', () => {
    expect(segments(3.5, 6)).toEqual([1, 1, 1, 0.5, 0, 0]);
    expect(segments(12, 4)).toEqual([1, 1, 1, 1]);
    expect(segments(Number.NaN, 2)).toEqual([0, 0]);
  });

  it('tilts the scale toward pity on the left, without numbers', () => {
    const empty = scalePose(0, 0);
    expect(empty.empty).toBe(true);
    expect(empty.beamDeg).toBeCloseTo(0);
    const pity = scalePose(3, 0);
    expect(pity.beamDeg).toBeLessThan(0);
    expect(pity.pityDrop).toBeGreaterThan(0);
    expect(pity.justiceDrop).toBeLessThan(0);
    const justice = scalePose(0, 3);
    expect(justice.beamDeg).toBeGreaterThan(0);
    // Clamped at ±6.
    expect(scalePose(20, 0).beamDeg).toBeCloseTo(scalePose(6, 0).beamDeg);
    // Loads grow but are capped.
    expect(scalePose(6, 6).pityLoad).toBeLessThanOrEqual(1);
    expect(scalePose(6, 6).beamDeg).toBeCloseTo(0);
  });

  it('darkens the edges while fear drains resolve', () => {
    expect(fearIntensity(10, false)).toBe(0);
    expect(fearIntensity(8, true)).toBeGreaterThan(0.3);
    expect(fearIntensity(1, true)).toBeGreaterThan(fearIntensity(8, true));
  });
});

describe('Book tabs and content', () => {
  it('gates tabs by unlocks (ENGINE §7.2)', () => {
    expect(visibleTabs([]).map((t) => t.id)).toEqual(['settings']);
    expect(visibleTabs(['words']).map((t) => t.id)).toEqual(['words', 'settings']);
    expect(visibleTabs(['book', 'words', 'codex', 'remembrance']).map((t) => t.id)).toEqual(BOOK_TABS.map((t) => t.id));
    expect(initialTab(['words'])).toBe('words');
    expect(initialTab([], 'cantos')).toBe('settings');
    expect(initialTab(['book', 'words'], 'words')).toBe('words');
  });

  it('marks the whole canto with the lines the reader saw', () => {
    const src = parseSourceText(canto01, '/docs/source/inferno/canto-01.txt');
    expect(src).not.toBeNull();
    const lines = wholeCanto(src!, [1, 2, 3, 12]);
    expect(lines).toHaveLength(136);
    expect(lines[0]).toMatchObject({ n: 1, seen: true, tercetStart: true });
    expect(lines[3]).toMatchObject({ n: 4, seen: false, tercetStart: true });
    expect(lines[11]?.seen).toBe(true);
    expect(lines[11]?.text).toBe('In which I had abandoned the true way.');
  });

  it('groups seen lines into runs, in canto and line order', () => {
    expect(lineRuns([7, 1, 2, 3, 8, 3])).toEqual([
      { first: 1, last: 3 },
      { first: 7, last: 8 },
    ]);
    const src = parseSourceText(canto01, '/docs/source/inferno/canto-01.txt');
    const s = state({ linesSeen: { 'Inferno:1': [10, 11, 12, 1, 2, 3] } });
    const groups = versesSeen(s, (canticle, canto) => (canticle === 'Inferno' && canto === 1 ? src : null));
    expect(groups).toHaveLength(1);
    expect(groups[0]?.heading).toBe('Inferno I');
    expect(groups[0]?.runs.map((r) => r.citation)).toEqual(['Inferno I, 1–3', 'Inferno I, 10–12']);
    expect(groups[0]?.runs[1]?.lines[2]?.text).toBe('In which I had abandoned the true way.');
  });

  it('lists played cantos in chapter order', () => {
    const s = state({
      log: [
        { kind: 'narration', canto: 'inf03', beat: 'inf03.s1.b1', text: 'x' },
        { kind: 'narration', canto: 'inf01', beat: 'inf01.s1.b1', text: 'y' },
      ],
      completedCantos: ['inf01'],
    });
    const list = playedCantos(s, { script: () => null });
    expect(list.map((c) => c.id)).toEqual(['inf01', 'inf03']);
    expect(list[0]).toMatchObject({ numeral: 'I', fullText: true });
    expect(list[1]).toMatchObject({ numeral: 'III', fullText: false });
  });

  it('opens the whole canto as soon as its colophon is on the page', () => {
    const script = {
      cantoNumber: 3,
      front: { title: 'The Gate' },
      scenes: [{ id: 'inf03.s8', beats: [{ id: 'inf03.s8.b1', mode: 'colophon' }] }],
    } as unknown as CantoScript;
    const before = state({ log: [{ kind: 'narration', canto: 'inf03', beat: 'inf03.s1.b1', text: 'x' }] });
    expect(playedCantos(before, { script: () => script })[0]).toMatchObject({ title: 'The Gate', fullText: false });
    const during = state({ ...before, seen: ['inf03.s8', 'inf03.s8.b1'] });
    expect(playedCantos(during, { script: () => script })[0]).toMatchObject({ fullText: true, completed: false });
  });

  it('sorts codex entries into their tabs', () => {
    const entry = (id: string, tab: 'souls' | 'places' | 'lore') => ({
      id,
      cantoId: 'inf01',
      tab,
      title: id,
      quote: null,
      note: '',
      related: [],
      pos: { line: 1 },
    });
    const s = state({ codex: ['inf01.virgil', 'inf01.dark_wood', 'inf01.missing'] });
    const byTab = codexByTab(s, {
      codex: (id) => (id === 'inf01.virgil' ? entry(id, 'souls') : id === 'inf01.dark_wood' ? entry(id, 'places') : null),
    });
    expect(byTab.souls.map((e) => e.id)).toEqual(['inf01.virgil']);
    expect(byTab.places.map((e) => e.id)).toEqual(['inf01.dark_wood']);
    expect(byTab.lore).toEqual([]);
  });

  it('draws the circles reached, and names all once the order of Hell is known', () => {
    const s = state({ completedCantos: ['inf01', 'inf02', 'inf03'], position: { canto: 'inf04', scene: null, beat: null, checkpoint: null } });
    const circles = mapCircles(s);
    expect(circles.find((c) => c.id === 'gate')?.reached).toBe(true);
    expect(circles.find((c) => c.id === 'c1')).toMatchObject({ reached: true, current: true });
    expect(circles.find((c) => c.id === 'c9')).toMatchObject({ reached: false, named: false });
    const knows = mapCircles(state({ codex: ['inf05.order_of_hell'] }));
    expect(knows.every((c) => c.named)).toBe(true);
  });
});

describe('Settings rows', () => {
  it('steps enumerations with wrap and volumes with a clamp', () => {
    const speed = SETTING_ROWS.find((r) => r.key === 'textSpeed')!;
    expect(valueLabel(speed, DEFAULT_SETTINGS)).toBe('Normal');
    expect(stepSetting(speed, DEFAULT_SETTINGS, 1)).toEqual({ textSpeed: 'fast' });
    expect(stepSetting(speed, { ...DEFAULT_SETTINGS, textSpeed: 'instant' }, 1)).toEqual({ textSpeed: 'slow' });
    const vol = SETTING_ROWS.find((r) => r.key === 'masterVolume')!;
    expect(choiceIndex(vol, { ...DEFAULT_SETTINGS, masterVolume: 0.83 })).toBe(8);
    expect(stepSetting(vol, { ...DEFAULT_SETTINGS, masterVolume: 1 }, 1)).toEqual({ masterVolume: 1 });
    expect(stepSetting(vol, { ...DEFAULT_SETTINGS, masterVolume: 0 }, -1)).toEqual({ masterVolume: 0 });
    const reveal = SETTING_ROWS.find((r) => r.key === 'revealTiming')!;
    expect(valueLabel(reveal, DEFAULT_SETTINGS)).toBe('After each choice');
    const size = SETTING_ROWS.find((r) => r.key === 'fontScale')!;
    expect(stepSetting(size, DEFAULT_SETTINGS, 1)).toEqual({ fontScale: 1.15 });
  });

  it('scales fonts and never goes below 20 px', () => {
    expect(themeFor({ fontScale: 1, highContrast: false }).size('citation')).toBe(20);
    expect(themeFor({ fontScale: 1.3, highContrast: false }).size('verse')).toBe(34);
    expect(themeFor({ fontScale: 1, highContrast: true }).colors.paper).toBe(0xffffff);
  });
});

describe('Composer', () => {
  const owned = ['Fear', 'Way', 'Hope', 'Love', 'Go', 'Away'];
  const ctx = verseContextOf(
    state({ words: { owned, sealed: [], shed: [] }, unlocks: ['words', 'compose', 'verse'] }),
  );

  it('builds the first tercet Way · Love · Away (bible §3.4.7)', () => {
    const m = new ComposerModel(1, false);
    m.place('Way');
    expect(m.focus).toEqual({ kind: 'tercet', tercet: 0, slot: 1 });
    expect(m.fits('Love')).toBe(true);
    expect(m.fits('Away')).toBe(false); // same family as the outer word: not a middle word
    m.place('Love');
    expect(m.fits('Away')).toBe(true);
    expect(m.fits('Hope')).toBe(false);
    m.place('Away');
    const ev = m.evaluate(ctx);
    expect(ev.valid).toBe(true);
    expect(ev.tercets[0]).toMatchObject({ middle: 'Love', category: 'Force' });
    expect(ev.cento.map((l) => l.citation)).toEqual(['Inferno I, 12', 'Inferno I, 83', 'Inferno II, 116']);
    expect(headlineIssue(ev, m)).toBeNull();
  });

  it('moves a word that is placed twice and reports real issues only', () => {
    const m = new ComposerModel(1, false);
    m.place('Way', { kind: 'tercet', tercet: 0, slot: 0 });
    m.place('Way', { kind: 'tercet', tercet: 0, slot: 2 });
    expect(m.get({ kind: 'tercet', tercet: 0, slot: 0 })).toBeNull();
    expect(m.get({ kind: 'tercet', tercet: 0, slot: 2 })).toBe('Way');
    const partial = m.evaluate(ctx);
    expect(partial.valid).toBe(false);
    expect(headlineIssue(partial, m)).toBeNull();
    m.place('Hope', { kind: 'tercet', tercet: 0, slot: 0 });
    m.place('Love', { kind: 'tercet', tercet: 0, slot: 1 });
    expect(headlineIssue(m.evaluate(ctx), m)).toMatch(/rhyme/);
  });

  it('keeps optional tercets and the coda out of the verse until used', () => {
    const m = ComposerModel.from({ tercets: [['Way', 'Love', 'Away']], coda: null }, 2, true);
    expect(m.toVerse()).toEqual({ tercets: [['Way', 'Love', 'Away']], coda: null });
    expect(m.slots()).toHaveLength(7);
    expect(composerWords(owned, ['Hope']).map((w) => w.use)).toEqual(['burden', 'usable', 'sealed', 'usable', 'usable', 'usable']);
    expect(getWord('Fear')?.role).toBe('burden');
  });
});

describe('Colophon and chapter end', () => {
  const spec: ColophonSpec = {
    canto: { id: 'inf03', canticle: 'Inferno', cantoNumber: 3, roman: 'III', title: 'The Gate', location: 'Ante-Inferno', chapter: 'ch1' },
    canticleLabel: 'INFERNO',
    cantoLabel: 'CANTO III',
    closing: null,
    choices: [
      { choice: 'inf03.c1', title: 'What Dante leaves at the gate', systemic: false, letter: 'a', chosenText: 'Leave your fear at the gate.', heading: 'As Dante did', note: 'Dante did not give up his hope.' },
    ],
    reveals: [],
    words: [
      { word: 'Stay', def: getWord('Stay'), change: 'gained', collected: true, silent: false },
      { word: 'Fear', def: getWord('Fear'), change: 'gained', collected: false, silent: false },
      { word: 'Fear', def: getWord('Fear'), change: 'shed', collected: false, silent: false },
    ],
    codex: [{ id: 'inf03.gate', entry: null, silent: true }],
    memories: [],
    heart: { pity: 0, justice: 0, visible: true },
    highlightWords: [],
    fullTextUnlocked: true,
    next: { cantoId: 'inf04', label: 'CANTO IV' },
  };

  it('lists choices, words (latest change), pages and the scale', () => {
    const rows = colophonWordRows(spec.words);
    expect(rows.map((r) => `${r.word}:${r.change}`)).toEqual(['Stay:gained', 'Fear:shed']);
    const blocks = colophonBlocks(spec);
    expect(blocks[0]).toEqual({ kind: 'heading', text: 'In this canto' });
    expect(blocks.some((b) => b.kind === 'choice' && b.heading === 'As Dante did')).toBe(true);
    expect(blocks.some((b) => b.kind === 'scale')).toBe(true);
    expect(blocks.some((b) => b.kind === 'line' && /kept/.test(b.text))).toBe(true);
    // Never a number for the heart.
    expect(JSON.stringify(blocks.filter((b) => b.kind === 'line'))).not.toMatch(/\d/);
  });

  it('paginates measured blocks and keeps a subheading with what follows', () => {
    expect(paginate([10, 10, 10], 25)).toEqual([[0, 1], [2]]);
    expect(paginate([50, 10], 25)).toEqual([[0], [1]]);
    expect(paginate([10, 10, 10], 25, ['line', 'subheading', 'line'])).toEqual([[0], [1, 2]]);
    expect(paginate([], 100)).toEqual([[]]);
  });

  it('summarises the chapter in words, never numbers', () => {
    const { summary, comedy } = chapterBlocks({
      chapter: { id: 'ch1', title: 'Chapter One', subtitle: 'Inferno, Cantos I–V', cantos: ['inf01'] },
      flags: ['ch1.heart_even'],
      heart: { pity: 2, justice: 1 },
      trust: 7,
      trustLabel: 'Faithful',
      virtues: { prudence: 2, justice: 0, fortitude: 5, temperance: 1 },
      words: ['Way', 'Love'],
      memories: [],
      verses: [{ canto: 'inf02', order: 1, verse: { tercets: [['Way', 'Love', 'Away']], coda: null } }],
      cantos: [{ id: 'inf01', title: 'The Dark Wood', choices: [] }],
    });
    expect(summary.some((b) => b.kind === 'line' && b.text === trustPhrase('Faithful'))).toBe(true);
    expect(comedy.some((b) => b.kind === 'cento' && b.lines.length === 3)).toBe(true);
    expect(heartPhrase(0, 0)).toMatch(/empty/);
    expect(heartPhrase(5, 0)).toMatch(/pity/);
    expect(heartPhrase(0, 5)).toMatch(/justice/);
    expect(starLevel(0)).toBe(0);
    expect(starLevel(5)).toBe(2);
  });
});

describe('Copy', () => {
  it('has a message for every unlock and tutorial', () => {
    for (const f of ['book', 'words', 'verse', 'compose', 'heart', 'codex', 'remembrance', 'chain'] as const) {
      expect(unlockCopy(f).title.length).toBeGreaterThan(0);
    }
    expect(tutorialCopy('move').keys).toEqual(['W', 'A', 'S', 'D']);
    expect(tutorialCopy('verse', 'gamepad').keys).toEqual(['X']);
  });
});
