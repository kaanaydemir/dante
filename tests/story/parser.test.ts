import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/test-canto.md?raw';
import { collectQuotes, listStatements } from '../../src/story/ast';
import { parseCanto, parseScriptBlock, splitLines } from '../../src/story/parser';
import type { Beat, CantoScript, ChoiceStmt, IfStmt, QuoteStmt, Statement } from '../../src/story/types';
import { FRONT_FIXTURE, beatLines, codes, docWithBeat, errors, parse, show } from './helpers';

const FILE = '/tests/fixtures/test-canto.md';
const result = parseCanto(fixture, FILE);
const canto = result.canto as CantoScript;

function beat(id: string): Beat {
  const b = canto.scenes.flatMap((s) => s.beats).find((x) => x.id === id);
  if (!b) throw new Error(`no beat ${id}`);
  return b;
}

function types(lines: readonly Statement[]): string[] {
  return lines.map((s) => s.type);
}

function choice(id: string): ChoiceStmt {
  const c = listStatements(canto)
    .map((x) => x.stmt)
    .find((s): s is ChoiceStmt => s.type === 'choice' && s.id === id);
  if (!c) throw new Error(`no choice ${id}`);
  return c;
}

describe('parseCanto: the engine fixture', () => {
  it('parses without a single diagnostic', () => {
    expect(result.canto).not.toBeNull();
    expect(show(result.diagnostics)).toBe('');
  });

  it('reads the front matter and the derived values', () => {
    expect(canto.id).toBe('inf99');
    expect(canto.file).toBe(FILE);
    expect(canto.heading).toBe('Inferno XCIX — The Test Wood');
    expect(canto).toMatchObject({ canticle: 'Inferno', cantoNumber: 99, roman: 'XCIX', lineRange: { first: 1, last: 136 } });
    expect(canto.epigraph?.text).toBe('Inferno I, 1–3');
    expect(canto.closing?.text).toBe('Inferno I, 136');
    expect(canto.front).toMatchObject({
      id: 'inf99',
      canticle: 'Inferno',
      canto: 99,
      title: 'The Test Wood',
      title_tr: 'Deneme Ormanı',
      location: 'The Test Wood',
      source: 'docs/source/inferno/canto-01.txt',
      lines: '1–136',
      characters: ['DANTE', 'VIRGIL', 'PANTHER', 'SHADE'],
      choices: ['inf99.c1', 'inf99.c2', 'inf99.c3', 'inf99.c4'],
      words: ['Fear', 'Way', 'Hope', 'Love'],
      memories: ['inf99.virgil_mantua'],
      flags_read: ['inf01.motive_gate'],
      playtime: '4–6',
      writer: 'Architect (engine fixture)',
      status: 'draft',
      version: '0.1',
    });
  });

  it('reads scenes and beats in file order', () => {
    expect(canto.scenes.map((s) => [s.id, s.number, s.index, s.beats.length])).toEqual([
      ['inf99.s0', 0, 0, 1],
      ['inf99.s1', 1, 1, 4],
      ['inf99.s2', 2, 2, 2],
      ['inf99.s3', 3, 3, 4],
      ['inf99.s4', 4, 4, 3],
      ['inf99.s5', 5, 5, 1],
    ]);
    expect(canto.scenes[1]?.title).toBe('The Forest Dark');
    expect(canto.scenes[1]?.pos).toEqual({ line: 50, file: FILE });
    const b = beat('inf99.s1.b1');
    expect(b).toMatchObject({
      sceneId: 'inf99.s1',
      cantoId: 'inf99',
      title: 'Into the wood',
      index: 0,
      mode: 'play',
      place: 'inf99_wood',
      trigger: { kind: 'auto' },
      music: 'alçak, tek notalı bir drone; çok seyrek',
      ambience: 'rüzgârsız orman, uzakta kırılan dallar',
      chapterEnd: null,
      hasScript: true,
      pos: { line: 54, file: FILE },
    });
  });

  it('reads every trigger kind and directive', () => {
    expect(beat('inf99.s1.b2').trigger).toEqual({ kind: 'enter', place: 'inf99_clearing' });
    expect(beat('inf99.s1.b3').trigger).toEqual({ kind: 'event', id: 'inf99.looked_back' });
    expect(beat('inf99.s3.b1').trigger).toEqual({ kind: 'talk', speaker: 'VIRGIL' });
    expect(beat('inf99.s3.b2').trigger).toEqual({ kind: 'auto' });
    expect(beat('inf99.s4.b2').trigger).toEqual({ kind: 'after', beat: 'inf99.s4.b1' });
    expect(beat('inf99.s0.b1').mode).toBe('page');
    expect(beat('inf99.s4.b1').mode).toBe('cinematic');
    expect(beat('inf99.s5.b1')).toMatchObject({ mode: 'colophon', chapterEnd: 'ch1' });
    const mid = beat('inf99.s2.b2').lines[1];
    expect(mid).toEqual({ type: 'directive', key: 'ambience', value: 'kuş sesleri çoğalır', pos: { line: 149 } });
  });

  it('reads the one-line statements', () => {
    const lines = beat('inf99.s1.b1').lines;
    expect(types(lines)).toEqual(['cam', 'narration', 'do', 'hint', 'quote', 'effects', 'sfx']);
    expect(lines[0]).toEqual({ type: 'cam', verb: 'unengrave', text: 'epigraf sayfasındaki ağaçlar oynanabilir ormana dönüşür', pos: { line: 62 } });
    expect(lines[1]).toMatchObject({ type: 'narration', text: 'Dante could not say how he had come into the wood. The path behind him was gone.' });
    expect(lines[2]).toEqual({
      type: 'do',
      text: 'Oyuncu doğuya yürür; ağaçlar sıklaştıkça görüş daralır.',
      tags: [{ kind: 'tutorial', name: 'move' }],
      pos: { line: 64 },
    });
    expect(lines[3]).toEqual({
      type: 'hint',
      text: 'Walk east, toward the grey light between the trees.',
      short: 'East, toward the light.',
      pos: { line: 65 },
    });
    expect(lines[5]).toMatchObject({ type: 'effects', raw: 'word:Fear', effects: [{ type: 'word', word: 'Fear' }], invalid: [] });
    expect(lines[6]).toMatchObject({ type: 'sfx', text: "kuru yaprak hışırtısı, Dante'nin hızlanan nefesi" });
    expect(beat('inf99.s1.b2').lines[2]).toEqual({ type: 'bark', speaker: 'SHADE', text: '—cold here—', pos: { line: 86 } });
    expect(beat('inf99.s4.b1').lines[0]).toEqual({ type: 'cam', verb: 'fade-in', text: '', pos: { line: 297 } });
    expect(beat('inf99.s4.b1').lines[2]).toMatchObject({ type: 'page' });
    expect(beat('inf99.s1.b3').lines[0]).toMatchObject({ type: 'note', kind: 'EKLEME' });
    const doTags = beat('inf99.s2.b1').lines.find((s) => s.type === 'do');
    expect(doTags).toMatchObject({
      tags: [
        { kind: 'event', id: 'inf99.waited_dawn' },
        { kind: 'event', id: 'inf99.panther_gone' },
      ],
    });
    expect(beat('inf99.s1.b4').lines.find((s) => s.type === 'do')).toMatchObject({ tags: [{ kind: 'checkpoint' }] });
  });

  it('reads dialogue lines with and without tags', () => {
    const say = listStatements(canto)
      .map((x) => x.stmt)
      .filter((s) => s.type === 'say');
    expect(say[0]).toEqual({ type: 'say', speaker: 'VIRGIL', tag: 'gentle', text: 'You looked back at the dark pass. Everyone does, once.', pos: { line: 196 } });
    expect(say.find((s) => s.pos.line === 203)).toMatchObject({ speaker: 'VIRGIL', tag: null, text: 'Come away from that slope.' });
  });

  it('reads quotes: voice, citation, cuts, skips, line numbers and glosses', () => {
    const quotes = beat('inf99.s3.b1').lines.filter((s): s is QuoteStmt => s.type === 'quote');
    expect(quotes.map((q) => [q.voice, q.citationRaw])).toEqual([
      ['POET', 'Inferno I, 61–63'],
      ['DANTE', 'Inferno I, 65–66'],
      ['VIRGIL', 'Inferno I, 67–69'],
    ]);
    expect(quotes[1]?.lines[0]).toEqual({ kind: 'verse', text: '"Have pity on me,"…', lineNo: 65, cutStart: false, cutEnd: true, pos: { line: 186 } });
    expect(quotes[2]?.lines[0]).toMatchObject({ text: '…"Not man; man once I was,', cutStart: true, cutEnd: false, lineNo: 67 });
    expect(quotes[2]?.gloss).toBe('Lombardy and Mantua are in the north of Italy. The shade was born there, long ago.');
    expect(quotes[0]?.citation).toEqual({ canticle: 'Inferno', canto: 1, roman: 'I', first: 61, last: 63, text: 'Inferno I, 61–63' });
    const skip = beat('inf99.s3.b4').lines[0] as QuoteStmt;
    expect(skip.lines.map((l) => (l.kind === 'verse' ? l.lineNo : 'skip'))).toEqual([82, 83, 84, 'skip', 87]);
    expect(skip.lines[3]).toEqual({ kind: 'skip', pos: { line: 263 } });
    expect(collectQuotes(canto)).toHaveLength(21);
  });

  it('builds IF trees two levels deep', () => {
    const iff = beat('inf99.s3.b1').lines.find((s): s is IfStmt => s.type === 'if') as IfStmt;
    expect(iff.branches.map((b) => b.raw)).toEqual(['seen:inf99.s1.b3', 'word:Hope and not sealed:Hope']);
    expect(iff.branches[0]?.condition).toEqual({ type: 'seen', id: 'inf99.s1.b3' });
    const inner = iff.branches[0]?.body[0] as IfStmt;
    expect(inner.type).toBe('if');
    expect(inner.branches[0]?.condition).toEqual({ type: 'compare', variable: { kind: 'trust' }, op: '>=', value: 5 });
    expect(types(inner.branches[0]?.body ?? [])).toEqual(['say']);
    expect(types(inner.elseBody ?? [])).toEqual(['say']);
    expect(iff.branches[1]?.condition).toEqual({
      type: 'and',
      terms: [
        { type: 'word', word: 'Hope' },
        { type: 'not', term: { type: 'sealed', word: 'Hope' } },
      ],
    });
    expect(types(iff.elseBody ?? [])).toEqual(['say']);
    expect(types(beat('inf99.s3.b1').lines)).toEqual(['cam', 'cam', 'quote', 'quote', 'quote', 'effects', 'if', 'say']);
  });

  it('reads a systemic choice', () => {
    const c = choice('inf99.c1');
    expect(c).toMatchObject({ weight: 'minor', systemic: true, title: 'The panther', prompt: null, beatId: 'inf99.s2.b2' });
    expect(c.options.map((o) => [o.letter, o.text, o.whenRaw])).toEqual([
      ['a', 'Waited for the dawn', 'event:inf99.waited_dawn'],
      ['b', 'Slipped past her', 'else'],
    ]);
    expect(c.options[0]?.when).toEqual({ type: 'event', id: 'inf99.waited_dawn' });
    expect(c.options[1]?.when).toBe('else');
    expect(c.options[0]?.effects).toEqual([{ type: 'virtue', virtue: 'temperance', amount: 1 }]);
    expect(c.reveal).toMatchObject({ canon: ['a'], timing: 'immediate', note: 'Dante waited. The morning came, and with it a little hope.' });
  });

  it('reads a dialogue choice with spoken options, requires:, GOTO and a REVEAL', () => {
    const c = choice('inf99.c2');
    expect(c).toMatchObject({ weight: 'major', systemic: false, title: 'Why Dante goes', prompt: 'Virgil waited for an answer. What did Dante want from the road?' });
    expect(c.options.map((o) => [o.letter, o.text, o.spoken, o.speech])).toEqual([
      ['a', '"Lead me out of this wood."', true, 'Lead me out of this wood.'],
      ['b', '"Take me to the gate you spoke of."', true, 'Take me to the gate you spoke of.'],
      ['c', '"Show me the lost."', true, 'Show me the lost.'],
    ]);
    expect(types(c.options[0]?.body ?? [])).toEqual(['effects', 'goto']);
    expect(c.options[0]?.body[1]).toEqual({ type: 'goto', target: 'inf99.s3.b4', pos: { line: 222 } });
    expect(c.options[2]?.requiresRaw).toBe('word:Hope or (codex:inf99.panther and not flag:inf99.motive_gate)');
    expect(c.options[2]?.requires).toMatchObject({ type: 'or' });
    expect(c.options.every((o) => o.when === null)).toBe(true);
    expect(c.reveal?.canon).toBe('all');
    expect(c.reveal?.quotes[0]?.lines).toHaveLength(6);
    // Lines after END CHOICE belong to the beat.
    expect(types(beat('inf99.s3.b2').lines)).toEqual(['quote', 'say', 'choice', 'narration']);
  });

  it('reads deferred reveals and the IF after END CHOICE', () => {
    expect(choice('inf99.c3').reveal).toMatchObject({ canon: 'none', timing: 'deferred' });
    expect(choice('inf99.c3').options[0]?.body.map((s) => s.type)).toEqual(['do', 'say', 'effects']);
    const c4 = choice('inf99.c4');
    expect(c4.reveal).toMatchObject({ canon: ['a', 'b'], timing: 'deferred' });
    expect(c4.options[0]?.requires).toEqual({ type: 'word', word: 'Fear' });
    expect(c4.options[1]?.effects).toEqual([]);
    expect(types(beat('inf99.s4.b3').lines)).toEqual(['choice', 'if', 'cam', 'cam', 'cam']);
  });

  it('reads Codex and memory entries', () => {
    expect(canto.codex.map((e) => [e.id, e.tab, e.title, e.related])).toEqual([
      ['inf99.dark_wood', 'places', 'The Test Wood', ['inf99.panther', 'inf99.virgil']],
      ['inf99.panther', 'souls', 'The Panther', ['inf99.dark_wood']],
      ['inf99.virgil', 'souls', 'Virgil', ['inf99.dark_wood']],
    ]);
    expect(canto.codex[1]?.quote?.citationRaw).toBe('Inferno I, 32–33');
    expect(canto.codex[0]?.note).toMatch(/^A fixture entry\./);
    expect(canto.codex[0]?.pos).toEqual({ line: 362, file: FILE });
    expect(canto.memories).toEqual([
      expect.objectContaining({ id: 'inf99.virgil_mantua', cantoId: 'inf99', name: 'Virgil of Mantua', kind: 'kept' }),
    ]);
  });

  it('ignores prose and other fences (text, cento)', () => {
    const all = listStatements(canto).map((x) => x.stmt);
    expect(all.some((s) => s.type === 'narration' && s.text.includes('text fence'))).toBe(false);
    expect(all.some((s) => s.type === 'choice' && s.id === 'inf99.c9')).toBe(false);
    expect(all.some((s) => s.type === 'unknown')).toBe(false);
  });

  it('produces plain JSON data', () => {
    expect(JSON.parse(JSON.stringify(canto))).toEqual(canto);
  });
});

describe('parseCanto: recovery from mistakes', () => {
  it('turns unknown lines into UnknownStmt with an L04 error', () => {
    const { lines, diagnostics } = beatLines(docWithBeat('VIRGIL: Come.\nThis is prose by mistake.\nnarration: lower case\nVirgil: hello'));
    expect(types(lines)).toEqual(['say', 'unknown', 'unknown', 'unknown']);
    expect(codes(diagnostics, 'error')).toEqual(['L04', 'L04', 'L04']);
    expect(diagnostics.find((d) => d.message.includes('NARRATION'))).toBeTruthy();
  });

  it('closes an IF without END IF and reports L21', () => {
    const { lines, diagnostics } = beatLines(docWithBeat('IF trust>=7\nVIRGIL: Yes.\nELSE\nVIRGIL: No.'));
    expect(types(lines)).toEqual(['if']);
    expect((lines[0] as IfStmt).elseBody).toHaveLength(1);
    expect(codes(diagnostics, 'error')).toEqual(['L21']);
  });

  it('reports stray ELSE / END IF / OPTION / END CHOICE (L21)', () => {
    const { lines, diagnostics } = beatLines(docWithBeat('END IF\nELSE\nOPTION a [Go.]\nEND CHOICE\nVIRGIL: Fine.'));
    expect(types(lines)).toEqual(['unknown', 'unknown', 'unknown', 'unknown', 'say']);
    expect(codes(diagnostics, 'error')).toEqual(['L21', 'L21', 'L21', 'L21']);
  });

  it('closes a CHOICE that runs into the next CHOICE', () => {
    const body = 'CHOICE inf99.c1 minor "One"\nOPTION a [A.]\nOPTION b [B.]\nCHOICE inf99.c2 minor "Two"\nOPTION a [C.]\nOPTION b [D.]\nEND CHOICE';
    const { lines, diagnostics } = beatLines(docWithBeat(body));
    expect(lines.map((s) => (s.type === 'choice' ? s.id : s.type))).toEqual(['inf99.c1', 'inf99.c2']);
    expect(codes(diagnostics, 'error')).toEqual(['L21']);
  });

  it('closes a CHOICE after its REVEAL when END CHOICE is missing', () => {
    const body =
      'CHOICE inf99.c1 minor "One"\nOPTION a [A.]\nOPTION b [B.]\nREVEAL canon=a timing=immediate\nQUOTE POET (Inferno I, 136)\n> Then he moved on, and I behind him followed.\nNOTE: He went.\nNARRATION: Everyone sees this.';
    const { lines, diagnostics } = beatLines(docWithBeat(body));
    expect(types(lines)).toEqual(['choice', 'narration']);
    expect((lines[0] as ChoiceStmt).reveal?.note).toBe('He went.');
    expect(codes(diagnostics, 'error')).toEqual(['L21']);
  });

  it('closes an IF inside an option at the next OPTION', () => {
    const body = 'CHOICE inf99.c1 minor "One"\nOPTION a [A.]\nIF trust>=5\nVIRGIL: Good.\nOPTION b [B.]\nVIRGIL: Fine.\nREVEAL canon=all timing=immediate\nQUOTE POET (Inferno I, 136)\n> Then he moved on, and I behind him followed.\nNOTE: He went.\nEND CHOICE';
    const { lines, diagnostics } = beatLines(docWithBeat(body));
    const c = lines[0] as ChoiceStmt;
    expect(c.options.map((o) => types(o.body))).toEqual([['if'], ['say']]);
    expect(codes(diagnostics, 'error')).toEqual(['L21']);
  });

  it('drops lines between CHOICE and the first OPTION, and options with bad letters', () => {
    const body = 'CHOICE inf99.c1 minor "One"\nNARRATION: Misplaced.\nOPTION a [A.]\nOPTION d [D.]\nOPTION b [B.]\nEND CHOICE';
    const { lines, diagnostics } = beatLines(docWithBeat(body));
    expect((lines[0] as ChoiceStmt).options.map((o) => o.letter)).toEqual(['a', 'b']);
    expect(codes(diagnostics, 'error')).toEqual(['L04', 'L15']);
  });

  it('repairs CHOICE / OPTION / REVEAL headers', () => {
    const body =
      'CHOICE inf99.c1 "No weight"\nOPTION a Grieve with him. requires: trust>=1\nOPTION b [Fine.] when: else\nREVEAL canon=x timing=later\nQUOTE POET (Inferno I, 136)\n> Then he moved on, and I behind him followed.\nNOTE: He went.\nEND CHOICE';
    const { lines, diagnostics } = beatLines(docWithBeat(body));
    const c = lines[0] as ChoiceStmt;
    expect(c.weight).toBe('minor');
    expect(c.options[0]).toMatchObject({ text: 'Grieve with him.', requiresRaw: 'trust>=1' });
    expect(c.options[1]?.when).toBe('else');
    expect(c.reveal).toMatchObject({ canon: 'none', timing: 'immediate' });
    expect(codes(diagnostics, 'error')).toEqual(['P70', 'P71', 'P72', 'P72']);
  });

  it('reports a missing @mode, a late @mode and extra script blocks (L03)', () => {
    const missing = parse(docWithBeat('VIRGIL: Come.', { mode: null }));
    expect(missing.canto.scenes[1]?.beats[0]?.mode).toBe('cinematic');
    expect(codes(missing.diagnostics, 'error')).toEqual(['L03']);
    const late = parse(docWithBeat('@place: inf99_wood\n@mode: play\nVIRGIL: Come.', { mode: null }));
    expect(late.canto.scenes[1]?.beats[0]).toMatchObject({ mode: 'play', place: 'inf99_wood' });
    expect(codes(late.diagnostics, 'error')).toEqual(['L03']);
    const after = parse(docWithBeat('VIRGIL: Come.\n@mode: play', { mode: null }));
    expect(after.canto.scenes[1]?.beats[0]?.mode).toBe('play');
    expect(after.canto.scenes[1]?.beats[0]?.lines.map((s) => s.type)).toEqual(['say']);
    const twice = parse(docWithBeat('VIRGIL: One.', { extra: '\n```script\nVIRGIL: Two.\n```\n' }));
    expect(twice.canto.scenes[1]?.beats[0]?.lines.map((s) => s.type)).toEqual(['say', 'say']);
    expect(codes(twice.diagnostics, 'error')).toEqual(['L03']);
  });

  it('keeps reading quotes across a stray blank line, and reports malformed quotes', () => {
    const { lines, diagnostics } = beatLines(
      docWithBeat('QUOTE POET (Inferno I, 1–2)\n> Midway upon the journey of our life\n\n> I found myself within a forest dark,\nQUOTE POET\n> x\nQUOTE POET (Inferno I, 1)\nNARRATION: After.\n> orphan'),
    );
    expect(types(lines)).toEqual(['quote', 'quote', 'narration', 'unknown']);
    const first = lines[0] as QuoteStmt;
    expect(first.lines.map((l) => (l.kind === 'verse' ? l.lineNo : null))).toEqual([1, 2]);
    expect((lines[1] as QuoteStmt).citation).toBeNull();
    expect(codes(diagnostics)).toEqual(['P60', 'P60', 'P60', 'L04']);
  });

  it('handles HINT-SHORT, GLOSS and speaker-line variants', () => {
    const { lines, diagnostics } = beatLines(docWithBeat('HINT-SHORT: Alone.\nGLOSS: Stray.\nVIRGIL(gentle): Close.\nVIRGIL (sorrowful): Odd tag.\nDANTE (Afraid): Upper.'));
    expect(lines.map((s) => s.type)).toEqual(['hint', 'unknown', 'say', 'say', 'say']);
    expect(lines[2]).toMatchObject({ speaker: 'VIRGIL', tag: 'gentle', text: 'Close.' });
    expect(lines[3]).toMatchObject({ tag: null });
    expect(lines[4]).toMatchObject({ tag: 'afraid' });
    expect(codes(diagnostics)).toEqual(['P61', 'P61', 'P51', 'L04', 'P51']);
  });

  it('normalises CAM separators, DO tags and triggers with warnings', () => {
    const { canto: c, diagnostics } = parse(docWithBeat('CAM: pan - over the hill\nCAM: blur — no\nDO: Walk {event: inf99.walked} {mystery} {tutorial:juggle}.', { mode: 'play\n@trigger: enter: inf99_wood' }));
    const b = c.scenes[1]?.beats[0] as Beat;
    expect(b.trigger).toEqual({ kind: 'enter', place: 'inf99_wood' });
    expect(b.lines[0]).toMatchObject({ type: 'cam', verb: 'pan', text: 'over the hill' });
    expect(b.lines[1]?.type).toBe('unknown');
    expect(b.lines[2]).toMatchObject({
      type: 'do',
      text: 'Walk.',
      tags: [{ kind: 'event', id: 'inf99.walked' }, { kind: 'unknown', raw: 'mystery' }, { kind: 'unknown', raw: 'tutorial:juggle' }],
    });
    expect(codes(diagnostics, 'error')).toEqual(['L04']);
    expect(codes(diagnostics, 'warning').sort()).toEqual(['P50', 'P52', 'P53', 'P53', 'P53']);
    const bogus = parse(docWithBeat('VIRGIL: Hi.', { mode: 'play\n@trigger: whenever' }));
    expect(bogus.canto.scenes[1]?.beats[0]?.trigger).toEqual({ kind: 'auto' });
    expect(codes(bogus.diagnostics, 'error')).toEqual(['P50']);
  });

  it('normalises the case of voices, verbs, letters and REVEAL spacing with warnings', () => {
    const body = `QUOTE poet (Inferno I, 136)\n> Then he moved on, and I behind him followed.\nCAM: Fade-in\nCHOICE inf99.c1 major "X"\nOPTION A [First.]\nOPTION b) [Second.]\nREVEAL canon = a, b timing = deferred\nQUOTE POET (Inferno I, 136)\n> Then he moved on, and I behind him followed.\nNOTE: He went.\nEND CHOICE`;
    const { lines, diagnostics } = beatLines(docWithBeat(body));
    expect(lines[0]).toMatchObject({ type: 'quote', voice: 'POET' });
    expect(lines[1]).toMatchObject({ type: 'cam', verb: 'fade-in' });
    const c = lines[2] as ChoiceStmt;
    expect(c.options.map((o) => o.letter)).toEqual(['a', 'b']);
    expect(c.reveal).toMatchObject({ canon: ['a', 'b'], timing: 'deferred' });
    expect(errors(diagnostics)).toEqual([]);
    expect(codes(diagnostics, 'warning').sort()).toEqual(['P52', 'P60', 'P71', 'P71']);
  });

  it('keeps malformed conditions and effects from doing anything', () => {
    const { lines, diagnostics } = beatLines(docWithBeat('IF trust >> 3\nVIRGIL: Never.\nEND IF\nEFFECTS: trust+1, love, pity-2@lust'));
    expect((lines[0] as IfStmt).branches[0]?.condition).toEqual({ type: 'const', value: false });
    expect(lines[1]).toMatchObject({ type: 'effects', effects: [{ type: 'trust', delta: 1 }], invalid: ['love', 'pity-2@lust'] });
    expect(errors(diagnostics).map((d) => d.code)).toEqual(['P12', 'P20', 'P20']);
  });

  it('reports structural problems of the document', () => {
    const text = `${FRONT_FIXTURE}
# Title

### [inf99.s1.b1] Orphan beat

\`\`\`script
@mode: play
\`\`\`

## [inf99.s1] Scene

\`\`\`script
@mode: play
VIRGIL: Lost block.
\`\`\`

### [inf99.s1.b1] Beat

\`\`\`script
@mode: play
VIRGIL: Kept.
\`\`\`

### [inf99.s1.b1] Twice

\`\`\`script
@mode: play
\`\`\`

### [inf99.s2.b1] Wrong scene

\`\`\`script
@mode: play
\`\`\`

\`\`\`script
@mode: play
`;
    const { canto: c, diagnostics } = parse(text);
    expect(c.scenes.map((s) => s.beats.map((b) => b.id))).toEqual([['inf99.s1.b1', 'inf99.s1.b1', 'inf99.s2.b1']]);
    // Orphan beat heading (P32) and its block (P41); a block under the scene but outside a beat (P41);
    // a duplicate beat id and a beat under the wrong scene (L02); the unclosed fence (P40) whose
    // block became a second block of the last beat (L03).
    expect(codes(diagnostics, 'error')).toEqual(['P32', 'P41', 'P41', 'L02', 'L02', 'P40', 'L03']);
  });

  it('reads front matter variants: block lists, spread lists, quoting, comments', () => {
    const front = FRONT_FIXTURE.replace('characters: [DANTE, VIRGIL]', 'characters:\n  - DANTE\n  - "VIRGIL"')
      .replace('mechanics: [move]', 'mechanics: [move,\n  dash] # two')
      .replace('canto: 99', "canto: '99'")
      .replace('version: "0.1"', 'version: 0.1');
    const { canto: c, diagnostics } = parse(docWithBeat('VIRGIL: Hi.', { front }));
    expect(c.front.characters).toEqual(['DANTE', 'VIRGIL']);
    expect(c.front.mechanics).toEqual(['move', 'dash']);
    expect(c.front.canto).toBe(99);
    expect(c.front.version).toBe('0.1');
    expect(errors(diagnostics)).toEqual([]);
    expect(codes(diagnostics, 'warning')).toEqual(['L01']);
  });

  it('reports missing, unknown, duplicate and mistyped front-matter fields (L01)', () => {
    const front = FRONT_FIXTURE.replace('writer: "test"\n', '')
      .replace('status: draft', 'status: final\nmood: grim')
      .replace('title_tr: "Deneme"', 'title_tr: "Deneme"\ntitle_tr: "Again"')
      .replace('choices: []', 'choices: inf99.c1');
    const { canto: c, diagnostics } = parse(docWithBeat('VIRGIL: Hi.', { front }));
    expect(c.front).toMatchObject({ writer: '', status: 'draft', title_tr: 'Deneme', choices: ['inf99.c1'] });
    const l01 = diagnostics.filter((d) => d.code === 'L01');
    expect(l01.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([
      expect.stringContaining('"writer" is missing'),
      expect.stringContaining('"title_tr" appears twice'),
      expect.stringContaining('"status" must be one of'),
    ]);
    expect(l01.filter((d) => d.severity === 'warning').map((d) => d.message)).toEqual([
      expect.stringContaining('"choices" should be a list'),
      expect.stringContaining('Unknown front matter field "mood"'),
    ]);
  });

  it('survives a missing or unclosed front matter', () => {
    const none = parseCanto('# Inferno III — The Gate\n\n## [inf03.s1] The Gate\n\n### [inf03.s1.b1] Gate\n\n```script\n@mode: page\nNARRATION: Here.\n```\n', '/docs/script/inferno-03.md');
    expect(none.canto?.id).toBe('inf03');
    expect(none.canto?.canticle).toBe('Inferno');
    expect(none.canto?.cantoNumber).toBe(3);
    expect(codes(none.diagnostics)).toContain('P01');
    const open = parseCanto('---\nid: inf03\n# Inferno III\n\n## [inf03.s1] A\n\n### [inf03.s1.b1] B\n\n```script\n@mode: page\n```\n', '/x.md');
    expect(open.canto?.scenes[0]?.beats).toHaveLength(1);
    expect(codes(open.diagnostics)).toContain('P02');
  });

  it('accepts CRLF line endings, a BOM and HTML comments', () => {
    const text = `﻿${docWithBeat('VIRGIL: Hi.\n// note')}\n<!--\n## [inf99.s7] Hidden\n-->\n`.replace(/\n/g, '\r\n');
    const { canto: c, diagnostics } = parse(text);
    expect(errors(diagnostics)).toEqual([]);
    expect(c.scenes.map((s) => s.id)).toEqual(['inf99.s0', 'inf99.s1', 'inf99.s9']);
    const line = text.split('\r\n').indexOf('VIRGIL: Hi.') + 1;
    expect(c.scenes[1]?.beats[0]?.lines).toEqual([{ type: 'say', speaker: 'VIRGIL', tag: null, text: 'Hi.', pos: { line } }]);
    expect(splitLines('a\r\nb\rc\nd').map((l) => l.text)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns null only when nothing is usable, and never throws', () => {
    expect(parseCanto('', '/x.md')).toMatchObject({ canto: null });
    expect(parseCanto('just some prose\nand more', '/x.md').canto).toBeNull();
    const samples = [
      '---',
      '```script',
      '## [',
      '### [inf01.s1.b1]',
      '---\n---\n',
      '\u0000\u0001',
      'CHOICE\nOPTION\nREVEAL\nEND CHOICE',
      '> …\n> …',
      fixture.slice(0, 3000),
      fixture.replace(/END /g, ''),
      fixture.replace(/```/g, '~~~'),
      fixture.split('\n').reverse().join('\n'),
    ];
    let seed = 7;
    const rand = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const pieces = fixture.split('\n');
    for (let k = 0; k < 40; k++) {
      const lines: string[] = [];
      for (let i = 0; i < 80; i++) lines.push(pieces[Math.floor(rand() * pieces.length)] ?? '');
      samples.push(lines.join('\n'));
    }
    for (const s of samples) expect(() => parseCanto(s, '/fuzz.md')).not.toThrow();
  });
});

describe('parseScriptBlock', () => {
  it('reads a lone block with its directives', () => {
    const r = parseScriptBlock('@mode: dialogue\n@place: inf03_gate\nVIRGIL (gentle): Come.', { firstLine: 10 });
    expect(r).toMatchObject({ mode: 'dialogue', place: 'inf03_gate', trigger: null });
    expect(r.statements).toEqual([{ type: 'say', speaker: 'VIRGIL', tag: 'gentle', text: 'Come.', pos: { line: 12 } }]);
    expect(r.diagnostics).toEqual([]);
  });

  it('reads snippets without directives', () => {
    const r = parseScriptBlock('IF flag:inf01.motive_gate\nDANTE: Yes.\nEND IF', { directives: false });
    expect(r.statements.map((s) => s.type)).toEqual(['if']);
    expect(r.diagnostics).toEqual([]);
  });
});
