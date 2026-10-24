import { describe, expect, it } from 'vitest';
import { ROUTINE, NOT_STARTED, startRoutine, tick, nextStep, isFinished, currentStretch } from '../routine';
import { addRoutine, todayCount, dayKey } from '../daily';
import { paletteFrom } from '../palette';

describe('the routine', () => {
  it('starts on the first stretch and counts down each second', () => {
    const state = startRoutine();
    expect(currentStretch(state)?.name).toBe('Neck rolls');
    expect(tick(state).left).toBe(29);
  });

  it('moves to the next stretch when the time is up', () => {
    let state = startRoutine();
    for (let i = 0; i < 30; i++) state = tick(state);
    expect(currentStretch(state)?.name).toBe('Shoulder rolls');
  });

  it('finishes after the last stretch, and ignores ticks when not running', () => {
    let state = NOT_STARTED;
    expect(tick(state)).toBe(state);
    state = startRoutine();
    for (let i = 0; i < ROUTINE.length; i++) state = nextStep(state);
    expect(isFinished(state)).toBe(true);
  });
});

describe('the daily count', () => {
  it('counts routines for today, and starts again tomorrow', () => {
    const today = addRoutine(undefined, '2026-10-24');
    expect(today.doneToday).toBe(1);
    expect(todayCount(today, '2026-10-24')).toBe(1);
    expect(todayCount(today, '2026-10-25')).toBe(0);
  });

  it('uses the local day', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-1-5');
  });
});

describe('the palette', () => {
  it('uses the colours the app passes', () => {
    expect(paletteFrom({ colours: { current: { tint: '#123456' } } }).tint).toBe('#123456');
  });
  it('falls back to its own light or dark values for an older app', () => {
    expect(paletteFrom({ theme: 'dark' }).card).toBe('#1C1C1E');
    expect(paletteFrom({ theme: 'light' }).card).toBe('#FFFFFF');
  });
});
