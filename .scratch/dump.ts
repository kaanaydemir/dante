import { loadStoryLibrary } from '/src/story/load';
import type { Statement } from '/src/story/types';

const lib = loadStoryLibrary({ includeFixtures: true });
const only = process.argv[2];
function walk(lines: readonly Statement[], depth: number, out: string[]): void {
  for (const s of lines) {
    const pad = '    '.repeat(depth);
    switch (s.type) {
      case 'do': out.push(`${pad}DO: ${s.text.slice(0, 110)} ${s.tags.map((t) => JSON.stringify(t)).join(' ')}`); break;
      case 'cam': out.push(`${pad}CAM ${s.verb}: ${s.text.slice(0, 80)}`); break;
      case 'directive': out.push(`${pad}@${s.key}: ${s.value}`); break;
      case 'effects': out.push(`${pad}EFFECTS: ${s.raw}`); break;
      case 'choice': out.push(`${pad}CHOICE ${s.id} ${s.systemic ? 'systemic' : ''} opts=${s.options.map((o) => o.letter + (o.when ? '(when)' : '')).join(',')}`);
        for (const o of s.options) { out.push(`${pad}  OPTION ${o.letter} ${o.text} ${o.whenRaw ?? ''}`); walk(o.body, depth + 1, out); }
        break;
      case 'if': for (const b of s.branches) { out.push(`${pad}IF ${b.raw}`); walk(b.body, depth + 1, out); } if (s.elseBody) { out.push(`${pad}ELSE`); walk(s.elseBody, depth + 1, out); } break;
      case 'say': out.push(`${pad}${s.speaker}: ${s.text.slice(0, 50)}`); break;
      case 'bark': out.push(`${pad}BARK ${s.speaker}: ${s.text.slice(0, 50)}`); break;
      case 'quote': out.push(`${pad}QUOTE ${s.voice} ${s.citationRaw}`); break;
      case 'goto': out.push(`${pad}GOTO ${s.target}`); break;
      case 'hint': out.push(`${pad}HINT: ${s.text.slice(0, 60)}`); break;
      case 'narration': out.push(`${pad}NARRATION: ${s.text.slice(0, 60)}`); break;
      default: break;
    }
  }
}
for (const id of lib.cantoIds) {
  if (only && id !== only) continue;
  const c = lib.canto(id);
  const sc = c.script;
  if (!sc) { console.log(id, c.status); continue; }
  console.log(`=== ${id} ${sc.heading} mechanics=${sc.front.mechanics.join(',')} chars=${sc.front.characters.join(',')}`);
  for (const scene of sc.scenes) {
    console.log(`## ${scene.id} ${scene.title}`);
    for (const b of scene.beats) {
      const t = b.trigger.kind === 'auto' ? '' : JSON.stringify(b.trigger);
      console.log(`  ### ${b.id} [${b.mode}] place=${b.place ?? '-'} ${t} ${b.title}`);
      const out: string[] = [];
      walk(b.lines, 2, out);
      for (const l of out) console.log(l);
    }
  }
}
