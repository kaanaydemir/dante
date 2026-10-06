/**
 * Condition grammar (bible §2.8): tokenize, parse, evaluate, format, inspect.
 *
 * Owner: team A (story-core). Pure TypeScript (no Phaser, no DOM).
 * Frozen exports (docs/ENGINE.md): `parseCondition(text, pos?)`,
 * `evaluateCondition(cond, ctx)`, `ConditionParse`.
 *
 * Grammar (bible §2.8):
 *
 *   condition := term { ("and" | "or") term }      "and" binds tighter than "or"
 *   term      := "not" term | "(" condition ")" | predicate
 *   predicate := flag:<id> | memory:<id> | codex:<id> | word:<Word> | sealed:<Word>
 *              | choice:<choice-id>=<letter> | seen:<scene-id | beat-id> | event:<id>
 *              | <variable><op><integer>            no spaces: trust>=7, heart<=-3
 *   variable  := pity | justice | heart | pity@<sin> | justice@<sin> | trust
 *              | virtue:prudence | virtue:justice | virtue:fortitude | virtue:temperance
 *              | resolve | grace
 *   op        := >= | <= | > | < | == | !=
 *
 * Robustness: parsing never throws. A malformed condition (any error-severity
 * finding) degrades to `{ type: 'const', value: false }` plus diagnostics, so
 * the runner simply skips the guarded lines. Harmless deviations (spaces around
 * an operator, upper-case keywords) are normalised with a warning.
 *
 * Diagnostic codes:
 *   P10  syntax error (parentheses, missing operand, dangling operator, empty condition)
 *   P11  unknown predicate or variable
 *   P12  malformed id or value inside a predicate
 *   P13  normalised style problem (warning): spaces inside a predicate, upper-case keyword
 */

import {
  COMPARE_OPS,
  ID_PATTERNS,
  OPTION_LETTERS,
  SIN_TAGS_KNOWN,
  VIRTUES,
  type CompareOp,
  type Condition,
  type ConditionContext,
  type Diagnostic,
  type OptionLetter,
  type Severity,
  type SourcePos,
  type VariableRef,
  type Virtue,
} from './types';

export interface ConditionParse {
  readonly condition: Condition;
  readonly diagnostics: readonly Diagnostic[];
}

/** The constant a malformed condition degrades to. */
export const FALSE_CONDITION: Condition = Object.freeze({ type: 'const', value: false }) as Condition;

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenKind = 'lparen' | 'rparen' | 'and' | 'or' | 'not' | 'word';

interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  /** 1-based column in the condition text. */
  readonly col: number;
}

interface RawWord {
  text: string;
  col: number;
}

const OPERATOR_ONLY = /^(>=|<=|==|!=|=>|=<|=|>|<)$/;
const ENDS_WITH_OPERATOR = /(>=|<=|==|!=|>|<|=)$/;
const STARTS_WITH_OPERATOR = /^(>=|<=|==|!=|>|<|=)/;
const PREDICATE_KINDS = ['flag', 'memory', 'codex', 'word', 'sealed', 'choice', 'seen', 'event'] as const;

interface Collector {
  readonly diagnostics: Diagnostic[];
  readonly text: string;
  readonly pos: SourcePos | undefined;
  errors: number;
}

function report(c: Collector, severity: Severity, code: string, message: string, col?: number): void {
  if (severity === 'error') c.errors += 1;
  const where = col !== undefined ? ` (column ${col})` : '';
  c.diagnostics.push({
    severity,
    code,
    message: `${message}${where} in condition "${c.text}"`,
    ...(c.pos ? { pos: c.pos } : {}),
  });
}

/** Splits on whitespace and parentheses, remembering 1-based columns. */
function splitWords(text: string): (RawWord | { paren: '(' | ')'; col: number })[] {
  const out: (RawWord | { paren: '(' | ')'; col: number })[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i] as string;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '(' || ch === ')') {
      out.push({ paren: ch, col: i + 1 });
      i += 1;
      continue;
    }
    const start = i;
    while (i < text.length && !/[\s()]/.test(text[i] as string)) i += 1;
    out.push({ text: text.slice(start, i), col: start + 1 });
  }
  return out;
}

function isKeyword(word: string): 'and' | 'or' | 'not' | null {
  const lower = word.toLowerCase();
  return lower === 'and' || lower === 'or' || lower === 'not' ? lower : null;
}

/**
 * Tokenizes a condition. Re-joins predicates that were split by stray spaces
 * (`trust >= 7`, `flag: inf03.left_hope`, `choice:inf05.c4 = a`) with a P13 warning.
 */
function tokenize(c: Collector): Token[] {
  const pieces = splitWords(c.text);
  const tokens: Token[] = [];
  let k = 0;
  while (k < pieces.length) {
    const piece = pieces[k] as RawWord | { paren: '(' | ')'; col: number };
    if ('paren' in piece) {
      tokens.push({ kind: piece.paren === '(' ? 'lparen' : 'rparen', text: piece.paren, col: piece.col });
      k += 1;
      continue;
    }
    let word = piece.text;
    const col = piece.col;
    let merged = false;
    // Greedily absorb the following words while the predicate is visibly incomplete.
    for (;;) {
      const next = pieces[k + 1];
      if (!next || 'paren' in next || isKeyword(next.text)) break;
      const prefixOnly = PREDICATE_KINDS.some((kind) => word === `${kind}:`) || /^virtue:$/.test(word);
      if (
        OPERATOR_ONLY.test(next.text) ||
        ENDS_WITH_OPERATOR.test(word) ||
        STARTS_WITH_OPERATOR.test(next.text) ||
        prefixOnly
      ) {
        word += next.text;
        k += 1;
        merged = true;
        continue;
      }
      break;
    }
    if (merged) report(c, 'warning', 'P13', `Predicates contain no spaces; read as "${word}"`, col);
    const kw = isKeyword(word);
    if (kw) {
      if (word !== kw) report(c, 'warning', 'P13', `Keywords are lower case; read "${word}" as "${kw}"`, col);
      tokens.push({ kind: kw, text: kw, col });
    } else {
      tokens.push({ kind: 'word', text: word, col });
    }
    k += 1;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------

const SIMPLE_VARIABLES: Readonly<Record<string, VariableRef>> = {
  pity: { kind: 'pity' },
  justice: { kind: 'justice' },
  heart: { kind: 'heart' },
  trust: { kind: 'trust' },
  resolve: { kind: 'resolve' },
  grace: { kind: 'grace' },
};

/** Parses a variable name (`pity`, `pity@lust`, `virtue:fortitude`, …). */
export function parseVariable(name: string): VariableRef | null {
  const simple = SIMPLE_VARIABLES[name];
  if (simple) return simple;
  const at = /^(pity|justice)@([a-z][a-z0-9_]*)$/.exec(name);
  if (at) {
    const sin = at[2] as string;
    return at[1] === 'pity' ? { kind: 'pity_at', sin } : { kind: 'justice_at', sin };
  }
  const virtue = /^virtue:([a-z]+)$/.exec(name);
  if (virtue && (VIRTUES as readonly string[]).includes(virtue[1] as string)) {
    return { kind: 'virtue', virtue: virtue[1] as Virtue };
  }
  return null;
}

/** Canonical text of a variable (inverse of parseVariable). */
export function formatVariable(v: VariableRef): string {
  switch (v.kind) {
    case 'pity_at':
      return `pity@${v.sin}`;
    case 'justice_at':
      return `justice@${v.sin}`;
    case 'virtue':
      return `virtue:${v.virtue}`;
    default:
      return v.kind;
  }
}

function parsePredicate(token: Token, c: Collector): Condition {
  const text = token.text;
  const col = token.col;

  // Comparisons: <variable><op><integer>
  const cmp = /^([a-z_]+(?:@[a-z0-9_]+|:[a-z_]+)?)(>=|<=|==|!=|=>|=<|=|>|<)(.*)$/.exec(text);
  if (cmp && !PREDICATE_KINDS.some((k) => text.startsWith(`${k}:`))) {
    const name = cmp[1] as string;
    const op = cmp[2] as string;
    const rest = cmp[3] as string;
    const variable = parseVariable(name);
    if (!variable) {
      const virtue = /^virtue:(.*)$/.exec(name);
      if (virtue) {
        report(c, 'error', 'P11', `Unknown virtue "${virtue[1]}" (expected ${VIRTUES.join(', ')})`, col);
      } else {
        report(c, 'error', 'P11', `Unknown variable "${name}"`, col);
      }
      return FALSE_CONDITION;
    }
    if (op === '=' || op === '=>' || op === '=<') {
      const fixed = op === '=' ? '==' : op === '=>' ? '>=' : '<=';
      report(c, 'error', 'P10', `Unknown operator "${op}" (did you mean "${fixed}"?)`, col);
      return FALSE_CONDITION;
    }
    if (!/^-?\d+$/.test(rest)) {
      report(c, 'error', 'P12', `Comparison needs an integer after "${op}", found "${rest}"`, col);
      return FALSE_CONDITION;
    }
    if (variable.kind === 'pity_at' || variable.kind === 'justice_at') {
      if (!(SIN_TAGS_KNOWN as readonly string[]).includes(variable.sin)) {
        report(c, 'warning', 'P12', `Unknown sin tag "${variable.sin}" (known: ${SIN_TAGS_KNOWN.join(', ')})`, col);
      }
    }
    return { type: 'compare', variable, op: op as CompareOp, value: Number(rest) };
  }

  const kv = /^([a-z]+):(.*)$/.exec(text);
  if (!kv) {
    if (text === 'else') {
      report(c, 'error', 'P10', '"else" is only valid as a whole `when: else` clause of a systemic OPTION', col);
    } else if (text === '&&' || text === '||' || text === '!') {
      report(c, 'error', 'P10', `Use "and", "or" and "not" instead of "${text}"`, col);
    } else if (/^[a-z_]+$/.test(text) && parseVariable(text)) {
      report(c, 'error', 'P10', `Variable "${text}" needs a comparison, e.g. ${text}>=1`, col);
    } else {
      report(c, 'error', 'P11', `Unknown predicate "${text}"`, col);
    }
    return FALSE_CONDITION;
  }
  const kind = kv[1] as string;
  const value = kv[2] as string;
  if (value.length === 0) {
    report(c, 'error', 'P12', `Predicate "${kind}:" has no value`, col);
    return FALSE_CONDITION;
  }
  switch (kind) {
    case 'flag':
    case 'memory':
    case 'codex':
    case 'event': {
      if (!ID_PATTERNS.named.test(value)) {
        report(c, 'error', 'P12', `"${value}" is not a valid ${kind} id (expected <canto>.<name>, e.g. inf03.left_hope)`, col);
        return FALSE_CONDITION;
      }
      return kind === 'flag'
        ? { type: 'flag', id: value }
        : kind === 'memory'
          ? { type: 'memory', id: value }
          : kind === 'codex'
            ? { type: 'codex', id: value }
            : { type: 'event', id: value };
    }
    case 'word':
    case 'sealed': {
      if (!ID_PATTERNS.word.test(value)) {
        report(c, 'error', 'P12', `"${value}" is not a Word (one capitalised English word, e.g. Hope)`, col);
        return FALSE_CONDITION;
      }
      return kind === 'word' ? { type: 'word', word: value } : { type: 'sealed', word: value };
    }
    case 'choice': {
      const m = /^([a-z]{3}\d{2}\.c\d{1,2})=([a-z])$/.exec(value);
      if (!m || !ID_PATTERNS.choice.test(m[1] as string)) {
        report(c, 'error', 'P12', `"choice:${value}" must look like choice:inf05.c4=a`, col);
        return FALSE_CONDITION;
      }
      const letter = m[2] as string;
      if (!(OPTION_LETTERS as readonly string[]).includes(letter)) {
        report(c, 'error', 'P12', `Option letter "${letter}" must be a, b or c`, col);
        return FALSE_CONDITION;
      }
      return { type: 'choice', choice: m[1] as string, letter: letter as OptionLetter };
    }
    case 'seen': {
      if (!ID_PATTERNS.scene.test(value) && !ID_PATTERNS.beat.test(value)) {
        report(c, 'error', 'P12', `"seen:${value}" needs a scene or beat id (inf03.s2, inf03.s2.b4)`, col);
        return FALSE_CONDITION;
      }
      return { type: 'seen', id: value };
    }
    case 'virtue':
      report(c, 'error', 'P10', `"virtue:${value}" needs a comparison, e.g. virtue:${value}>=2`, col);
      return FALSE_CONDITION;
    default:
      report(c, 'error', 'P11', `Unknown predicate "${kind}:" (expected ${PREDICATE_KINDS.join(':, ')}:)`, col);
      return FALSE_CONDITION;
  }
}

// ---------------------------------------------------------------------------
// Recursive descent
// ---------------------------------------------------------------------------

class ConditionSyntaxError extends Error {}

class TokenStream {
  private i = 0;
  constructor(
    private readonly tokens: readonly Token[],
    private readonly c: Collector,
  ) {}

  peek(): Token | undefined {
    return this.tokens[this.i];
  }

  next(): Token | undefined {
    const t = this.tokens[this.i];
    this.i += 1;
    return t;
  }

  get done(): boolean {
    return this.i >= this.tokens.length;
  }

  fail(message: string, token?: Token): never {
    const col = token?.col ?? this.c.text.length + 1;
    report(this.c, 'error', 'P10', message, col);
    throw new ConditionSyntaxError(message);
  }

  parseOr(): Condition {
    const terms: Condition[] = [this.parseAnd()];
    while (this.peek()?.kind === 'or') {
      this.next();
      terms.push(this.parseAnd());
    }
    return terms.length === 1 ? (terms[0] as Condition) : { type: 'or', terms };
  }

  parseAnd(): Condition {
    const terms: Condition[] = [this.parseTerm()];
    while (this.peek()?.kind === 'and') {
      this.next();
      terms.push(this.parseTerm());
    }
    return terms.length === 1 ? (terms[0] as Condition) : { type: 'and', terms };
  }

  parseTerm(): Condition {
    const t = this.next();
    if (!t) this.fail('Condition ends where a predicate was expected');
    switch (t.kind) {
      case 'not':
        return { type: 'not', term: this.parseTerm() };
      case 'lparen': {
        if (this.peek()?.kind === 'rparen') this.fail('Empty parentheses', this.peek());
        const inner = this.parseOr();
        const close = this.next();
        if (!close || close.kind !== 'rparen') this.fail('Missing ")"', close ?? t);
        return inner;
      }
      case 'word':
        return parsePredicate(t, this.c);
      case 'rparen':
        return this.fail('Unexpected ")"', t);
      default:
        return this.fail(`"${t.text}" needs a predicate before it`, t);
    }
  }
}

/**
 * Parses a §2.8 condition. Never throws. Any error-severity finding makes the
 * whole condition `{ type: 'const', value: false }` (with diagnostics), so a
 * broken guard never shows content by accident.
 */
export function parseCondition(text: string, pos?: SourcePos): ConditionParse {
  const c: Collector = { diagnostics: [], text: text.trim(), pos, errors: 0 };
  try {
    if (c.text.length === 0) {
      report(c, 'error', 'P10', 'Empty condition');
      return { condition: FALSE_CONDITION, diagnostics: c.diagnostics };
    }
    const tokens = tokenize(c);
    const stream = new TokenStream(tokens, c);
    const condition = stream.parseOr();
    if (!stream.done) {
      const extra = stream.peek();
      stream.fail(
        extra?.kind === 'rparen' ? 'Unexpected ")"' : `Missing "and" / "or" before "${extra?.text ?? ''}"`,
        extra,
      );
    }
    return { condition: c.errors > 0 ? FALSE_CONDITION : condition, diagnostics: c.diagnostics };
  } catch (err) {
    if (!(err instanceof ConditionSyntaxError)) {
      report(c, 'error', 'P10', `Condition could not be parsed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return { condition: FALSE_CONDITION, diagnostics: c.diagnostics };
  }
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

function compare(v: number, op: CompareOp, value: number): boolean {
  switch (op) {
    case '>=':
      return v >= value;
    case '<=':
      return v <= value;
    case '>':
      return v > value;
    case '<':
      return v < value;
    case '==':
      return v === value;
    case '!=':
      return v !== value;
  }
  return false;
}

/** Evaluates a condition AST. Missing data is false / 0 (bible §2.8: an unread flag is false). */
export function evaluateCondition(condition: Condition, ctx: ConditionContext): boolean {
  switch (condition.type) {
    case 'and':
      return condition.terms.every((t) => evaluateCondition(t, ctx));
    case 'or':
      return condition.terms.some((t) => evaluateCondition(t, ctx));
    case 'not':
      return !evaluateCondition(condition.term, ctx);
    case 'flag':
      return ctx.hasFlag(condition.id);
    case 'memory':
      return ctx.hasMemory(condition.id);
    case 'codex':
      return ctx.hasCodex(condition.id);
    case 'word':
      return ctx.hasWord(condition.word);
    case 'sealed':
      return ctx.isSealed(condition.word);
    case 'choice':
      return ctx.choiceLetter(condition.choice) === condition.letter;
    case 'seen':
      return ctx.hasSeen(condition.id);
    case 'event':
      return ctx.hasEvent(condition.id);
    case 'compare': {
      const v = ctx.value(condition.variable);
      return Number.isFinite(v) ? compare(v, condition.op, condition.value) : false;
    }
    case 'const':
      return condition.value;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Formatting and inspection (Book, debug tools, lint)
// ---------------------------------------------------------------------------

function precedence(c: Condition): number {
  return c.type === 'or' ? 1 : c.type === 'and' ? 2 : 3;
}

/** Canonical text of a condition (parses back to an equivalent AST). */
export function formatCondition(condition: Condition): string {
  const wrap = (inner: Condition, min: number): string => {
    const text = formatCondition(inner);
    return precedence(inner) < min ? `(${text})` : text;
  };
  switch (condition.type) {
    case 'or':
      return condition.terms.map((t) => wrap(t, 1)).join(' or ');
    case 'and':
      return condition.terms.map((t) => wrap(t, 2)).join(' and ');
    case 'not':
      return `not ${wrap(condition.term, 3)}`;
    case 'flag':
      return `flag:${condition.id}`;
    case 'memory':
      return `memory:${condition.id}`;
    case 'codex':
      return `codex:${condition.id}`;
    case 'word':
      return `word:${condition.word}`;
    case 'sealed':
      return `sealed:${condition.word}`;
    case 'choice':
      return `choice:${condition.choice}=${condition.letter}`;
    case 'seen':
      return `seen:${condition.id}`;
    case 'event':
      return `event:${condition.id}`;
    case 'compare':
      return `${formatVariable(condition.variable)}${condition.op}${condition.value}`;
    case 'const':
      return condition.value ? 'true' : 'false';
  }
  return 'false';
}

/** Leaf predicates of a condition, in reading order (duplicates kept). */
export function conditionAtoms(condition: Condition): Condition[] {
  switch (condition.type) {
    case 'and':
    case 'or':
      return condition.terms.flatMap(conditionAtoms);
    case 'not':
      return conditionAtoms(condition.term);
    default:
      return [condition];
  }
}

/** Everything a condition reads, grouped by kind (lint: flags read, choices referenced, …). */
export interface ConditionRefs {
  readonly flags: string[];
  readonly memories: string[];
  readonly codex: string[];
  readonly words: string[];
  readonly sealed: string[];
  readonly choices: { readonly choice: string; readonly letter: OptionLetter }[];
  readonly seen: string[];
  readonly events: string[];
  readonly variables: VariableRef[];
}

export function conditionRefs(condition: Condition): ConditionRefs {
  const refs = {
    flags: [] as string[],
    memories: [] as string[],
    codex: [] as string[],
    words: [] as string[],
    sealed: [] as string[],
    choices: [] as { choice: string; letter: OptionLetter }[],
    seen: [] as string[],
    events: [] as string[],
    variables: [] as VariableRef[],
  };
  for (const atom of conditionAtoms(condition)) {
    switch (atom.type) {
      case 'flag':
        refs.flags.push(atom.id);
        break;
      case 'memory':
        refs.memories.push(atom.id);
        break;
      case 'codex':
        refs.codex.push(atom.id);
        break;
      case 'word':
        refs.words.push(atom.word);
        break;
      case 'sealed':
        refs.sealed.push(atom.word);
        break;
      case 'choice':
        refs.choices.push({ choice: atom.choice, letter: atom.letter });
        break;
      case 'seen':
        refs.seen.push(atom.id);
        break;
      case 'event':
        refs.events.push(atom.id);
        break;
      case 'compare':
        refs.variables.push(atom.variable);
        break;
      default:
        break;
    }
  }
  return refs;
}

/** True for the degraded condition of a malformed guard. */
export function isConstFalse(condition: Condition): boolean {
  return condition.type === 'const' && !condition.value;
}

/** True when `op` is one of the §2.8 comparison operators. */
export function isCompareOp(op: string): op is CompareOp {
  return (COMPARE_OPS as readonly string[]).includes(op);
}
