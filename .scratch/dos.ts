import { loadStoryLibrary } from '/src/story/load';
import { walkStatements } from '/src/story/ast';
const lib = loadStoryLibrary({ includeFixtures: true });
const id = process.argv[2] ?? 'inf01';
const sc = lib.script(id)!;
for (const scene of sc.scenes) for (const beat of scene.beats) {
  let i = 0;
  const lines: string[] = [];
  walkStatements(beat.lines, (s) => {
    if (s.type === 'do') { lines.push(`  DO[${i}] ${s.text} ${s.tags.map((t) => JSON.stringify(t)).join(' ')}`); i++; }
  });
  if (lines.length) { console.log(`${beat.id} [${beat.mode}] ${JSON.stringify(beat.trigger)} place=${beat.place}`); for (const l of lines) console.log(l); }
}
