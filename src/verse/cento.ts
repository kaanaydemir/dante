/**
 * The cento reading of a verse (bible §3.4.5): the Book shows every tercet as
 * the origin lines of its words. The words sit at the rhyme position, so the
 * tercet really rhymes and is Longfellow from end to end:
 *
 *   This side the summit, when I saw a fire (Inferno IV, 68)
 *   In which I had abandoned the true way. (Inferno I, 12)
 *   So that their fear is turned into desire. (Inferno III, 126)
 *
 * Owner: team B (verse). Pure.
 */

import type { CentoLine, ComposedVerse } from '../runtime/contracts';
import { getWord } from '../story/words';
import type { WordName } from '../story/types';

/** The origin line of one word, or null for a word missing from the table. */
export function centoLine(word: WordName): CentoLine | null {
  const def = getWord(word);
  if (!def) return null;
  return { word: def.name, text: def.origin.text, citation: def.origin.citation };
}

/** A verse as Longfellow lines: A, B, A for each tercet, then the coda. Unknown or empty slots are skipped. */
export function centoLines(verse: ComposedVerse): CentoLine[] {
  const out: CentoLine[] = [];
  for (const tercet of verse.tercets) {
    for (const word of tercet) {
      const line = word ? centoLine(word) : null;
      if (line) out.push(line);
    }
  }
  if (verse.coda) {
    const line = centoLine(verse.coda);
    if (line) out.push(line);
  }
  return out;
}

/** Plain text of a cento, one `<line> (<citation>)` per row (the format of the bible's ```cento blocks). */
export function formatCento(lines: readonly CentoLine[]): string {
  return lines.map((l) => `${l.text} (${l.citation})`).join('\n');
}
