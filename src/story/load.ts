/**
 * Loads every canto script and Longfellow source at build time and indexes
 * them as a StoryLibrary.
 *
 * Owner: team A (story-core). Frozen exports (docs/ENGINE.md):
 * loadStoryLibrary, buildStoryLibrary, RAW_SCRIPTS, RAW_SOURCES, RAW_FIXTURES,
 * cantoIdFromPath.
 *
 * import.meta.glob works both in the browser bundle and under vitest, so tests
 * can call loadStoryLibrary() directly. Nothing here throws: a canto with no
 * script reports status 'missing', an unusable one 'invalid', and a parser or
 * lint failure becomes a diagnostic.
 *
 * After parsing, every quote is checked against its Longfellow canto and its
 * verse lines get their source line numbers (also behind `…` skip lines), so
 * collectible words and the Book's gold "lines you saw" work everywhere.
 * Each canto is then linted (profile `fixture` for inf99, else `canto`); the
 * lint findings join the canto's diagnostics (the debug API shows them).
 */

import type { BeatLocation, LoadStoryLibrary, LoadedCanto, StoryLibrary } from '../runtime/contracts';
import { mapQuotes } from './ast';
import { lintCanto } from './lint';
import { cantoIdFromScriptPath, parseCanto } from './parser';
import { buildSourceMap, sourceKey, verifyQuote } from './quotes';
import {
  FIXTURE_CANTO_ID,
  type BeatId,
  type Canticle,
  type CantoId,
  type CantoScript,
  type CodexEntry,
  type CodexId,
  type Diagnostic,
  type MemoryEntry,
  type MemoryId,
  type QuoteStmt,
  type Scene,
  type SceneId,
  type SourceCanto,
} from './types';

/** Canto scripts, keyed by absolute path (`/docs/script/inferno-03.md`). */
export const RAW_SCRIPTS: Readonly<Record<string, string>> = import.meta.glob<string>('/docs/script/inferno-*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Longfellow Inferno, one numbered file per canto (`/docs/source/inferno/canto-01.txt`). */
export const RAW_SOURCES: Readonly<Record<string, string>> = import.meta.glob<string>(
  '/docs/source/inferno/canto-*.txt',
  { query: '?raw', import: 'default', eager: true },
);

/** Test fixtures in the bible format (canto id `inf99`); only loaded on request (debug builds). */
export const RAW_FIXTURES: Readonly<Record<string, string>> = import.meta.glob<string>('/tests/fixtures/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** `/docs/script/inferno-03.md` -> `inf03`; other names -> null (id then comes from the front matter). */
export function cantoIdFromPath(path: string): CantoId | null {
  return cantoIdFromScriptPath(path);
}

export interface BuildOptions {
  /** Run lintCanto on every canto and add its findings to the diagnostics (default true). */
  readonly lint?: boolean;
}

/** Fills every verse's `lineNo` from the source (verifyQuote), keeping the parser's value when unresolved. */
export function resolveQuoteLines(
  script: CantoScript,
  source: (canticle: Canticle, canto: number) => SourceCanto | null,
): CantoScript {
  return mapQuotes(script, (q: QuoteStmt): QuoteStmt => {
    if (!q.citation) return q;
    const src = source(q.citation.canticle, q.citation.canto);
    if (!src) return q;
    const check = verifyQuote(q, src);
    let changed = false;
    const lines = q.lines.map((l, i) => {
      if (l.kind !== 'verse') return l;
      const n = check.lineNumbers[i] ?? l.lineNo;
      if (n === l.lineNo) return l;
      changed = true;
      return { ...l, lineNo: n };
    });
    return changed ? { ...q, lines } : q;
  });
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Pure: builds a library from raw texts. Used by loadStoryLibrary and by tests.
 * Never throws; a parser crash becomes an 'invalid' canto with a diagnostic.
 */
export function buildStoryLibrary(
  scripts: Readonly<Record<string, string>>,
  sources: Readonly<Record<string, string>>,
  opts: BuildOptions = {},
): StoryLibrary {
  let sourceMap = new Map<string, SourceCanto>();
  const loadDiagnostics: Diagnostic[] = [];
  try {
    sourceMap = buildSourceMap(sources);
  } catch (err) {
    loadDiagnostics.push({ severity: 'error', code: 'P99', message: `Source texts could not be read: ${errorText(err)}` });
  }
  const source = (canticle: Canticle, canto: number): SourceCanto | null => sourceMap.get(sourceKey(canticle, canto)) ?? null;

  // 1. Parse every file.
  interface Parsed {
    readonly path: string;
    readonly id: CantoId;
    script: CantoScript | null;
    diagnostics: Diagnostic[];
  }
  const parsed: Parsed[] = [];
  const byId = new Map<CantoId, Parsed>();
  for (const path of Object.keys(scripts).sort()) {
    const text = scripts[path] ?? '';
    let script: CantoScript | null = null;
    let diagnostics: Diagnostic[] = [];
    try {
      const result = parseCanto(text, path);
      script = result.canto;
      diagnostics = [...result.diagnostics];
    } catch (err) {
      diagnostics = [{ severity: 'error', code: 'P99', message: `Parser crashed: ${errorText(err)}`, pos: { line: 1, file: path } }];
    }
    if (script) {
      try {
        script = resolveQuoteLines(script, source);
      } catch (err) {
        diagnostics.push({ severity: 'error', code: 'P99', message: `Quote lines could not be resolved: ${errorText(err)}`, pos: { line: 1, file: path } });
      }
    }
    const id = script?.id || cantoIdFromPath(path) || path;
    const entry: Parsed = { path, id, script, diagnostics };
    const clash = byId.get(id);
    if (clash) {
      diagnostics.push({
        severity: 'error',
        code: 'P00',
        message: `Canto id ${id} is already used by ${clash.path}; this file is ignored`,
        pos: { line: 1, file: path },
      });
      loadDiagnostics.push(...diagnostics);
      continue;
    }
    byId.set(id, entry);
    parsed.push(entry);
  }

  // 2. Lint (cross-file rules see every parsed canto).
  if (opts.lint !== false) {
    const all = parsed.flatMap((p) => (p.script ? [p.script] : []));
    for (const p of parsed) {
      if (!p.script) continue;
      try {
        const profile = p.script.id === FIXTURE_CANTO_ID ? 'fixture' : 'canto';
        const others = profile === 'fixture' ? [] : all.filter((s) => s.id !== FIXTURE_CANTO_ID);
        p.diagnostics.push(...lintCanto(p.script, { profile, source, cantos: others }));
      } catch (err) {
        p.diagnostics.push({ severity: 'error', code: 'L00', message: `Lint crashed: ${errorText(err)}`, pos: { line: 1, file: p.path } });
      }
    }
  }

  // 3. Index.
  const cantos = new Map<CantoId, LoadedCanto>();
  const allDiagnostics: Diagnostic[] = [...loadDiagnostics];
  for (const p of parsed) {
    const usable = p.script !== null && p.script.scenes.some((s) => s.beats.length > 0);
    cantos.set(p.id, {
      id: p.id,
      file: p.path,
      status: usable ? 'ok' : 'invalid',
      script: usable ? p.script : null,
      diagnostics: p.diagnostics,
    });
    allDiagnostics.push(...p.diagnostics);
  }

  const codexById = new Map<CodexId, CodexEntry>();
  const memoryById = new Map<MemoryId, MemoryEntry>();
  const sceneById = new Map<SceneId, { canto: CantoScript; scene: Scene }>();
  const beatById = new Map<BeatId, BeatLocation>();
  for (const loaded of cantos.values()) {
    const s = loaded.script;
    if (!s) continue;
    for (const entry of s.codex) if (!codexById.has(entry.id)) codexById.set(entry.id, entry);
    for (const entry of s.memories) if (!memoryById.has(entry.id)) memoryById.set(entry.id, entry);
    for (const scene of s.scenes) {
      if (!sceneById.has(scene.id)) sceneById.set(scene.id, { canto: s, scene });
      for (const beat of scene.beats) if (!beatById.has(beat.id)) beatById.set(beat.id, { canto: s, scene, beat });
    }
  }

  const ids = [...cantos.keys()].sort();

  return {
    cantoIds: ids,
    canto(id: CantoId): LoadedCanto {
      return cantos.get(id) ?? { id, file: null, status: 'missing', script: null, diagnostics: [] };
    },
    script(id: CantoId): CantoScript | null {
      return cantos.get(id)?.script ?? null;
    },
    source,
    codex: (id) => codexById.get(id) ?? null,
    memory: (id) => memoryById.get(id) ?? null,
    allCodex: () => [...codexById.values()],
    allMemories: () => [...memoryById.values()],
    findScene: (id) => sceneById.get(id) ?? null,
    findBeat: (id) => beatById.get(id) ?? null,
    diagnostics: () => allDiagnostics,
  };
}

/** The game's library: every docs/script/inferno-*.md (+ fixtures when asked) and the Inferno sources. Never throws. */
export const loadStoryLibrary: LoadStoryLibrary = (opts) => {
  const scripts = opts?.includeFixtures ? { ...RAW_SCRIPTS, ...RAW_FIXTURES } : RAW_SCRIPTS;
  try {
    return buildStoryLibrary(scripts, RAW_SOURCES);
  } catch (err) {
    // Last resort: an empty library still lets the game boot (every canto shows "still being written").
    return withDiagnostic(buildStoryLibrary({}, {}, { lint: false }), {
      severity: 'error',
      code: 'P99',
      message: `Story library failed to load: ${errorText(err)}`,
    });
  }
};

function withDiagnostic(library: StoryLibrary, diagnostic: Diagnostic): StoryLibrary {
  const all = [...library.diagnostics(), diagnostic];
  return { ...library, diagnostics: () => all };
}
