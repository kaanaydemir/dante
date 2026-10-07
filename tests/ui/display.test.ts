import { describe, expect, it } from 'vitest';
import { crispScaling } from '../../src/ui/models/display';

describe('canvas scaling', () => {
  it('keeps nearest-neighbour scaling at whole factors only', () => {
    expect(crispScaling(1280, 1)).toBe(true);
    expect(crispScaling(640, 2)).toBe(true);
    expect(crispScaling(1280, 2)).toBe(true);
    expect(crispScaling(2560, 1)).toBe(true);
    // 1.125× (1440 px window) and 1.5× (1920 px window) would make text uneven.
    expect(crispScaling(1440, 1)).toBe(false);
    expect(crispScaling(1920, 1)).toBe(false);
    // Retina laptop: 1440 CSS px × 2 = 2.25×.
    expect(crispScaling(1440, 2)).toBe(false);
    // Smaller than the game: smoothed.
    expect(crispScaling(1000, 1)).toBe(false);
  });

  it('falls back to crisp when the size is unknown', () => {
    expect(crispScaling(0, 1)).toBe(true);
    expect(crispScaling(Number.NaN, 1)).toBe(true);
  });
});
