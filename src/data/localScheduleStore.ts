import { BASE_ROLES, COUNT_ROLES, SUB_ROLES, type GenerateScheduleResult, type ScheduleSettings, type VoteData } from "../domain/scheduleTypes";
import { normalizeFeastDay } from "../domain/feastDay";

const STORE_VERSION = 3;
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
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
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
    if (!isSnapshotEnvelope(parsed, month)) return emptySnapshot(month);
    const salvaged = salvageSnapshotSections(parsed, month);
    const preserveOcrSource = parsed.version === 3;
    const settings = salvaged.settings && {
      ...salvaged.settings,
      serviceSchedules: salvaged.settings.serviceSchedules.map(({ source, ...schedule }) =>
        preserveOcrSource && (source === "ocr" || source === "import") ? { ...schedule, source } : schedule,
      ),
      carSchedules: salvaged.settings.carSchedules.map(({ source, ...schedule }) =>
        preserveOcrSource && (source === "ocr" || source === "import") ? { ...schedule, source } : schedule,
      ),
    };
    const result = salvaged.settings && salvaged.votes ? salvaged.result : undefined;
    return { version: STORE_VERSION, month, updatedAt: parsed.updatedAt, ...salvaged, settings, result };
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

function isSnapshotEnvelope(value: unknown, month: string): value is Record<string, unknown> & { version: 1 | 2 | 3; month: string; updatedAt: string } {
  return isRecord(value) && (value.version === 1 || value.version === 2 || value.version === 3) && value.month === month && typeof value.updatedAt === "string";
}

function salvageSnapshotSections(value: Record<string, unknown>, month: string): Pick<MonthSnapshot, "settings" | "votes" | "result"> {
  const hasValidSource = (item: Record<string, unknown>) => item.source === undefined || item.source === "ocr" || item.source === "import";
  const isSchedule = (item: unknown, service: boolean) => isRecord(item) && typeof item.key === "string" && typeof item.date === "string" && typeof item.time === "string" && typeof item.displayDate === "string" && hasValidSource(item) && (!service || (Array.isArray(item.baseRoles) && item.baseRoles.every((role) => BASE_ROLES.includes(role as never)) && Array.isArray(item.subRoles) && item.subRoles.every((role) => SUB_ROLES.includes(role as never))));
  const isOptionalString = (value: unknown) => value === undefined || typeof value === "string";
  const isVote = (item: unknown) => isRecord(item) && typeof item.scheduleKey === "string" && typeof item.name === "string" && isOptionalString(item.displayText) && (item.source === undefined || item.source === "ocr" || item.source === "manual" || item.source === "import");
  const isFeastDay = (value: unknown) => {
    if (value === undefined) return true;
    if (typeof value !== "string") return false;
    try {
      return normalizeFeastDay(value) === value;
    } catch {
      return false;
    }
  };
  const hasRequiredKeys = (record: Record<string, unknown>, keys: readonly string[], predicate: (value: unknown) => boolean) => keys.every((key) => predicate(record[key]));
  const isMember = (item: unknown) => isRecord(item) && typeof item.name === "string" && isOptionalString(item.id) && isOptionalString(item.baptismalName) && isFeastDay(item.feastDay) && isOptionalString(item.alias) && isRecord(item.roles) && hasRequiredKeys(item.roles, BASE_ROLES, (enabled) => typeof enabled === "boolean") && Object.keys(item.roles).every((role) => BASE_ROLES.includes(role as never)) && isRecord(item.counts) && hasRequiredKeys(item.counts, COUNT_ROLES, (count) => typeof count === "number" && Number.isInteger(count) && count >= 0) && Object.keys(item.counts).every((role) => COUNT_ROLES.includes(role as never));
  const isServiceRow = (item: unknown) => isRecord(item) && typeof item.displayDate === "string" && isOptionalString(item.note) && isRecord(item.roles) && Object.entries(item.roles).every(([role, name]) => [...BASE_ROLES, ...SUB_ROLES].includes(role as never) && typeof name === "string");
  const isCarRow = (item: unknown) => isRecord(item) && typeof item.displayDate === "string" && typeof item.name === "string" && isOptionalString(item.note);
  const isIssue = (item: unknown) => {
    if (!isRecord(item) || !["info", "warning", "error"].includes(String(item.severity)) || typeof item.code !== "string" || typeof item.message !== "string") return false;
    if (item.target === undefined) return true;
    return isRecord(item.target) && ["member", "setting", "vote", "schedule"].includes(String(item.target.type)) && isOptionalString(item.target.id);
  };
  const validSettings = isRecord(value.settings) && value.settings.month === month && typeof value.settings.titleColor === "string" && typeof value.settings.headerColor === "string" && Array.isArray(value.settings.serviceSchedules) && value.settings.serviceSchedules.every((item) => isSchedule(item, true)) && Array.isArray(value.settings.carSchedules) && value.settings.carSchedules.every((item) => isSchedule(item, false));
  const validVotes = isRecord(value.votes) && value.votes.month === month && typeof value.votes.rawText === "string" && Array.isArray(value.votes.serviceVotes) && value.votes.serviceVotes.every(isVote) && Array.isArray(value.votes.carVotes) && value.votes.carVotes.every(isVote);
  const validResult = isRecord(value.result) && typeof value.result.generatedAt === "string" && Array.isArray(value.result.serviceRows) && value.result.serviceRows.every(isServiceRow) && Array.isArray(value.result.carRows) && value.result.carRows.every(isCarRow) && Array.isArray(value.result.updatedMembers) && value.result.updatedMembers.every(isMember) && Array.isArray(value.result.issues) && value.result.issues.every(isIssue);
  return {
    settings: validSettings ? value.settings as ScheduleSettings : undefined,
    votes: validVotes ? value.votes as VoteData : undefined,
    result: validResult ? value.result as GenerateScheduleResult : undefined,
  };
}

export function saveSnapshot(snapshot: MonthSnapshot): boolean {
  if (!isMonthKey(snapshot.month)) return false;
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
