import type { GenerateScheduleResult, ScheduleSettings, VoteData } from "../domain/scheduleTypes";

const STORE_VERSION = 1;
const LAST_MONTH_KEY = "schedule.lastMonth";

export type MonthSnapshot = {
  version: number;
  month: string;
  updatedAt: string;
  settings?: ScheduleSettings;
  votes?: VoteData;
  result?: GenerateScheduleResult;
};

function key(month: string): string {
  return `schedule.snapshot.${month}`;
}

function isMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export function loadLastMonth(fallbackMonth: string): string {
  try {
    const savedMonth = localStorage.getItem(LAST_MONTH_KEY);
    return savedMonth && isMonthKey(savedMonth) ? savedMonth : fallbackMonth;
  } catch {
    return fallbackMonth;
  }
}

export function saveLastMonth(month: string): void {
  if (!isMonthKey(month)) return;

  try {
    localStorage.setItem(LAST_MONTH_KEY, month);
  } catch {
    // Ignore storage failures so the scheduler still works in restricted browsers.
  }
}

export function loadSnapshot(month: string): MonthSnapshot {
  const raw = localStorage.getItem(key(month));
  if (!raw) {
    return { version: STORE_VERSION, month, updatedAt: new Date().toISOString() };
  }

  try {
    return JSON.parse(raw) as MonthSnapshot;
  } catch {
    return { version: STORE_VERSION, month, updatedAt: new Date().toISOString() };
  }
}

export function saveSnapshot(snapshot: MonthSnapshot): void {
  saveLastMonth(snapshot.month);
  localStorage.setItem(
    key(snapshot.month),
    JSON.stringify({
      ...snapshot,
      version: STORE_VERSION,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function mergeSnapshot(month: string, patch: Partial<MonthSnapshot>): MonthSnapshot {
  const next = { ...loadSnapshot(month), ...patch, month };
  saveSnapshot(next);
  return next;
}
