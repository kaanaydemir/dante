/**
 * Script lint rules L01–L22 (bible §2.14), checked on the parsed AST.
 *
 * Owner: team A (story-core). Pure TypeScript. Frozen export (docs/ENGINE.md):
 * `lintCanto(script, ctx): Diagnostic[]`. Never throws.
 *
 * The parser already reports what only the raw text shows (front-matter
 * presence and types, unknown lines L04, unbalanced IF / CHOICE L21, @mode
 * placement L03, malformed conditions / effects). This module checks the rest.
 * Run both: `[...parseCanto(text, file).diagnostics, ...lintCanto(canto, ctx)]`.
 *
 * Profiles (types.ts `LintProfile`):
 * - `canto`: every rule, including the Chapter 1 registers of the bible
 *   (`ctx.registry`, default the CHAPTER1_REGISTRY snapshot): §7 scene lists,
 *   what each scene gives, binding choice blocks, anchor lines, §4.3 flags,
 *   §3.4.6 word-to-canto assignment, id range 01–34, source path.
 * - `fixture`: format rules only (for `inf99` engine fixtures).
 *
 * Severity: `error` for a broken binding rule, `warning` for style rules and
 * heuristics (archaic or slang words, 5-word echoes, balloon runs), `info` for
 * preferences ("SHADE preferably never speaks").
 */

import { choicesOf, collectQuotes, forEachStatement, verseLines, type StatementContext } from './ast';
import { CHAPTER1_REGISTRY } from './registry';
import type { ChapterRegistry } from './bible';
import { conditionAtoms, conditionRefs, formatCondition } from './conditions';
import { formatEffect, sumEffects, validateEffect, validateOptionTotals } from './effects';
import { cantoIdFromScriptPath, parseScriptBlock } from './parser';
import { verifyQuote, verseCore } from './quotes';
import { getWord } from './words';
import {
  CANTICLE_PREFIX,
  CANTICLES,
  ID_PATTERNS,
  MAX_LIMBO_SPEAKERS_PER_CANTO,
  MECHANIC_NAMES,
  OPTION_LETTERS,
  SIN_TAGS_CH1,
  SIN_TAGS_KNOWN,
  SPEAKERS,
  UNLOCK_FEATURES,
  type Beat,
  type CantoScript,
  type ChoiceOption,
  type ChoiceStmt,
  type Condition,
  type Diagnostic,
  type Effect,
  type LintContext,
  type QuoteStmt,
  type Scene,
  type Severity,
  type SourceCanto,
  type SpeakerDef,
  type Statement,
} from './types';

/** lintCanto's context, with the optional bible registers (tests pass the live bible). */
export interface StoryLintContext extends LintContext {
  /** Chapter registers for the 'canto' profile. Default: the CHAPTER1_REGISTRY snapshot. */
  readonly registry?: ChapterRegistry | null;
}

/** One-line descriptions of the rules (bible §2.14), for reports. */
export const LINT_RULES: Readonly<Record<string, string>> = {
  L01: 'front matter complete and well typed',
  L02: 'heading ids well formed and unique; scene ids as in §7',
  L03: 'one script block per beat, starting with @mode',
  L04: 'every line is a §2.5 line type',
  L05: 'speakers exist and have the right to speak that way (§4.8)',
  L06: 'quotes match the Longfellow source; citations cover exactly the quoted lines',
  L07: 'at most 6 lines per quote, 12 in a row, 3 in the epigraph, 6 in a REVEAL',
  L08: 'no archaic words in modern lines (§6.1)',
  L09: 'no modern line shares 5 words in a row with the canto',
  L10: 'length limits (§6.4)',
  L11: 'at most 5 modern balloons in a row',
  L12: 'EFFECTS tokens valid; magnitudes fit the choice weight',
  L13: 'heart effects carry sin tags; canto and chapter caps hold',
  L14: 'every dialogue CHOICE has a REVEAL with a NOTE',
  L15: 'option letters in order, 2–3 options, at least two always visible',
  L16: 'no system terms or numbers in option texts',
  L17: 'front matter lists match the content',
  L18: 'flags carry the file prefix; cross-canto reads are registered (§4.3)',
  L19: 'every word: is assigned to this canto (§3.4.6) or unseals an earlier word',
  L20: 'every codex id is defined and given at most once per path',
  L21: 'IF / CHOICE balanced; GOTO stays in its scene',
  L22: 'straight quotes, … and – in citations',
};

/** Never throws: an internal failure becomes one L00 diagnostic. */
export function lintCanto(script: CantoScript, ctx: LintContext): Diagnostic[] {
  try {
    return new Linter(script, ctx as StoryLintContext).run();
  } catch (err) {
    return [
      {
        severity: 'error',
        code: 'L00',
        message: `Lint crashed: ${err instanceof Error ? err.message : String(err)}`,
        pos: { line: 1, file: script.file },
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// Vocabularies (§6.1, §2.14)
// ---------------------------------------------------------------------------

const ARCHAIC = new Set([
  'thee',
  'thou',
  'thy',
  'thine',
  'ye',
  'hath',
  'doth',
  'dost',
  'shalt',
  'wilt',
  'wouldst',
  'couldst',
  'hast',
  'ere',
  "o'er",
  "'tis",
  "'twas",
  'nay',
  'behold',
  'lo',
  'whence',
  'thence',
  'hither',
  'thither',
  'alas',
]);

const SLANG = new Set([
  'okay',
  'hey',
  'yeah',
  'guys',
  'wow',
  'cool',
  'stuff',
  'gonna',
  'wanna',
  'kinda',
  'awesome',
  'totally',
  'literally',
  'basically',
  'vibe',
  'chill',
  'stress',
  'trauma',
]);

const SYSTEM_TERMS =
  /\b(pity|justice|mercy|trust|heart|virtue|prudence|fortitude|temperance|grace|resolve)(s|es)?\b/i;

/** SPEAKERS lookup that ignores inherited object properties. */
function speaker(id: string): SpeakerDef | undefined {
  return Object.prototype.hasOwnProperty.call(SPEAKERS, id) ? SPEAKERS[id] : undefined;
}

/** §6.4 length limits by text kind (characters). */
const LIMITS: Readonly<Record<string, number>> = {
  say: 140,
  narration: 200,
  page: 400,
  bark: 60,
  hint: 120,
  'hint-short': 60,
  option: 48,
  prompt: 120,
  note: 160,
  gloss: 160,
  'codex-title': 40,
  'codex-note': 400,
  'memory-note': 300,
};

type TextKind =
  | 'say'
  | 'narration'
  | 'page'
  | 'bark'
  | 'hint'
  | 'hint-short'
  | 'option'
  | 'prompt'
  | 'note'
  | 'gloss'
  | 'choice-title'
  | 'codex-title'
  | 'codex-note'
  | 'memory-name'
  | 'memory-note'
  | 'scene-title'
  | 'beat-title';

interface TextItem {
  readonly kind: TextKind;
  readonly text: string;
  readonly line: number;
}

const chars = (s: string): number => [...s].length;

function words(text: string): string[] {
  return (text.replace(/[’‘]/g, "'").match(/[A-Za-z']+/g) ?? [])
    .map((w) => w.replace(/^'+(?!tis|twas)/i, '').replace(/'+$/, ''))
    .filter((w) => w.length > 0);
}

function normalWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z'\s]+/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 0);
}

function sameSet(a: readonly string[], b: readonly string[]): { missing: string[]; extra: string[] } {
  const sa = new Set(a);
  const sb = new Set(b);
  return { missing: [...sa].filter((x) => !sb.has(x)), extra: [...sb].filter((x) => !sa.has(x)) };
}

/** Max over every path of the per-key totals produced by `contrib` (IF branches and options are alternatives). */
function pathTotals(
  stmts: readonly Statement[],
  contrib: (e: Effect) => readonly (readonly [string, number])[],
): Map<string, number> {
  const total = new Map<string, number>();
  const addAll = (m: ReadonlyMap<string, number>): void => {
    for (const [k, v] of m) total.set(k, (total.get(k) ?? 0) + v);
  };
  const maxOf = (maps: readonly Map<string, number>[]): Map<string, number> => {
    const out = new Map<string, number>();
    for (const m of maps) for (const [k, v] of m) out.set(k, Math.max(out.get(k) ?? 0, v));
    return out;
  };
  for (const s of stmts) {
    if (s.type === 'effects') {
      for (const e of s.effects) for (const [k, v] of contrib(e)) total.set(k, (total.get(k) ?? 0) + v);
    } else if (s.type === 'if') {
      const branches = s.branches.map((b) => pathTotals(b.body, contrib));
      if (s.elseBody) branches.push(pathTotals(s.elseBody, contrib));
      addAll(maxOf(branches));
    } else if (s.type === 'choice') {
      addAll(maxOf(s.options.map((o) => pathTotals(o.body, contrib))));
    }
  }
  return total;
}

function cantoTotals(
  script: CantoScript,
  contrib: (e: Effect) => readonly (readonly [string, number])[],
): Map<string, number> {
  const total = new Map<string, number>();
  for (const scene of script.scenes) {
    for (const beat of scene.beats) {
      for (const [k, v] of pathTotals(beat.lines, contrib)) total.set(k, (total.get(k) ?? 0) + v);
    }
  }
  return total;
}

/** Every effect of a statement list, at any depth. */
function deepEffects(stmts: readonly Statement[]): Effect[] {
  const out: Effect[] = [];
  for (const s of stmts) {
    if (s.type === 'effects') out.push(...s.effects);
    else if (s.type === 'if') {
      for (const b of s.branches) out.push(...deepEffects(b.body));
      if (s.elseBody) out.push(...deepEffects(s.elseBody));
    } else if (s.type === 'choice') {
      for (const o of s.options) out.push(...deepEffects(o.body));
    }
  }
  return out;
}

const canonicalCache = new WeakMap<ChapterRegistry, Map<string, ChoiceStmt | null>>();

function canonicalChoice(reg: ChapterRegistry, id: string): ChoiceStmt | null {
  let cache = canonicalCache.get(reg);
  if (!cache) {
    cache = new Map();
    canonicalCache.set(reg, cache);
  }
  if (cache.has(id)) return cache.get(id) ?? null;
  const block = reg.choices[id]?.block ?? null;
  let parsed: ChoiceStmt | null = null;
  if (block) {
    const r = parseScriptBlock(block, { directives: false, beatId: id });
    const first = r.statements.find((s) => s.type === 'choice');
    parsed = first && first.type === 'choice' ? first : null;
  }
  cache.set(id, parsed);
  return parsed;
}

// ---------------------------------------------------------------------------
// The linter
// ---------------------------------------------------------------------------

class Linter {
  private readonly out: Diagnostic[] = [];
  private readonly isCanto: boolean;
  private readonly reg: ChapterRegistry | null;
  /** Resolved source line numbers of every quote (filled by L06). */
  private readonly quoteLines = new Map<QuoteStmt, readonly (number | null)[]>();
  private readonly stmts: { stmt: Statement; ctx: StatementContext }[] = [];
  private readonly choices: ChoiceStmt[];

  constructor(
    private readonly script: CantoScript,
    private readonly ctx: StoryLintContext,
  ) {
    this.isCanto = ctx.profile === 'canto';
    this.reg = this.isCanto ? (ctx.registry === undefined ? CHAPTER1_REGISTRY : ctx.registry) : null;
    forEachStatement(script, (stmt, c) => this.stmts.push({ stmt, ctx: c }));
    this.choices = choicesOf(script);
  }

  private add(severity: Severity, code: string, message: string, line?: number): void {
    this.out.push({ severity, code, message, pos: { line: line ?? 1, file: this.script.file } });
  }

  run(): Diagnostic[] {
    const rules: [string, () => void][] = [
      ['L06', () => this.l06Quotes()],
      ['L01', () => this.l01FrontMatter()],
      ['L02', () => this.l02Ids()],
      ['L03', () => this.l03Beats()],
      ['L05', () => this.l05Speakers()],
      ['L07', () => this.l07QuoteLengths()],
      ['L08', () => this.l08to10Texts()],
      ['L11', () => this.l11Balloons()],
      ['L12', () => this.l12Effects()],
      ['L13', () => this.l13Heart()],
      ['L14', () => this.l14Reveals()],
      ['L15', () => this.l15Options()],
      ['L17', () => this.l17Lists()],
      ['L18', () => this.l18Flags()],
      ['L19', () => this.l19Words()],
      ['L20', () => this.l20Codex()],
      ['L21', () => this.l21Flow()],
      ['L22', () => this.l22Typography()],
      ['L02', () => this.registerChecks()],
    ];
    for (const [code, rule] of rules) {
      try {
        rule();
      } catch (err) {
        this.add('error', 'L00', `${code} check crashed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return this.out.sort((a, b) => (a.pos?.line ?? 0) - (b.pos?.line ?? 0));
  }

  // --- helpers --------------------------------------------------------------

  private get id(): string {
    return this.script.id;
  }

  /**
   * The canto whose Longfellow text this script tells: its own number for real
   * cantos; for fixtures (inf99) the canto named by the front matter `source`.
   */
  private sourceCanto(): SourceCanto | null {
    const m = /canto-(\d{2})\.txt$/.exec(this.script.front.source);
    const n = !this.isCanto && m ? Number(m[1]) : this.script.cantoNumber;
    try {
      return this.ctx.source(this.script.canticle, n);
    } catch {
      return null;
    }
  }

  private sceneOfBeat(beatId: string): string {
    return beatId.replace(/\.b\d+$/, '');
  }

  private get colophonScene(): Scene | null {
    const last = this.script.scenes[this.script.scenes.length - 1];
    return last ?? null;
  }

  private colophonBeat(): Beat | null {
    const scene = this.colophonScene;
    return scene?.beats.find((b) => b.mode === 'colophon') ?? null;
  }

  private firstQuote(beat: Beat | null | undefined): QuoteStmt | null {
    if (!beat) return null;
    const q = beat.lines.find((s) => s.type === 'quote');
    return q && q.type === 'quote' ? q : null;
  }

  private allTexts(): TextItem[] {
    const items: TextItem[] = [];
    const push = (kind: TextKind, text: string | null | undefined, line: number): void => {
      if (text) items.push({ kind, text, line });
    };
    for (const scene of this.script.scenes) {
      push('scene-title', scene.title, scene.pos.line);
      for (const beat of scene.beats) push('beat-title', beat.title, beat.pos.line);
    }
    for (const { stmt } of this.stmts) {
      switch (stmt.type) {
        case 'say':
          push('say', stmt.text, stmt.pos.line);
          break;
        case 'narration':
          push('narration', stmt.text, stmt.pos.line);
          break;
        case 'page':
          push('page', stmt.text, stmt.pos.line);
          break;
        case 'bark':
          push('bark', stmt.text, stmt.pos.line);
          break;
        case 'hint':
          push('hint', stmt.text, stmt.pos.line);
          push('hint-short', stmt.short, stmt.pos.line);
          break;
        case 'quote':
          push('gloss', stmt.gloss, stmt.pos.line);
          break;
        case 'choice':
          push('choice-title', stmt.title, stmt.pos.line);
          push('prompt', stmt.prompt, stmt.pos.line);
          // A spoken option's speech is its text without the quotes, so the text alone is checked.
          for (const o of stmt.options) push('option', o.text, o.pos.line);
          if (stmt.reveal) {
            push('note', stmt.reveal.note, stmt.reveal.pos.line);
            for (const q of stmt.reveal.quotes) push('gloss', q.gloss, q.pos.line);
          }
          break;
        default:
          break;
      }
    }
    for (const e of this.script.codex) {
      push('codex-title', e.title, e.pos.line);
      push('codex-note', e.note, e.pos.line);
      push('gloss', e.quote?.gloss, e.pos.line);
    }
    for (const e of this.script.memories) {
      push('memory-name', e.name, e.pos.line);
      push('memory-note', e.note, e.pos.line);
      push('gloss', e.quote?.gloss, e.pos.line);
    }
    return items;
  }

  // --- L06 quotes -------------------------------------------------------------

  private l06Quotes(): void {
    for (const site of collectQuotes(this.script)) {
      const q = site.quote;
      let source: SourceCanto | null = null;
      if (q.citation) {
        try {
          source = this.ctx.source(q.citation.canticle, q.citation.canto);
        } catch {
          source = null;
        }
      }
      const check = verifyQuote(q, source);
      this.quoteLines.set(q, check.lineNumbers);
      for (const d of check.diagnostics) {
        this.add(d.severity, 'L06', `[${d.code}] ${d.message}`, d.pos?.line ?? q.pos.line);
      }
    }
    // Anchor lines (§7 "Çapa dizeleri") must be shown somewhere in the canto.
    const bible = this.reg?.cantos[this.id];
    if (!bible || bible.anchors.length === 0) return;
    const shown = new Set<number>();
    for (const site of collectQuotes(this.script)) {
      if (site.kind === 'codex' || site.kind === 'memory') continue;
      const c = site.quote.citation;
      if (!c || c.canticle !== this.script.canticle || c.canto !== this.script.cantoNumber) continue;
      for (const n of this.quoteLines.get(site.quote) ?? []) if (n != null) shown.add(n);
    }
    for (const a of bible.anchors) {
      const missing: number[] = [];
      for (let n = a.first; n <= a.last; n++) if (!shown.has(n)) missing.push(n);
      if (missing.length > 0) {
        const range = a.first === a.last ? `${a.first}` : `${a.first}–${a.last}`;
        this.add('warning', 'L06', `Anchor line${a.first === a.last ? '' : 's'} ${this.script.roman} ${range} (§7) not shown verbatim (missing ${missing.join(', ')})`);
      }
    }
  }

  // --- L01 front matter values ------------------------------------------------

  private l01FrontMatter(): void {
    const f = this.script.front;
    const s = this.script;
    if (!ID_PATTERNS.canto.test(f.id)) {
      this.add('error', 'L01', `id "${f.id}" must look like inf03`);
    } else if (this.isCanto) {
      const n = Number(f.id.slice(3));
      const max = f.id.startsWith('inf') ? 34 : 33;
      if (n < 1 || n > max) this.add('error', 'L01', `id ${f.id}: canto numbers run 01–${String(max).padStart(2, '0')}`);
      const fromPath = cantoIdFromScriptPath(s.file);
      if (fromPath && fromPath !== f.id) this.add('error', 'L01', `id ${f.id} does not match the file name (${fromPath})`);
    }
    if (!(CANTICLES as readonly string[]).includes(f.canticle)) {
      this.add('error', 'L01', `canticle must be one of ${CANTICLES.join(', ')}`);
    } else if (ID_PATTERNS.canto.test(f.id) && CANTICLE_PREFIX[f.canticle as keyof typeof CANTICLE_PREFIX] !== f.id.slice(0, 3)) {
      this.add('error', 'L01', `canticle ${f.canticle} does not match id ${f.id}`);
    }
    if (ID_PATTERNS.canto.test(f.id) && f.canto !== Number(f.id.slice(3))) {
      this.add('error', 'L01', `canto ${f.canto} does not match id ${f.id}`);
    }
    for (const key of ['title', 'title_tr', 'location', 'version'] as const) {
      if (f[key].trim().length === 0) this.add(key === 'version' ? 'warning' : 'error', 'L01', `${key} is empty`);
    }
    if (f.playtime && !/^\d+[–-]\d+$/.test(f.playtime)) this.add('warning', 'L01', `playtime "${f.playtime}" should be minutes like "8–12"`);
    if (this.isCanto) {
      const expected = `docs/source/${s.canticle.toLowerCase()}/canto-${String(s.cantoNumber).padStart(2, '0')}.txt`;
      if (f.source.replace(/^\//, '') !== expected) this.add('error', 'L01', `source should be ${expected} (found "${f.source}")`);
    }
    const src = this.sourceCanto();
    if (!s.lineRange) this.add('error', 'L01', `lines "${f.lines}" must be a range like "1–136"`);
    else if (src && (s.lineRange.first !== 1 || s.lineRange.last !== src.count)) {
      this.add('error', 'L01', `lines should be "1–${src.count}" (the whole canto)`);
    }
    const sourceNumber = src?.canto ?? s.cantoNumber;
    if (!s.epigraph) this.add('error', 'L01', `epigraph "${f.epigraph}" is not a citation like "Inferno III, 1–3"`);
    else if (s.epigraph.canticle !== s.canticle || s.epigraph.canto !== sourceNumber) {
      this.add('error', 'L01', `epigraph ${s.epigraph.text} is not from this canto`);
    }
    if (!s.closing) this.add('error', 'L01', `closing "${f.closing}" is not a citation like "Inferno III, 136"`);
    else {
      if (s.closing.canticle !== s.canticle || s.closing.canto !== sourceNumber) {
        this.add('error', 'L01', `closing ${s.closing.text} is not from this canto`);
      }
      if (s.closing.first !== s.closing.last) this.add('error', 'L01', 'closing is a single line (the canto\'s last line)');
      const last = s.lineRange?.last ?? src?.count;
      if (last !== undefined && s.closing.last !== last) this.add('error', 'L01', `closing should be the canto's last line (${last})`);
    }
    // The s0 quote is the epigraph; the colophon quote is the closing line.
    const s0 = s.scenes[0];
    const epi = this.firstQuote(s0?.beats[0]);
    if (epi && s.epigraph && epi.citation && epi.citation.text !== s.epigraph.text) {
      this.add('error', 'L01', `epigraph says ${s.epigraph.text} but the opening page quotes ${epi.citation.text}`, epi.pos.line);
    }
    const close = this.firstQuote(this.colophonBeat());
    if (close && s.closing && close.citation && close.citation.text !== s.closing.text) {
      this.add('error', 'L01', `closing says ${s.closing.text} but the colophon quotes ${close.citation.text}`, close.pos.line);
    }
    for (const c of f.characters) {
      if (!speaker(c)) this.add('error', 'L01', `characters: unknown speaker "${c}" (§4.8)`);
    }
    for (const m of f.mechanics) {
      if (!(MECHANIC_NAMES as readonly string[]).includes(m)) this.add('error', 'L01', `mechanics: unknown mechanic "${m}" (§7.0)`);
    }
    for (const u of f.unlocks) {
      if (!(UNLOCK_FEATURES as readonly string[]).includes(u)) this.add('error', 'L01', `unlocks: unknown feature "${u}"`);
    }
    const shape: [string, readonly string[], RegExp][] = [
      ['choices', f.choices, ID_PATTERNS.choice],
      ['words', f.words, ID_PATTERNS.word],
      ['memories', f.memories, ID_PATTERNS.named],
      ['codex', f.codex, ID_PATTERNS.named],
      ['flags_set', f.flags_set, ID_PATTERNS.named],
      ['flags_read', f.flags_read, ID_PATTERNS.named],
    ];
    for (const [key, list, re] of shape) {
      for (const item of list) if (!re.test(item)) this.add('error', 'L01', `${key}: "${item}" is not a valid id`);
    }
    // §7 basic values.
    const bible = this.reg?.cantos[this.id];
    if (bible) {
      const cmp: [string, string, string, Severity][] = [
        ['title', f.title, bible.title, 'warning'],
        ['location', f.location, bible.location, 'warning'],
        ['lines', f.lines, bible.lines, 'error'],
        ['epigraph', f.epigraph, bible.epigraph, 'error'],
        ['closing', f.closing, bible.closing, 'error'],
        ['playtime', f.playtime, bible.playtime, 'info'],
      ];
      for (const [key, mine, theirs, sev] of cmp) {
        if (theirs && mine !== theirs) this.add(sev, 'L01', `${key} is "${mine}"; §7 gives "${theirs}"`);
      }
      const mech = sameSet(bible.mechanics, f.mechanics);
      if (mech.missing.length > 0 || mech.extra.length > 0) {
        this.add(
          'warning',
          'L01',
          `mechanics differ from §7${mech.missing.length ? `; missing ${mech.missing.join(', ')}` : ''}${mech.extra.length ? `; extra ${mech.extra.join(', ')}` : ''}`,
        );
      }
    }
  }

  // --- L02 ids ------------------------------------------------------------------

  private l02Ids(): void {
    const s = this.script;
    const seenScenes = new Map<string, number>();
    const numbers = new Map<number, string>();
    for (const scene of s.scenes) {
      if (ID_PATTERNS.scene.test(scene.id) && !scene.id.startsWith(`${this.id}.`)) {
        this.add('error', 'L02', `Scene ${scene.id} does not carry the canto prefix ${this.id}`, scene.pos.line);
      }
      const prev = seenScenes.get(scene.id);
      if (prev !== undefined) this.add('error', 'L02', `Scene id ${scene.id} is used twice (first at line ${prev})`, scene.pos.line);
      else seenScenes.set(scene.id, scene.pos.line);
      if (scene.number >= 0) {
        const other = numbers.get(scene.number);
        if (other && other !== scene.id) this.add('error', 'L02', `Scene number s${scene.number} is used twice`, scene.pos.line);
        numbers.set(scene.number, scene.id);
      }
      if (scene.beats.length === 0) this.add('error', 'L03', `Scene ${scene.id} has no beats (### [id] headings)`, scene.pos.line);
    }
    const first = s.scenes[0];
    if (first && first.number !== 0) this.add('error', 'L02', `The first scene must be the opening page ${this.id}.s0 (found ${first.id})`, first.pos.line);
    const s0 = s.scenes.find((x) => x.number === 0);
    if (s0 && s0 !== first) this.add('error', 'L02', `${s0.id} (the opening page) must be the first scene`, s0.pos.line);
    if (s0 && (s0.beats.length !== 1 || s0.beats[0]?.id !== `${s0.id}.b1`)) {
      this.add('warning', 'L02', `${s0.id} has exactly one beat, ${s0.id}.b1 (§2.4)`, s0.pos.line);
    }
    // Choice ids: shape, prefix, unique in the file and across the chapter.
    const seenChoices = new Map<string, number>();
    for (const c of this.choices) {
      if (!ID_PATTERNS.choice.test(c.id)) this.add('error', 'L02', `Choice id "${c.id}" must look like ${this.id}.c1`, c.pos.line);
      else if (!c.id.startsWith(`${this.id}.`)) this.add('error', 'L02', `Choice ${c.id} does not carry the canto prefix ${this.id}`, c.pos.line);
      const prev = seenChoices.get(c.id);
      if (prev !== undefined) this.add('error', 'L02', `Choice id ${c.id} is used twice (first at line ${prev})`, c.pos.line);
      else seenChoices.set(c.id, c.pos.line);
    }
    for (const other of this.ctx.cantos ?? []) {
      if (other.id === this.id || other.file === s.file) continue;
      for (const c of choicesOf(other)) {
        if (seenChoices.has(c.id)) this.add('error', 'L02', `Choice id ${c.id} is also used in ${other.file}`, seenChoices.get(c.id));
      }
    }
    // Places carry the canto prefix.
    for (const scene of s.scenes) {
      for (const beat of scene.beats) {
        const places = [beat.place, beat.trigger.kind === 'enter' ? beat.trigger.place : null];
        for (const p of places) {
          if (p && ID_PATTERNS.place.test(p) && !p.startsWith(`${this.id}_`)) {
            this.add('warning', 'L02', `Map area ${p} does not carry the canto prefix ${this.id}_`, beat.pos.line);
          }
        }
      }
    }
  }

  // --- L03 beats ----------------------------------------------------------------

  private l03Beats(): void {
    const s = this.script;
    const lastScene = this.colophonScene;
    for (const scene of s.scenes) {
      for (const beat of scene.beats) {
        if (!beat.hasScript) this.add('error', 'L03', `Beat ${beat.id} has no \`\`\`script block`, beat.pos.line);
        if (beat.mode === 'colophon' && scene !== lastScene) {
          this.add('error', 'L03', `@mode: colophon belongs only in the last scene (the colophon)`, beat.pos.line);
        }
        if (beat.chapterEnd && beat.mode !== 'colophon') {
          this.add('error', 'L03', '@chapter_end belongs only in the colophon beat', beat.pos.line);
        }
      }
    }
    const s0 = s.scenes.find((x) => x.number === 0);
    const opening = s0?.beats[0];
    if (opening && opening.hasScript) {
      if (opening.mode !== 'page') this.add('error', 'L03', `The opening page ${opening.id} must be @mode: page`, opening.pos.line);
      if (!this.firstQuote(opening)) this.add('error', 'L03', `The opening page ${opening.id} needs the epigraph QUOTE`, opening.pos.line);
    }
    if (lastScene && lastScene !== s0) {
      const colophon = this.colophonBeat();
      if (!colophon) this.add('error', 'L03', `The last scene ${lastScene.id} must be the colophon (@mode: colophon)`, lastScene.pos.line);
      else if (!this.firstQuote(colophon)) this.add('error', 'L03', `The colophon ${colophon.id} needs the closing-line QUOTE`, colophon.pos.line);
      // §2.7: Chapter 1 ends in the Canto V colophon, and only there.
      if (colophon && this.isCanto && /^inf0[1-5]$/.test(this.id)) {
        if (this.id === 'inf05' && colophon.chapterEnd !== 'ch1') {
          this.add('error', 'L03', 'The Canto V colophon carries @chapter_end: ch1 (§2.7)', colophon.pos.line);
        }
        if (this.id !== 'inf05' && colophon.chapterEnd) {
          this.add('error', 'L03', '@chapter_end belongs only in the Canto V colophon (§2.7)', colophon.pos.line);
        }
      }
    }
    for (const { stmt } of this.stmts) {
      if (stmt.type === 'directive' && (stmt.key === 'mode' || stmt.key === 'trigger' || stmt.key === 'chapter_end')) {
        this.add('error', 'L03', `@${stmt.key} only works at the top of a script block; this one is ignored`, stmt.pos.line);
      }
    }
  }

  // --- L05 speakers ---------------------------------------------------------------

  private l05Speakers(): void {
    const balloons = new Map<string, number>();
    const limbo = new Set<string>();
    const used = new Set<string>();
    const count = (id: string, line: number): void => {
      const def = speaker(id);
      if (!def) return;
      const n = (balloons.get(id) ?? 0) + 1;
      balloons.set(id, n);
      if (def.right === 'modern-single') limbo.add(id);
      if (def.maxBalloons !== undefined && n === def.maxBalloons + 1) {
        this.add('error', 'L05', `${id} speaks at most ${def.maxBalloons} balloon${def.maxBalloons === 1 ? '' : 's'} per canto (§4.8)`, line);
      }
    };
    for (const { stmt, ctx } of this.stmts) {
      if (stmt.type === 'say') {
        used.add(stmt.speaker);
        const def = speaker(stmt.speaker);
        if (!def) {
          this.add('error', 'L05', `Unknown speaker ${stmt.speaker} (§4.8)`, stmt.pos.line);
          continue;
        }
        switch (def.right) {
          case 'modern+longfellow':
            break;
          case 'longfellow':
            this.add('error', 'L05', `${stmt.speaker} speaks only Longfellow: use QUOTE ${stmt.speaker} (…)`, stmt.pos.line);
            break;
          case 'modern-limited':
          case 'modern-single':
            count(stmt.speaker, stmt.pos.line);
            break;
          case 'soul': {
            const scene = ctx.scene?.id ?? '';
            if (this.isCanto && scene !== 'inf05.s2') {
              this.add('error', 'L05', 'SOUL speaks modern lines only in Minos\'s court (inf05.s2); elsewhere use BARK SOUL', stmt.pos.line);
            }
            break;
          }
          case 'bark':
            this.add('error', 'L05', `${stmt.speaker} only speaks in BARK lines`, stmt.pos.line);
            break;
          case 'silent':
            this.add('error', 'L05', `${stmt.speaker} is silent and takes no lines (§4.8)`, stmt.pos.line);
            break;
          case 'quote-voice':
            this.add('error', 'L05', `${stmt.speaker} is only a QUOTE voice`, stmt.pos.line);
            break;
        }
      } else if (stmt.type === 'bark') {
        used.add(stmt.speaker);
        const def = speaker(stmt.speaker);
        if (!def) {
          this.add('error', 'L05', `Unknown speaker ${stmt.speaker} (§4.8)`, stmt.pos.line);
          continue;
        }
        if (def.right === 'silent' || def.right === 'quote-voice' || def.right === 'longfellow') {
          this.add('error', 'L05', `${stmt.speaker} cannot BARK (${def.right === 'silent' ? 'silent' : def.right === 'longfellow' ? 'speaks only Longfellow' : 'QUOTE voice only'})`, stmt.pos.line);
        }
        if (def.right === 'modern-limited' || def.right === 'modern-single') count(stmt.speaker, stmt.pos.line);
        if (def.maxBarkWords !== undefined && words(stmt.text).length > def.maxBarkWords) {
          this.add('warning', 'L05', `${stmt.speaker} barks broken fragments of at most ${def.maxBarkWords} words`, stmt.pos.line);
        }
        if (stmt.speaker === 'SHADE') this.add('info', 'L05', 'SHADE should preferably not speak at all (§4.8)', stmt.pos.line);
      } else if (stmt.type === 'quote') {
        this.checkVoice(stmt);
        used.add(stmt.voice);
      } else if (stmt.type === 'choice' && stmt.reveal) {
        for (const q of stmt.reveal.quotes) {
          this.checkVoice(q);
          used.add(q.voice);
        }
      }
    }
    for (const e of [...this.script.codex, ...this.script.memories]) if (e.quote) this.checkVoice(e.quote);
    if (limbo.size > MAX_LIMBO_SPEAKERS_PER_CANTO) {
      this.add('error', 'L05', `${limbo.size} of Limbo's great spirits speak; at most ${MAX_LIMBO_SPEAKERS_PER_CANTO} per canto (§4.8)`);
    }
    for (const scene of this.script.scenes) {
      for (const beat of scene.beats) {
        if (beat.trigger.kind === 'talk') {
          used.add(beat.trigger.speaker);
          if (!speaker(beat.trigger.speaker)) this.add('error', 'L05', `@trigger talk:${beat.trigger.speaker}: unknown speaker (§4.8)`, beat.pos.line);
        }
      }
    }
    const listed = new Set(this.script.front.characters);
    for (const sp of used) {
      if (sp === 'POET' || sp === 'INSCRIPTION' || !speaker(sp)) continue;
      if (!listed.has(sp)) this.add('warning', 'L05', `${sp} speaks or is talked to but is missing from the front matter characters`);
    }
  }

  private checkVoice(q: QuoteStmt): void {
    const def = speaker(q.voice);
    if (!def) {
      this.add('error', 'L05', `Unknown QUOTE voice ${q.voice} (POET, INSCRIPTION or a §4.8 speaker)`, q.pos.line);
      return;
    }
    if (def.right !== 'modern+longfellow' && def.right !== 'longfellow' && def.right !== 'quote-voice') {
      this.add('error', 'L05', `${q.voice} cannot be a QUOTE voice (§4.8: ${def.right})`, q.pos.line);
    }
  }

  // --- L07 quote lengths ---------------------------------------------------------

  private l07QuoteLengths(): void {
    const verses = (q: QuoteStmt): number => q.lines.filter((l) => l.kind === 'verse').length;
    for (const site of collectQuotes(this.script)) {
      const n = verses(site.quote);
      const max = site.kind === 'memory' ? 3 : 6;
      if (n > max) {
        this.add('error', 'L07', `A ${site.kind === 'memory' ? 'memory' : 'QUOTE'} block holds at most ${max} lines (this one has ${n})`, site.quote.pos.line);
      }
    }
    // The epigraph: at most 3 lines. The colophon's left page: exactly one line.
    const epi = this.firstQuote(this.script.scenes.find((s) => s.number === 0)?.beats[0]);
    if (epi && verses(epi) > 3) this.add('error', 'L07', `The epigraph holds at most 3 lines (this one has ${verses(epi)})`, epi.pos.line);
    const close = this.firstQuote(this.colophonBeat());
    if (close && verses(close) !== 1) this.add('error', 'L07', 'The colophon\'s left page holds exactly one line (the canto\'s last)', close.pos.line);
    // REVEAL: at most 6 lines in all.
    for (const c of this.choices) {
      if (!c.reveal) continue;
      const total = c.reveal.quotes.reduce((sum, q) => sum + verses(q), 0);
      if (total > 6) this.add('error', 'L07', `REVEAL of ${c.id} shows ${total} lines; at most 6`, c.reveal.pos.line);
    }
    // At most 12 lines in a row in a beat without NARRATION, DO, CAM or a choice between.
    for (const scene of this.script.scenes) {
      for (const beat of scene.beats) this.runOfVerses(beat.lines, 0);
    }
  }

  /** Returns the running count of consecutive verse lines after the statements. */
  private runOfVerses(stmts: readonly Statement[], start: number): number {
    let run = start;
    for (const s of stmts) {
      if (s.type === 'quote') {
        const before = run;
        run += s.lines.filter((l) => l.kind === 'verse').length;
        if (run > 12 && before <= 12) {
          this.add('error', 'L07', `${run} Longfellow lines in a row; break them up with NARRATION, DO, CAM or a choice after 12`, s.pos.line);
        }
      } else if (s.type === 'narration' || s.type === 'do' || s.type === 'cam' || s.type === 'choice') {
        if (s.type === 'choice') for (const o of s.options) this.runOfVerses(o.body, 0);
        run = 0;
      } else if (s.type === 'if') {
        const results = s.branches.map((b) => this.runOfVerses(b.body, run));
        results.push(s.elseBody ? this.runOfVerses(s.elseBody, run) : run);
        run = Math.max(...results);
      }
    }
    return run;
  }

  // --- L08, L09, L10 texts ----------------------------------------------------------

  private l08to10Texts(): void {
    const texts = this.allTexts();
    const strictKinds: ReadonlySet<TextKind> = new Set(['say', 'narration', 'page', 'bark', 'hint', 'hint-short', 'option', 'prompt']);
    const src = this.sourceCanto();
    const grams = new Set<string>();
    if (src) {
      const w = normalWords(src.lines.join(' '));
      for (let i = 0; i + 5 <= w.length; i++) grams.add(w.slice(i, i + 5).join(' '));
    }
    const reported = new Set<string>();
    for (const item of texts) {
      if (item.kind === 'scene-title' || item.kind === 'beat-title') continue;
      // L08: archaic and slang words.
      const archaic = [...new Set(words(item.text).map((w) => w.toLowerCase()).filter((w) => ARCHAIC.has(w)))];
      if (archaic.length > 0) {
        this.add(
          strictKinds.has(item.kind) ? 'error' : 'warning',
          'L08',
          `Archaic word${archaic.length > 1 ? 's' : ''} ${archaic.map((w) => `"${w}"`).join(', ')} in a modern ${item.kind} line; archaic language belongs only to Longfellow (§6.1)`,
          item.line,
        );
      }
      const slang = [
        ...new Set(
          words(item.text)
            .filter((w) => SLANG.has(w.toLowerCase()) || w === 'OK')
            .map((w) => w.toLowerCase()),
        ),
      ];
      if (/\bfreak(s|ed|ing)? out\b/i.test(item.text)) slang.push('freak out');
      if (slang.length > 0) {
        this.add('warning', 'L08', `Modern slang ${slang.map((w) => `"${w}"`).join(', ')} (§6.1)`, item.line);
      }
      if (item.kind === 'narration' || item.kind === 'page') {
        if (/\b\w+n't\b|\b\w+'(re|ve|ll|d|m)\b|\b(it|that|he|she|there|here|what|who|let)'s\b/i.test(item.text.replace(/’/g, "'"))) {
          this.add('warning', 'L08', 'No contractions in NARRATION or PAGE (§6.1)', item.line);
        }
        if (/\b(I|me|my|mine|myself)\b/.test(item.text)) {
          this.add('warning', 'L08', 'The book\'s voice speaks of Dante as "he"; "I" is only Longfellow (§1.2, §6.2)', item.line);
        }
        if (/\b(you|your|yours|yourself)\b/i.test(item.text)) {
          this.add('warning', 'L08', 'The book\'s voice does not address the reader as "you" (§6.2)', item.line);
        }
      }
      // L09: five words in a row shared with the canto.
      if (grams.size > 0 && item.kind !== 'codex-title' && item.kind !== 'memory-name' && item.kind !== 'choice-title') {
        const w = normalWords(item.text);
        for (let i = 0; i + 5 <= w.length; i++) {
          const g = w.slice(i, i + 5).join(' ');
          if (grams.has(g)) {
            const key = `${item.line}:${g}`;
            if (!reported.has(key)) {
              reported.add(key);
              this.add('warning', 'L09', `"${g}" repeats five words of the canto's Longfellow text in a modern line; quote it or rephrase (§6.3)`, item.line);
            }
            break;
          }
        }
      }
      // L10: lengths.
      const limit = LIMITS[item.kind];
      if (limit !== undefined && chars(item.text) > limit) {
        this.add('error', 'L10', `${item.kind} is ${chars(item.text)} characters; the limit is ${limit} (§6.4)`, item.line);
      }
      if (item.kind === 'narration') {
        const sentences = (item.text.match(/[.!?]+["')\]]*(?=\s|$)/g) ?? []).length;
        if (sentences > 2) this.add('error', 'L10', `NARRATION holds at most two sentences (found ${sentences})`, item.line);
      }
      if (item.kind === 'option' && item.text.length === 0) this.add('error', 'L10', 'Empty option text', item.line);
    }
  }

  // --- L11 balloon runs ---------------------------------------------------------------

  private l11Balloons(): void {
    for (const scene of this.script.scenes) {
      let run = 0;
      for (const beat of scene.beats) {
        if ((beat.trigger.kind !== 'auto' && beat.trigger.kind !== 'after') || beat.mode === 'play') run = 0;
        run = this.balloonRun(beat.lines, run);
      }
    }
  }

  private balloonRun(stmts: readonly Statement[], start: number): number {
    let run = start;
    for (const s of stmts) {
      if (s.type === 'say') {
        run += 1;
        if (run === 6) this.add('warning', 'L11', 'More than five modern balloons in a row without a player action, a quote or a choice (§6.4)', s.pos.line);
      } else if (s.type === 'quote' || s.type === 'do') {
        run = 0;
      } else if (s.type === 'choice') {
        run = Math.max(0, ...s.options.map((o) => this.balloonRun(o.body, 0)));
      } else if (s.type === 'if') {
        const results = s.branches.map((b) => this.balloonRun(b.body, run));
        results.push(s.elseBody ? this.balloonRun(s.elseBody, run) : run);
        run = Math.max(...results);
      }
    }
    return run;
  }

  // --- L12 effects ---------------------------------------------------------------------

  private sinTags(): { allowed: readonly string[]; known: readonly string[] } {
    const chapter1 = /^inf0[1-5]$/.test(this.id);
    return { allowed: this.isCanto && chapter1 ? SIN_TAGS_CH1 : SIN_TAGS_KNOWN, known: SIN_TAGS_KNOWN };
  }

  private l12Effects(): void {
    const tags = this.sinTags();
    for (const { stmt, ctx } of this.stmts) {
      if (stmt.type !== 'effects') continue;
      const weight = ctx.choice?.weight ?? null;
      for (const e of stmt.effects) {
        for (const f of validateEffect(e, { weight, sinTags: tags.allowed, knownSinTags: tags.known })) {
          this.add(f.severity, f.code, f.message, stmt.pos.line);
        }
      }
    }
    for (const c of this.choices) {
      for (const o of c.options) {
        for (const f of validateOptionTotals(deepEffects(o.body), c.weight)) {
          this.add(f.severity, f.code, `${c.id} option ${o.letter}: ${f.message}`, o.pos.line);
        }
      }
      if (this.isCanto && /^inf0[1-5]$/.test(this.id) && c.weight === 'centre' && c.id !== 'inf05.c4') {
        this.add('error', 'L12', `The centre weight is used once in Chapter 1, by inf05.c4 (§2.9)`, c.pos.line);
      }
    }
    // §3.2 choice budget.
    const dialogue = this.choices.filter((c) => !c.systemic);
    const systemic = this.choices.filter((c) => c.systemic);
    if (this.choices.length > 0 && !this.choices.some((c) => c.weight === 'major' || c.weight === 'centre')) {
      this.add('error', 'L12', 'Every canto has at least one major (or centre) choice (§3.2)');
    }
    if (this.choices.length === 0 && this.isCanto) this.add('error', 'L12', 'Every canto has at least one major (or centre) choice (§3.2)');
    if (dialogue.length > 3) this.add('error', 'L12', `${dialogue.length} dialogue choices; at most 3 per canto (§3.2)`);
    if (systemic.length > 3) this.add('error', 'L12', `${systemic.length} systemic measurements; at most 3 per canto (§3.2)`);
    this.bindingChoices();
  }

  /** §7 / §2.15: ids, letters, effects and REVEAL quotes of Chapter 1 choices are binding. */
  private bindingChoices(): void {
    const reg = this.reg;
    if (!reg) return;
    const expected = Object.values(reg.choices).filter((c) => c.canto === this.id);
    if (expected.length === 0) return;
    const mine = new Map(this.choices.map((c) => [c.id, c]));
    for (const exp of expected) {
      const got = mine.get(exp.id);
      if (!got) {
        this.add('error', 'L12', `Choice ${exp.id} (${exp.weight}${exp.systemic ? ', systemic' : ''}) from the §3.2 inventory is missing`);
        continue;
      }
      if (got.weight !== exp.weight) this.add('error', 'L12', `${got.id} is ${exp.weight} in §3.2 (found ${got.weight})`, got.pos.line);
      if (got.systemic !== exp.systemic) {
        this.add('error', 'L12', `${got.id} is ${exp.systemic ? 'a systemic measurement' : 'a dialogue choice'} in §3.2`, got.pos.line);
      }
      if (exp.scene && this.sceneOfBeat(got.beatId) !== exp.scene) {
        this.add('warning', 'L02', `${got.id} belongs in scene ${exp.scene} (§3.2); it is in ${this.sceneOfBeat(got.beatId)}`, got.pos.line);
      }
      const canon = canonicalChoice(reg, exp.id);
      if (!canon) continue;
      const letters = (c: ChoiceStmt): string => c.options.map((o) => o.letter).join(',');
      if (letters(canon) !== letters(got)) {
        this.add('error', 'L15', `${got.id} has options ${letters(got)}; the binding block has ${letters(canon)}`, got.pos.line);
      }
      for (const o of canon.options) {
        const g = got.options.find((x) => x.letter === o.letter);
        if (!g) continue;
        const want = deepEffects(o.body).map(formatEffect).sort();
        const have = deepEffects(g.body).map(formatEffect).sort();
        if (want.join(', ') !== have.join(', ')) {
          this.add(
            'error',
            'L12',
            `${got.id} option ${o.letter}: binding effects are "${want.join(', ') || '(none)'}" (found "${have.join(', ') || '(none)'}")`,
            g.pos.line,
          );
        }
        if (canon.systemic && o.whenRaw !== g.whenRaw && formatWhen(o.when) !== formatWhen(g.when)) {
          this.add('error', 'L12', `${got.id} option ${o.letter}: binding condition is "when: ${o.whenRaw ?? ''}" (found "when: ${g.whenRaw ?? ''}")`, g.pos.line);
        }
      }
      if (canon.reveal) {
        if (!got.reveal) {
          this.add('error', 'L14', `${got.id} needs its binding REVEAL (canon=${formatCanon(canon.reveal.canon)} timing=${canon.reveal.timing})`, got.pos.line);
        } else {
          const r = got.reveal;
          if (formatCanon(r.canon) !== formatCanon(canon.reveal.canon) || r.timing !== canon.reveal.timing) {
            this.add(
              'error',
              'L14',
              `${got.id}: binding REVEAL is canon=${formatCanon(canon.reveal.canon)} timing=${canon.reveal.timing} (found canon=${formatCanon(r.canon)} timing=${r.timing})`,
              r.pos.line,
            );
          }
          const sig = (qs: readonly QuoteStmt[]): string => qs.map((q) => `${q.voice} (${q.citation?.text ?? q.citationRaw})`).join('; ');
          if (sig(r.quotes) !== sig(canon.reveal.quotes)) {
            this.add('error', 'L14', `${got.id}: binding REVEAL quotes are ${sig(canon.reveal.quotes)} (found ${sig(r.quotes) || 'none'})`, r.pos.line);
          } else {
            r.quotes.forEach((q, i) => {
              const want = verseLines(canon.reveal?.quotes[i] as QuoteStmt).join(' / ');
              const have = verseLines(q).join(' / ');
              if (want !== have) this.add('warning', 'L14', `${got.id}: REVEAL lines differ from the binding block (${q.citationRaw})`, q.pos.line);
            });
          }
        }
      }
    }
    for (const c of this.choices) {
      if (!expected.some((e) => e.id === c.id) && ID_PATTERNS.choice.test(c.id)) {
        this.add('error', 'L12', `Choice ${c.id} is not in the §3.2 inventory (the lead writer adds choices)`, c.pos.line);
      }
    }
  }

  // --- L13 heart caps -------------------------------------------------------------------

  private heartTotals(script: CantoScript): Map<string, number> {
    return cantoTotals(script, (e) =>
      e.type === 'heart'
        ? [
            [e.side, e.amount],
            ['total', e.amount],
          ]
        : [],
    );
  }

  private l13Heart(): void {
    const totals = this.heartTotals(this.script);
    const hasCentre = this.choices.some((c) => c.weight === 'centre');
    const cap = hasCentre ? 4 : 3;
    const total = totals.get('total') ?? 0;
    if (total > cap) {
      this.add('error', 'L13', `One path through this canto writes up to ${total} heart points; the cap is ${cap} (§3.1)`);
    }
    const cantos = this.ctx.cantos;
    if (cantos && cantos.length > 0 && this.isCanto && /^inf0[1-5]$/.test(this.id)) {
      const byId = new Map<string, CantoScript>();
      for (const c of [...cantos, this.script]) if (/^inf0[1-5]$/.test(c.id) && !byId.has(c.id)) byId.set(c.id, c);
      byId.set(this.id, this.script);
      const chapter = [...byId.values()];
      // Reported once, on the last canto of the chapter that is present.
      if (this.id === [...byId.keys()].sort().slice(-1)[0]) {
        let pity = 0;
        let justice = 0;
        for (const c of chapter) {
          const t = this.heartTotals(c);
          pity += t.get('pity') ?? 0;
          justice += t.get('justice') ?? 0;
        }
        if (pity > 6) this.add('error', 'L13', `Across Chapter 1 pity can reach ${pity}; each counter ends the chapter at 6 at most (§3.1)`);
        if (justice > 6) this.add('error', 'L13', `Across Chapter 1 justice can reach ${justice}; each counter ends the chapter at 6 at most (§3.1)`);
      }
    }
  }

  // --- L14 reveals -----------------------------------------------------------------------

  private l14Reveals(): void {
    // Lines shown in each scene (beats), to spot cards that repeat them (§2.11).
    const shownByScene = new Map<string, { line: number; core: string }[]>();
    for (const { stmt, ctx } of this.stmts) {
      if (stmt.type !== 'quote' || !ctx.scene) continue;
      const nums = this.quoteLines.get(stmt) ?? [];
      const list = shownByScene.get(ctx.scene.id) ?? [];
      stmt.lines.forEach((l, i) => {
        const n = nums[i];
        if (l.kind === 'verse' && n != null) list.push({ line: n, core: verseCore(l.text).core });
      });
      shownByScene.set(ctx.scene.id, list);
    }
    for (const c of this.choices) {
      const letters = new Set(c.options.map((o) => o.letter));
      if (!c.reveal) {
        if (!c.systemic) this.add('error', 'L14', `Dialogue choice ${c.id} needs a REVEAL group with a NOTE`, c.pos.line);
        continue;
      }
      const r = c.reveal;
      if (r.note.trim().length === 0) this.add('error', 'L14', `REVEAL of ${c.id} needs exactly one NOTE line`, r.pos.line);
      if (r.quotes.length === 0 || r.quotes.length > 3) {
        this.add('error', 'L14', `REVEAL of ${c.id} carries 1–3 QUOTE blocks (found ${r.quotes.length})`, r.pos.line);
      }
      if (Array.isArray(r.canon)) {
        for (const l of r.canon) if (!letters.has(l)) this.add('error', 'L14', `REVEAL canon=${l}: ${c.id} has no option ${l}`, r.pos.line);
      }
      const shown = shownByScene.get(this.sceneOfBeat(c.beatId)) ?? [];
      for (const q of r.quotes) {
        const nums = this.quoteLines.get(q) ?? [];
        q.lines.forEach((l, i) => {
          const n = nums[i];
          if (l.kind !== 'verse' || n == null) return;
          const core = verseCore(l.text).core;
          if (shown.some((s) => s.line === n && (s.core.includes(core) || core.includes(s.core)))) {
            this.add('warning', 'L14', `REVEAL of ${c.id} repeats line ${n}, which the scene already shows (§2.11)`, q.pos.line);
          }
        });
      }
    }
  }

  // --- L15 options -----------------------------------------------------------------------

  private l15Options(): void {
    for (const c of this.choices) {
      const letters = c.options.map((o) => o.letter);
      const expected = OPTION_LETTERS.slice(0, letters.length);
      if (letters.join(',') !== expected.join(',')) {
        this.add('error', 'L15', `${c.id}: option letters run a, b, c in order without gaps (found ${letters.join(', ') || 'none'})`, c.pos.line);
      }
      if (c.options.length < 2 || c.options.length > 3) {
        this.add('error', 'L15', `${c.id} has ${c.options.length} option${c.options.length === 1 ? '' : 's'}; a choice has 2–3`, c.pos.line);
      }
      if (c.systemic) {
        c.options.forEach((o, i) => {
          const last = i === c.options.length - 1;
          if (o.requires) this.add('error', 'L15', `${c.id} option ${o.letter}: requires: is for dialogue choices; systemic options use when:`, o.pos.line);
          if (o.when === null) this.add('error', 'L15', `${c.id} option ${o.letter}: systemic options need a when: clause`, o.pos.line);
          else if (o.when === 'else' && !last) this.add('error', 'L15', `${c.id} option ${o.letter}: when: else must be the last option`, o.pos.line);
          if (last && o.when !== 'else') this.add('error', 'L15', `${c.id}: the last systemic option is "when: else"`, o.pos.line);
        });
      } else {
        for (const o of c.options) {
          if (o.when !== null) this.add('error', 'L15', `${c.id} option ${o.letter}: when: is for systemic choices; use requires:`, o.pos.line);
        }
        this.visibility(c);
      }
      // L16: no system terms or numbers in option texts.
      for (const o of c.options) {
        const term = SYSTEM_TERMS.exec(o.text);
        if (term) this.add('error', 'L16', `${c.id} option ${o.letter}: no system terms in option texts ("${term[0]}")`, o.pos.line);
        if (/\d/.test(o.text)) this.add('error', 'L16', `${c.id} option ${o.letter}: no numbers in option texts`, o.pos.line);
      }
      if (c.prompt) {
        const term = SYSTEM_TERMS.exec(c.prompt);
        if (term) this.add('warning', 'L16', `${c.id}: PROMPT uses the system term "${term[0]}"`, c.pos.line);
      }
    }
  }

  /** Every state must leave at least two options visible (requires: clauses as independent switches). */
  private visibility(c: ChoiceStmt): void {
    const conds = c.options.map((o) => o.requires);
    if (conds.filter((x) => x === null).length >= 2) return;
    const atoms = new Map<string, Condition>();
    for (const cond of conds) if (cond) for (const a of conditionAtoms(cond)) if (a.type !== 'const') atoms.set(formatCondition(a), a);
    const keys = [...atoms.keys()];
    if (keys.length > 12) {
      this.add('info', 'L15', `${c.id}: too many requires: predicates to check that two options always show`, c.pos.line);
      return;
    }
    for (let mask = 0; mask < 1 << keys.length; mask++) {
      const value = new Map(keys.map((k, i) => [k, (mask & (1 << i)) !== 0]));
      const visible = conds.filter((cond) => cond === null || evalWith(cond, value)).length;
      if (visible < 2) {
        const state = keys.map((k) => `${k}=${value.get(k) ? 'true' : 'false'}`).join(', ');
        this.add('error', 'L15', `${c.id}: when ${state || 'nothing holds'}, only ${visible} option${visible === 1 ? '' : 's'} would show; at least two must`, c.pos.line);
        return;
      }
    }
  }

  // --- L17 front matter lists --------------------------------------------------------------

  private contentLists(): {
    choices: string[];
    words: string[];
    codex: string[];
    memories: string[];
    flagsSet: string[];
    flagsRead: string[];
    unlocks: string[];
  } {
    const all = this.script.scenes.flatMap((s) => s.beats.flatMap((b) => deepEffects(b.lines)));
    const totals = sumEffects(all);
    const flagsRead = new Set<string>();
    const readConds = (cond: Condition | 'else' | null): void => {
      if (!cond || cond === 'else') return;
      for (const f of conditionRefs(cond).flags) if (!f.startsWith(`${this.id}.`)) flagsRead.add(f);
    };
    for (const { stmt } of this.stmts) {
      if (stmt.type === 'if') for (const b of stmt.branches) readConds(b.condition);
      if (stmt.type === 'choice') for (const o of stmt.options) {
        readConds(o.requires);
        readConds(o.when);
      }
    }
    const firstGiven = totals.words.filter((w) => {
      if (!this.isCanto) return true;
      const def = getWord(w);
      return !def || def.canto === this.id || !/^inf0[1-5]$/.test(def.canto) || def.canto > this.id;
    });
    return {
      choices: this.choices.map((c) => c.id),
      words: [...new Set(firstGiven)],
      codex: [...new Set(totals.codex)],
      memories: [...new Set(totals.memories)],
      flagsSet: [...new Set(totals.flags)],
      flagsRead: [...flagsRead],
      unlocks: [...new Set(totals.unlocks)],
    };
  }

  private l17Lists(): void {
    const f = this.script.front;
    const c = this.contentLists();
    const pairs: [string, readonly string[], readonly string[]][] = [
      ['choices', f.choices, c.choices],
      ['words', f.words, c.words],
      ['codex', f.codex, c.codex],
      ['memories', f.memories, c.memories],
      ['flags_set', f.flags_set, c.flagsSet],
      ['flags_read', f.flags_read, c.flagsRead],
      ['unlocks', f.unlocks, c.unlocks],
    ];
    for (const [key, listed, actual] of pairs) {
      const diff = sameSet(listed, actual);
      if (diff.extra.length > 0) this.add('error', 'L17', `Front matter ${key} lacks ${diff.extra.join(', ')} (used in the script)`);
      if (diff.missing.length > 0) this.add('error', 'L17', `Front matter ${key} lists ${diff.missing.join(', ')}, which the script never ${key === 'flags_read' ? 'reads' : key === 'choices' ? 'contains' : 'gives'}`);
    }
  }

  // --- L18 flags ------------------------------------------------------------------------------

  private l18Flags(): void {
    for (const { stmt, ctx } of this.stmts) {
      if (stmt.type === 'effects') {
        for (const e of stmt.effects) {
          if (e.type === 'flag') {
            if (/^(ch\d+|sys)\./.test(e.id)) this.add('error', 'L18', `flag:${e.id}: ch<n>. and sys. flags are raised only by the engine (§4.7)`, stmt.pos.line);
            else if (!e.id.startsWith(`${this.id}.`)) this.add('error', 'L18', `flag:${e.id} must carry this file's prefix ${this.id}.`, stmt.pos.line);
          }
          if ((e.type === 'codex' || e.type === 'memory') && !e.id.startsWith(`${this.id}.`)) {
            this.add('error', 'L18', `${e.type}:${e.id}: ids made in this file carry its prefix ${this.id}.`, stmt.pos.line);
          }
        }
      }
      if (stmt.type === 'do') {
        for (const t of stmt.tags) {
          if (t.kind === 'event' && !t.id.startsWith(`${this.id}.`)) {
            this.add('warning', 'L18', `{event:${t.id}}: events of this canto carry its prefix ${this.id}.`, stmt.pos.line);
          }
        }
      }
      const reads: { cond: Condition | 'else' | null; line: number }[] = [];
      if (stmt.type === 'if') for (const b of stmt.branches) reads.push({ cond: b.condition, line: b.pos.line });
      if (stmt.type === 'choice') for (const o of stmt.options) reads.push({ cond: o.requires, line: o.pos.line }, { cond: o.when, line: o.pos.line });
      for (const { cond, line } of reads) {
        if (!cond || cond === 'else') continue;
        for (const flag of conditionRefs(cond).flags) this.checkFlagRead(flag, ctx.scene?.id ?? null, line);
      }
    }
  }

  private checkFlagRead(flag: string, scene: string | null, line: number): void {
    if (flag.startsWith(`${this.id}.`) || /^(ch\d+|sys)\./.test(flag)) return;
    const owner = flag.slice(0, 5);
    if (ID_PATTERNS.canto.test(owner) && owner > this.id && owner.slice(0, 3) === this.id.slice(0, 3)) {
      this.add('error', 'L18', `flag:${flag} belongs to a later canto; it cannot be set yet`, line);
    }
    if (!this.reg) return;
    const entry = this.reg.flags[flag];
    if (!entry) {
      this.add('error', 'L18', `flag:${flag} is read from another canto but is not registered in §4.3`, line);
      return;
    }
    if (scene && entry.readers.length > 0 && !entry.readers.includes(scene)) {
      this.add('warning', 'L18', `flag:${flag} is registered for ${entry.readers.join(', ')} (§4.3), not ${scene}`, line);
    }
    if (entry.readers.length === 0) this.add('warning', 'L18', `§4.3 lists no Chapter 1 reader for flag:${flag}`, line);
  }

  // --- L19 words ---------------------------------------------------------------------------------

  private l19Words(): void {
    const sealedSomewhere = new Set<string>();
    for (const c of [this.script, ...(this.ctx.cantos ?? [])]) {
      if (c.id > this.id && c !== this.script) continue;
      for (const s of c.scenes) for (const b of s.beats) for (const e of deepEffects(b.lines)) if (e.type === 'seal') sealedSomewhere.add(e.word);
    }
    // Seals made by the binding choice blocks of earlier cantos count too (their scripts may not exist yet).
    if (this.reg) {
      for (const ch of Object.values(this.reg.choices)) {
        if (ch.canto >= this.id) continue;
        const canon = canonicalChoice(this.reg, ch.id);
        for (const o of canon?.options ?? []) for (const e of deepEffects(o.body)) if (e.type === 'seal') sealedSomewhere.add(e.word);
      }
    }
    const checkLists = (stmts: readonly Statement[], beat: Beat, scene: Scene, option: { choice: ChoiceStmt; option: ChoiceOption } | null): void => {
      stmts.forEach((s, i) => {
        if (s.type === 'if') {
          for (const b of s.branches) checkLists(b.body, beat, scene, option);
          if (s.elseBody) checkLists(s.elseBody, beat, scene, option);
          return;
        }
        if (s.type === 'choice') {
          for (const o of s.options) checkLists(o.body, beat, scene, { choice: s, option: o });
          return;
        }
        if (s.type !== 'effects') return;
        for (const e of s.effects) {
          if (e.type !== 'word' && e.type !== 'seal' && e.type !== 'shed') continue;
          const def = getWord(e.word);
          if (!def) {
            this.add('error', 'L19', `${e.type}:${e.word}: no such word in the §3.4.6 table (writers do not invent words)`, s.pos.line);
            continue;
          }
          if (e.type === 'shed' && def.role !== 'burden') this.add('error', 'L19', `shed:${e.word}: only Burden words are shed`, s.pos.line);
          if (e.type === 'seal' && def.role === 'burden') this.add('error', 'L19', `seal:${e.word}: a Burden word cannot be sealed`, s.pos.line);
          if (e.type !== 'word') continue;
          if (this.isCanto && /^inf0[1-5]$/.test(this.id)) {
            if (def.canto === this.id) {
              if (def.scene !== scene.id) this.add('warning', 'L19', `word:${e.word} is given in ${def.scene} (§3.4.6), not ${scene.id}`, s.pos.line);
            } else if (!sealedSomewhere.has(e.word)) {
              this.add(
                this.ctx.cantos ? 'error' : 'warning',
                'L19',
                `word:${e.word} belongs to ${def.canto} (§3.4.6); here it can only unseal a word sealed earlier${this.ctx.cantos ? '' : ' (lint the whole chapter to confirm)'}`,
                s.pos.line,
              );
            }
            if (def.acquisition === 'conditional' && def.condition) {
              const m = /^choice:([^=]+)=([abc])$/.exec(def.condition);
              if (m && (!option || option.choice.id !== m[1] || option.option.letter !== m[2])) {
                this.add('warning', 'L19', `word:${e.word} is conditional on ${def.condition} (§3.4.6); give it inside that option`, s.pos.line);
              }
            }
          }
          // §3.4.2 rule 7: when the beat shows the origin line, EFFECTS comes right after that QUOTE.
          const shows = this.beatShowsLine(beat, def.origin.canticle, def.origin.canto, def.origin.line);
          if (shows) {
            const prev = stmts[i - 1];
            const right = prev && prev.type === 'quote' && this.quoteHasLine(prev, def.origin.line);
            if (!right) this.add('warning', 'L19', `word:${e.word}: write this EFFECTS line right after the QUOTE showing its origin line (§3.4.2)`, s.pos.line);
          }
        }
      });
    };
    for (const scene of this.script.scenes) for (const beat of scene.beats) checkLists(beat.lines, beat, scene, null);
    // A word is given at most once per path (unless sealed in between).
    const counts = cantoTotals(this.script, (e) => (e.type === 'word' ? [[e.word, 1]] : []));
    for (const [w, n] of counts) {
      if (n > 1 && !sealedSomewhere.has(w)) this.add('warning', 'L19', `word:${w} can be given ${n} times on one path; words are given once (§2.10)`);
    }
  }

  private quoteHasLine(q: QuoteStmt, line: number): boolean {
    return (this.quoteLines.get(q) ?? q.lines.map((l) => (l.kind === 'verse' ? l.lineNo : null))).includes(line);
  }

  private beatShowsLine(beat: Beat, canticle: string, canto: number, line: number): boolean {
    let found = false;
    const visit = (stmts: readonly Statement[]): void => {
      for (const s of stmts) {
        if (s.type === 'quote' && s.citation?.canticle === canticle && s.citation.canto === canto && this.quoteHasLine(s, line)) found = true;
        if (s.type === 'if') {
          for (const b of s.branches) visit(b.body);
          if (s.elseBody) visit(s.elseBody);
        }
        if (s.type === 'choice') for (const o of s.options) visit(o.body);
      }
    };
    visit(beat.lines);
    return found;
  }

  // --- L20 codex and memories ---------------------------------------------------------------------

  private l20Codex(): void {
    const s = this.script;
    const defined = new Map<string, number>();
    for (const e of s.codex) {
      const prev = defined.get(e.id);
      if (prev !== undefined) this.add('error', 'L20', `Codex entry ${e.id} is defined twice (first at line ${prev})`, e.pos.line);
      else defined.set(e.id, e.pos.line);
      if (!e.quote) this.add('error', 'L20', `Codex entry ${e.id} needs a QUOTE (1–6 lines)`, e.pos.line);
      if (e.note.trim().length === 0) this.add('error', 'L20', `Codex entry ${e.id} needs a NOTE`, e.pos.line);
      if (!e.id.startsWith(`${this.id}.`)) this.add('error', 'L20', `Codex entry ${e.id} must carry this file's prefix ${this.id}.`, e.pos.line);
    }
    const memDefined = new Map<string, number>();
    for (const e of s.memories) {
      const prev = memDefined.get(e.id);
      if (prev !== undefined) this.add('error', 'L20', `Memory ${e.id} is defined twice (first at line ${prev})`, e.pos.line);
      else memDefined.set(e.id, e.pos.line);
      if (!e.quote) this.add('error', 'L20', `Memory ${e.id} needs a QUOTE of the soul's own line (1–3 lines)`, e.pos.line);
      if (e.note.trim().length === 0) this.add('error', 'L20', `Memory ${e.id} needs a NOTE`, e.pos.line);
      const reg = this.reg?.memories.find((m) => m.id === e.id);
      if (reg && reg.kind !== e.kind) this.add('warning', 'L20', `Memory ${e.id} is "${reg.kind}" in §4.6 (found ${e.kind})`, e.pos.line);
    }
    const given = new Set<string>();
    const memGiven = new Set<string>();
    for (const { stmt } of this.stmts) {
      if (stmt.type !== 'effects') continue;
      for (const e of stmt.effects) {
        if (e.type === 'codex') {
          given.add(e.id);
          if (!defined.has(e.id)) this.add('error', 'L20', `codex:${e.id} is not defined under ## Codex`, stmt.pos.line);
        }
        if (e.type === 'memory') {
          memGiven.add(e.id);
          if (!memDefined.has(e.id)) this.add('error', 'L20', `memory:${e.id} is not defined under ## Memories`, stmt.pos.line);
        }
      }
    }
    for (const [id, line] of defined) if (!given.has(id)) this.add('warning', 'L20', `Codex entry ${id} is never given (EFFECTS: codex:${id})`, line);
    for (const [id, line] of memDefined) if (!memGiven.has(id)) this.add('warning', 'L20', `Memory ${id} is never given (EFFECTS: memory:${id})`, line);
    const counts = cantoTotals(s, (e) => (e.type === 'codex' || e.type === 'memory' ? [[`${e.type}:${e.id}`, 1]] : []));
    for (const [key, n] of counts) {
      if (n > 1) this.add('error', 'L20', `${key} can be given ${n} times on one path; at most once (§2.10)`);
    }
    // RELATED links point at known entries.
    const known = new Set<string>([...defined.keys()]);
    for (const c of this.ctx.cantos ?? []) for (const e of c.codex) known.add(e.id);
    for (const list of Object.values(this.reg?.codexPlan ?? {})) for (const id of list) known.add(id);
    for (const e of s.codex) {
      for (const r of e.related) {
        if (!ID_PATTERNS.named.test(r)) this.add('error', 'L20', `${e.id}: RELATED "${r}" is not a codex id`, e.pos.line);
        else if (!known.has(r)) this.add('warning', 'L20', `${e.id}: RELATED ${r} is not a known codex entry`, e.pos.line);
      }
    }
    // §4.5 minimum plan.
    for (const id of this.reg?.codexPlan[this.id] ?? []) {
      if (!defined.has(id)) this.add('warning', 'L20', `Codex entry ${id} from the §4.5 plan is missing`);
    }
  }

  // --- L21 flow -------------------------------------------------------------------------------------

  private l21Flow(): void {
    const beatIndex = new Map<string, { scene: string; index: number }>();
    for (const scene of this.script.scenes) scene.beats.forEach((b, i) => beatIndex.set(b.id, { scene: scene.id, index: i }));
    for (const { stmt, ctx } of this.stmts) {
      if (stmt.type === 'if' && ctx.ifDepth >= 2) {
        this.add('error', 'L21', 'IF blocks nest at most two levels deep (§2.8)', stmt.pos.line);
      }
      if (stmt.type === 'choice' && ctx.option) this.add('error', 'L21', 'Choices are not nested (§2.9)', stmt.pos.line);
      if (stmt.type !== 'goto') continue;
      const target = beatIndex.get(stmt.target);
      const here = ctx.beat ? beatIndex.get(ctx.beat.id) : undefined;
      if (!target) {
        this.add('error', 'L21', `GOTO ${stmt.target}: no such beat in this canto`, stmt.pos.line);
      } else if (ctx.scene && target.scene !== ctx.scene.id) {
        this.add('error', 'L21', `GOTO ${stmt.target} leaves scene ${ctx.scene.id}; a GOTO stays in its scene`, stmt.pos.line);
      } else if (here && target.index <= here.index) {
        this.add('warning', 'L21', `GOTO ${stmt.target} jumps backwards; branches rejoin the spine later in the scene`, stmt.pos.line);
      }
      const body = ctx.option?.body;
      if (!ctx.option || ctx.ifDepth > 0 || body?.[body.length - 1] !== stmt) {
        this.add('error', 'L21', 'GOTO is only allowed as the last line of an OPTION (§2.9)', stmt.pos.line);
      }
    }
    for (const scene of this.script.scenes) {
      for (const beat of scene.beats) {
        if (beat.trigger.kind !== 'after') continue;
        const target = beatIndex.get(beat.trigger.beat);
        if (!target) this.add('error', 'L21', `@trigger after:${beat.trigger.beat}: no such beat in this canto`, beat.pos.line);
        else if (target.scene === scene.id && target.index >= (beatIndex.get(beat.id)?.index ?? 0)) {
          this.add('warning', 'L21', `@trigger after:${beat.trigger.beat} waits for a later beat`, beat.pos.line);
        }
      }
    }
    // Systemic when: event: should be emitted by a DO tag earlier in the same scene.
    for (const c of this.choices) {
      if (!c.systemic) continue;
      const scene = this.sceneOfBeat(c.beatId);
      const documented = new Set<string>();
      for (const { stmt, ctx } of this.stmts) {
        if (ctx.scene?.id !== scene || stmt.type !== 'do') continue;
        if (stmt.pos.line > c.pos.line) continue;
        for (const t of stmt.tags) if (t.kind === 'event') documented.add(t.id);
      }
      for (const o of c.options) {
        if (!o.when || o.when === 'else') continue;
        for (const ev of conditionRefs(o.when).events) {
          if (!documented.has(ev)) {
            this.add('warning', 'L21', `${c.id} option ${o.letter} listens for event:${ev}, but no DO line of scene ${scene} emits it ({event:${ev}}) before the CHOICE`, o.pos.line);
          }
          if (this.reg && !this.reg.events.includes(ev)) {
            this.add('warning', 'L18', `event:${ev} is not in the §4.9 list of events that systemic choices listen to`, o.pos.line);
          }
        }
      }
    }
  }

  // --- L22 typography -------------------------------------------------------------------------------

  private l22Typography(): void {
    const check = (text: string, line: number, what: string): void => {
      if (/[“”‘’]/.test(text)) this.add('error', 'L22', `Smart quotes in ${what}; use straight " and ' (§2.1)`, line);
      if (text.includes('...')) this.add('error', 'L22', `"..." in ${what}; use the single character … (§2.1)`, line);
    };
    for (const item of this.allTexts()) check(item.text, item.line, item.kind);
    for (const site of collectQuotes(this.script)) {
      const q = site.quote;
      for (const l of q.lines) if (l.kind === 'verse') check(l.text, l.pos.line, 'a verse line');
      if (/\d\s*-\s*\d/.test(q.citationRaw)) this.add('error', 'L22', `Citation "${q.citationRaw}" uses a hyphen; ranges take an en dash (–)`, q.pos.line);
    }
    const f = this.script.front;
    for (const [key, value] of [
      ['epigraph', f.epigraph],
      ['closing', f.closing],
    ] as const) {
      if (/\d\s*-\s*\d/.test(value)) this.add('error', 'L22', `Front matter ${key} "${value}" uses a hyphen; ranges take an en dash (–)`);
    }
    for (const [key, value] of [
      ['lines', f.lines],
      ['playtime', f.playtime],
    ] as const) {
      if (/\d\s*-\s*\d/.test(value)) this.add('warning', 'L22', `Front matter ${key} "${value}": write ranges with an en dash (–)`);
    }
    for (const [key, value] of [
      ['title', f.title],
      ['location', f.location],
    ] as const) {
      check(value, 1, `front matter ${key}`);
    }
  }

  // --- §7 registers: scenes and what they give -------------------------------------------------------

  private registerChecks(): void {
    const bible = this.reg?.cantos[this.id];
    if (!bible) return;
    const s = this.script;
    const byId = new Map(s.scenes.map((x) => [x.id, x]));
    let lastIndex = -1;
    const bibleIds = new Set(bible.scenes.map((x) => x.id));
    const maxBible = Math.max(...bible.scenes.map((x) => Number(x.id.split('.s')[1])));
    for (const b of bible.scenes) {
      const scene = byId.get(b.id);
      if (!scene) {
        this.add('error', 'L02', `Scene ${b.id} "${b.title}" from §7 is missing`);
        continue;
      }
      if (scene.title !== b.title) this.add('warning', 'L02', `Scene ${b.id} is called "${b.title}" in §7 (found "${scene.title}")`, scene.pos.line);
      if (scene.index < lastIndex) this.add('error', 'L02', `Scene ${b.id} is out of the §7 order`, scene.pos.line);
      lastIndex = Math.max(lastIndex, scene.index);
      const modes = new Set(scene.beats.map((x) => x.mode));
      for (const m of b.modes) {
        if (!modes.has(m)) this.add('info', 'L03', `§7 plays ${b.id} partly in ${m} mode; no beat of the scene uses it`, scene.pos.line);
      }
    }
    for (const scene of s.scenes) {
      if (bibleIds.has(scene.id) || scene.number < 0) continue;
      if (scene.number <= maxBible) {
        this.add('error', 'L02', `Scene ${scene.id} is not in §7; a new scene takes the next free number (s${maxBible + 1}…)`, scene.pos.line);
      } else {
        this.add('info', 'L02', `Scene ${scene.id} is an addition to the §7 scene list`, scene.pos.line);
      }
    }
    // What each scene gives (§7 "Verilenler").
    const effectsByScene = new Map<string, Set<string>>();
    const sceneOfToken = new Map<string, string>();
    for (const { stmt, ctx } of this.stmts) {
      const sceneId = ctx.scene?.id;
      if (!sceneId) continue;
      if (stmt.type === 'effects') {
        for (const e of stmt.effects) {
          const tok = formatEffect(e);
          const set = effectsByScene.get(sceneId) ?? new Set<string>();
          set.add(tok);
          effectsByScene.set(sceneId, set);
          if (!sceneOfToken.has(tok)) sceneOfToken.set(tok, sceneId);
        }
      }
      if (stmt.type === 'choice') {
        const set = effectsByScene.get(sceneId) ?? new Set<string>();
        set.add(stmt.id);
        effectsByScene.set(sceneId, set);
        if (!sceneOfToken.has(stmt.id)) sceneOfToken.set(stmt.id, sceneId);
      }
    }
    for (const b of bible.scenes) {
      for (const tok of b.gives) {
        const norm = tok.replace(/^@.*$/, '');
        if (!norm) continue;
        const here = effectsByScene.get(b.id)?.has(norm) ?? false;
        if (here) continue;
        const elsewhere = sceneOfToken.get(norm);
        const code = norm.startsWith('word:') ? 'L19' : norm.startsWith('codex:') ? 'L20' : ID_PATTERNS.choice.test(norm) ? 'L02' : 'L17';
        if (elsewhere) this.add('warning', code, `§7 gives ${norm} in ${b.id}; the script gives it in ${elsewhere}`);
        else this.add('error', code, `§7 gives ${norm} in ${b.id}; the script never does`);
      }
    }
  }
}

function formatCanon(canon: readonly string[] | 'all' | 'none'): string {
  return Array.isArray(canon) ? canon.join(',') : (canon as string);
}

function formatWhen(when: Condition | 'else' | null): string {
  return when === null ? '' : when === 'else' ? 'else' : formatCondition(when);
}

/** Evaluates a condition with atoms set from a truth table (keys: formatCondition of the atom). */
function evalWith(cond: Condition, value: ReadonlyMap<string, boolean>): boolean {
  switch (cond.type) {
    case 'and':
      return cond.terms.every((t) => evalWith(t, value));
    case 'or':
      return cond.terms.some((t) => evalWith(t, value));
    case 'not':
      return !evalWith(cond.term, value);
    case 'const':
      return cond.value;
    default:
      return value.get(formatCondition(cond)) ?? false;
  }
}
