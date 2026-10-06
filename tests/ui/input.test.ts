import { describe, expect, it } from 'vitest';
import { PAD } from '../../src/config';
import {
  actionsForCode,
  actionsForPadButton,
  codesForKeyName,
  promptKey,
  repeatCount,
  shouldPreventDefault,
  stickDirection,
} from '../../src/ui/inputMap';

describe('keyboard map', () => {
  it('translates Phaser key names to KeyboardEvent codes', () => {
    expect(codesForKeyName('E')).toEqual(['KeyE']);
    expect(codesForKeyName('UP')).toEqual(['ArrowUp']);
    expect(codesForKeyName('ENTER')).toContain('NumpadEnter');
    expect(codesForKeyName('ONE')).toEqual(['Digit1', 'Numpad1']);
  });

  it('maps codes to config actions (GDD 2.2)', () => {
    expect(actionsForCode('KeyE')).toEqual(expect.arrayContaining(['interact', 'advance']));
    expect(actionsForCode('Enter')).toContain('advance');
    expect(actionsForCode('Space')).toEqual(expect.arrayContaining(['dash', 'advance']));
    expect(actionsForCode('Tab')).toContain('book');
    expect(actionsForCode('Escape')).toEqual(expect.arrayContaining(['book', 'back']));
    expect(actionsForCode('KeyQ')).toContain('askVirgil');
    expect(actionsForCode('KeyW')).toContain('up');
    expect(actionsForCode('ArrowDown')).toContain('down');
    expect(actionsForCode('Digit2')).toContain('option2');
    expect(actionsForCode('KeyR')).toContain('lookBack');
    expect(actionsForCode('PageDown')).toContain('pageDown');
    expect(actionsForCode('KeyZ')).toEqual([]);
  });

  it('keeps the browser from moving focus or scrolling', () => {
    expect(shouldPreventDefault('Tab')).toBe(true);
    expect(shouldPreventDefault('Space')).toBe(true);
    expect(shouldPreventDefault('KeyE')).toBe(false);
  });
});

describe('gamepad map', () => {
  it('maps standard buttons', () => {
    expect(actionsForPadButton(PAD.A)).toEqual(expect.arrayContaining(['advance', 'dash']));
    expect(actionsForPadButton(PAD.Y)).toEqual(expect.arrayContaining(['advance', 'interact']));
    expect(actionsForPadButton(PAD.LB)).toContain('askVirgil');
    expect(actionsForPadButton(PAD.START)).toContain('book');
    expect(actionsForPadButton(PAD.B)).toContain('back');
    expect(actionsForPadButton(PAD.DPAD_UP)).toContain('up');
  });

  it('adds tab switching on the shoulders in the Book', () => {
    expect(actionsForPadButton(PAD.LB, { book: true })).toContain('tabPrev');
    expect(actionsForPadButton(PAD.RB, { book: true })).toContain('tabNext');
    expect(actionsForPadButton(PAD.RB)).not.toContain('tabNext');
  });

  it('reads the stick with a dead zone', () => {
    expect(stickDirection(0.1, 0.2)).toBeNull();
    expect(stickDirection(0, -0.9)).toBe('up');
    expect(stickDirection(0.8, 0.3)).toBe('right');
    expect(stickDirection(-0.7, 0.6)).toBe('left');
  });

  it('labels prompts per device and repeats held keys', () => {
    expect(promptKey('advance', 'keyboard')).toBe('E');
    expect(promptKey('advance', 'gamepad')).toBe('A');
    expect(repeatCount(100)).toBe(0);
    expect(repeatCount(380)).toBe(1);
    expect(repeatCount(380 + 220)).toBe(3);
  });
});
