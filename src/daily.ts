// How many routines were finished today. Kept per day: the count starts again each day.
export type Daily = { lastDay: string; doneToday: number };

export const dayKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

export const todayCount = (saved: Partial<Daily> | undefined, today: string): number =>
  saved?.lastDay === today ? saved.doneToday ?? 0 : 0;

export const addRoutine = (saved: Partial<Daily> | undefined, today: string): Daily => ({
  lastDay: today,
  doneToday: todayCount(saved, today) + 1,
});
