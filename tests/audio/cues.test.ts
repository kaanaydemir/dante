import { describe, expect, it } from 'vitest';
import { ambienceFor, asksForSilence, blipVoice, soundsForDescription } from '../../src/audio/cues';

describe('SFX prose -> sounds (ENGINE §7.5)', () => {
  it('maps Turkish keywords in order of appearance', () => {
    expect(soundsForDescription('deprem, sonra rüzgâr')).toEqual(['quake', 'wind']);
    expect(soundsForDescription('kuru yaprak hışırtısı, Dante’nin hızlanan nefesi')).toEqual(['leaves', 'breath']);
    expect(soundsForDescription('ayak sesleri, taş üstünde')).toEqual(['step', 'stone']);
    expect(soundsForDescription('Aslanın kükremesi')).toEqual(['roar']);
    expect(soundsForDescription('gök gürültüsü')).toEqual(['thunder']);
    expect(soundsForDescription('Kart Dante’ye yapışırken tek, boğuk bir kalp vuruşu.')).toEqual(['heart']);
  });

  it('respects word starts (yarı is not a bee, dalga is not a branch)', () => {
    expect(soundsForDescription('yarı karanlık')).toEqual([]);
    expect(soundsForDescription('dalgalar kıyıya vurur')).toEqual(['water']);
    expect(soundsForDescription('eşek arıları vızıldar')).toEqual(['bees']);
    expect(soundsForDescription('sus')).toEqual([]);
  });

  it('knows when silence is asked for', () => {
    expect(asksForSilence('sessizlik; yalnızca gece böcekleri')).toBe(true);
    expect(asksForSilence('deprem')).toBe(false);
  });
});

describe('ambience', () => {
  it('uses the canto bed and drone, shaped by the cue prose', () => {
    const wood = ambienceFor(null, 'rüzgârsız orman, uzakta kırılan dallar', 'inf01');
    expect(wood.bed).toBe('forest');
    expect(wood.droneLevel).toBeGreaterThan(0);
    const storm = ambienceFor(null, null, 'inf05');
    expect(storm.bed).toBe('storm');
    const quiet = ambienceFor('Müzik yok.', 'sessiz', 'inf03');
    expect(quiet.droneLevel).toBe(0);
    expect(quiet.bedLevel).toBeLessThan(0.3);
    const unknown = ambienceFor(null, null, 'inf99');
    expect(unknown.root).toBeGreaterThan(0);
  });

  it('gives every speaker a stable blip voice', () => {
    expect(blipVoice('VIRGIL').wave).toBe('sine');
    expect(blipVoice('ARISTOTLE')).toEqual(blipVoice('ARISTOTLE'));
    expect(blipVoice('ARISTOTLE').freq).toBeGreaterThanOrEqual(140);
  });
});
