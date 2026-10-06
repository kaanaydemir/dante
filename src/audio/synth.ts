/**
 * A tiny WebAudio synthesizer: SFX voices, per-speaker murmurs, a drone and an
 * ambience bed per canto. Everything is generated (oscillators, filtered
 * noise); no audio files. Every method is guarded by the caller (audio.ts).
 *
 * Owner: team C (audio).
 */

import type { AmbienceSpec, BedKind, BlipVoice, SoundId } from './cues';

type Ctx = AudioContext;

export class Synth {
  readonly master: GainNode;
  readonly music: GainNode;
  readonly sfx: GainNode;
  private readonly noise: AudioBuffer;
  private drone: { nodes: AudioNode[]; stops: (OscillatorNode | AudioBufferSourceNode)[]; gain: GainNode } | null = null;
  private bed: { stops: (OscillatorNode | AudioBufferSourceNode)[]; gain: GainNode; timer: number | null } | null = null;
  private current: AmbienceSpec | null = null;
  private duckTimer: number | null = null;
  private musicLevel = 0.33;

  constructor(readonly ctx: Ctx) {
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    const len = Math.floor(ctx.sampleRate * 2);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      // a little brown in the white: softer, less hiss
      brown = (brown + 0.02 * white) / 1.02;
      data[i] = white * 0.6 + brown * 3.2;
    }
  }

  setVolumes(master: number, music: number, sfx: number): void {
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, master)), t, 0.05);
    this.musicLevel = Math.max(0, Math.min(1, music)) * 0.55;
    this.music.gain.setTargetAtTime(this.musicLevel, t, 0.05);
    this.sfx.gain.setTargetAtTime(Math.max(0, Math.min(1, sfx)), t, 0.05);
  }

  // -------------------------------------------------------------------------
  // Building blocks
  // -------------------------------------------------------------------------

  private env(gain: GainNode, t0: number, attack: number, peak: number, decay: number): void {
    const g = gain.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + Math.max(0.005, attack));
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + Math.max(0.02, decay));
  }

  private tone(freq: number, type: OscillatorType, t0: number, attack: number, peak: number, decay: number, opts: { to?: number; detune?: number; dest?: AudioNode } = {}): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + attack + decay);
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, t0);
    const g = ctx.createGain();
    this.env(g, t0, attack, peak, decay);
    osc.connect(g);
    g.connect(opts.dest ?? this.sfx);
    osc.start(t0);
    osc.stop(t0 + attack + decay + 0.05);
  }

  private noiseBurst(
    t0: number,
    dur: number,
    peak: number,
    filter: { type: BiquadFilterType; freq: number; to?: number; q?: number },
    opts: { attack?: number; dest?: AudioNode; rate?: number } = {},
  ): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = opts.rate ?? 1;
    const f = ctx.createBiquadFilter();
    f.type = filter.type;
    f.frequency.setValueAtTime(filter.freq, t0);
    if (filter.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, filter.to), t0 + dur);
    f.Q.value = filter.q ?? 0.8;
    const g = ctx.createGain();
    this.env(g, t0, opts.attack ?? 0.01, peak, dur);
    src.connect(f);
    f.connect(g);
    g.connect(opts.dest ?? this.sfx);
    const offset = Math.random() * 1.5;
    src.start(t0, offset);
    src.stop(t0 + (opts.attack ?? 0.01) + dur + 0.05);
  }

  // -------------------------------------------------------------------------
  // Voices
  // -------------------------------------------------------------------------

  play(id: SoundId): void {
    const t = this.ctx.currentTime + 0.01;
    switch (id) {
      case 'ui':
        this.tone(880, 'sine', t, 0.004, 0.05, 0.05, { to: 660 });
        break;
      case 'page':
        this.noiseBurst(t, 0.28, 0.22, { type: 'bandpass', freq: 2600, to: 700, q: 0.7 }, { attack: 0.04 });
        this.tone(120, 'sine', t + 0.18, 0.005, 0.05, 0.12, { to: 70 });
        break;
      case 'blip':
        this.tone(320, 'triangle', t, 0.004, 0.04, 0.05);
        break;
      case 'choice':
        this.tone(660, 'sine', t, 0.005, 0.08, 0.45);
        this.tone(990, 'sine', t + 0.07, 0.005, 0.05, 0.55);
        break;
      case 'card':
        this.noiseBurst(t, 0.32, 0.12, { type: 'highpass', freq: 500, to: 3500, q: 0.5 }, { attack: 0.08 });
        break;
      case 'word':
        [659.3, 830.6, 987.8, 1318.5].forEach((f, i) => this.tone(f, 'sine', t + i * 0.07, 0.01, 0.07, 0.6));
        break;
      case 'unlock':
        [523.3, 659.3, 784].forEach((f) => this.tone(f, 'sine', t, 0.25, 0.06, 1.2));
        this.tone(1046.5, 'triangle', t + 0.2, 0.2, 0.025, 1.1);
        break;
      case 'step':
        this.noiseBurst(t, 0.06, 0.12, { type: 'lowpass', freq: 600 });
        break;
      case 'dash':
        this.noiseBurst(t, 0.2, 0.16, { type: 'bandpass', freq: 1800, to: 400, q: 0.6 });
        break;
      case 'verse':
        this.tone(1568, 'sine', t, 0.01, 0.012, 0.35);
        this.tone(2093, 'sine', t + 0.03, 0.01, 0.006, 0.3);
        break;
      case 'hurt':
        this.tone(95, 'sine', t, 0.005, 0.22, 0.22, { to: 50 });
        break;
      case 'heart':
        this.tone(70, 'sine', t, 0.005, 0.3, 0.16, { to: 45 });
        this.tone(64, 'sine', t + 0.24, 0.005, 0.22, 0.2, { to: 42 });
        break;
      case 'faint':
        this.tone(440, 'sine', t, 0.05, 0.08, 1.6, { to: 110 });
        this.noiseBurst(t, 1.6, 0.06, { type: 'lowpass', freq: 1200, to: 200 }, { attack: 0.3 });
        break;
      case 'quake':
        this.noiseBurst(t, 1.8, 0.55, { type: 'lowpass', freq: 160, to: 60, q: 1.2 }, { attack: 0.15, rate: 0.5 });
        this.tone(42, 'sine', t, 0.2, 0.3, 1.6);
        break;
      case 'thunder':
        this.noiseBurst(t, 0.18, 0.5, { type: 'lowpass', freq: 3200, to: 800 });
        this.noiseBurst(t + 0.1, 2.2, 0.45, { type: 'lowpass', freq: 900, to: 70, q: 0.9 }, { attack: 0.05, rate: 0.6 });
        break;
      case 'wind':
        this.noiseBurst(t, 2.2, 0.22, { type: 'bandpass', freq: 380, to: 900, q: 1.4 }, { attack: 0.8, rate: 0.7 });
        break;
      case 'bell': {
        const ctx = this.ctx;
        const car = ctx.createOscillator();
        const mod = ctx.createOscillator();
        const modGain = ctx.createGain();
        car.frequency.value = 392;
        mod.frequency.value = 392 * 1.41;
        modGain.gain.value = 260;
        mod.connect(modGain);
        modGain.connect(car.frequency);
        const g = ctx.createGain();
        this.env(g, t, 0.005, 0.12, 2.4);
        car.connect(g);
        g.connect(this.sfx);
        car.start(t);
        mod.start(t);
        car.stop(t + 2.6);
        mod.stop(t + 2.6);
        break;
      }
      case 'roar': {
        const ctx = this.ctx;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(700, t);
        f.frequency.exponentialRampToValueAtTime(220, t + 1.2);
        f.connect(this.sfx);
        this.tone(78, 'sawtooth', t, 0.12, 0.2, 1.1, { to: 52, dest: f });
        this.tone(82, 'sawtooth', t, 0.12, 0.15, 1.1, { to: 55, dest: f, detune: 20 });
        this.noiseBurst(t, 1.1, 0.18, { type: 'bandpass', freq: 500, to: 200 }, { attack: 0.1 });
        break;
      }
      case 'bird':
        for (let i = 0; i < 3; i++) this.tone(2600 + Math.random() * 600, 'sine', t + i * 0.12, 0.01, 0.03, 0.08, { to: 3400 });
        break;
      case 'breath':
        this.noiseBurst(t, 1.1, 0.06, { type: 'bandpass', freq: 1100, q: 0.6 }, { attack: 0.5 });
        break;
      case 'leaves':
        for (let i = 0; i < 6; i++) this.noiseBurst(t + Math.random() * 0.5, 0.05, 0.05, { type: 'highpass', freq: 3000 });
        break;
      case 'water':
        this.noiseBurst(t, 1.6, 0.14, { type: 'lowpass', freq: 900, to: 500 }, { attack: 0.4, rate: 0.8 });
        break;
      case 'oar':
        this.tone(110, 'sine', t, 0.005, 0.18, 0.15, { to: 70 });
        this.noiseBurst(t + 0.05, 0.5, 0.16, { type: 'lowpass', freq: 1500, to: 400 });
        break;
      case 'crowd':
        for (let i = 0; i < 5; i++) this.tone(140 + Math.random() * 120, 'sawtooth', t + Math.random() * 0.3, 0.3, 0.012, 1.4, { to: 120 + Math.random() * 80 });
        this.noiseBurst(t, 1.6, 0.05, { type: 'bandpass', freq: 600, q: 0.8 }, { attack: 0.4 });
        break;
      case 'sigh':
        this.noiseBurst(t, 1.4, 0.07, { type: 'bandpass', freq: 900, to: 380, q: 1.2 }, { attack: 0.4 });
        this.tone(330, 'sine', t, 0.3, 0.012, 1.1, { to: 220 });
        break;
      case 'bees':
        this.tone(220, 'sawtooth', t, 0.1, 0.02, 1.4, { detune: 15 });
        this.tone(226, 'sawtooth', t, 0.1, 0.02, 1.4);
        break;
      case 'fire':
        for (let i = 0; i < 9; i++) this.noiseBurst(t + Math.random() * 0.9, 0.03, 0.07, { type: 'highpass', freq: 1800 });
        this.noiseBurst(t, 1, 0.05, { type: 'lowpass', freq: 400 }, { attack: 0.2 });
        break;
      case 'cry':
        this.tone(620, 'triangle', t, 0.05, 0.05, 0.8, { to: 380 });
        break;
      case 'stone':
        this.noiseBurst(t, 0.08, 0.15, { type: 'lowpass', freq: 1600 });
        break;
      case 'wings':
        for (let i = 0; i < 8; i++) this.noiseBurst(t + i * 0.08, 0.05, 0.06, { type: 'bandpass', freq: 1400, q: 0.7 });
        break;
      case 'gate':
        this.tone(58, 'sawtooth', t, 0.1, 0.08, 0.9, { to: 49 });
        this.tone(140, 'sine', t + 0.7, 0.005, 0.2, 0.3, { to: 60 });
        break;
    }
  }

  blip(voice: BlipVoice): void {
    const t = this.ctx.currentTime + 0.005;
    const cents = (Math.random() - 0.5) * 2 * voice.spread;
    this.tone(voice.freq * 2 ** (cents / 1200), voice.wave, t, 0.004, 0.035 * voice.gain, 0.05);
  }

  // -------------------------------------------------------------------------
  // Drone and ambience bed
  // -------------------------------------------------------------------------

  ambience(spec: AmbienceSpec): void {
    if (this.current && JSON.stringify(this.current) === JSON.stringify(spec)) return;
    this.current = spec;
    this.fadeOutDrone(2.2);
    this.fadeOutBed(2.2);
    if (spec.droneLevel > 0) this.startDrone(spec);
    if (spec.bed !== 'none' && spec.bedLevel > 0) this.startBed(spec.bed, spec.bedLevel);
  }

  private startDrone(spec: AmbienceSpec): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09 * spec.droneLevel, t + 3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260 + spec.brightness * 1400;
    filter.Q.value = 0.7;
    filter.connect(gain);
    gain.connect(this.music);
    const stops: OscillatorNode[] = [];
    spec.chord.forEach((semi, i) => {
      const f = spec.root * 2 ** (semi / 12);
      for (const [type, det] of [
        ['sine', 0],
        ['triangle', 7],
      ] as const) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = det + (i % 2 === 0 ? -4 : 4);
        const og = ctx.createGain();
        og.gain.value = (type === 'sine' ? 0.5 : 0.18) / (1 + i * 0.6);
        o.connect(og);
        og.connect(filter);
        o.start(t);
        stops.push(o);
      }
    });
    // Slow breathing of the drone.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 0.025 * spec.droneLevel;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start(t);
    stops.push(lfo);
    this.drone = { nodes: [filter], stops, gain };
  }

  private startBed(kind: BedKind, level: number): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    const peak = Math.max(0.0002, 0.16 * level);
    gain.gain.exponentialRampToValueAtTime(peak, t + 3);
    gain.connect(this.music);
    const stops: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    let lfoRate = 0.08;
    let lfoDepth = 0;
    switch (kind) {
      case 'forest':
        f.type = 'lowpass';
        f.frequency.value = 420;
        break;
      case 'wind':
        f.type = 'bandpass';
        f.frequency.value = 420;
        f.Q.value = 0.9;
        lfoDepth = 220;
        lfoRate = 0.09;
        break;
      case 'storm':
        f.type = 'bandpass';
        f.frequency.value = 340;
        f.Q.value = 0.7;
        lfoDepth = 260;
        lfoRate = 0.21;
        break;
      case 'water':
        f.type = 'lowpass';
        f.frequency.value = 820;
        lfoDepth = 160;
        lfoRate = 0.27;
        break;
      case 'fire':
        f.type = 'lowpass';
        f.frequency.value = 380;
        break;
      case 'crowd':
        f.type = 'bandpass';
        f.frequency.value = 560;
        f.Q.value = 1.4;
        lfoDepth = 120;
        lfoRate = 0.5;
        break;
      case 'sighs':
      case 'night':
        f.type = 'lowpass';
        f.frequency.value = 300;
        break;
      default:
        f.type = 'lowpass';
        f.frequency.value = 400;
    }
    src.connect(f);
    f.connect(gain);
    src.start(t, Math.random());
    stops.push(src);
    if (lfoDepth > 0) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = lfoRate;
      lg.gain.value = lfoDepth;
      lfo.connect(lg);
      lg.connect(f.frequency);
      lfo.start(t);
      stops.push(lfo);
    }
    // Occasional events in the bed.
    let timer: number | null = null;
    const events: Partial<Record<BedKind, { every: [number, number]; sound: SoundId }>> = {
      storm: { every: [9000, 20000], sound: 'thunder' },
      sighs: { every: [3500, 7000], sound: 'sigh' },
      night: { every: [1500, 3500], sound: 'bird' },
      fire: { every: [1200, 2600], sound: 'fire' },
      forest: { every: [7000, 15000], sound: 'leaves' },
    };
    const ev = events[kind];
    if (ev) {
      const schedule = (): void => {
        const wait = ev.every[0] + Math.random() * (ev.every[1] - ev.every[0]);
        timer = window.setTimeout(() => {
          try {
            if (this.bed?.timer === timer) this.play(ev.sound);
          } catch {
            // ignore
          }
          if (this.bed && this.bed.timer === timer) schedule();
        }, wait);
        if (this.bed) this.bed.timer = timer;
      };
      this.bed = { stops, gain, timer: null };
      schedule();
      return;
    }
    this.bed = { stops, gain, timer };
  }

  private fadeOutDrone(sec: number): void {
    const d = this.drone;
    this.drone = null;
    if (!d) return;
    const t = this.ctx.currentTime;
    d.gain.gain.cancelScheduledValues(t);
    d.gain.gain.setTargetAtTime(0.0001, t, sec / 4);
    for (const s of d.stops) {
      try {
        s.stop(t + sec + 0.2);
      } catch {
        // already stopped
      }
    }
  }

  private fadeOutBed(sec: number): void {
    const b = this.bed;
    this.bed = null;
    if (!b) return;
    if (b.timer !== null) window.clearTimeout(b.timer);
    const t = this.ctx.currentTime;
    b.gain.gain.cancelScheduledValues(t);
    b.gain.gain.setTargetAtTime(0.0001, t, sec / 4);
    for (const s of b.stops) {
      try {
        s.stop(t + sec + 0.2);
      } catch {
        // already stopped
      }
    }
  }

  /** The world falls silent for a moment (SFX "sessizlik"). */
  duck(seconds: number): void {
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(this.musicLevel * 0.15, t, 0.3);
    if (this.duckTimer !== null) window.clearTimeout(this.duckTimer);
    this.duckTimer = window.setTimeout(() => {
      try {
        this.music.gain.setTargetAtTime(this.musicLevel, this.ctx.currentTime, 0.8);
      } catch {
        // ignore
      }
    }, seconds * 1000);
  }

  stopAll(): void {
    this.current = null;
    this.fadeOutDrone(0.8);
    this.fadeOutBed(0.8);
  }
}
