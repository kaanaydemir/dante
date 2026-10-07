import { loadStoryLibrary } from '/src/story/load';
import { planGenericLevel } from '/src/levels/_framework/layout';
const lib = loadStoryLibrary({ includeFixtures: true });
for (const id of lib.cantoIds) {
  const sc = lib.script(id);
  if (!sc) continue;
  const plan = planGenericLevel(sc);
  console.log(`== ${id} width=${plan.width} virgilFrom=${plan.virgilFrom} never=${plan.virgilNever}`);
  for (const p of plan.places) console.log(`  ${p.id.padEnd(26)} ${plan.themes[p.id]}  x=${p.x} y=${p.y}`);
  console.log('  npcs:', plan.npcs.map((n) => `${n.speaker}@${n.place}${n.talkable ? '*' : ''}`).join(' '));
}
