/**
 * EFFECTS token vocabulary (bible §2.10): parse, format, validate, summarise.
 *
 * Owner: team A (story-core). Pure TypeScript (no Phaser, no DOM).
 * Frozen exports (docs/ENGINE.md): `parseEffects(text, pos?)`, `formatEffect(effect)`,
 * `EffectsParse`. Applying effects to game state belongs to the store (team B);
 * this module only turns text into the `Effect` union and checks the rules.
 *
 * Token grammar (one token per comma, separated by ", "; no spaces inside a token):
 *
 *   pity+N@<sin>   justice+N@<sin>      heart (never negative; N by weight 1–3)
 *   trust+N        trust-N              Virgil's trust, clamped 0–10 by the store
 *   virtue:<v>+N                        prudence | justice | fortitude | temperance
 *   word:<Word>    seal:<Word>   shed:<Word>
 *   memory:<id>    codex:<id>    flag:<id>
 *   resolve±N      grace±N       gracemax+1
 *   unlock:<feature>                    book | words | verse | compose | heart | codex | remembrance | chain
 *
 * Diagnostic codes:
 *   P20  invalid token (error; the token is listed in `invalid` and never applied)
 *   P21  separator / spacing problem, normalised (warning)
 *   P22  capitalisation normalised (warning)
 *   L12  magnitudes against the bible's limits and the choice weight (validateEffects)
 *   L13  heart effects without a (known) sin tag (validateEffects)
 */

import { getWord } from './words';
import {
  ID_PATTERNS,
  SIN_TAGS_KNOWN,
  UNLOCK_FEATURES,
  VIRTUES,
  WEIGHT_LIMITS,
  type ChoiceWeight,
  type Diagnostic,
  type Effect,
  type Severity,
  type SinTag,
  type SourcePos,
  type UnlockFeature,
  type Virtue,
} from './types';

export interface EffectsParse {
  readonly effects: readonly Effect[];
  /** Tokens that did not parse, as written. */
  readonly invalid: readonly string[];
  readonly diagnostics: readonly Diagnostic[];
}

/** Result of parsing one token. */
export interface EffectTokenParse {
  readonly effect: Effect | null;
  /** Why the token is invalid (null when it parsed). */
  readonly error: string | null;
  /** A harmless deviation that was normalised (null when none). */
  readonly warning: string | null;
}

const ok = (effect: Effect, warning: string | null = null): EffectTokenParse => ({ effect, error: null, warning });
const bad = (error: string): EffectTokenParse => ({ effect: null, error, warning: null });

function canonicalWord(value: string): { word: string; warning: string | null } | null {
  const known = getWord(value);
  if (known) {
    return { word: known.name, warning: known.name !== value ? `read "${value}" as "${known.name}"` : null };
  }
  return ID_PATTERNS.word.test(value) ? { word: value, warning: null } : null;
}

/**
 * Parses one EFFECTS token (no surrounding whitespace). Never throws.
 * Signs are part of the token (`trust-1`); N is a positive integer.
 */
export function parseEffectToken(token: string): EffectTokenParse {
  const t = token.trim();
  if (t.length === 0) return bad('empty token');

  const heart = /^(pity|justice)([+-])(\d+)(?:@(.*))?$/i.exec(t);
  if (heart) {
    const side = (heart[1] as string).toLowerCase() as 'pity' | 'justice';
    const amount = Number(heart[3]);
    if (heart[2] === '-') return bad(`heart effects never subtract: write ${side}+N (bible §2.10)`);
    if (amount < 1) return bad('N must be a positive integer');
    const rawSin = heart[4];
    if (rawSin === undefined) return ok({ type: 'heart', side, amount, sin: null });
    if (rawSin.length === 0) return bad(`missing sin tag after "@" in "${t}"`);
    const sin = rawSin.toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(sin)) return bad(`"${rawSin}" is not a sin tag (e.g. limbo, lust)`);
    const caseWarning = sin !== rawSin || side !== heart[1] ? `read "${t}" as "${side}+${amount}@${sin}"` : null;
    return ok({ type: 'heart', side, amount, sin: sin as SinTag }, caseWarning);
  }

  const trust = /^trust([+-])(\d+)$/.exec(t);
  if (trust) {
    const n = Number(trust[2]);
    if (n < 1) return bad('N must be a positive integer');
    return ok({ type: 'trust', delta: trust[1] === '-' ? -n : n });
  }

  const virtue = /^virtue:([a-z]+)([+-])(\d+)$/.exec(t);
  if (virtue) {
    const name = virtue[1] as string;
    if (!(VIRTUES as readonly string[]).includes(name)) {
      return bad(`unknown virtue "${name}" (expected ${VIRTUES.join(', ')})`);
    }
    if (virtue[2] === '-') return bad('virtues only grow (bible §3.6)');
    const n = Number(virtue[3]);
    if (n < 1) return bad('N must be a positive integer');
    return ok({ type: 'virtue', virtue: name as Virtue, amount: n });
  }

  const resource = /^(resolve|grace|gracemax)([+-])(\d+)$/.exec(t);
  if (resource) {
    const kind = resource[1] as 'resolve' | 'grace' | 'gracemax';
    const n = Number(resource[3]);
    if (n < 1) return bad('N must be a positive integer');
    if (kind === 'gracemax' && resource[2] === '-') return bad('gracemax only grows: gracemax+1');
    const delta = resource[2] === '-' ? -n : n;
    return ok({ type: kind, delta });
  }

  const wordish = /^(word|seal|shed):(.*)$/.exec(t);
  if (wordish) {
    const kind = wordish[1] as 'word' | 'seal' | 'shed';
    const value = wordish[2] as string;
    if (value.length === 0) return bad(`"${kind}:" needs a Word`);
    const w = canonicalWord(value);
    if (!w) return bad(`"${value}" is not a Word (one capitalised English word, e.g. Stay)`);
    return ok({ type: kind, word: w.word }, w.warning);
  }

  const named = /^(memory|codex|flag):(.*)$/.exec(t);
  if (named) {
    const kind = named[1] as 'memory' | 'codex' | 'flag';
    const id = named[2] as string;
    if (!ID_PATTERNS.named.test(id)) {
      return bad(`"${id}" is not a valid ${kind} id (expected <canto>.<name>, e.g. inf03.left_hope)`);
    }
    return ok({ type: kind, id });
  }

  const unlock = /^unlock:(.*)$/.exec(t);
  if (unlock) {
    const feature = unlock[1] as string;
    if (!(UNLOCK_FEATURES as readonly string[]).includes(feature)) {
      return bad(`unknown feature "${feature}" (expected ${UNLOCK_FEATURES.join(', ')})`);
    }
    return ok({ type: 'unlock', feature: feature as UnlockFeature });
  }

  if (/^event:/.test(t)) return bad('events are not effects; emit them with a DO tag {event:<id>}');
  if (/^heart[+-]/.test(t)) return bad('write pity+N@<sin> or justice+N@<sin> instead of heart±N');
  if (/^(word|seal|shed|memory|codex|flag|unlock|virtue)$/.test(t)) return bad(`"${t}" needs ":<value>"`);
  return bad('unknown effect token');
}

/**
 * Parses the text after `EFFECTS:`. Never throws. Tokens are separated by
 * ", "; other separators and spaces inside a token are normalised with a P21
 * warning. Invalid tokens are reported (P20), listed in `invalid` and dropped.
 */
export function parseEffects(text: string, pos?: SourcePos): EffectsParse {
  const effects: Effect[] = [];
  const invalid: string[] = [];
  const diagnostics: Diagnostic[] = [];
  const push = (severity: Severity, code: string, message: string): void => {
    diagnostics.push({ severity, code, message, ...(pos ? { pos } : {}) });
  };

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    push('warning', 'P21', 'EFFECTS line has no tokens');
    return { effects, invalid, diagnostics };
  }

  // Separator style: exactly ", " between tokens (bible §2.10).
  if (/\s+,|,(?! )|, {2,}|;/.test(trimmed)) {
    push('warning', 'P21', `Separate EFFECTS tokens with a comma and one space: "${trimmed}"`);
  }

  const pieces = trimmed.split(/[,;]/);
  for (const piece of pieces) {
    const raw = piece.trim();
    if (raw.length === 0) {
      push('warning', 'P21', `Empty EFFECTS token in "${trimmed}"`);
      continue;
    }
    let token = raw;
    if (/\s/.test(raw)) {
      token = raw.replace(/\s+/g, '');
      push('warning', 'P21', `EFFECTS tokens contain no spaces; read "${raw}" as "${token}"`);
    }
    const parsed = parseEffectToken(token);
    if (parsed.effect) {
      effects.push(parsed.effect);
      if (parsed.warning) push('warning', 'P22', `EFFECTS: ${parsed.warning}`);
    } else {
      invalid.push(raw);
      push('error', 'P20', `Invalid EFFECTS token "${raw}": ${parsed.error ?? 'unknown effect token'}`);
    }
  }
  return { effects, invalid, diagnostics };
}

/** Canonical token text of an effect (inverse of parseEffects). */
export function formatEffect(effect: Effect): string {
  const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);
  switch (effect.type) {
    case 'heart':
      return `${effect.side}${signed(effect.amount)}${effect.sin ? `@${effect.sin}` : ''}`;
    case 'trust':
      return `trust${signed(effect.delta)}`;
    case 'virtue':
      return `virtue:${effect.virtue}${signed(effect.amount)}`;
    case 'word':
      return `word:${effect.word}`;
    case 'seal':
      return `seal:${effect.word}`;
    case 'shed':
      return `shed:${effect.word}`;
    case 'memory':
      return `memory:${effect.id}`;
    case 'codex':
      return `codex:${effect.id}`;
    case 'flag':
      return `flag:${effect.id}`;
    case 'resolve':
      return `resolve${signed(effect.delta)}`;
    case 'grace':
      return `grace${signed(effect.delta)}`;
    case 'gracemax':
      return `gracemax${signed(effect.delta)}`;
    case 'unlock':
      return `unlock:${effect.feature}`;
  }
}

/** `a, b, c` */
export function formatEffects(effects: readonly Effect[]): string {
  return effects.map(formatEffect).join(', ');
}

// ---------------------------------------------------------------------------
// Totals and validation (lint L12 / L13; pure)
// ---------------------------------------------------------------------------

/** What a list of effects adds up to (signed sums and id lists, in order). */
export interface EffectTotals {
  readonly pity: number;
  readonly justice: number;
  /** pity − justice: how far the beam moves. */
  readonly heart: number;
  readonly trust: number;
  readonly virtues: Readonly<Record<Virtue, number>>;
  readonly resolve: number;
  readonly grace: number;
  readonly gracemax: number;
  readonly words: readonly string[];
  readonly seals: readonly string[];
  readonly sheds: readonly string[];
  readonly memories: readonly string[];
  readonly codex: readonly string[];
  readonly flags: readonly string[];
  readonly unlocks: readonly UnlockFeature[];
}

export function sumEffects(effects: readonly Effect[]): EffectTotals {
  let pity = 0;
  let justice = 0;
  let trust = 0;
  let resolve = 0;
  let grace = 0;
  let gracemax = 0;
  const virtues: Record<Virtue, number> = { prudence: 0, justice: 0, fortitude: 0, temperance: 0 };
  const words: string[] = [];
  const seals: string[] = [];
  const sheds: string[] = [];
  const memories: string[] = [];
  const codex: string[] = [];
  const flags: string[] = [];
  const unlocks: UnlockFeature[] = [];
  for (const e of effects) {
    switch (e.type) {
      case 'heart':
        if (e.side === 'pity') pity += e.amount;
        else justice += e.amount;
        break;
      case 'trust':
        trust += e.delta;
        break;
      case 'virtue':
        virtues[e.virtue] += e.amount;
        break;
      case 'resolve':
        resolve += e.delta;
        break;
      case 'grace':
        grace += e.delta;
        break;
      case 'gracemax':
        gracemax += e.delta;
        break;
      case 'word':
        words.push(e.word);
        break;
      case 'seal':
        seals.push(e.word);
        break;
      case 'shed':
        sheds.push(e.word);
        break;
      case 'memory':
        memories.push(e.id);
        break;
      case 'codex':
        codex.push(e.id);
        break;
      case 'flag':
        flags.push(e.id);
        break;
      case 'unlock':
        unlocks.push(e.feature);
        break;
    }
  }
  return {
    pity,
    justice,
    heart: pity - justice,
    trust,
    virtues,
    resolve,
    grace,
    gracemax,
    words,
    seals,
    sheds,
    memories,
    codex,
    flags,
    unlocks,
  };
}

export interface EffectRules {
  /** Weight of the enclosing CHOICE (option effects), or null / undefined outside choices. */
  readonly weight?: ChoiceWeight | null;
  /** Sin tags allowed without a warning. Default: every tag known so far (§3.8). */
  readonly sinTags?: readonly string[];
  /** Sin tags allowed at all; anything else is an error. Default: SIN_TAGS_KNOWN. */
  readonly knownSinTags?: readonly string[];
}

export interface EffectFinding {
  readonly severity: Severity;
  readonly code: 'L12' | 'L13';
  readonly message: string;
}

/** Bible §2.10: a resource token moves 1–3 units. */
export const RESOURCE_TOKEN_MAX = 3;
/** Bible §2.9: no heart token exceeds the `centre` limit. */
export const HEART_TOKEN_MAX = WEIGHT_LIMITS.centre.heart;

/**
 * Checks one effect against the bible's per-token limits (§2.9 weights,
 * §2.10 vocabulary, §3.1 sin tags). Pure; no positions (callers add them).
 */
export function validateEffect(effect: Effect, rules: EffectRules = {}): EffectFinding[] {
  const out: EffectFinding[] = [];
  const weight = rules.weight ?? null;
  const limits = weight ? WEIGHT_LIMITS[weight] : null;
  const token = formatEffect(effect);
  switch (effect.type) {
    case 'heart': {
      if (effect.sin === null) {
        out.push({ severity: 'error', code: 'L13', message: `${token}: every heart effect carries a sin tag (${effect.side}+N@<sin>)` });
      } else {
        const known = rules.knownSinTags ?? SIN_TAGS_KNOWN;
        const allowed = rules.sinTags ?? known;
        if (!known.includes(effect.sin)) {
          out.push({ severity: 'error', code: 'L13', message: `${token}: unknown sin tag "${effect.sin}" (known: ${known.join(', ')})` });
        } else if (!allowed.includes(effect.sin)) {
          out.push({ severity: 'error', code: 'L13', message: `${token}: sin tag "${effect.sin}" is not used in this chapter (allowed: ${allowed.join(', ')})` });
        }
      }
      if (effect.amount > HEART_TOKEN_MAX) {
        out.push({ severity: 'error', code: 'L12', message: `${token}: a heart effect moves at most ${HEART_TOKEN_MAX}` });
      } else if (limits && effect.amount > limits.heart) {
        out.push({ severity: 'error', code: 'L12', message: `${token}: a ${weight} choice moves the heart at most ${limits.heart}` });
      }
      break;
    }
    case 'trust': {
      const n = Math.abs(effect.delta);
      if (n > 2) out.push({ severity: 'error', code: 'L12', message: `${token}: trust changes by 1 (2 only with the lead writer's approval)` });
      else if (n === 2) out.push({ severity: 'warning', code: 'L12', message: `${token}: trust ±2 needs the lead writer's approval (bible §2.9)` });
      break;
    }
    case 'virtue': {
      if (effect.amount > 2) out.push({ severity: 'error', code: 'L12', message: `${token}: virtues grow by 1 (2 only with the lead writer's approval)` });
      else if (effect.amount === 2) out.push({ severity: 'warning', code: 'L12', message: `${token}: virtue +2 needs the lead writer's approval (bible §2.9)` });
      break;
    }
    case 'resolve':
    case 'grace': {
      const n = Math.abs(effect.delta);
      if (n > RESOURCE_TOKEN_MAX) {
        out.push({ severity: 'error', code: 'L12', message: `${token}: resource effects move 1–${RESOURCE_TOKEN_MAX} units (bible §2.10)` });
      } else if (limits && n > limits.resource) {
        out.push({ severity: 'error', code: 'L12', message: `${token}: a ${weight} choice moves a resource by at most ${limits.resource}` });
      }
      break;
    }
    case 'gracemax': {
      if (effect.delta !== 1) out.push({ severity: 'error', code: 'L12', message: `${token}: only gracemax+1 exists (bible §2.10)` });
      break;
    }
    default:
      break;
  }
  return out;
}

/**
 * Checks what one choice option does as a whole against its weight (§2.9):
 * the beam moves at most the weight's heart limit, trust by at most 1 net,
 * each virtue by at most 1. Token-level limits come from validateEffect.
 */
export function validateOptionTotals(effects: readonly Effect[], weight: ChoiceWeight): EffectFinding[] {
  const out: EffectFinding[] = [];
  const limits = WEIGHT_LIMITS[weight];
  const totals = sumEffects(effects);
  if (Math.abs(totals.heart) > limits.heart) {
    out.push({ severity: 'error', code: 'L12', message: `the option moves the heart by ${totals.heart}; a ${weight} choice allows ±${limits.heart}` });
  }
  if (totals.pity + totals.justice > limits.heart && Math.abs(totals.heart) <= limits.heart) {
    out.push({ severity: 'warning', code: 'L12', message: `the option writes ${totals.pity + totals.justice} heart points; a ${weight} choice is meant to move ±${limits.heart}` });
  }
  if (Math.abs(totals.trust) > limits.trust) {
    out.push({
      severity: Math.abs(totals.trust) > 2 ? 'error' : 'warning',
      code: 'L12',
      message: `the option changes trust by ${totals.trust}; a ${weight} choice allows ±${limits.trust} (±2 only with approval)`,
    });
  }
  for (const v of VIRTUES) {
    const n = totals.virtues[v];
    if (n > limits.virtue) {
      out.push({
        severity: n > 2 ? 'error' : 'warning',
        code: 'L12',
        message: `the option raises virtue:${v} by ${n}; a ${weight} choice allows +${limits.virtue} (+2 only with approval)`,
      });
    }
  }
  for (const [name, n] of [
    ['resolve', totals.resolve],
    ['grace', totals.grace],
  ] as const) {
    if (Math.abs(n) > limits.resource) {
      out.push({ severity: 'error', code: 'L12', message: `the option changes ${name} by ${n}; a ${weight} choice allows ±${limits.resource}` });
    }
  }
  return out;
}

/** Validates a list of effects token by token and returns positioned diagnostics. */
export function validateEffects(effects: readonly Effect[], rules: EffectRules = {}, pos?: SourcePos): Diagnostic[] {
  return effects.flatMap((e) =>
    validateEffect(e, rules).map((f) => ({ severity: f.severity, code: f.code, message: f.message, ...(pos ? { pos } : {}) })),
  );
}
