/**
 * `hub` (bible §7.0, Canto IV; GDD 4.2 "a centre without combat"): a quiet
 * place of optional conversations. The hub counts the figures Dante has
 * spoken with (talk signals on the bus) and emits `allEvent` once every
 * listed speaker has been heard; it never forces a conversation. With `part`,
 * standing crowds step aside as Dante comes near (IV s3 "the forest of
 * ghosts": they make way for him, and close again behind).
 *
 * Config:
 *   speakers?: SpeakerId[]      the optional conversations
 *   allEvent?: EventId          emitted once when all of them have been heard
 *   part?: boolean              crowds part before Dante (default false)
 *   crowd?: SpeakerId[]         which figures part (default SHADE, SOUL, NEUTRAL)
 *   partRadius?: number         default 26
 *   area?: Rect | PlaceId       parting only inside
 *   partForVirgil?: boolean     they also make way for Virgil, before he reaches them (default false)
 *   strayDistance?: number      inside the area, Dante farther than this from Virgil is slowed
 *                               and the crowd parts later and narrower (default 0: off)
 *   straySlow?: number          his speed factor then (default 0.6)
 *
 * Owner: team D (mechanics).
 */

import type { MechanicContext } from '../runtime/contracts';
import type { EventId, SpeakerId } from '../story/types';
import type { Npc } from '../entities/npc';
import { dist, normalize, rectContains } from '../world/geometry';
import { BaseMechanic, num, type AreaRef, type Point } from './base';

export interface HubConfig {
  readonly speakers?: readonly SpeakerId[];
  readonly allEvent?: EventId;
  readonly part?: boolean;
  readonly crowd?: readonly SpeakerId[];
  readonly partRadius?: number;
  readonly area?: AreaRef;
  readonly partForVirgil?: boolean;
  readonly strayDistance?: number;
  readonly straySlow?: number;
}

export class Hub extends BaseMechanic {
  private readonly cfg: HubConfig;
  private readonly heard = new Set<SpeakerId>();
  private readonly homes = new Map<Npc, Point>();
  private done = false;
  private straying = false;

  constructor(ctx: MechanicContext, cfg: HubConfig) {
    super('hub', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.allEvent);
    const off = ctx.level.bus.on('world:signal', (sig) => {
      if (sig.kind === 'talk') this.onTalk(sig.speaker);
    });
    this.onDispose(off);
  }

  /** Speakers heard so far (in no particular order). */
  get spokenWith(): readonly SpeakerId[] {
    return [...this.heard];
  }

  private onTalk(speaker: SpeakerId): void {
    this.heard.add(speaker);
    const list = this.cfg.speakers ?? [];
    if (!this.done && list.length > 0 && list.every((s) => this.heard.has(s))) {
      this.done = true;
      this.emitEvent(this.cfg.allEvent);
    }
  }

  protected override step(dt: number): void {
    if (!this.cfg.part || !this.w) return;
    const w = this.w;
    const p = this.player;
    const area = this.areaOf(this.cfg.area);
    const inside = !area || rectContains(area, p.x, p.y);
    const crowd = new Set(this.cfg.crowd ?? ['SHADE', 'SOUL', 'NEUTRAL']);
    const radius = num(this.cfg.partRadius, 26);
    const v = w.companion.visible ? w.companion.actor : null;
    // Far from Virgil the crowd is slow to let him through (IV s3: "the way only grows longer").
    const strayAt = num(this.cfg.strayDistance, 0);
    this.straying = inside && strayAt > 0 && v !== null && dist(v.x, v.y, p.x, p.y) > strayAt;
    if (this.straying && w.playable()) w.slow(Math.max(0.2, Math.min(1, num(this.cfg.straySlow, 0.6))));
    const danteRadius = this.straying ? radius * 0.6 : radius;
    const virgilRadius = radius * 1.4;
    const virgilIn = v !== null && this.cfg.partForVirgil === true && (!area || rectContains(area, v.x, v.y));
    for (const npc of w.npcs()) {
      if (!crowd.has(npc.speaker) || npc.actor.walking) continue;
      let home = this.homes.get(npc);
      if (!home) {
        home = { x: npc.x, y: npc.y };
        this.homes.set(npc, home);
      }
      let tx = home.x;
      let ty = home.y;
      // Make way for whoever is nearest (Dante, or Virgil walking ahead of him).
      const sources: Array<{ x: number; y: number; r: number }> = [];
      if (inside) sources.push({ x: p.x, y: p.y, r: danteRadius });
      if (virgilIn && v) sources.push({ x: v.x, y: v.y, r: virgilRadius });
      for (const src of sources) {
        const d = dist(home.x, home.y, src.x, src.y);
        if (d >= src.r) continue;
        // Step aside, perpendicular to the way when possible.
        const away = normalize(home.x - src.x, home.y - src.y);
        const k = src.r - d + 6;
        tx = home.x + away.x * k;
        ty = home.y + away.y * k * 0.7;
        break;
      }
      const dx = tx - npc.x;
      const dy = ty - npc.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.5) {
        const stepPx = Math.min(len, (40 * dt) / 1000);
        npc.actor.setPosition(npc.x + (dx / len) * stepPx, npc.y + (dy / len) * stepPx);
      }
    }
  }

  override debugInfo(): Record<string, unknown> {
    return { ...super.debugInfo(), heard: [...this.heard], done: this.done, straying: this.straying };
  }
}

export function createHub(ctx: MechanicContext, cfg: HubConfig): Hub {
  return new Hub(ctx, cfg);
}
