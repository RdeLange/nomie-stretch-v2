import { t } from './i18n/index.svelte';

// The stretch routine and its timer, as plain rules. The screen only shows the state.
export type Stretch = { name: string; seconds: number; cue: string };

export const ROUTINE: Stretch[] = [
  { seconds: 30, get name() { return t('neckName'); }, get cue() { return t('neckCue'); } },
  { seconds: 30, get name() { return t('shoulderName'); }, get cue() { return t('shoulderCue'); } },
  { seconds: 30, get name() { return t('sideName'); }, get cue() { return t('sideCue'); } },
  { seconds: 40, get name() { return t('hipName'); }, get cue() { return t('hipCue'); } },
  { seconds: 30, get name() { return t('hamName'); }, get cue() { return t('hamCue'); } },
];

// step: -1 not started, 0 to ROUTINE.length - 1 the stretch that runs, ROUTINE.length finished
export type RoutineState = { step: number; left: number };

export const NOT_STARTED: RoutineState = { step: -1, left: 0 };

export const startRoutine = (): RoutineState => ({ step: 0, left: ROUTINE[0].seconds });

// one second passes; a stretch that ends hands over to the next one
export const tick = (state: RoutineState): RoutineState => {
  if (!isRunning(state)) return state;
  const left = state.left - 1;
  return left > 0 ? { ...state, left } : nextStep(state);
};

export const nextStep = (state: RoutineState): RoutineState => {
  const step = state.step + 1;
  if (step >= ROUTINE.length) return { step, left: 0 };
  return { step, left: ROUTINE[step].seconds };
};

export const isRunning = (state: RoutineState): boolean => state.step >= 0 && state.step < ROUTINE.length;
export const isFinished = (state: RoutineState): boolean => state.step >= ROUTINE.length;
export const currentStretch = (state: RoutineState): Stretch | undefined => (isRunning(state) ? ROUTINE[state.step] : undefined);
