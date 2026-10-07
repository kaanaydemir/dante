/**
 * `wind_field` (bible §7.0, Canto V s3; GDD 4.3 and 10.2 `WindField`): the
 * infernal hurricane. Wind lanes push Dante steadily (about half his walking
 * speed); behind a rock there is no wind (its shadow downwind is a shelter,
 * where he gets his breath back); the dash is the way through (it cuts most of
 * the push). A Still verse calms the wind around him for a while; the lull of
 * V 96 (`lull()`, or the `wind_lull` mechanic) stills it everywhere. The wind
 * itself never hurts. Optional flocks of shades (the starlings, V 40–45)
 * sweep across now and then: caught in the open they throw him hard and sting
 * a little; behind a rock they pass over.
 *
 * Config:
 *   lanes?: WindLane[]           explicit lanes ({ rect, dir, strength, gust?, gustMs? })
 *   area?: Rect | PlaceId        …or one lane over an area
 *   dir?: Point                  its direction (default east)
 *   strength?: number            px/s (default 36)
 *   gust?: number; gustMs?: number  strength swings by ±gust (default 10 over 2600 ms)
 *   rocks?: Rect[]               shelter rocks (solid; wind shadow downwind)
 *   shadowLength?: number        default 56
 *   streaks?: boolean            wind streaks across the lanes (default true)
 *   souls?: number               blown shades drawn in the lanes (default 4)
 *   flock?: { everyMs?, speed?, width?, damage?, area? } | null   the starlings
 *                                (with `area`: they sweep across it, back and forth,
 *                                only while Dante is inside it)
 *   restPerSecond?: number       Resolve regained in a shelter, standing (default 0.12)
 *   calmEvent?: EventId          emitted when a lull begins
 *   brace?: { afterMs?, factor? } "keep low": Dante standing still braces after `afterMs`
 *                                (default 450) and the push falls to `factor` (default 0.15):
 *                                he is pushed, not swept away (default off)
 *
 * Owner: team D (mechanics).
 */

import type * as Phaser from 'phaser';
import { DEPTH } from '../config';
import type { MechanicContext, Rect } from '../runtime/contracts';
import type { EventId } from '../story/types';
import { normalize, rectContains } from '../world/geometry';
import type { VerseCast } from '../world/extras';
import { BaseMechanic, num, type AreaRef, type Point, type Waiter } from './base';
import { approachCalm, braceFactor, shelterShadow, windAt, type WindBrace, type WindLane } from './logic/wind';

export interface FlockConfig {
  readonly everyMs?: number;
  readonly speed?: number;
  readonly width?: number;
  readonly damage?: number;
  /** Sweep across this area only (and only while Dante is inside it). */
  readonly area?: AreaRef;
}

export interface WindFieldConfig {
  readonly lanes?: readonly WindLane[];
  readonly area?: AreaRef;
  readonly dir?: Point;
  readonly strength?: number;
  readonly gust?: number;
  readonly gustMs?: number;
  readonly rocks?: readonly Rect[];
  readonly shadowLength?: number;
  readonly streaks?: boolean;
  readonly souls?: number;
  readonly flock?: FlockConfig | null;
  readonly restPerSecond?: number;
  readonly calmEvent?: EventId;
  readonly brace?: WindBrace | null;
}

interface Flock {
  x: number;
  readonly y: number;
  readonly dir: number;
  readonly birds: Phaser.GameObjects.Sprite[];
  readonly lane: Rect;
}

export class WindField extends BaseMechanic {
  private readonly cfg: WindFieldConfig;
  private readonly lanes: WindLane[] = [];
  private readonly rocks: Rect[] = [];
  private readonly shelters: Rect[] = [];
  private readonly rockRemovers: Array<() => void> = [];
  private calm = 0;
  private calmTarget = 0;
  private calmRate = 0.8;
  private t = 0;
  private localCalmUntil = 0;
  private sheltered = false;
  private readonly particles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private readonly souls: { sprite: Phaser.GameObjects.Sprite; lane: number; x: number; y: number; phase: number }[] = [];
  private flock: Flock | null = null;
  private untilFlock: number;
  private readonly flockArea: Rect | null;
  private flockPasses = 0;
  private flockHits = 0;
  private lullWaiter: Waiter<'calm'> | null = null;
  /** How long Dante has stood still (for the brace). */
  private stillMs = 0;

  constructor(ctx: MechanicContext, cfg: WindFieldConfig) {
    super('wind_field', ctx, cfg);
    this.cfg = cfg;
    this.declareEmits(cfg.calmEvent);
    for (const l of cfg.lanes ?? []) this.lanes.push({ ...l, rect: { ...l.rect } });
    const area = this.areaOf(cfg.area);
    if (area) {
      this.lanes.push({
        rect: area,
        dir: cfg.dir ?? { x: 1, y: 0 },
        strength: num(cfg.strength, 36),
        gust: num(cfg.gust, 10),
        gustMs: num(cfg.gustMs, 2600),
      });
    }
    this.addRocks(cfg.rocks ?? []);
    this.untilFlock = num(cfg.flock?.everyMs, 9000);
    this.flockArea = this.areaOf(cfg.flock?.area);
    this.buildVisuals();
  }

  /** Shelter rocks: solid, with a calm shadow downwind of each lane they stand in. */
  addRocks(rocks: readonly Rect[]): void {
    for (const r of rocks) {
      const rock = { ...r };
      this.rocks.push(rock);
      const remove = this.w?.addSolid(rock);
      if (remove) this.rockRemovers.push(remove);
      const lane = this.lanes.find((l) => rectContains(l.rect, rock.x + rock.w / 2, rock.y + rock.h / 2)) ?? this.lanes[0];
      const dir = lane?.dir ?? { x: 1, y: 0 };
      this.shelters.push(shelterShadow(rock, dir, num(this.cfg.shadowLength, 56)));
    }
  }

  private buildVisuals(): void {
    const scene = this.scene;
    const tint = this.level.palette.accent2;
    if (this.cfg.streaks !== false && scene.textures.exists('fx-wind')) {
      for (const lane of this.lanes) {
        const d = normalize(lane.dir.x, lane.dir.y);
        const r = lane.rect;
        const speed = 120 + lane.strength * 3;
        const emitter = this.own(
          scene.add.particles(0, 0, 'fx-wind', {
            x: { min: r.x, max: r.x + r.w },
            y: { min: r.y, max: r.y + r.h },
            speedX: d.x * speed,
            speedY: d.y * speed,
            rotate: (Math.atan2(d.y, d.x) * 180) / Math.PI,
            lifespan: 900,
            frequency: Math.max(25, 9000 / Math.max(1, (r.w * r.h) / 400)),
            alpha: { start: 0.5, end: 0 },
            tint,
          }),
        );
        emitter.setDepth(DEPTH.weather);
        this.particles.push(emitter);
      }
    }
    const nSouls = Math.round(num(this.cfg.souls, 4));
    if (nSouls > 0 && scene.textures.exists('npc-windsoul') && this.lanes.length > 0) {
      for (let i = 0; i < nSouls; i++) {
        const lane = i % this.lanes.length;
        const r = (this.lanes[lane] as WindLane).rect;
        const sprite = this.own(scene.add.sprite(r.x + ((i * 97) % Math.max(1, r.w)), r.y + ((i * 53) % Math.max(1, r.h)), 'npc-windsoul', 'right-0'));
        sprite.setDepth(DEPTH.weather - 1).setAlpha(0.75);
        this.souls.push({ sprite, lane, x: sprite.x, y: sprite.y, phase: i * 1.7 });
      }
    }
  }

  /** Current calm (0 = full wind, 1 = still). */
  get calmLevel(): number {
    return this.calm;
  }

  /** Is (x, y) in a rock's lee? */
  isSheltered(x: number, y: number): boolean {
    return this.shelters.some((s) => rectContains(s, x, y));
  }

  /** The wind drops (V 96). Resolves when it is still. `holdMs` > 0 brings it back afterwards. */
  lull(fadeMs = 1500, holdMs = 0): Promise<void> {
    this.calmTarget = 1;
    this.calmRate = 1000 / Math.max(100, fadeMs);
    this.emitEvent(this.cfg.calmEvent);
    this.lullWaiter?.finish('calm');
    const waiter = this.moment<'calm'>(fadeMs + 3000);
    this.lullWaiter = waiter;
    if (holdMs > 0) this.scene.time.delayedCall(fadeMs + holdMs, () => this.resume());
    return waiter.promise.then(() => undefined);
  }

  /** The wind rises again. */
  resume(fadeMs = 1500): void {
    this.calmTarget = 0;
    this.calmRate = 1000 / Math.max(100, fadeMs);
  }

  protected override step(dt: number): void {
    this.t += dt;
    this.calm = approachCalm(this.calm, this.calmTarget, dt, this.calmRate);
    if (this.lullWaiter && this.calm >= 0.999) {
      this.lullWaiter.finish('calm');
      this.lullWaiter = null;
    }
    for (const e of this.particles) e.setAlpha(1 - this.calm);
    this.updateSouls(dt);
    const w = this.w;
    if (!w) return;
    const p = this.player;
    this.sheltered = this.isSheltered(p.x, p.y);
    const localCalm = this.now() < this.localCalmUntil || w.stilled() ? 0.9 : 0;
    const v = windAt(p.x, p.y, { lanes: this.lanes, shelters: this.shelters, calm: Math.max(this.calm, localCalm), time: this.t });
    if (w.playable()) {
      // "Keep low": standing still, he braces against it (pushed, not swept away).
      const input = w.input();
      const still = Math.hypot(input.moveX, input.moveY) < 0.1 && !input.dashPressed;
      this.stillMs = still ? this.stillMs + dt : 0;
      const brace = braceFactor(this.stillMs, this.cfg.brace);
      if (v.x !== 0 || v.y !== 0) w.push(v.x * brace, v.y * brace);
      // Getting his breath back behind a rock.
      if (this.sheltered && !w.movedThisFrame()) {
        const rest = num(this.cfg.restPerSecond, 0.12);
        if (rest > 0 && this.level.store.state.resolve < 10) this.level.store.adjustResolve((rest * dt) / 1000, 'shelter');
      }
    }
    this.updateFlock(dt);
  }

  private updateSouls(dt: number): void {
    for (const s of this.souls) {
      const lane = this.lanes[s.lane];
      if (!lane) continue;
      const d = normalize(lane.dir.x, lane.dir.y);
      const sp = (60 + lane.strength * 2) * (1 - this.calm * 0.85);
      s.x += (d.x * sp * dt) / 1000;
      s.y += (d.y * sp * dt) / 1000 + Math.sin(this.t / 300 + s.phase) * 0.15;
      const r = lane.rect;
      if (s.x > r.x + r.w + 12) s.x = r.x - 12;
      if (s.x < r.x - 12) s.x = r.x + r.w + 12;
      if (s.y > r.y + r.h + 8) s.y = r.y - 8;
      if (s.y < r.y - 8) s.y = r.y + r.h + 8;
      s.sprite.setPosition(Math.round(s.x), Math.round(s.y));
      const key = d.x < 0 ? 'npc-windsoul-fly-left' : 'npc-windsoul-fly-right';
      if (s.sprite.anims.currentAnim?.key !== key && this.scene.anims.exists(key)) s.sprite.play(key);
      s.sprite.setAlpha(0.35 + 0.4 * (1 - this.calm));
    }
  }

  private updateFlock(dt: number): void {
    const fc = this.cfg.flock;
    const w = this.w;
    if (!fc || !w || this.lanes.length === 0) return;
    if (!this.flock) {
      if (this.calm > 0.5) return;
      const area = this.flockArea;
      if (area && !rectContains(area, this.player.x, this.player.y)) return;
      this.untilFlock -= dt;
      if (this.untilFlock > 0) return;
      this.untilFlock = num(fc.everyMs, 9000);
      let r: Rect;
      let dir: number;
      if (area) {
        // Over an open field they come back the other way each time (V 43: "now here, now there").
        r = area;
        dir = this.flockPasses % 2 === 0 ? -1 : 1;
      } else {
        const lane = this.lanes[Math.floor(this.t / 1000) % this.lanes.length] as WindLane;
        r = lane.rect;
        dir = lane.dir.x >= 0 ? 1 : -1;
      }
      this.flockPasses += 1;
      const y = Math.max(r.y + 8, Math.min(r.y + r.h - 8, this.player.y - 10));
      const birds: Phaser.GameObjects.Sprite[] = [];
      if (this.scene.textures.exists('fx-birds')) {
        for (let i = 0; i < 14; i++) {
          const b = this.scene.add
            .sprite(0, 0, 'fx-birds', 'starling-0')
            .setDepth(DEPTH.weather)
            .setFlipX(dir < 0)
            .setTint(0x2a2440);
          if (this.scene.anims.exists('fx-birds-starling')) b.play({ key: 'fx-birds-starling', startFrame: i % 2 });
          birds.push(this.own(b));
        }
      }
      this.flock = { x: dir > 0 ? r.x - 40 : r.x + r.w + 40, y, dir, birds, lane: r };
      w.sfx('wind');
    }
    const f = this.flock;
    f.x += (f.dir * num(fc.speed, 150) * dt) / 1000;
    const width = num(fc.width, 46);
    f.birds.forEach((b, i) => {
      const ox = ((i * 37) % 60) - 30;
      const oy = ((i * 23) % 36) - 18 + Math.sin(this.t / 120 + i) * 3;
      b.setPosition(Math.round(f.x + ox), Math.round(f.y + oy));
    });
    const p = this.player;
    if (w.playable() && Math.abs(p.x - f.x) < width * 0.6 && Math.abs(p.y - 10 - f.y) < width * 0.5 && !this.sheltered) {
      if (w.hurt(num(fc.damage, 0.5), 'flock', { x: f.x - f.dir * 20, y: p.y }, 210)) this.flockHits += 1;
    }
    const r = f.lane;
    if ((f.dir > 0 && f.x > r.x + r.w + 60) || (f.dir < 0 && f.x < r.x - 60)) {
      for (const b of f.birds) b.destroy();
      this.flock = null;
    }
  }

  override onVerse(cast: VerseCast): void {
    if (cast.category === 'Still') this.localCalmUntil = this.now() + 4500 * cast.power;
  }

  override destroy(): void {
    for (const r of this.rockRemovers.splice(0)) r();
    super.destroy();
  }

  override debugInfo(): Record<string, unknown> {
    return {
      ...super.debugInfo(),
      lanes: this.lanes.length,
      rocks: this.rocks.length,
      calm: Math.round(this.calm * 100) / 100,
      sheltered: this.sheltered,
      flock: this.flock !== null,
      flockHits: this.flockHits,
      still: Math.round(this.stillMs),
    };
  }
}

export function createWindField(ctx: MechanicContext, cfg: WindFieldConfig): WindField {
  return new WindField(ctx, cfg);
}

// ---------------------------------------------------------------------------
// `shelter` and `wind_lull`: thin mechanics that act on the level's wind field
// ---------------------------------------------------------------------------

function findWind(level: MechanicContext['level'], id?: string): WindField | null {
  const m = level.mechanic(id ?? 'wind_field');
  return m instanceof WindField ? m : null;
}

export interface ShelterConfig {
  readonly rocks: readonly Rect[];
  /** The wind field to shelter from (id or name; default the level's first `wind_field`). */
  readonly wind?: string;
}

/** `shelter` (V s3): rocks whose lee is calm. Adds them to the wind field (or stands alone as solid rocks). */
export class Shelter extends BaseMechanic {
  private readonly removers: Array<() => void> = [];

  constructor(ctx: MechanicContext, cfg: ShelterConfig) {
    super('shelter', ctx, cfg);
    const wind = findWind(ctx.level, cfg.wind);
    if (wind) wind.addRocks(cfg.rocks ?? []);
    else for (const r of cfg.rocks ?? []) {
      const remove = this.w?.addSolid(r);
      if (remove) this.removers.push(remove);
    }
  }

  override destroy(): void {
    for (const r of this.removers.splice(0)) r();
    super.destroy();
  }
}

export interface WindLullConfig {
  /** Start the lull when this event is emitted (default: at once). */
  readonly on?: EventId;
  /** The wind rises again when this event is emitted (default: never). */
  readonly resumeOn?: EventId;
  readonly fadeMs?: number;
  readonly wind?: string;
}

/** `wind_lull` (V 96: "while the wind, as now, is silent"): stills the wind field on cue. */
export class WindLull extends BaseMechanic {
  constructor(ctx: MechanicContext, cfg: WindLullConfig) {
    super('wind_lull', ctx, cfg);
    const fade = num(cfg.fadeMs, 1500);
    const go = (): void => {
      void findWind(ctx.level, cfg.wind)?.lull(fade);
    };
    if (cfg.on) {
      const off = ctx.level.bus.on('world:signal', (sig) => {
        if (sig.kind === 'event' && sig.id === cfg.on) go();
        if (sig.kind === 'event' && cfg.resumeOn && sig.id === cfg.resumeOn) findWind(ctx.level, cfg.wind)?.resume(fade);
      });
      this.onDispose(off);
    } else {
      go();
    }
  }
}

export function createShelter(ctx: MechanicContext, cfg: ShelterConfig): Shelter {
  return new Shelter(ctx, cfg);
}

export function createWindLull(ctx: MechanicContext, cfg: WindLullConfig): WindLull {
  return new WindLull(ctx, cfg);
}
