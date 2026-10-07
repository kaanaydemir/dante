/**
 * The title: the book's cover (THE DIVINE COMEDY · Dante Alighieri · A
 * Playable Book · Longfellow's translation) with New Journey / Continue /
 * Settings. Starting a journey opens the cover and hands over to the session;
 * the presenter and the world start the scenes they need.
 *
 * Owner: team C (presentation). Keep the class name and scene key.
 */

import * as Phaser from 'phaser';
import { services } from '../app/services';
import { GAME_HEIGHT, GAME_WIDTH, PAGE_BACKGROUND } from '../config';
import { glowTexture, panelTexture } from '../ui/art/textures';
import { openBook } from '../ui/bookControl';
import { promptRow } from '../ui/components/keycap';
import { sfx, uiContext } from '../ui/context';
import type { UiAction } from '../ui/inputMap';
import { addText, destroy, tweenTo } from '../ui/phaser/helpers';
import { uiRouter, type ActionMeta, type InputHandler } from '../ui/router';
import { cssColor, textStyle } from '../ui/theme';
import { SceneKeys } from './keys';

type ItemId = 'new' | 'continue' | 'settings' | 'confirm-yes' | 'confirm-no';

interface Item {
  readonly id: ItemId;
  readonly label: string;
  readonly enabled: boolean;
  text: Phaser.GameObjects.Text | null;
  zone: Phaser.GameObjects.Zone | null;
}

const COVER_W = 600;
const COVER_H = 680;

export class TitleScene extends Phaser.Scene implements InputHandler {
  uiReady = false;
  private items: Item[] = [];
  private index = 0;
  private started = false;
  private confirming = false;
  private cover: Phaser.GameObjects.Container | null = null;
  private pointer: Phaser.GameObjects.Text | null = null;
  private menu: Phaser.GameObjects.Container | null = null;
  private popRouter: (() => void) | null = null;
  /** Screen y where the menu starts (under the cover's lettering). */
  private menuTop = GAME_HEIGHT / 2 + 56;

  constructor() {
    super({ key: SceneKeys.Title });
  }

  create(): void {
    this.uiReady = false;
    this.started = false;
    this.confirming = false;
    const theme = uiContext().theme();
    const c = theme.colors;
    this.cameras.main.setBackgroundColor(PAGE_BACKGROUND);
    // Candle light behind the book.
    const glow = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, glowTexture(this, 0xc9a24a, 256)).setDisplaySize(1500, 1100).setAlpha(0.14);
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.dust();
    // The cover
    const panel = panelTexture(this, 'cover', COVER_W, COVER_H, theme);
    const cover = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    cover.add(this.add.image(0, 0, panel.key));
    const gold = c.goldBright;
    // The cover is laid out from the top down, so larger text sizes keep their spacing.
    let y = -COVER_H / 2 + 90;
    const t1 = addText(this, 0, y, 'THE DIVINE', textStyle(theme, 'title', { px: 54, color: gold, letterSpacing: 6, shadow: true }));
    t1.setOrigin(0.5, 0);
    y += 64;
    const t2 = addText(this, 0, y, 'COMEDY', textStyle(theme, 'title', { px: 64, color: gold, letterSpacing: 10, shadow: true }));
    t2.setOrigin(0.5, 0);
    y += 88;
    const rule = this.add.graphics();
    rule.lineStyle(1, c.gold, 0.9);
    rule.lineBetween(-150, y, -14, y);
    rule.lineBetween(14, y, 150, y);
    rule.fillStyle(c.gold, 1);
    rule.fillTriangle(-7, y, 0, y - 7, 7, y);
    rule.fillTriangle(-7, y, 0, y + 7, 7, y);
    y += 18;
    const author = addText(this, 0, y, 'Dante Alighieri', textStyle(theme, 'heading', { italic: true, color: c.paper, shadow: true })).setOrigin(0.5, 0);
    y += author.height + 4;
    const sub = addText(this, 0, y, 'A  PLAYABLE  BOOK', textStyle(theme, 'citation', { color: c.gold, letterSpacing: 3 })).setOrigin(0.5, 0);
    y += sub.height + 4;
    const part = addText(this, 0, y, 'Inferno · Chapter One · Cantos I–V', textStyle(theme, 'citation', { italic: true, color: c.paperShade })).setOrigin(0.5, 0);
    y += part.height;
    this.menuTop = GAME_HEIGHT / 2 + y + 26;
    const credit = addText(
      this,
      0,
      0,
      'In the translation of\nHenry Wadsworth Longfellow, 1867',
      textStyle(theme, 'citation', { italic: true, color: c.paperShade, align: 'center' }),
    ).setOrigin(0.5, 1);
    credit.setY(COVER_H / 2 - 68);
    cover.add([t1, t2, rule, author, sub, part, credit]);
    this.cover = cover;
    cover.setAlpha(0);
    this.tweens.add({ targets: cover, alpha: 1, duration: 900, ease: 'Sine.easeOut' });
    this.buildMenu();
    this.popRouter = uiRouter()?.push(this) ?? null;
    // Text size or contrast changed in the Settings opened from here: redraw the cover when the Book closes.
    const themeKey = this.themeKey();
    let offBook: (() => void) | null = null;
    try {
      offBook = services().bus.on('ui:book', (p) => {
        if (!p.open && !this.started && this.themeKey() !== themeKey) {
          try {
            this.scene.restart();
          } catch {
            // keep the old cover
          }
        }
      });
    } catch {
      offBook = null;
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offBook?.();
      offBook = null;
      this.popRouter?.();
      this.popRouter = null;
      this.uiReady = false;
    });
    this.uiReady = true;
  }

  private themeKey(): string {
    const t = uiContext().theme();
    return `${t.fontScale}|${t.highContrast}`;
  }

  private canContinue(): boolean {
    try {
      return services().session.canContinue();
    } catch {
      return false;
    }
  }

  private buildMenu(): void {
    destroy(this.menu);
    const theme = uiContext().theme();
    const c = theme.colors;
    const items: Item[] = this.confirming
      ? [
          { id: 'confirm-yes', label: 'Begin again', enabled: true, text: null, zone: null },
          { id: 'confirm-no', label: 'Keep my journey', enabled: true, text: null, zone: null },
        ]
      : [
          { id: 'new', label: 'New Journey', enabled: true, text: null, zone: null },
          { id: 'continue', label: 'Continue', enabled: this.canContinue(), text: null, zone: null },
          { id: 'settings', label: 'Settings', enabled: true, text: null, zone: null },
        ];
    const menu = this.add.container(GAME_WIDTH / 2, this.menuTop);
    let top = 0;
    if (this.confirming) {
      const warn = addText(this, 0, 0, 'The journey so far will be lost.', textStyle(theme, 'citation', { italic: true, color: c.paperShade })).setOrigin(0.5, 0);
      menu.add(warn);
      top = warn.height + 10;
    }
    const style = textStyle(theme, 'option', { color: c.paper, shadow: true });
    const step = Math.max(46, Math.round(theme.size('option') * 1.6));
    items.forEach((it, i) => {
      const y = top + i * step;
      const t = addText(this, 0, y, it.label, { ...style, color: cssColor(it.enabled ? c.paper : 0x6f6655) }).setOrigin(0.5, 0);
      const zone = this.add.zone(0, y + t.height / 2, 320, step - 4).setInteractive({ useHandCursor: it.enabled });
      zone.on('pointerover', () => {
        if (it.enabled) this.select(i);
      });
      zone.on('pointerdown', () => {
        if (it.enabled) {
          this.select(i);
          this.activate();
        }
      });
      it.text = t;
      it.zone = zone;
      menu.add([zone, t]);
    });
    const pointer = addText(this, 0, 0, '▸', textStyle(theme, 'option', { color: c.goldBright }));
    pointer.setOrigin(1, 0);
    menu.add(pointer);
    const hint = promptRow(this, ['▴', '▾', 'Enter'], 'choose and open', { align: 'right' });
    // Bottom right of the screen (the menu container's origin is at menuTop).
    hint.node.setPosition(GAME_WIDTH / 2 - 24, GAME_HEIGHT - 32 - this.menuTop);
    hint.node.setAlpha(0.55);
    menu.add(hint.node);
    this.pointer = pointer;
    this.menu = menu;
    this.items = items;
    this.index = Math.max(0, items.findIndex((it) => it.enabled && (this.confirming ? it.id === 'confirm-no' : it.id === (this.canContinue() ? 'continue' : 'new'))));
    this.render();
    menu.setAlpha(0);
    this.tweens.add({ targets: menu, alpha: 1, duration: 500, delay: this.confirming ? 0 : 500 });
  }

  private select(i: number): void {
    if (i === this.index) return;
    this.index = i;
    sfx('ui');
    this.render();
  }

  private render(): void {
    const c = uiContext().theme().colors;
    this.items.forEach((it, i) => {
      it.text?.setColor(cssColor(!it.enabled ? 0x6f6655 : i === this.index ? c.goldBright : c.paper));
    });
    const cur = this.items[this.index]?.text;
    if (cur && this.pointer) {
      this.pointer.setPosition(cur.x - cur.width / 2 - 14, cur.y);
    }
  }

  private move(delta: number): void {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      const i = (((this.index + delta * k) % n) + n) % n;
      if (this.items[i]?.enabled) {
        this.select(i);
        return;
      }
    }
  }

  onAction(action: UiAction, meta: ActionMeta): boolean {
    if (this.started) return true;
    if (action === 'up') this.move(-1);
    else if (action === 'down') this.move(1);
    else if ((action === 'advance' || action === 'interact') && !meta.repeat) this.activate();
    else if ((action === 'back' || action === 'book') && this.confirming) {
      this.confirming = false;
      this.buildMenu();
    }
    return true;
  }

  onPointer(): boolean {
    return false;
  }

  private activate(): void {
    const it = this.items[this.index];
    if (!it || !it.enabled || this.started) return;
    sfx('choice');
    const s = services();
    switch (it.id) {
      case 'new':
        if (this.canContinue()) {
          this.confirming = true;
          this.buildMenu();
          return;
        }
        this.begin(() => void s.session.newGame());
        return;
      case 'confirm-yes':
        s.store.clearSave();
        this.begin(() => void s.session.newGame());
        return;
      case 'confirm-no':
        this.confirming = false;
        this.buildMenu();
        return;
      case 'continue':
        this.begin(() => void s.session.continueGame());
        return;
      case 'settings':
        openBook(this.game, s.bus, { tab: 'settings', fromTitle: true });
        return;
    }
  }

  /** The cover opens, then the session takes over (the presenter stops this scene). */
  private begin(start: () => void): void {
    this.started = true;
    try {
      services().audio.unlock();
    } catch {
      // optional
    }
    sfx('page');
    const cover = this.cover;
    const menu = this.menu;
    void (async () => {
      if (menu) void tweenTo(this, { targets: menu, alpha: 0, duration: 200 });
      if (cover) {
        await tweenTo(this, { targets: cover, scaleX: 0.02, x: GAME_WIDTH / 2 - COVER_W / 2, alpha: 0.4, duration: 520, ease: 'Cubic.easeIn' });
      }
      start();
    })();
  }

  /** Slow motes of light drifting up in the dark. */
  private dust(): void {
    const key = glowTexture(this, 0xe6c66e, 32);
    for (let i = 0; i < 26; i++) {
      const mote = this.add.image(Math.random() * GAME_WIDTH, GAME_HEIGHT + Math.random() * 200, key);
      mote.setScale(0.12 + Math.random() * 0.22).setAlpha(0.15 + Math.random() * 0.35).setBlendMode('ADD');
      this.tweens.add({
        targets: mote,
        y: -40,
        x: mote.x + (Math.random() - 0.5) * 160,
        duration: 14000 + Math.random() * 16000,
        delay: Math.random() * 12000,
        repeat: -1,
      });
    }
  }
}
