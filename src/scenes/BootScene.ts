/**
 * Boot: generate every procedural texture, wait for the fonts, open the title.
 *
 * PLACEHOLDER created by the architect. Owner: team D (world / art).
 * Keep the class name and scene key; replace freely otherwise.
 */

import * as Phaser from 'phaser';
import { loadFonts } from '../app/fonts';
import { generateTextures } from '../art/textures';
import { SceneKeys } from './keys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.Boot });
  }

  create(): void {
    generateTextures(this);
    void loadFonts().then(() => {
      this.scene.start(SceneKeys.Title);
    });
  }
}
