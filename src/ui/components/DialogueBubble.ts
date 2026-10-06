/**
 * Modern dialogue balloon (bible §1.2, §1.4): a portrait, the speaker's name,
 * text typed letter by letter at the reader's speed with the speaker's murmur.
 * Distinct from the verse bubble: rounded, dark, no gold rule.
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, TIMINGS } from '../../config';
import type { SayLine } from '../../runtime/contracts';
import { panelTexture, portraitTexture, PORTRAIT_PX } from '../art/textures';
import { uiContext } from '../context';
import { addText, destroy, measurer, tweenTo } from '../phaser/helpers';
import { charDelayMs, typeset, wrapText } from '../text';
import { lineHeight, textStyle } from '../theme';

const WIDTH = 940;
const BOTTOM = 704;
const PAD = 26;
const PORTRAIT = PORTRAIT_PX * 3;

export class DialogueBubble {
  private root: Phaser.GameObjects.Container | null = null;
  private body: Phaser.GameObjects.Text | null = null;
  private more: Phaser.GameObjects.Text | null = null;
  private thread: Phaser.GameObjects.Rectangle | null = null;
  private full = '';
  private shown = 0;
  private times: number[] = [];
  private elapsed = 0;
  private timer: Phaser.Time.TimerEvent | null = null;
  private speaker = '';
  private onTyped: (() => void) | null = null;
  private blocking = true;
  private top = BOTTOM;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.bubble,
  ) {}

  get visible(): boolean {
    return this.root !== null;
  }

  get typing(): boolean {
    return this.root !== null && this.shown < this.full.length;
  }

  /** Top edge of the balloon (for stacking other elements above it). */
  get topY(): number {
    return this.root ? this.top : BOTTOM;
  }

  show(line: SayLine, opts: { blocking: boolean; onTyped?: () => void }): void {
    this.clear();
    const theme = uiContext().theme();
    const c = theme.colors;
    this.blocking = opts.blocking;
    this.onTyped = opts.onTyped ?? null;
    this.speaker = line.speaker;
    const textW = WIDTH - PORTRAIT - PAD * 3;
    const style = textStyle(theme, 'body', { color: c.bubbleText });
    const measure = measurer(style);
    const lines = wrapText(line.text, textW, measure);
    const lh = lineHeight(theme.size('body'));
    const nameStyle = textStyle(theme, 'citation', { color: c.goldBright, letterSpacing: 2 });
    const nameH = theme.size('citation') + 10;
    const textH = lines.length * lh;
    const h = Math.max(PORTRAIT + PAD * 2, nameH + textH + PAD * 2 + 6);
    const panel = panelTexture(this.scene, 'bubble', WIDTH, h, theme);
    const top = BOTTOM - panel.h;
    this.top = top;
    const root = this.scene.add.container(GAME_WIDTH / 2, top).setDepth(this.depth);
    const bg = this.scene.add.image(0, 0, panel.key).setOrigin(0.5, 0);
    root.add(bg);
    const left = -panel.w / 2 + PAD;
    // Portrait in a thin frame
    const pkey = portraitTexture(this.scene, line.speaker, line.tag);
    const frame = this.scene.add.rectangle(left + PORTRAIT / 2, PAD + PORTRAIT / 2 + 2, PORTRAIT + 6, PORTRAIT + 6, 0x000000, 0.45);
    frame.setStrokeStyle(2, c.goldBright, 0.5);
    const portrait = this.scene.add.image(left + PORTRAIT / 2, PAD + PORTRAIT / 2 + 2, pkey);
    portrait.setDisplaySize(PORTRAIT, PORTRAIT);
    if (line.speaker !== 'DANTE' && line.speaker !== 'VIRGIL') portrait.setFlipX(false);
    root.add([frame, portrait]);
    const textX = left + PORTRAIT + PAD;
    const name = addText(this.scene, textX, PAD - 2, line.name.toUpperCase(), nameStyle);
    root.add(name);
    const body = addText(this.scene, textX, PAD + nameH, '', { ...style, lineSpacing: lh - theme.size('body') });
    root.add(body);
    this.body = body;
    this.full = typeset(lines.join('\n'));
    this.shown = 0;
    this.elapsed = 0;
    // Cumulative reveal times per character.
    const cps = this.cps();
    this.times = [];
    let t = 0;
    for (let i = 0; i < this.full.length; i++) {
      t += charDelayMs(this.full, i, cps);
      this.times.push(t);
    }
    const more = addText(this.scene, panel.w / 2 - PAD - 6, panel.h - PAD - 12, '▸', textStyle(theme, 'body', { color: c.goldBright }));
    more.setOrigin(1, 0.5).setAlpha(0);
    root.add(more);
    this.more = more;
    if (!opts.blocking) {
      const thread = this.scene.add.rectangle(textX, panel.h - 18, panel.w / 2 - PAD - textX, 2, c.bubbleText, 0.3).setOrigin(0, 0.5);
      thread.setVisible(false);
      root.add(thread);
      this.thread = thread;
    }
    root.setAlpha(0);
    root.y = top + 12;
    this.root = root;
    this.scene.tweens.add({ targets: root, alpha: 1, y: top, duration: 200, ease: 'Quad.easeOut' });
    if (!Number.isFinite(cps) || this.full.length === 0) {
      this.finishTyping();
    } else {
      this.timer = this.scene.time.addEvent({ delay: 16, loop: true, callback: () => this.tick(16) });
    }
  }

  private cps(): number {
    return TIMINGS.textCps[uiContext().settings().textSpeed] ?? TIMINGS.textCps.normal;
  }

  private tick(dt: number): void {
    if (!this.body) return;
    this.elapsed += dt;
    let n = this.shown;
    while (n < this.full.length && (this.times[n] ?? 0) <= this.elapsed) n++;
    if (n !== this.shown) {
      const before = this.shown;
      this.shown = n;
      this.body.setText(this.full.slice(0, n));
      // A murmur every few letters (GDD 8.2).
      for (let i = before; i < n; i++) {
        const ch = this.full[i] ?? ' ';
        if (/[A-Za-z]/.test(ch) && i % 3 === 0) {
          try {
            uiContext().audio()?.blip(this.speaker);
          } catch {
            // optional
          }
          break;
        }
      }
    }
    if (this.shown >= this.full.length) this.finishTyping();
  }

  /** Reveal the whole text now. Returns true if it was still typing. */
  finishTyping(): boolean {
    const wasTyping = this.shown < this.full.length;
    if (this.timer) {
      this.timer.remove(false);
      this.timer = null;
    }
    this.shown = this.full.length;
    this.body?.setText(this.full);
    if (this.more && this.blocking) {
      this.more.setAlpha(1);
      this.scene.tweens.add({ targets: this.more, x: this.more.x + 4, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.easeInOut' });
    }
    const cb = this.onTyped;
    this.onTyped = null;
    cb?.();
    return wasTyping;
  }

  /** Non-blocking balloons: show the reading thread shrinking over `ms`. */
  runThread(ms: number): void {
    const t = this.thread;
    if (!t) return;
    t.setVisible(true);
    this.scene.tweens.add({ targets: t, scaleX: 0, duration: Math.max(100, ms) });
  }

  async hide(fast = false): Promise<void> {
    const root = this.root;
    this.detach();
    if (!root) return;
    if (fast) {
      destroy(root);
      return;
    }
    await tweenTo(this.scene, { targets: root, alpha: 0, y: root.y + 8, duration: 140, ease: 'Quad.easeIn' });
    destroy(root);
  }

  clear(): void {
    const root = this.root;
    this.detach();
    destroy(root);
  }

  private detach(): void {
    if (this.timer) {
      this.timer.remove(false);
      this.timer = null;
    }
    this.root = null;
    this.body = null;
    this.more = null;
    this.thread = null;
    this.onTyped = null;
  }
}

export const DIALOGUE_LAYOUT = { WIDTH, BOTTOM, PAD, PORTRAIT } as const;
