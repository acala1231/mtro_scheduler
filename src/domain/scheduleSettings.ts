import { BASE_ROLES, type CarSchedule, type ScheduleSettings, type ServiceSchedule, type VoteData, type VoteEntry } from "./scheduleTypes";
import { formatKoreanDateTime, makeScheduleKey } from "./dateTime";

type MigratableSchedule = { key: string; displayDate: string };

function migrateVoteEntries<TSchedule extends MigratableSchedule>(
  oldSchedules: TSchedule[],
  newSchedules: TSchedule[],
  entries: VoteEntry[],
  explicitReplacements?: Map<string, string>,
): VoteEntry[] {
  const oldKeys = new Set(oldSchedules.map((item) => item.key));
  const newKeys = new Set(newSchedules.map((item) => item.key));
  const replacementSchedules = new Map<string, TSchedule>();

  explicitReplacements?.forEach((newKey, oldKey) => {
    const newSchedule = newSchedules.find((item) => item.key === newKey);
    if (newSchedule) replacementSchedules.set(oldKey, newSchedule);
  });

  oldSchedules.forEach((oldSchedule, index) => {
    const newSchedule = newSchedules[index];
    if (
      !explicitReplacements &&
      newSchedule &&
      oldSchedule.key !== newSchedule.key &&
      !newKeys.has(oldSchedule.key) &&
      !oldKeys.has(newSchedule.key)
    ) {
      replacementSchedules.set(oldSchedule.key, newSchedule);
    }
  });

  return entries.map((entry) => {
    const replacement = replacementSchedules.get(entry.scheduleKey);
    return replacement ? { ...entry, scheduleKey: replacement.key, displayText: replacement.displayDate } : entry;
  });
}

function getSundaysOfMonth(month: string): string[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const dates: string[] = [];
  const date = new Date(year, monthNumber - 1, 1);

  while (date.getMonth() === monthNumber - 1) {
    if (date.getDay() === 0) {
      dates.push(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      );
    }
    date.setDate(date.getDate() + 1);
  }

  return dates;
}

export function createDefaultSettings(month: string): ScheduleSettings {
  const sundays = getSundaysOfMonth(month);

  return {
    month,
    titleColor: "#1F3A68",
    headerColor: "#CFCFCF",
    serviceSchedules: sundays.map((date) => createServiceSchedule(date, "11:00")),
    carSchedules: sundays.map((date) => createCarSchedule(date, "09:40")),
  };
}

export function ensureDefaultScheduleData(settings: ScheduleSettings): ScheduleSettings {
  const defaults = createDefaultSettings(settings.month);

  return {
    ...settings,
    serviceSchedules: dedupeSchedulesByKey(settings.serviceSchedules.length > 0 ? settings.serviceSchedules : defaults.serviceSchedules),
    carSchedules: dedupeSchedulesByKey(settings.carSchedules.length > 0 ? settings.carSchedules : defaults.carSchedules),
  };
}

export function dedupeSchedulesByKey<TSchedule extends { key: string }>(schedules: TSchedule[]): TSchedule[] {
  return [...new Map(schedules.map((schedule) => [schedule.key, schedule])).values()];
}

export function makeUniqueScheduleTime(date: string, preferredTime: string, existingKeys: string[]): string {
  const existingKeySet = new Set(existingKeys);
  const [preferredHour, preferredMinute] = preferredTime.split(":").map(Number);
  const preferredTotalMinutes = (preferredHour || 0) * 60 + (preferredMinute || 0);

  for (let offset = 0; offset < 24 * 60; offset += 30) {
    const totalMinutes = (preferredTotalMinutes + offset) % (24 * 60);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    if (!existingKeySet.has(makeScheduleKey(date, time))) return time;
  }

  return preferredTime;
}

export function createServiceSchedule(date: string, time: string): ServiceSchedule {
  const normalizedTime = time || "11:00";
  return {
    key: makeScheduleKey(date, normalizedTime),
    date,
    time: normalizedTime,
    displayDate: formatKoreanDateTime(date, normalizedTime),
    baseRoles: [...BASE_ROLES],
    subRoles: [],
  };
}

export function createCarSchedule(date: string, time: string): CarSchedule {
  const normalizedTime = time || "09:40";
  return {
    key: makeScheduleKey(date, normalizedTime),
    date,
    time: normalizedTime,
    displayDate: formatKoreanDateTime(date, normalizedTime),
  };
}

export function refreshServiceSchedule(schedule: ServiceSchedule): ServiceSchedule {
  const key = makeScheduleKey(schedule.date, schedule.time);
  return {
    ...schedule,
    key,
    displayDate: formatKoreanDateTime(schedule.date, schedule.time),
  };
}

export function refreshCarSchedule(schedule: CarSchedule): CarSchedule {
  const key = makeScheduleKey(schedule.date, schedule.time);
  return {
    ...schedule,
    key,
    displayDate: formatKoreanDateTime(schedule.date, schedule.time),
  };
}

export function migrateVotesForSettingsChange(previous: ScheduleSettings, next: ScheduleSettings, votes: VoteData, replacements?: { service?: Map<string, string>; car?: Map<string, string> }): VoteData {
  return {
    ...votes,
    serviceVotes: migrateVoteEntries(previous.serviceSchedules, next.serviceSchedules, votes.serviceVotes, replacements?.service),
    carVotes: migrateVoteEntries(previous.carSchedules, next.carSchedules, votes.carVotes, replacements?.car),
  };
}
