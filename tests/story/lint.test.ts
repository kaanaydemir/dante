import { describe, expect, it } from 'vitest';
import fixture from '../fixtures/test-canto.md?raw';
import { toRoman } from '../../src/story/cite';
import { lintCanto, LINT_RULES, type StoryLintContext } from '../../src/story/lint';
import { parseCanto } from '../../src/story/parser';
import { CHAPTER1_REGISTRY } from '../../src/story/registry';
import type { CantoScript, Diagnostic } from '../../src/story/types';
import { docWithBeat, fixtureLint, inferno, parse, show, source } from './helpers';

const lintText = (text: string, ctx: StoryLintContext = fixtureLint): Diagnostic[] => lintCanto(parse(text).canto, ctx);

function has(ds: readonly Diagnostic[], code: string, severity: Diagnostic['severity'] = 'error', re?: RegExp): boolean {
  return ds.some((d) => d.code === code && d.severity === severity && (!re || re.test(d.message)));
}

const expectRule = (body: string, code: string, severity: Diagnostic['severity'] = 'error', re?: RegExp, opts: Parameters<typeof docWithBeat>[1] = {}): void => {
  const ds = lintText(docWithBeat(body, opts));
  expect(has(ds, code, severity, re), `${code}/${severity} ${re ?? ''} not in:\n${show(ds)}`).toBe(true);
};

const pad = (n: number): string => String(n).padStart(2, '0');

/** A complete real-canto document (canto profile) with `body` in scene s<scene>, beat b1. */
function cantoText(o: { id: string; body: string; scene?: number; front?: Record<string, string>; mode?: string }): string {
  const n = Number(o.id.slice(3));
  const src = inferno(n);
  const roman = toRoman(n);
  const last = src.count;
  const front: Record<string, string> = {
    id: o.id,
    canticle: 'Inferno',
    canto: String(n),
    title: '"T"',
    title_tr: '"T"',
    location: '"L"',
    source: `docs/source/inferno/canto-${pad(n)}.txt`,
    lines: `"1–${last}"`,
    epigraph: `"Inferno ${roman}, 1–3"`,
    closing: `"Inferno ${roman}, ${last}"`,
    characters: '[DANTE, VIRGIL]',
    mechanics: '[talk]',
    choices: '[]',
    words: '[]',
    memories: '[]',
    codex: '[]',
    flags_set: '[]',
    flags_read: '[]',
    unlocks: '[]',
    playtime: '"1–2"',
    writer: '"t"',
    status: 'draft',
    version: '"0.1"',
    ...o.front,
  };
  const s = o.scene ?? 1;
  return `---
${Object.entries(front)
  .map(([k, v]) => `${k}: ${v}`)
  .join('\n')}
---

# Inferno ${roman} — T

## [${o.id}.s0] Opening page

### [${o.id}.s0.b1] Epigraph

\`\`\`script
@mode: page
QUOTE POET (Inferno ${roman}, 1–3)
> ${src.lines[0]}
> ${src.lines[1]}
> ${src.lines[2]}
\`\`\`

## [${o.id}.s${s}] Scene

### [${o.id}.s${s}.b1] Beat

\`\`\`script
@mode: ${o.mode ?? 'dialogue'}
${o.body}
\`\`\`

## [${o.id}.s20] Colophon

### [${o.id}.s20.b1] End

\`\`\`script
@mode: colophon
QUOTE POET (Inferno ${roman}, ${last})
> ${src.lines[last - 1]}
\`\`\`
`;
}

const cantoCtx = (extra: Partial<StoryLintContext> = {}): StoryLintContext => ({ profile: 'canto', source, registry: null, ...extra });

const REVEAL = 'REVEAL canon=a timing=immediate\nQUOTE POET (Inferno I, 136)\n> Then he moved on, and I behind him followed.\nNOTE: He went.';

describe('lintCanto on the engine fixture', () => {
  it('finds nothing but one preference note (fixture profile)', () => {
    const r = parseCanto(fixture, '/tests/fixtures/test-canto.md');
    const ds = lintCanto(r.canto as CantoScript, fixtureLint);
    expect(show(ds.filter((d) => d.severity !== 'info'))).toBe('');
    expect(ds.map((d) => d.code)).toEqual(['L05']);
  });

  it('describes every rule', () => {
    expect(Object.keys(LINT_RULES)).toHaveLength(22);
  });

  it('never throws, even on a damaged AST', () => {
    const r = parseCanto(fixture, '/tests/fixtures/test-canto.md');
    const broken = { ...(r.canto as CantoScript), scenes: [], codex: [], memories: [] } as CantoScript;
    expect(() => lintCanto(broken, fixtureLint)).not.toThrow();
    const weird = { ...(r.canto as CantoScript), scenes: [{ id: 'x', beats: null }] } as unknown as CantoScript;
    expect(() => lintCanto(weird, fixtureLint)).not.toThrow();
    expect(() => lintCanto(r.canto as CantoScript, { profile: 'canto', source: () => null })).not.toThrow();
  });
});

describe('L01–L03: front matter, ids, beats', () => {
  it('L01: epigraph and closing must match the opening page and the colophon', () => {
    const text = docWithBeat('VIRGIL: Hi.').replace('epigraph: "Inferno I, 1–3"', 'epigraph: "Inferno I, 1–2"').replace('closing: "Inferno I, 136"', 'closing: "Inferno I, 135"');
    const ds = lintText(text);
    expect(has(ds, 'L01', 'error', /opening page quotes/)).toBe(true);
    expect(has(ds, 'L01', 'error', /last line/)).toBe(true);
  });

  it('L01: values must be valid (canto profile checks id, source and lines)', () => {
    const ds = lintText(cantoText({ id: 'inf03', body: 'VIRGIL: Hi.', front: { source: 'docs/source/inferno/canto-04.txt', lines: '"1–100"', mechanics: '[talk, flying]' } }), cantoCtx());
    expect(has(ds, 'L01', 'error', /source should be docs\/source\/inferno\/canto-03\.txt/)).toBe(true);
    expect(has(ds, 'L01', 'error', /unknown mechanic "flying"/)).toBe(true);
  });

  it('L02: duplicate scene ids and choice ids without the prefix', () => {
    const extra = '\n## [inf99.s1] Again\n\n### [inf99.s1.b9] Beat\n\n```script\n@mode: play\n```\n';
    expectRule(`CHOICE inf98.c1 major "X"\nOPTION a [A.]\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L02', 'error', /canto prefix/);
    expectRule('VIRGIL: Hi.', 'L02', 'error', /used twice/, { extra });
  });

  it('L03: misplaced directives and colophons', () => {
    expectRule('VIRGIL: Hi.\n@trigger: auto', 'L03', 'error', /only works at the top/);
    expectRule('VIRGIL: Hi.', 'L03', 'error', /colophon belongs only/, { mode: 'colophon' });
  });
});

describe('L05: who may speak how (§4.8)', () => {
  it('rejects modern lines for Longfellow-only and silent characters', () => {
    expectRule('FRANCESCA: Hello there.', 'L05', 'error', /only Longfellow/);
    expectRule('PAOLO: Hello there.', 'L05', 'error', /silent/);
    expectRule('POET: Hello there.', 'L05', 'error', /QUOTE voice/);
    expectRule('NEUTRAL: Hello there.', 'L05', 'error', /BARK/);
    expectRule('GHOST: Boo.', 'L05', 'error', /Unknown speaker/);
  });

  it('counts balloons and Limbo speakers', () => {
    expectRule('HOMER: One.\nHOMER: Two.\nHOMER: Three.', 'L05', 'error', /at most 2/);
    expectRule('ARISTOTLE: One.\nARISTOTLE: Two.', 'L05', 'error', /at most 1 balloon/);
    const nine = ['SOCRATES', 'PLATO', 'AVICENNA', 'AVERROES', 'ELECTRA', 'HECTOR', 'CAESAR', 'CAMILLA', 'LIVY'].map((s) => `${s}: Welcome.`).join('\nDO: x\n');
    expectRule(nine, 'L05', 'error', /at most 8/);
  });

  it('checks BARK rights and QUOTE voices', () => {
    expectRule('BARK CHARON: Away!', 'L05', 'error', /cannot BARK/);
    expectRule('BARK NEUTRAL: —not this way, no—', 'L05', 'warning', /at most 3 words/);
    expectRule('QUOTE HOMER (Inferno I, 1)\n> Midway upon the journey of our life', 'L05', 'error', /cannot be a QUOTE voice/);
    expectRule('VIRGIL: Hi.\nBARK PLATO: Hm.', 'L05', 'warning', /missing from the front matter characters/);
  });

  it('allows SOUL modern lines only in Minos\'s court', () => {
    const outside = lintText(cantoText({ id: 'inf05', scene: 3, body: 'SOUL: I lived for pleasure.' }), cantoCtx());
    expect(has(outside, 'L05', 'error', /Minos/)).toBe(true);
    const inside = lintText(cantoText({ id: 'inf05', scene: 2, body: 'SOUL: I lived for pleasure.' }), cantoCtx());
    expect(has(inside, 'L05', 'error', /Minos/)).toBe(false);
  });
});

describe('L06–L07: quotes', () => {
  it('L06: reports quotes that do not match the source', () => {
    expectRule('QUOTE POET (Inferno I, 1)\n> Midway upon the journey of my life', 'L06', 'error', /does not match/);
    expectRule('QUOTE POET (Inferno I, 1–2)\n> Midway upon the journey of our life', 'L06', 'error', /citation must cover/);
  });

  it('L06: reports missing anchor lines (canto profile with the bible registers)', () => {
    const ds = lintText(cantoText({ id: 'inf03', body: 'VIRGIL: Hi.' }), cantoCtx({ registry: CHAPTER1_REGISTRY }));
    expect(has(ds, 'L06', 'warning', /Anchor lines III 49–51/)).toBe(true);
  });

  it('L07: limits quote lengths', () => {
    const seven = inferno(1).lines.slice(3, 10).map((l) => `> ${l}`).join('\n');
    expectRule(`QUOTE POET (Inferno I, 4–10)\n${seven}`, 'L07', 'error', /at most 6/);
    const six = (a: number): string => `QUOTE POET (Inferno I, ${a}–${a + 5})\n${inferno(1).lines.slice(a - 1, a + 5).map((l) => `> ${l}`).join('\n')}`;
    expectRule(`${six(4)}\nVIRGIL: Listen.\n${six(10)}\n${six(16)}`, 'L07', 'error', /in a row/);
    const ok = lintText(docWithBeat(`${six(4)}\nNARRATION: He listened.\n${six(10)}\n${six(16)}`));
    expect(has(ok, 'L07')).toBe(false);
  });
});

describe('L08–L11: modern text', () => {
  it('L08: archaic words, slang, and the book\'s voice', () => {
    expectRule('VIRGIL: Thou must go on.', 'L08', 'error', /"thou"/);
    expectRule("VIRGIL: 'Tis late.", 'L08', 'error', /'tis/);
    expectRule('VIRGIL: Okay, let us go.', 'L08', 'warning', /slang/);
    expectRule("NARRATION: He didn't stop.", 'L08', 'warning', /contractions/);
    expectRule('NARRATION: I walked on.', 'L08', 'warning', /"he"/);
    expectRule('NARRATION: You see him walk.', 'L08', 'warning', /"you"/);
    const clean = lintText(docWithBeat('VIRGIL: The wood is behind us.\nNARRATION: He walked on.'));
    expect(has(clean, 'L08', 'error') || has(clean, 'L08', 'warning')).toBe(false);
  });

  it('L09: five words in a row from the canto', () => {
    expectRule('VIRGIL: Midway upon the journey of our life, we meet.', 'L09', 'warning');
    const ds = lintText(docWithBeat('VIRGIL: Halfway through life, we meet.'));
    expect(has(ds, 'L09', 'warning')).toBe(false);
  });

  it('L10: length limits', () => {
    expectRule(`VIRGIL: ${'word '.repeat(29)}x.`, 'L10', 'error', /say is 1\d\d characters/);
    expectRule('NARRATION: He walked. He stopped. He wept.', 'L10', 'error', /two sentences/);
    expectRule(`BARK VIRGIL: ${'a'.repeat(61)}`, 'L10', 'error', /bark/);
    expectRule(`HINT: ${'a'.repeat(121)}`, 'L10', 'error', /hint/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [${'a'.repeat(49)}]\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L10', 'error', /option/);
  });

  it('L11: at most five balloons in a row', () => {
    expectRule(Array.from({ length: 6 }, (_, i) => `VIRGIL: Line ${'abcdef'[i]}.`).join('\n'), 'L11', 'warning');
    const ds = lintText(docWithBeat(Array.from({ length: 6 }, (_, i) => `VIRGIL: Line ${'abcdef'[i]}.${i === 2 ? '\nDO: Dante walks.' : ''}`).join('\n')));
    expect(has(ds, 'L11', 'warning')).toBe(false);
  });
});

describe('L12–L16: effects and choices', () => {
  it('L12: magnitudes and the choice budget', () => {
    expectRule(`CHOICE inf99.c1 minor "X"\nOPTION a [A.]\nEFFECTS: pity+2@limbo\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L12', 'error', /minor/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [A.]\nEFFECTS: trust+2\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L12', 'warning', /approval/);
    expectRule('EFFECTS: resolve-4', 'L12', 'error', /1–3 units/);
    expectRule(`CHOICE inf99.c1 minor "X"\nOPTION a [A.]\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L12', 'error', /at least one major/);
    const four = [1, 2, 3, 4].map((n) => `CHOICE inf99.c${n} major "X${n}"\nOPTION a [A.]\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`).join('\nDO: x\n');
    expectRule(four, 'L12', 'error', /at most 3 per canto/);
  });

  it('L12: binding choice blocks of the bible (canto profile)', () => {
    const body = 'CHOICE inf03.c3 minor systemic "Before Charon"\nOPTION a [Did not withdraw] when: event:inf03.held_before_charon\nEFFECTS: virtue:fortitude+2\nOPTION b [Stepped back] when: else\nREVEAL canon=a timing=immediate\nQUOTE POET (Inferno III, 90)\n> But when he saw that I did not withdraw,\nNOTE: Dante stood his ground.\nEND CHOICE';
    const ds = lintText(cantoText({ id: 'inf03', scene: 5, body: `DO: Charon shouts. {event:inf03.held_before_charon}\n${body}` }), cantoCtx({ registry: CHAPTER1_REGISTRY }));
    expect(has(ds, 'L12', 'error', /binding effects are "virtue:fortitude\+1"/)).toBe(true);
    expect(has(ds, 'L12', 'error', /inf03\.c1 .*missing/)).toBe(true);
    expect(has(ds, 'L02', 'error', /Scene inf03\.s1 "The Gate" from §7 is missing/)).toBe(true);
  });

  it('L13: sin tags and the canto cap', () => {
    expectRule('EFFECTS: pity+1', 'L13', 'error', /sin tag/);
    expectRule('EFFECTS: pity+1@gossip', 'L13', 'error', /unknown sin tag/);
    const twice = [1, 2].map((n) => `CHOICE inf99.c${n} major "X${n}"\nOPTION a [A.]\nEFFECTS: pity+2@limbo\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`).join('\nDO: x\n');
    expectRule(twice, 'L13', 'error', /cap is 3/);
  });

  it('L14: dialogue choices carry a REVEAL with a NOTE', () => {
    expectRule('CHOICE inf99.c1 major "X"\nOPTION a [A.]\nOPTION b [B.]\nEND CHOICE', 'L14', 'error', /needs a REVEAL/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [A.]\nOPTION b [B.]\n${REVEAL.replace('NOTE: He went.', '')}\nEND CHOICE`, 'L14', 'error', /NOTE/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [A.]\nOPTION b [B.]\n${REVEAL.replace('canon=a', 'canon=c')}\nEND CHOICE`, 'L14', 'error', /no option c/);
    const repeat = `QUOTE POET (Inferno I, 136)\n> Then he moved on, and I behind him followed.\nCHOICE inf99.c1 major "X"\nOPTION a [A.]\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`;
    expectRule(repeat, 'L14', 'warning', /repeats line 136/);
  });

  it('L15: letters, counts and visibility', () => {
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [A.]\nOPTION c [C.]\n${REVEAL}\nEND CHOICE`, 'L15', 'error', /in order/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [A.]\n${REVEAL}\nEND CHOICE`, 'L15', 'error', /2–3/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [A.] requires: word:Hope\nOPTION b [B.] requires: not word:Hope and trust>=3\n${REVEAL}\nEND CHOICE`, 'L15', 'error', /only \d options? would show/);
    expectRule('CHOICE inf99.c1 minor systemic "X"\nOPTION a [A] when: trust>=3\nOPTION b [B] when: trust<3\nEND CHOICE', 'L15', 'error', /when: else/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [A.] when: trust>=3\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L15', 'error', /use requires/);
    const fine = lintText(docWithBeat(`CHOICE inf99.c1 major "X"\nOPTION a [A.] requires: word:Hope\nOPTION b [B.]\nOPTION c [C.] requires: not word:Hope\n${REVEAL}\nEND CHOICE`));
    expect(has(fine, 'L15')).toBe(false);
  });

  it('L16: no system terms or numbers in options', () => {
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [Show him pity.]\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L16', 'error', /pity/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [Wait 3 days.]\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L16', 'error', /numbers/);
  });
});

describe('L17–L22: registers, flow and typography', () => {
  it('L17: front matter lists match the content', () => {
    expectRule('EFFECTS: flag:inf99.found_it', 'L17', 'error', /flags_set lacks inf99\.found_it/);
    const ds = lintText(docWithBeat('VIRGIL: Hi.').replace('unlocks: []', 'unlocks: [heart]'));
    expect(has(ds, 'L17', 'error', /unlocks lists heart/)).toBe(true);
  });

  it('L18: flags carry the file prefix; cross-canto reads are registered', () => {
    expectRule('EFFECTS: flag:inf01.not_mine', 'L18', 'error', /prefix/);
    expectRule('EFFECTS: flag:ch1.heart_tender', 'L18', 'error', /engine/);
    const ds = lintText(
      cantoText({ id: 'inf03', body: 'IF flag:inf01.secret_wish\nVIRGIL: Hm.\nEND IF\nIF flag:inf04.sixth_proud\nVIRGIL: Later.\nEND IF', front: { flags_read: '[inf01.secret_wish, inf04.sixth_proud]' } }),
      cantoCtx({ registry: CHAPTER1_REGISTRY }),
    );
    expect(has(ds, 'L18', 'error', /not registered in §4\.3/)).toBe(true);
    expect(has(ds, 'L18', 'error', /later canto/)).toBe(true);
  });

  it('L19: words come from the table, in their canto', () => {
    expectRule('EFFECTS: word:Banana', 'L19', 'error', /no such word/);
    expectRule('EFFECTS: shed:Hope', 'L19', 'error', /Burden/);
    const elsewhere = lintText(cantoText({ id: 'inf02', body: 'EFFECTS: word:Stay', front: { words: '[Stay]' } }), cantoCtx({ cantos: [] }));
    expect(has(elsewhere, 'L19', 'error', /belongs to inf03/)).toBe(true);
    // IV gives Hope back to a player who sealed it at the gate (inf03.c1=b, a binding block of the bible).
    const unseal = lintText(cantoText({ id: 'inf04', scene: 2, body: 'IF flag:inf03.left_hope\nEFFECTS: word:Hope, shed:Fear\nEND IF', front: { flags_read: '[inf03.left_hope]' } }), cantoCtx({ cantos: [], registry: CHAPTER1_REGISTRY }));
    expect(has(unseal, 'L19', 'error', /belongs to inf01/)).toBe(false);
    expect(has(unseal, 'L19', 'warning', /belongs to inf01/)).toBe(false);
    expect(has(unseal, 'L17', 'error', /Front matter words/)).toBe(false);
    const late = lintText(docWithBeat('QUOTE POET (Inferno I, 10–12)\n> I cannot well repeat how there I entered,\n> So full was I of slumber at the moment\n> In which I had abandoned the true way.\nVIRGIL: Hm.\nEFFECTS: word:Way').replace('words: []', 'words: [Way]'));
    expect(has(late, 'L19', 'warning', /right after the QUOTE/)).toBe(true);
  });

  it('L20: codex entries are defined and given once', () => {
    expectRule('EFFECTS: codex:inf99.nowhere', 'L20', 'error', /not defined/);
    const entry = '\n## Codex\n\n```codex\nID: inf99.wood\nTAB: places\nTITLE: The Wood\nQUOTE POET (Inferno I, 2)\n> I found myself within a forest dark,\nNOTE: A wood.\n```\n';
    const twice = lintText(docWithBeat('EFFECTS: codex:inf99.wood\nEFFECTS: codex:inf99.wood').replace('codex: []', 'codex: [inf99.wood]') + entry);
    expect(has(twice, 'L20', 'error', /2 times on one path/)).toBe(true);
    const never = lintText(docWithBeat('VIRGIL: Hi.') + entry);
    expect(has(never, 'L20', 'warning', /never given/)).toBe(true);
    const alternatives = lintText(
      docWithBeat(`CHOICE inf99.c1 major "X"\nOPTION a [A.]\nEFFECTS: codex:inf99.wood\nOPTION b [B.]\nEFFECTS: codex:inf99.wood\n${REVEAL}\nEND CHOICE`)
        .replace('codex: []', 'codex: [inf99.wood]')
        .replace('choices: []', 'choices: [inf99.c1]') + entry,
    );
    expect(has(alternatives, 'L20')).toBe(false);
  });

  it('L21: GOTO, nesting and after: targets', () => {
    expectRule('GOTO inf99.s1.b1', 'L21', 'error', /last line of an OPTION/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [A.]\nGOTO inf99.s0.b1\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L21', 'error', /leaves scene/);
    expectRule(`CHOICE inf99.c1 major "X"\nOPTION a [A.]\nGOTO inf99.s1.b7\nOPTION b [B.]\n${REVEAL}\nEND CHOICE`, 'L21', 'error', /no such beat/);
    expectRule('IF trust>=1\nIF trust>=2\nIF trust>=3\nVIRGIL: Deep.\nEND IF\nEND IF\nEND IF', 'L21', 'error', /two levels/);
    expectRule('VIRGIL: Hi.', 'L21', 'error', /after:inf99\.s1\.b5/, { mode: 'play\n@trigger: after:inf99.s1.b5' });
    expectRule('CHOICE inf99.c1 minor systemic "X"\nOPTION a [A] when: event:inf99.never_emitted\nOPTION b [B] when: else\nEND CHOICE', 'L21', 'warning', /no DO line/);
  });

  it('L22: straight quotes, … and en dashes', () => {
    expectRule('VIRGIL: “Come,” he said.', 'L22', 'error', /Smart quotes/);
    expectRule('NARRATION: He waited...', 'L22', 'error', /"\.\.\."/);
    expectRule('QUOTE POET (Inferno I, 1-2)\n> Midway upon the journey of our life\n> I found myself within a forest dark,', 'L22', 'error', /hyphen/);
  });
});
