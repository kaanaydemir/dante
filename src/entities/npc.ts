/**
 * NPCs: speakers and set dressing (beasts, guardians, souls, poets, great
 * spirits). An NPC shows a key-cap "E" when a `talk:` beat for its speaker is
 * armed and Dante is near, plays its ambient animation, and can carry a
 * behaviour (pacing, blocking, drifting) set by mechanics or level hooks.
 *
 * Owner: team D (entities).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { Facing } from '../runtime/contracts';
import type { SpeakerId } from '../story/types';
import { Actor, type DirectionSet } from './actor';

/** Per-texture drawing info: which directional frames exist, and an ambient loop. */
const TEXTURE_INFO: Readonly<Record<string, { directions: DirectionSet; ambient?: string; speed?: number }>> = {
  'npc-panther': { directions: 'sides', speed: 90 },
  'npc-lion': { directions: 'sides', speed: 80 },
  'npc-she_wolf': { directions: 'sides', speed: 40 },
  'npc-neutral': { directions: 'sides', speed: 70 },
  'npc-windsoul': { directions: 'sides', ambient: 'npc-windsoul-fly-right', speed: 90 },
  'npc-charon': { directions: 'four', ambient: 'npc-charon-idle' },
  'npc-minos': { directions: 'none' },
  'npc-lovers': { directions: 'four', ambient: 'npc-lovers-drift' },
  'npc-francesca': { directions: 'four', ambient: 'npc-francesca-drift' },
  'npc-paolo': { directions: 'four', ambient: 'npc-paolo-drift' },
};

export function textureInfo(texture: string): { directions: DirectionSet; ambient?: string; speed?: number } {
  return TEXTURE_INFO[texture] ?? { directions: 'four' };
}

export type NpcBehaviour = (npc: Npc, dt: number) => void;

export interface NpcOptions {
  readonly id: string;
  readonly speaker: SpeakerId;
  readonly texture: string;
  readonly x: number;
  readonly y: number;
  readonly talkable: boolean;
  readonly facing?: Facing;
}

export class Npc {
  readonly actor: Actor;
  readonly speaker: SpeakerId;
  talkable: boolean;
  /** A `talk:` beat for this speaker is armed. */
  armed = false;
  behaviour: NpcBehaviour | null = null;
  private readonly prompt: Phaser.GameObjects.Image | null;
  private readonly marker: Phaser.GameObjects.Sprite | null;
  private readonly ambient: string | undefined;
  private time = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    opts: NpcOptions,
  ) {
    const info = textureInfo(opts.texture);
    this.speaker = opts.speaker;
    this.talkable = opts.talkable;
    this.ambient = info.ambient;
    this.actor = new Actor(scene, {
      id: opts.id,
      speaker: opts.speaker,
      texture: opts.texture,
      x: opts.x,
      y: opts.y,
      directions: info.directions,
      facing: opts.facing ?? (info.directions === 'sides' ? 'left' : 'down'),
      speed: info.speed ?? 50,
      shadow: opts.texture !== 'npc-windsoul',
    });
    this.prompt = scene.textures.exists('prop-key-e')
      ? scene.add.image(opts.x, opts.y - 40, 'prop-key-e').setDepth(DEPTH.fx).setVisible(false)
      : null;
    this.marker = scene.textures.exists('fx-glint')
      ? scene.add.sprite(opts.x, opts.y - 36, 'fx-glint', '2').setDepth(DEPTH.fx).setVisible(false)
      : null;
    if (this.marker && scene.anims.exists('fx-glint-twinkle')) this.marker.play('fx-glint-twinkle');
    this.startAmbient();
  }

  get x(): number {
    return this.actor.x;
  }

  get y(): number {
    return this.actor.y;
  }

  private startAmbient(): void {
    if (this.ambient && this.scene.anims.exists(this.ambient)) this.actor.sprite.play(this.ambient, true);
  }

  /** The top of the drawing (for prompts), from the sprite's height. */
  private headY(): number {
    return this.actor.y - this.actor.sprite.displayHeight + 4;
  }

  /** One frame: behaviour, scripted walks, prompt. `near`: Dante is within talking reach. */
  update(dt: number, near: boolean): void {
    this.time += dt;
    if (this.behaviour) {
      try {
        this.behaviour(this, dt);
      } catch {
        this.behaviour = null;
      }
    }
    const walking = this.actor.update(dt);
    if (!walking && this.ambient && !this.actor.sprite.anims.isPlaying && !this.actor.poseLocked) this.startAmbient();
    const show = this.armed && this.talkable && this.actor.sprite.visible;
    if (this.marker) {
      this.marker.setVisible(show && !near);
      this.marker.setPosition(this.actor.x, this.headY() - 4);
    }
    if (this.prompt) {
      this.prompt.setVisible(show && near);
      this.prompt.setPosition(this.actor.x, this.headY() - 6 + Math.round(Math.sin(this.time / 220)));
    }
  }

  setVisible(v: boolean): void {
    this.actor.setVisible(v);
    if (!v) {
      this.prompt?.setVisible(false);
      this.marker?.setVisible(false);
    }
  }

  destroy(): void {
    this.actor.destroy();
    this.prompt?.destroy();
    this.marker?.destroy();
  }
}
