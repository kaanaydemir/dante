/**
 * The set of overlays a scene can host: strip, balloons, verse bubble,
 * margin, card, word cards, toasts, margin note, barks, tutorial prompts.
 * The UI scene hosts one over the world; the book page scene hosts one over
 * the open book (with a depth offset so it draws above the pages).
 *
 * Owner: team C (presentation).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../../config';
import { Barks, TutorialPrompt } from './Barks';
import { ChoiceMargin } from './ChoiceMargin';
import { DialogueBubble } from './DialogueBubble';
import { HintPanel } from './HintPanel';
import { NarrationStrip } from './NarrationStrip';
import { RevealCardView } from './RevealCardView';
import { Toasts } from './Toasts';
import { VerseBubble } from './VerseBubble';
import { WordCardFx } from './WordCardFx';

export interface OverlayOptions {
  /** Added to every DEPTH value (the book page scene draws overlays above its pages). */
  readonly depthOffset: number;
  /** Where word cards fly (the Book icon). */
  readonly bookTarget: () => { x: number; y: number };
  readonly onBookLand: () => void;
}

export class OverlaySet {
  readonly strip: NarrationStrip;
  readonly dialog: DialogueBubble;
  readonly verse: VerseBubble;
  readonly margin: ChoiceMargin;
  readonly card: RevealCardView;
  readonly words: WordCardFx;
  readonly toasts: Toasts;
  readonly hint: HintPanel;
  readonly barks: Barks;
  readonly tutorial: TutorialPrompt;

  constructor(readonly scene: Phaser.Scene, opts: OverlayOptions) {
    const d = opts.depthOffset;
    this.strip = new NarrationStrip(scene, DEPTH.strip + d);
    this.dialog = new DialogueBubble(scene, DEPTH.bubble + d);
    this.verse = new VerseBubble(scene, DEPTH.bubble + d);
    this.margin = new ChoiceMargin(scene, DEPTH.margin + d);
    this.card = new RevealCardView(scene, DEPTH.card + d);
    this.words = new WordCardFx(scene, opts.bookTarget, opts.onBookLand, DEPTH.card + 20 + d);
    this.toasts = new Toasts(scene, DEPTH.toast + d);
    this.hint = new HintPanel(scene, DEPTH.margin + 10 + d);
    this.barks = new Barks(scene, DEPTH.prompt + d);
    this.tutorial = new TutorialPrompt(scene, DEPTH.prompt + d);
    // Notices stack under the narration strip while one is up (they share the top left).
    this.toasts.avoid(() => (this.strip.visible ? this.strip.bottom : 0));
    this.hint.avoid(() => (this.strip.visible ? this.strip.bottom : 0));
    this.barks.avoid(() => (this.strip.visible ? this.strip.bottom : 0));
    // Tutorial prompts stay above a balloon or a verse at the bottom of the screen.
    this.tutorial.avoid(() => Math.min(this.dialog.visible ? this.dialog.topY : 720, this.verse.visible ? this.verse.topY : 720));
    this.strip.onLayout(() => {
      this.toasts.relayout();
      this.barks.relayout();
    });
  }

  /** Remove everything at once (cancelAll, scene changes). */
  clearAll(): void {
    this.strip.clear();
    this.dialog.clear();
    this.verse.clear();
    this.margin.clear();
    this.card.clear();
    this.words.clear();
    this.hint.clear();
    this.tutorial.clear();
  }
}
