/**
 * The AudioService (ENGINE §7.5): a tiny WebAudio synth for SFX, per-speaker
 * murmurs and per-canto drones / ambience. Optional by design: without
 * AudioContext (or before the first user gesture) every call is a silent
 * no-op, and nothing here ever throws.
 *
 * Owner: team C (audio). Contract: CreateAudio.
 */

import type { AudioService, CreateAudio, SfxName } from '../runtime/contracts';
import type { CantoId, SpeakerId } from '../story/types';
import { ambienceFor, asksForSilence, blipVoice, soundsForDescription, type SoundId } from './cues';
import { Synth } from './synth';

type AudioCtor = new () => AudioContext;

function audioCtor(): AudioCtor | null {
  try {
    const w = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    return w.AudioContext ?? w.webkitAudioContext ?? null;
  } catch {
    return null;
  }
}

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export const createAudio: CreateAudio = (deps) => {
  const Ctor = audioCtor();
  let synth: Synth | null = null;
  let pendingCue: { music: string | null; ambience: string | null; canto: CantoId | null } | null = null;
  let lastBlip = 0;
  const lastPlay = new Map<SoundId, number>();

  const volumes = (): { master: number; music: number; sfx: number } => {
    const s = deps.store.settings;
    return { master: s.masterVolume, music: s.musicVolume, sfx: s.sfxVolume };
  };

  const guard = (fn: (s: Synth) => void): void => {
    if (!synth) return;
    try {
      if (synth.ctx.state === 'closed') return;
      fn(synth);
    } catch {
      // audio must never break the book
    }
  };

  const playId = (id: SoundId): void => {
    const t = now();
    const minGap = id === 'verse' ? 140 : id === 'ui' ? 40 : 70;
    if (t - (lastPlay.get(id) ?? -1e9) < minGap) return;
    lastPlay.set(id, t);
    guard((s) => s.play(id));
  };

  const service: AudioService = {
    get available() {
      return Ctor !== null;
    },
    unlock() {
      if (!Ctor) return;
      try {
        if (!synth) {
          synth = new Synth(new Ctor());
          const v = volumes();
          synth.setVolumes(v.master, v.music, v.sfx);
        }
        if (synth.ctx.state === 'suspended') void synth.ctx.resume().catch(() => undefined);
        if (pendingCue) {
          const c = pendingCue;
          pendingCue = null;
          guard((s) => s.ambience(ambienceFor(c.music, c.ambience, c.canto)));
        }
      } catch {
        synth = null;
      }
    },
    play(name: SfxName) {
      playId(name);
    },
    describe(description: string) {
      if (!description) return;
      try {
        const ids = soundsForDescription(description);
        if (ids.length === 0 && asksForSilence(description)) {
          guard((s) => s.duck(4));
          return;
        }
        ids.forEach((id, i) => {
          if (i === 0) playId(id);
          else setTimeout(() => playId(id), i * 160);
        });
      } catch {
        // ignore
      }
    },
    cue(music: string | null, ambience: string | null, cantoId: CantoId | null) {
      if (!synth) {
        pendingCue = { music, ambience, canto: cantoId };
        return;
      }
      guard((s) => s.ambience(ambienceFor(music, ambience, cantoId)));
    },
    blip(speaker: SpeakerId) {
      const t = now();
      if (t - lastBlip < 45) return;
      lastBlip = t;
      guard((s) => s.blip(blipVoice(speaker)));
    },
    setVolumes(v: { master: number; music: number; sfx: number }) {
      guard((s) => s.setVolumes(v.master, v.music, v.sfx));
    },
    stopAll() {
      pendingCue = null;
      guard((s) => s.stopAll());
    },
  };

  try {
    deps.bus.on('settings:changed', () => {
      const v = volumes();
      service.setVolumes(v);
    });
    deps.bus.on('player:faint', () => playId('faint'));
  } catch {
    // no bus: fine
  }

  return service;
};
