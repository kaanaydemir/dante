/**
 * The Settings page (bible §1.6, GDD 9.6) as data: rows, their choices and
 * labels, and stepping a value. Pure.
 */

import { FONT_SCALES, TEXT_SPEEDS } from '../../config';
import type { Settings } from '../../runtime/contracts';

type Key = keyof Settings;

export interface SettingChoice<V> {
  readonly value: V;
  readonly label: string;
}

export interface SettingRow<K extends Key = Key> {
  readonly key: K;
  readonly label: string;
  readonly help: string;
  readonly choices: readonly SettingChoice<Settings[K]>[];
}

const VOLUME_STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] as const;

const volumeChoices = VOLUME_STEPS.map((v) => ({ value: v, label: v === 0 ? 'Off' : `${Math.round(v * 10)}` }));
const onOff = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
] as const;

export const SETTING_ROWS: readonly SettingRow[] = [
  {
    key: 'revealTiming',
    label: 'What Dante did',
    help: 'When the card that shows what Dante did in the poem appears.',
    choices: [
      { value: 'after_choice', label: 'After each choice' },
      { value: 'end_of_canto', label: 'At the end of the canto' },
      { value: 'book_only', label: 'Only in the Book' },
    ],
  },
  {
    key: 'textSpeed',
    label: 'Text speed',
    help: 'How fast spoken lines are written out.',
    choices: TEXT_SPEEDS.map((s) => ({ value: s, label: s[0]?.toUpperCase() + s.slice(1) })),
  },
  {
    key: 'verseDisplay',
    label: 'Verse',
    help: 'Longfellow’s lines appear one by one, or all at once.',
    choices: [
      { value: 'line_by_line', label: 'Line by line' },
      { value: 'all_at_once', label: 'All at once' },
    ],
  },
  {
    key: 'fontScale',
    label: 'Text size',
    help: 'Larger text for every page and balloon.',
    choices: FONT_SCALES.map((s, i) => ({ value: s, label: ['Normal', 'Large', 'Larger'][i] ?? `${s}` })),
  },
  {
    key: 'highContrast',
    label: 'High contrast',
    help: 'Stronger separation of text and paper.',
    choices: onOff.map((c) => ({ ...c })),
  },
  { key: 'masterVolume', label: 'Volume', help: 'All sound.', choices: volumeChoices },
  { key: 'musicVolume', label: 'Music and air', help: 'Drones and ambience.', choices: volumeChoices },
  { key: 'sfxVolume', label: 'Sounds', help: 'Pages, voices, steps.', choices: volumeChoices },
  {
    key: 'screenShake',
    label: 'Screen shake',
    help: 'Quakes and blows shake the view.',
    choices: onOff.map((c) => ({ ...c })),
  },
  {
    key: 'flashes',
    label: 'Flashes',
    help: 'Bright white and red flashes. Off: slow fades instead.',
    choices: onOff.map((c) => ({ ...c })),
  },
  {
    key: 'easyMode',
    label: 'Gentle mode',
    help: 'Resolve never falls. The story is the same.',
    choices: [
      { value: false, label: 'Off' },
      { value: true, label: 'On' },
    ],
  },
] as SettingRow[];

/** Index of the current value among a row's choices (nearest for numbers). */
export function choiceIndex(row: SettingRow, settings: Settings): number {
  const current = settings[row.key];
  const exact = row.choices.findIndex((c) => c.value === current);
  if (exact >= 0) return exact;
  if (typeof current === 'number') {
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    row.choices.forEach((c, i) => {
      const d = Math.abs((c.value as number) - current);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }
  return 0;
}

/** The label of a row's current value. */
export function valueLabel(row: SettingRow, settings: Settings): string {
  return row.choices[choiceIndex(row, settings)]?.label ?? '';
}

/**
 * Step a row's value by `dir` (+1 / −1). Enumerations wrap; volumes clamp.
 * Returns the patch for `store.updateSettings`.
 */
export function stepSetting(row: SettingRow, settings: Settings, dir: 1 | -1): Partial<Settings> {
  const n = row.choices.length;
  if (n === 0) return {};
  const i = choiceIndex(row, settings);
  const isVolume = row.key === 'masterVolume' || row.key === 'musicVolume' || row.key === 'sfxVolume';
  const next = isVolume ? Math.max(0, Math.min(n - 1, i + dir)) : (((i + dir) % n) + n) % n;
  const choice = row.choices[next];
  if (!choice) return {};
  return { [row.key]: choice.value } as Partial<Settings>;
}
