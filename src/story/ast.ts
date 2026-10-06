/**
 * AST helpers for parsed canto scripts: walk every statement (with its scene,
 * beat, enclosing choice / option and IF depth), collect quotes and choices,
 * and rebuild a script immutably with transformed quotes.
 *
 * Owner: team A (story-core). Pure TypeScript. Used by lint and the loader;
 * other teams may use it too (read-only helpers, no state).
 */

import type {
  Beat,
  CantoScript,
  ChoiceOption,
  ChoiceStmt,
  CodexEntry,
  MemoryEntry,
  QuoteStmt,
  Reveal,
  Scene,
  Statement,
} from './types';

/** Where a statement sits. */
export interface StatementContext {
  readonly scene: Scene | null;
  readonly beat: Beat | null;
  /** Innermost enclosing choice and option (null outside option bodies). */
  readonly choice: ChoiceStmt | null;
  readonly option: ChoiceOption | null;
  /** Number of IF blocks around the statement (0 = top level of its body). */
  readonly ifDepth: number;
}

const ROOT: StatementContext = { scene: null, beat: null, choice: null, option: null, ifDepth: 0 };

/**
 * Visits statements depth-first in file order, descending into IF branches,
 * ELSE bodies and option bodies. REVEAL quotes are not statements of a body;
 * use `collectQuotes` for them.
 */
export function walkStatements(
  statements: readonly Statement[],
  visit: (stmt: Statement, ctx: StatementContext) => void,
  ctx: StatementContext = ROOT,
): void {
  for (const stmt of statements) {
    visit(stmt, ctx);
    if (stmt.type === 'if') {
      const inner = { ...ctx, ifDepth: ctx.ifDepth + 1 };
      for (const branch of stmt.branches) walkStatements(branch.body, visit, inner);
      if (stmt.elseBody) walkStatements(stmt.elseBody, visit, inner);
    } else if (stmt.type === 'choice') {
      for (const option of stmt.options) {
        walkStatements(option.body, visit, { ...ctx, choice: stmt, option, ifDepth: 0 });
      }
    }
  }
}

/** Visits every statement of every beat of a canto. */
export function forEachStatement(canto: CantoScript, visit: (stmt: Statement, ctx: StatementContext) => void): void {
  for (const scene of canto.scenes) {
    for (const beat of scene.beats) {
      walkStatements(beat.lines, visit, { scene, beat, choice: null, option: null, ifDepth: 0 });
    }
  }
}

/** Every statement of a canto in file order, with context. */
export function listStatements(canto: CantoScript): { stmt: Statement; ctx: StatementContext }[] {
  const out: { stmt: Statement; ctx: StatementContext }[] = [];
  forEachStatement(canto, (stmt, ctx) => out.push({ stmt, ctx }));
  return out;
}

/** Every CHOICE of a canto in file order. */
export function choicesOf(canto: CantoScript): ChoiceStmt[] {
  const out: ChoiceStmt[] = [];
  forEachStatement(canto, (stmt) => {
    if (stmt.type === 'choice') out.push(stmt);
  });
  return out;
}

export type QuoteSite =
  | { readonly kind: 'beat'; readonly quote: QuoteStmt; readonly ctx: StatementContext }
  | { readonly kind: 'reveal'; readonly quote: QuoteStmt; readonly ctx: StatementContext; readonly choice: ChoiceStmt; readonly reveal: Reveal }
  | { readonly kind: 'codex'; readonly quote: QuoteStmt; readonly entry: CodexEntry }
  | { readonly kind: 'memory'; readonly quote: QuoteStmt; readonly entry: MemoryEntry };

/** Every QUOTE of a canto: beat bodies (any depth), REVEAL blocks, Codex and memory entries. */
export function collectQuotes(canto: CantoScript): QuoteSite[] {
  const out: QuoteSite[] = [];
  forEachStatement(canto, (stmt, ctx) => {
    if (stmt.type === 'quote') out.push({ kind: 'beat', quote: stmt, ctx });
    else if (stmt.type === 'choice' && stmt.reveal) {
      for (const quote of stmt.reveal.quotes) out.push({ kind: 'reveal', quote, ctx, choice: stmt, reveal: stmt.reveal });
    }
  });
  for (const entry of canto.codex) if (entry.quote) out.push({ kind: 'codex', quote: entry.quote, entry });
  for (const entry of canto.memories) if (entry.quote) out.push({ kind: 'memory', quote: entry.quote, entry });
  return out;
}

/** Rebuilds a statement list with every QuoteStmt (also inside REVEALs) passed through `fn`. */
export function mapStatementQuotes(statements: readonly Statement[], fn: (q: QuoteStmt) => QuoteStmt): Statement[] {
  return statements.map((stmt): Statement => {
    switch (stmt.type) {
      case 'quote':
        return fn(stmt);
      case 'if':
        return {
          ...stmt,
          branches: stmt.branches.map((b) => ({ ...b, body: mapStatementQuotes(b.body, fn) })),
          elseBody: stmt.elseBody ? mapStatementQuotes(stmt.elseBody, fn) : null,
        };
      case 'choice':
        return {
          ...stmt,
          options: stmt.options.map((o) => ({ ...o, body: mapStatementQuotes(o.body, fn) })),
          reveal: stmt.reveal ? { ...stmt.reveal, quotes: stmt.reveal.quotes.map(fn) } : null,
        };
      default:
        return stmt;
    }
  });
}

/** Rebuilds a canto with every quote (beats, reveals, codex, memories) passed through `fn`. */
export function mapQuotes(canto: CantoScript, fn: (q: QuoteStmt) => QuoteStmt): CantoScript {
  return {
    ...canto,
    scenes: canto.scenes.map((scene) => ({
      ...scene,
      beats: scene.beats.map((beat) => ({ ...beat, lines: mapStatementQuotes(beat.lines, fn) })),
    })),
    codex: canto.codex.map((entry) => (entry.quote ? { ...entry, quote: fn(entry.quote) } : entry)),
    memories: canto.memories.map((entry) => (entry.quote ? { ...entry, quote: fn(entry.quote) } : entry)),
  };
}

/** Every beat of a canto in file order. */
export function beatsOf(canto: CantoScript): Beat[] {
  return canto.scenes.flatMap((s) => [...s.beats]);
}

/** The verse lines of a quote (skip lines dropped). */
export function verseLines(quote: QuoteStmt): string[] {
  return quote.lines.flatMap((l) => (l.kind === 'verse' ? [l.text] : []));
}
