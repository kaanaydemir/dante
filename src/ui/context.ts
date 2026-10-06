/**
 * The book layer's shared context: current settings and theme, the last input
 * device (for key prompts), the audio service and the event bus. Set by the
 * presenter at construction; scenes and components read it.
 *
 * Owner: team C (presentation).
 */

import { DEFAULT_SETTINGS, type AudioService, type EventBus, type Settings } from '../runtime/contracts';
import type { InputDevice } from './inputMap';
import { themeFor, type Theme } from './theme';

export interface UiContext {
  settings(): Settings;
  theme(): Theme;
  device(): InputDevice;
  setDevice(device: InputDevice): void;
  audio(): AudioService | null;
  bus(): EventBus | null;
}

let settingsSource: () => Settings = () => DEFAULT_SETTINGS;
let audioRef: AudioService | null = null;
let busRef: EventBus | null = null;
let lastDevice: InputDevice = 'keyboard';
let cachedTheme: { key: string; theme: Theme } | null = null;

const ctx: UiContext = {
  settings: () => {
    try {
      return settingsSource();
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  theme: () => {
    const s = ctx.settings();
    const key = `${s.fontScale}|${s.highContrast}`;
    if (!cachedTheme || cachedTheme.key !== key) cachedTheme = { key, theme: themeFor(s) };
    return cachedTheme.theme;
  },
  device: () => lastDevice,
  setDevice: (d) => {
    lastDevice = d;
  },
  audio: () => audioRef,
  bus: () => busRef,
};

export function uiContext(): UiContext {
  return ctx;
}

export function configureUiContext(opts: { settings: () => Settings; audio: AudioService | null; bus: EventBus | null }): void {
  settingsSource = opts.settings;
  audioRef = opts.audio;
  busRef = opts.bus;
  cachedTheme = null;
}

/** Play a UI sound without caring whether audio exists. */
export function sfx(name: Parameters<AudioService['play']>[0]): void {
  try {
    audioRef?.play(name);
  } catch {
    // audio is optional
  }
}
