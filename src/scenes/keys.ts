/**
 * Scene keys. Render order (bottom to top) is the order of SCENES in
 * registry.ts: World < UI < BookPage < BookMenu. Architect-owned.
 */
export const SceneKeys = {
  Boot: 'Boot',
  Title: 'Title',
  World: 'World',
  UI: 'UI',
  BookPage: 'BookPage',
  BookMenu: 'BookMenu',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
