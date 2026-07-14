import type { CarSchedule, ServiceSchedule } from "./scheduleTypes";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatTimeText(value: string | number | Date | undefined | null): string {
  if (value instanceof Date) {
    return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
  }

  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    return `${pad2(Math.floor(totalMinutes / 60) % 24)}:${pad2(totalMinutes % 60)}`;
  }

  const text = String(value ?? "").trim();
  if (!text) return "";

  if (/^0?\.\d+$/.test(text)) return formatTimeText(Number(text));

  const compactMatch = text.match(/^(\d{1,2})(\d{2})$/);
  if (compactMatch) {
    return `${pad2(Number(compactMatch[1]))}:${compactMatch[2]}`;
  }

  const colonMatch = text.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    return `${pad2(Number(colonMatch[1]))}:${colonMatch[2]}`;
  }

  return text;
}

export function toDateKey(value: string | Date): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const currentYear = new Date().getFullYear();
  const match = text.match(/(?:(\d{4})[-./년]\s*)?(\d{1,2})[-./월]\s*(\d{1,2})/);
  if (!match) return text;

  const year = match[1] ? Number(match[1]) : currentYear;
  return `${year}-${pad2(Number(match[2]))}-${pad2(Number(match[3]))}`;
}

export function makeScheduleKey(date: string | Date, time: string | number | Date): string {
  return `${toDateKey(date)} ${formatTimeText(time)}`;
}

export function makeDateKeyFromScheduleKey(key: string): string {
  return key.split(/\s+/)[0] ?? key;
}

export function formatKoreanDateTime(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return `${month}/${day} (${WEEKDAYS[d.getDay()]}) ${formatTimeText(time)}`;
}

export function normalizeScheduleText(value: string): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/일\s+/g, " ")
    .trim();
}

export function formatDateKey(
  value: string,
  schedules: Array<ServiceSchedule | CarSchedule>,
  fallbackYear = new Date().getFullYear(),
): string {
  const input = String(value || "").trim();
  const normalizedInput = normalizeScheduleText(input);

  for (const schedule of schedules) {
    const simple = `${Number(schedule.date.slice(5, 7))}/${Number(schedule.date.slice(8, 10))} ${formatTimeText(schedule.time)}`;
    if (
      input === schedule.key ||
      input === schedule.displayDate ||
      normalizedInput === normalizeScheduleText(schedule.displayDate) ||
      normalizedInput === normalizeScheduleText(simple)
    ) {
      return schedule.key;
    }
  }

  const fullMatch = input.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$/);
  if (fullMatch) return `${fullMatch[1]} ${formatTimeText(fullMatch[2])}`;

  const shortMatch = normalizedInput.match(/^(\d{1,2})[/-](\d{1,2})\s+(\d{1,2}:\d{2})$/);
  if (shortMatch) {
    return `${fallbackYear}-${pad2(Number(shortMatch[1]))}-${pad2(Number(shortMatch[2]))} ${formatTimeText(shortMatch[3])}`;
  }

  return input;
}
