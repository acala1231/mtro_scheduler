import type { GenerateScheduleResult, ScheduleSettings, VoteData } from "../domain/scheduleTypes";

const STORE_VERSION = 2;
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
  try {
    const raw = localStorage.getItem(key(month));
    if (!raw) return emptySnapshot(month);
    const parsed: unknown = JSON.parse(raw);
    if (!isSnapshot(parsed, month)) return emptySnapshot(month);
    return { ...parsed, version: STORE_VERSION };
  } catch {
    return emptySnapshot(month);
  }
}

function emptySnapshot(month: string): MonthSnapshot {
  return { version: STORE_VERSION, month, updatedAt: new Date().toISOString() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSnapshot(value: unknown, month: string): value is MonthSnapshot {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2) || value.month !== month || typeof value.updatedAt !== "string") return false;
  const isSchedule = (item: unknown, service: boolean) => isRecord(item) && typeof item.key === "string" && typeof item.date === "string" && typeof item.time === "string" && typeof item.displayDate === "string" && (!service || (Array.isArray(item.baseRoles) && item.baseRoles.every((role) => typeof role === "string") && Array.isArray(item.subRoles) && item.subRoles.every((role) => typeof role === "string")));
  const isVote = (item: unknown) => isRecord(item) && typeof item.scheduleKey === "string" && typeof item.name === "string";
  const isOptionalString = (value: unknown) => value === undefined || typeof value === "string";
  const isMember = (item: unknown) => isRecord(item) && typeof item.name === "string" && isOptionalString(item.id) && isOptionalString(item.baptismalName) && isOptionalString(item.alias) && isRecord(item.roles) && Object.values(item.roles).every((enabled) => typeof enabled === "boolean") && isRecord(item.counts) && Object.values(item.counts).every((count) => typeof count === "number" && Number.isFinite(count));
  const isServiceRow = (item: unknown) => isRecord(item) && typeof item.displayDate === "string" && isOptionalString(item.note) && isRecord(item.roles) && Object.values(item.roles).every((name) => typeof name === "string");
  const isCarRow = (item: unknown) => isRecord(item) && typeof item.displayDate === "string" && typeof item.name === "string" && isOptionalString(item.note);
  const isIssue = (item: unknown) => {
    if (!isRecord(item) || !["info", "warning", "error"].includes(String(item.severity)) || typeof item.code !== "string" || typeof item.message !== "string") return false;
    if (item.target === undefined) return true;
    return isRecord(item.target) && ["member", "setting", "vote", "schedule"].includes(String(item.target.type)) && isOptionalString(item.target.id);
  };
  if (value.settings !== undefined && (!isRecord(value.settings) || value.settings.month !== month || typeof value.settings.titleColor !== "string" || typeof value.settings.headerColor !== "string" || !Array.isArray(value.settings.serviceSchedules) || !value.settings.serviceSchedules.every((item) => isSchedule(item, true)) || !Array.isArray(value.settings.carSchedules) || !value.settings.carSchedules.every((item) => isSchedule(item, false)))) return false;
  if (value.votes !== undefined && (!isRecord(value.votes) || value.votes.month !== month || typeof value.votes.rawText !== "string" || !Array.isArray(value.votes.serviceVotes) || !value.votes.serviceVotes.every(isVote) || !Array.isArray(value.votes.carVotes) || !value.votes.carVotes.every(isVote))) return false;
  if (value.result !== undefined && (!isRecord(value.result) || typeof value.result.generatedAt !== "string" || !Array.isArray(value.result.serviceRows) || !value.result.serviceRows.every(isServiceRow) || !Array.isArray(value.result.carRows) || !value.result.carRows.every(isCarRow) || !Array.isArray(value.result.updatedMembers) || !value.result.updatedMembers.every(isMember) || !Array.isArray(value.result.issues) || !value.result.issues.every(isIssue))) return false;
  return true;
}

export function saveSnapshot(snapshot: MonthSnapshot): boolean {
  try {
    localStorage.setItem(key(snapshot.month), JSON.stringify({ ...snapshot, version: STORE_VERSION, updatedAt: new Date().toISOString() }));
    saveLastMonth(snapshot.month);
    return true;
  } catch {
    return false;
  }
}

export function mergeSnapshot(month: string, patch: Partial<MonthSnapshot>): MonthSnapshot & { saved: boolean } {
  const next = { ...loadSnapshot(month), ...patch, month };
  const saved = saveSnapshot(next);
  return { ...next, saved };
}
