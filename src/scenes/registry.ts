/**
 * Scene registry. Order = render order (later scenes draw on top). Boot runs
 * first. Architect-owned: add scenes here, nowhere else.
 */

import { BookMenuScene } from './BookMenuScene';
import { BookPageScene } from './BookPageScene';
import { BootScene } from './BootScene';
import { TitleScene } from './TitleScene';
import { UIScene } from './UIScene';
import { WorldScene } from './WorldScene';

export const SCENES = [BootScene, TitleScene, WorldScene, UIScene, BookPageScene, BookMenuScene];
