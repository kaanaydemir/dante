/**
 * The HUD (GDD 9.5, ENGINE §7.1): Resolve as a flame and Grace as a drop (top
 * left), the scale beside them once the heart opens (pans for pity and
 * justice, the beam for the balance, never a number), place and canto (top
 * right), the Book (bottom right, where words fly), the [Q] mark, the
 * equipped verse.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, RESOURCES, TIMINGS } from '../../config';
import type { BeatMode, WordName } from '../../story/types';
import type { GameStateView } from '../../runtime/contracts';
import { iconTexture } from '../art/textures';
import { uiContext } from '../context';
import { scalePose, segments } from '../models/hud';
import { addText, destroy } from '../phaser/helpers';
import { textStyle } from '../theme';
import { promptRow } from './keycap';
import { keyLabel } from './VerseBubble';

export const BOOK_ICON = { x: GAME_WIDTH - 46, y: GAME_HEIGHT - 44 } as const;

const SEG_W = 15;
const SEG_H = 11;
const SEG_GAP = 3;
const SCALE_X = 286;
const SCALE_Y = 20;

export class Hud {
  private root: Phaser.GameObjects.Container;
  private bars: Phaser.GameObjects.Graphics;
  private scaleG: Phaser.GameObjects.Graphics;
  private scaleIcons: Phaser.GameObjects.Image[] = [];
  private place: Phaser.GameObjects.Text;
  private canto: Phaser.GameObjects.Text;
  private book: Phaser.GameObjects.Image;
  private bookKey: Phaser.GameObjects.Container | null = null;
  private ask: Phaser.GameObjects.Container | null = null;
  private verse: Phaser.GameObjects.Text;
  private flame: Phaser.GameObjects.Image;
  private drop: Phaser.GameObjects.Image;
  private beam = { deg: 0 };
  private heartVisible = false;
  private pity = 0;
  private justice = 0;
  private mode: BeatMode | null = null;
  private hintOn = false;

  constructor(private readonly scene: Phaser.Scene) {
    const theme = uiContext().theme();
    const c = theme.colors;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.hud);
    // A soft shade behind the top corners keeps the HUD legible over bright scenes.
    const shadeL = scene.add.rectangle(0, 0, 420, 96, 0x000000, 0.28).setOrigin(0, 0);
    const shadeR = scene.add.rectangle(GAME_WIDTH, 0, 420, 86, 0x000000, 0.28).setOrigin(1, 0);
    this.flame = scene.add.image(34, 32, iconTexture(scene, 'flame', c.resolve, c.ink, 36));
    this.drop = scene.add.image(34, 68, iconTexture(scene, 'drop', c.grace, c.ink, 30));
    this.bars = scene.add.graphics();
    this.scaleG = scene.add.graphics();
    this.place = addText(scene, GAME_WIDTH - 22, 12, '', textStyle(theme, 'hud', { face: 'book', px: theme.size('body'), color: c.paper, shadow: true }));
    this.place.setOrigin(1, 0);
    this.canto = addText(scene, GAME_WIDTH - 22, 46, '', textStyle(theme, 'citation', { italic: true, color: c.goldBright, shadow: true }));
    this.canto.setOrigin(1, 0);
    this.book = scene.add.image(BOOK_ICON.x, BOOK_ICON.y, iconTexture(scene, 'book', c.rubric, c.ink, 44));
    this.verse = addText(scene, BOOK_ICON.x - 70, BOOK_ICON.y, '', textStyle(theme, 'citation', { italic: true, color: c.goldBright, shadow: true }));
    this.verse.setOrigin(1, 0.5);
    this.root.add([shadeL, shadeR, this.flame, this.drop, this.bars, this.scaleG, this.place, this.canto, this.book, this.verse]);
    this.buildBookKey();
    this.scene.tweens.add({ targets: this.flame, scaleY: 1.06, scaleX: 0.96, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.easeInOut' });
  }

  private buildBookKey(): void {
    destroy(this.bookKey);
    const row = promptRow(this.scene, [keyLabel('book')], '', { align: 'center' });
    row.node.setPosition(BOOK_ICON.x, BOOK_ICON.y + 30);
    row.node.setScale(0.8);
    this.root.add(row.node);
    this.bookKey = row.node;
  }

  setCanto(location: string, label: string): void {
    this.place.setText(location);
    this.canto.setText(label);
  }

  update(state: GameStateView): void {
    const c = uiContext().theme().colors;
    const g = this.bars;
    g.clear();
    const draw = (x0: number, y: number, fills: number[], color: number): void => {
      fills.forEach((f, i) => {
        const x = x0 + i * (SEG_W + SEG_GAP);
        g.fillStyle(0x000000, 0.55);
        g.fillRect(x, y, SEG_W, SEG_H);
        if (f > 0) {
          g.fillStyle(color, 1);
          g.fillRect(x, y, Math.max(1, Math.round(SEG_W * f)), SEG_H);
          g.fillStyle(0xffffff, 0.25);
          g.fillRect(x, y, Math.max(1, Math.round(SEG_W * f)), 2);
        }
        g.lineStyle(1, color, 0.6);
        g.strokeRect(x + 0.5, y + 0.5, SEG_W - 1, SEG_H - 1);
      });
    };
    draw(58, 27, segments(state.resolve, RESOURCES.resolveMax), c.resolve);
    draw(58, 63, segments(state.grace, state.gracemax), c.grace);
    this.flame.setAlpha(0.45 + 0.55 * Math.min(1, state.resolve / RESOURCES.resolveMax));
    // Heart
    const visible = state.unlocks.includes('heart');
    if (visible && !this.heartVisible) this.revealScale();
    this.heartVisible = visible;
    this.pity = state.heart.pity;
    this.justice = state.heart.justice;
    if (visible) this.drawScale(scalePose(this.pity, this.justice).beamDeg);
    else this.scaleG.clear();
    // Equipped verse
    const v = state.equippedVerse;
    const words: WordName[] = v ? v.tercets.flatMap((t) => [t[0], t[1], t[2]]).filter(Boolean) : [];
    if (v?.coda) words.push(v.coda);
    this.verse.setText(state.unlocks.includes('verse') && words.length > 0 ? words.join(' · ') : '');
  }

  private revealScale(): void {
    this.scaleG.setAlpha(0);
    this.scene.tweens.add({ targets: this.scaleG, alpha: 1, duration: 900 });
  }

  private drawScale(beamDeg: number): void {
    const theme = uiContext().theme();
    const c = theme.colors;
    const g = this.scaleG;
    g.clear();
    const cx = SCALE_X;
    const top = SCALE_Y;
    const arm = 30;
    const pose = scalePose(this.pity, this.justice, arm);
    const rad = (beamDeg * Math.PI) / 180;
    const lx = cx - Math.cos(rad) * arm;
    const ly = top + 8 - Math.sin(rad) * arm;
    const rx = cx + Math.cos(rad) * arm;
    const ry = top + 8 + Math.sin(rad) * arm;
    // post and base
    g.lineStyle(3, c.gold, 1);
    g.lineBetween(cx, top + 2, cx, top + 58);
    g.lineBetween(cx - 14, top + 60, cx + 14, top + 60);
    g.fillStyle(c.gold, 1);
    g.fillCircle(cx, top + 4, 3.5);
    // beam
    g.lineStyle(3, c.goldBright, 1);
    g.lineBetween(lx, ly, rx, ry);
    // strings and pans
    const pan = (px: number, py: number, color: number, load: number, tear: boolean): void => {
      g.lineStyle(1, c.paper, 0.7);
      g.lineBetween(px, py, px - 10, py + 24);
      g.lineBetween(px, py, px + 10, py + 24);
      g.fillStyle(color, 0.95);
      g.fillEllipse(px, py + 26, 26, 9);
      g.lineStyle(1.5, c.paper, 0.6);
      g.strokeEllipse(px, py + 26, 26, 9);
      if (load > 0) {
        // the heap in the pan (no number: bible §3.1)
        g.fillStyle(tear ? 0xd8ecff : 0xffe2a8, 0.95);
        const hgt = 3 + load * 9;
        if (tear) {
          g.fillTriangle(px - 4, py + 24, px + 4, py + 24, px, py + 24 - hgt);
          g.fillCircle(px, py + 24, 4);
        } else {
          g.fillRect(px - 7, py + 25 - hgt * 0.6, 14, hgt * 0.6);
        }
      }
    };
    pan(lx, ly, c.pity, pose.pityLoad, true);
    pan(rx, ry, c.justice, pose.justiceLoad, false);
    if (this.scaleIcons.length === 0) {
      // Shape as well as colour: a tear for pity, a pan for justice (bible §1.6).
      const tear = this.scene.add.image(cx - 50, top + 40, iconTexture(this.scene, 'tear', c.pity, c.ink, 20));
      const panIcon = this.scene.add.image(cx + 50, top + 40, iconTexture(this.scene, 'pan', c.justice, c.ink, 20));
      this.scaleIcons = [tear, panIcon];
      this.root.add(this.scaleIcons);
    }
  }

  /** The scale twitches after a heart effect and settles at the new tilt (bible §1.3.5). */
  twitch(): void {
    if (!this.heartVisible) return;
    const target = scalePose(this.pity, this.justice).beamDeg;
    this.scene.tweens.killTweensOf(this.beam);
    this.beam.deg = target + (Math.random() < 0.5 ? -10 : 10);
    this.scene.tweens.add({
      targets: this.beam,
      deg: target,
      duration: TIMINGS.heartTwitchMs * 2,
      ease: 'Elastic.easeOut',
      onUpdate: () => this.drawScale(this.beam.deg),
    });
  }

  /** The empty scale trembles and returns (III 50: neither mercy nor justice). */
  tremble(): void {
    if (!this.heartVisible) return;
    this.scene.tweens.add({ targets: this.scaleG, x: 2, yoyo: true, repeat: 5, duration: 50, onComplete: () => this.scaleG.setX(0) });
  }

  pulseBook(): void {
    this.scene.tweens.killTweensOf(this.book);
    this.book.setScale(1);
    this.scene.tweens.add({ targets: this.book, scale: 1.25, yoyo: true, duration: 180, ease: 'Quad.easeOut' });
  }

  setHint(available: boolean): void {
    if (available === this.hintOn) return;
    this.hintOn = available;
    destroy(this.ask);
    this.ask = null;
    if (!available) return;
    const row = promptRow(this.scene, [keyLabel('askVirgil')], 'Ask Virgil', { italic: true, bookFace: true });
    row.node.setPosition(22, GAME_HEIGHT - 34);
    this.root.add(row.node);
    this.ask = row.node;
    row.node.setAlpha(0);
    this.scene.tweens.add({ targets: row.node, alpha: 0.9, duration: 400 });
  }

  /** Cinematic and page modes quiet the HUD. */
  setMode(mode: BeatMode): void {
    this.mode = mode;
    const alpha = mode === 'play' ? 1 : mode === 'dialogue' ? 0.75 : 0.35;
    this.scene.tweens.add({ targets: this.root, alpha, duration: 300 });
  }

  get currentMode(): BeatMode | null {
    return this.mode;
  }

  setVisible(v: boolean): void {
    this.root.setVisible(v);
  }

  destroy(): void {
    destroy(this.root);
  }
}

