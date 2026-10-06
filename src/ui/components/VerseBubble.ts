/**
 * The verse bubble (bible §1.2, §1.4, §2.6): Longfellow's lines on dark paper
 * with a thin gold rule, the voice on the frame, lines appearing one by one
 * (never letter by letter), the citation always under them, a [Q] gloss mark,
 * and words that glow in their origin line until taken with E.
 *
 * Shows one tercet-sized chunk of a quote at a time; the presenter pages.
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, TIMINGS } from '../../config';
import type { CollectibleWord, QuoteSpec } from '../../runtime/contracts';
import { glowTexture, panelTexture } from '../art/textures';
import { uiContext } from '../context';
import { addText, destroy, measurer, tweenTo } from '../phaser/helpers';
import { revealNodes } from './verseLines';
import { sliceCitation, splitAround, wrapVerseLine } from '../text';
import { promptKey } from '../inputMap';
import { lineHeight, textStyle } from '../theme';
import { promptRow } from './keycap';

const MAX_W = 1000;
const MIN_W = 560;
const PAD_X = 44;
const PAD_TOP = 50;
const PAD_BOTTOM = 26;
const BOTTOM = 704;
const INDENT = 36;

export interface VerseLayoutLine {
  readonly text: string;
  readonly index: number;
  readonly continuation: boolean;
  readonly collectible: CollectibleWord | null;
}

export interface VerseShowOptions {
  readonly lineByLine: boolean;
  /** Called when every line of the chunk is on screen. */
  readonly onRevealed?: () => void;
  /** Where to draw: bottom edge y and centre x (defaults: lower middle of the screen). */
  readonly bottom?: number;
  readonly centerX?: number;
  readonly depth?: number;
  /** Words already taken (they no longer glow). */
  readonly taken?: ReadonlySet<string>;
  /** Text of the "[E] …" take prompt; null hides it. */
  readonly takeLabel?: string | null;
}

interface WordNode {
  readonly word: string;
  readonly text: Phaser.GameObjects.Text;
  readonly glow: Phaser.GameObjects.Image;
}

export class VerseBubble {
  private root: Phaser.GameObjects.Container | null = null;
  private lineNodes: Phaser.GameObjects.GameObject[][] = [];
  private words: WordNode[] = [];
  private revealTimer: Phaser.Time.TimerEvent | null = null;
  private revealedCount = 0;
  private onRevealed: (() => void) | null = null;
  private prompt: Phaser.GameObjects.Container | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly depth: number = DEPTH.bubble,
  ) {}

  get visible(): boolean {
    return this.root !== null;
  }

  get revealing(): boolean {
    return this.root !== null && this.revealedCount < this.lineNodes.length;
  }

  /** Screen position of a glowing word (for its flight to the Book). */
  wordAnchor(word: string): { x: number; y: number } | null {
    const node = this.words.find((w) => w.word === word);
    if (!node || !this.root) return null;
    const m = node.text.getWorldTransformMatrix();
    return { x: m.tx + node.text.width / 2, y: m.ty + node.text.height / 2 };
  }

  show(spec: QuoteSpec, range: readonly [number, number], opts: VerseShowOptions): void {
    this.clear();
    const theme = uiContext().theme();
    const c = theme.colors;
    const x = theme.extra;
    const verseStyle = textStyle(theme, 'verse', { color: c.verseText });
    const measure = measurer(verseStyle);
    const maxInner = MAX_W - PAD_X * 2;
    const [start, end] = range;
    const layout: VerseLayoutLine[] = [];
    for (let i = start; i < end; i++) {
      const text = spec.lines[i] ?? '';
      const col = spec.collectible.find((cw) => cw.lineIndex === i && !(opts.taken?.has(cw.word) ?? false)) ?? null;
      const segments = wrapVerseLine(text, maxInner, measure, INDENT);
      if (col && segments.length > 1) {
        // A long collectible line: glow on the whole first segment is wrong; keep the word in its segment.
        let offset = 0;
        segments.forEach((seg, k) => {
          const inSeg = col.start >= offset && col.end <= offset + seg.text.length + 1;
          layout.push({ text: seg.text, index: i, continuation: k > 0, collectible: inSeg ? { ...col, start: col.start - offset, end: col.end - offset } : null });
          offset += seg.text.length + 1;
        });
      } else {
        segments.forEach((seg, k) => layout.push({ text: seg.text, index: i, continuation: seg.continuation, collectible: k === 0 ? col : null }));
      }
    }
    const widest = Math.max(...layout.map((l) => measure(l.text) + (l.continuation ? INDENT : 0)), 0);
    const citation = sliceCitation(spec.citation, spec.citationText, spec.lineNumbers, start, end);
    const citeStyle = textStyle(theme, 'citation', { italic: true, color: x.verseSoft });
    const citeW = measurer(citeStyle)(citation);
    const w = Math.max(MIN_W, Math.min(MAX_W, Math.ceil(Math.max(widest, citeW + 120)) + PAD_X * 2));
    const lh = lineHeight(theme.size('verse'), 'verse');
    const citeH = theme.size('citation') + 12;
    const hasTake = spec.collectible.some((cw) => !cw.auto && cw.lineIndex >= start && cw.lineIndex < end && !(opts.taken?.has(cw.word) ?? false));
    const footer = spec.gloss || hasTake ? 34 : 8;
    const h = PAD_TOP + layout.length * lh + citeH + footer + PAD_BOTTOM;
    const panel = panelTexture(this.scene, 'verse', w, h, theme);
    const bottom = opts.bottom ?? BOTTOM;
    const top = bottom - panel.h;
    const root = this.scene.add.container(opts.centerX ?? GAME_WIDTH / 2, top).setDepth(opts.depth ?? this.depth);
    root.add(this.scene.add.image(0, 0, panel.key).setOrigin(0.5, 0));
    const left = -panel.w / 2 + PAD_X;
    // Voice on the frame
    const voice = addText(this.scene, left - 6, 16, spec.speakerName.toUpperCase(), textStyle(theme, 'citation', { color: c.goldBright, letterSpacing: 2 }));
    root.add(voice);
    const ruleG = this.scene.add.graphics();
    ruleG.lineStyle(1, x.rule, 0.6);
    ruleG.lineBetween(left + voice.width + 4, 16 + voice.height / 2, panel.w / 2 - PAD_X + 6, 16 + voice.height / 2);
    root.add(ruleG);
    // Lines
    this.lineNodes = [];
    this.words = [];
    layout.forEach((line, k) => {
      const y = PAD_TOP + k * lh;
      const lx = left + (line.continuation ? INDENT : 0);
      const nodes: Phaser.GameObjects.GameObject[] = [];
      if (line.collectible) {
        const [before, word, after] = splitAround(line.text, line.collectible.start, line.collectible.end);
        const t1 = addText(this.scene, lx, y, before, verseStyle);
        const wx = lx + measure(before);
        const glow = this.scene.add.image(wx + measure(word) / 2, y + theme.size('verse') * 0.62, glowTexture(this.scene, x.glow));
        glow.setDisplaySize(measure(word) + 46, theme.size('verse') * 1.9).setAlpha(0.55).setBlendMode('ADD');
        glow.setData('glow', true);
        const t2 = addText(this.scene, wx, y, word, textStyle(theme, 'verse', { color: x.glow, shadow: true }));
        const t3 = addText(this.scene, wx + measure(word), y, after, verseStyle);
        nodes.push(glow, t1, t2, t3);
        this.words.push({ word: line.collectible.word, text: t2, glow });
      } else {
        nodes.push(addText(this.scene, lx, y, line.text, verseStyle));
      }
      for (const n of nodes) {
        (n as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0);
        root.add(n);
      }
      this.lineNodes.push(nodes);
    });
    // Citation: always visible (bible §1.6).
    const citeY = PAD_TOP + layout.length * lh + 6;
    const cite = addText(this.scene, panel.w / 2 - PAD_X + 6, citeY, citation, citeStyle).setOrigin(1, 0);
    root.add(cite);
    // Footer prompts
    const footY = citeY + citeH + 8;
    if (spec.gloss) {
      const q = promptRow(this.scene, [keyLabel('askVirgil')], 'gloss', { align: 'right', color: x.verseSoft, bookFace: true, italic: true });
      q.node.setPosition(panel.w / 2 - PAD_X + 6, footY);
      root.add(q.node);
    }
    if (hasTake && opts.takeLabel !== null) {
      const take = promptRow(this.scene, [keyLabel('interact')], opts.takeLabel ?? 'Take the word', { align: 'left', color: x.glow, bookFace: true, italic: true });
      take.node.setPosition(left - 6, footY);
      take.node.setAlpha(0);
      root.add(take.node);
      this.prompt = take.node;
    }
    root.setAlpha(0);
    this.root = root;
    this.scene.tweens.add({ targets: root, alpha: 1, duration: 220, ease: 'Quad.easeOut' });
    this.onRevealed = opts.onRevealed ?? null;
    this.revealedCount = 0;
    if (opts.lineByLine) {
      this.revealNext();
      this.revealTimer = this.scene.time.addEvent({
        delay: TIMINGS.verseLineIntervalMs,
        repeat: Math.max(0, this.lineNodes.length - 2),
        callback: () => this.revealNext(),
      });
    } else {
      this.revealAll();
    }
  }

  private revealNext(): void {
    const nodes = this.lineNodes[this.revealedCount];
    if (!nodes) return;
    this.revealedCount += 1;
    revealNodes(this.scene, nodes, 420);
    try {
      uiContext().audio()?.play('verse');
    } catch {
      // optional
    }
    if (this.revealedCount >= this.lineNodes.length) this.finished();
  }

  /** Show every line now. Returns true if lines were still appearing. */
  revealAll(): boolean {
    const was = this.revealing;
    if (this.revealTimer) {
      this.revealTimer.remove(false);
      this.revealTimer = null;
    }
    for (let i = this.revealedCount; i < this.lineNodes.length; i++) revealNodes(this.scene, this.lineNodes[i] ?? [], 150);
    const already = this.revealedCount >= this.lineNodes.length;
    this.revealedCount = this.lineNodes.length;
    if (!already || was) this.finished();
    return was;
  }

  private finished(): void {
    if (this.revealTimer) {
      this.revealTimer.remove(false);
      this.revealTimer = null;
    }
    if (this.prompt) this.scene.tweens.add({ targets: this.prompt, alpha: 1, duration: 300 });
    const cb = this.onRevealed;
    this.onRevealed = null;
    cb?.();
  }

  /** The word leaves its line: it dims in place (its card flies from here). */
  markTaken(word: string): void {
    const node = this.words.find((w) => w.word === word);
    if (!node) return;
    this.scene.tweens.killTweensOf(node.glow);
    this.scene.tweens.add({ targets: node.glow, alpha: 0, duration: 250 });
    this.scene.tweens.add({ targets: node.text, alpha: 0.35, duration: 250 });
    if (this.prompt && this.words.every((w) => w.word === word || w.text.alpha < 0.5)) {
      this.scene.tweens.add({ targets: this.prompt, alpha: 0, duration: 200 });
    }
  }

  async hide(fast = false): Promise<void> {
    const root = this.root;
    this.detach();
    if (!root) return;
    if (fast) {
      destroy(root);
      return;
    }
    await tweenTo(this.scene, { targets: root, alpha: 0, duration: 160 });
    destroy(root);
  }

  clear(): void {
    const root = this.root;
    this.detach();
    destroy(root);
  }

  private detach(): void {
    if (this.revealTimer) {
      this.revealTimer.remove(false);
      this.revealTimer = null;
    }
    this.root = null;
    this.lineNodes = [];
    this.words = [];
    this.prompt = null;
    this.onRevealed = null;
    this.revealedCount = 0;
  }
}

/** Key label for the current input device. */
export function keyLabel(action: 'askVirgil' | 'interact' | 'advance' | 'book' | 'back' | 'confirm'): string {
  return promptKey(action, uiContext().device());
}
