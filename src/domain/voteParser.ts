import { formatDateKey, formatTimeText, pad2 } from "./dateTime";
import type { CarSchedule, ServiceSchedule, VoteCountInfo, VoteEntry } from "./scheduleTypes";

export type ParseVoteResult = {
  serviceVotes: VoteEntry[];
  carVotes: VoteEntry[];
  voteCounts: VoteCountInfo[];
  detectedMonths: string[];
  unparsedLines: string[];
};

const scheduleLinePattern = /^(?:(\d{4})[-./년]\s*)?(\d{1,2})[-./월]\s*(\d{1,2})(?:일)?(?:\s*\([^)]*\))?(?:\s+(.*))?$/;

function isCarLine(line: string): boolean {
  return /차량|운전|픽업/.test(line);
}

function normalizeOcrVoteText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/((?:(?:\d{4})[-./년]\s*)?\d{1,2}[-./월]\s*\d{1,2}(?:일)?\s*\([^\n)]*)\s*\n\s*\)\s*(?=\d{1,2}:\d{2}[^\n]*(?:차량|운전|픽업))/g, "$1) ")
    .replace(/((?:(?:\d{4})[-./년]\s*)?\d{1,2}[-./월]\s*\d{1,2}(?:일)?)\s*\n\s*\)\s*(?=\d{1,2}:\d{2}[^\n]*(?:차량|운전|픽업))/g, "$1 ")
    .replace(/(\d{1,2}):\s*\n\s*(\d{2})/g, "$1:$2")
    .replace(/[，、]/g, ",")
    .replace(/\s*,\s*(?=(?:(?:\d{4})[-./년]\s*)?\d{1,2}[-./월]\s*\d{1,2}(?:일)?(?:\s*\([^)]*\))?[^,\n]*(?:\d{1,2}:\d{2}|관리장님))/g, "\n");
}

function isIgnorableLine(line: string): boolean {
  return /^(투표현황|항목별|멤버별|미참여|투표한 멤버가 없습니다\.?|.*일정)$/.test(line);
}

function removeVoteCount(text: string): string {
  return text.replace(/^\s*\d+\s*명\s*,?\s*/, "").trim();
}

function parseVoteCount(text: string): number | undefined {
  const match = text.match(/:\s*(\d+)\s*(명|H)?/);
  if (!match) return undefined;

  const token = match[1];
  const suffix = match[2];
  if (!suffix && token.length > 1 && token.endsWith("8")) {
    return Number(token.slice(0, -1));
  }

  return Number(token);
}

function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

function detectScheduleMonth(line: string, fallbackYear: number): string | undefined {
  const scheduleMatch = line.match(scheduleLinePattern);
  if (!scheduleMatch) return undefined;

  const year = scheduleMatch[1] ? Number(scheduleMatch[1]) : fallbackYear;
  const month = Number(scheduleMatch[2]);
  return month >= 1 && month <= 12 ? monthKey(year, month) : undefined;
}

function normalizeScheduleDay(year: number, month: number, dayText: string): number | undefined {
  const day = Number(dayText);
  const lastDay = new Date(year, month, 0).getDate();
  if (day >= 1 && day <= lastDay) return day;

  if (dayText.length === 2) {
    const firstDigit = Number(dayText[0]);
    if (firstDigit >= 1 && firstDigit <= lastDay) return firstDigit;
  }

  return undefined;
}

function normalizeName(text: string): string {
  return text
    .replace(/[^A-Za-z가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveScheduleKey({
  line,
  displayText,
  year,
  month,
  day,
  serviceSchedules,
  carSchedules,
}: {
  line: string;
  displayText: string;
  year: number;
  month: number;
  day: number;
  serviceSchedules: ServiceSchedule[];
  carSchedules: CarSchedule[];
}): { key: string; displayText: string; kind: "service" | "car" } {
  const schedules = [...serviceSchedules, ...carSchedules];
  const serviceKeys = new Set(serviceSchedules.map((schedule) => schedule.key));
  const carKeys = new Set(carSchedules.map((schedule) => schedule.key));
  const exactKey = formatDateKey(displayText, schedules, year);
  const dateKey = `${year}-${pad2(month)}-${pad2(day)}`;
  const inferredKind = isCarLine(line) || carKeys.has(exactKey) || (!serviceKeys.has(exactKey) && isCarLine(line)) ? "car" : "service";
  const targetSchedules = inferredKind === "car" ? carSchedules : serviceSchedules;
  const exactMatchedSchedule = targetSchedules.find((schedule) => schedule.key === exactKey);
  const dateMatchedSchedule = targetSchedules.find((schedule) => schedule.date === dateKey);
  const matchedSchedule = exactMatchedSchedule ?? dateMatchedSchedule;

  return {
    key: matchedSchedule?.key ?? exactKey,
    displayText: matchedSchedule?.displayDate ?? displayText,
    kind: inferredKind,
  };
}

function splitNames(text: string): string[] {
  return removeVoteCount(text)
    .split(/[,，、/]|(?:\s{2,})|\n/)
    .map((name) => normalizeName(name))
    .filter((name) => !isIgnorableLine(name))
    .filter((name) => !/^\d+\s*명$/.test(name))
    .filter(Boolean);
}

function parseScheduleLine(line: string, fallbackYear: number): { year?: number; month: number; day: number; time: string; namesText: string; expectedCount?: number } | null {
  const scheduleMatch = line.match(scheduleLinePattern);
  if (!scheduleMatch) return null;

  const year = scheduleMatch[1] ? Number(scheduleMatch[1]) : undefined;
  const month = Number(scheduleMatch[2]);
  const day = normalizeScheduleDay(year ?? fallbackYear, month, scheduleMatch[3]);
  if (!day) return null;

  const rest = scheduleMatch[4] ?? "";
  const timeMatch = rest.match(/\d{1,2}:\d{2}/);
  if (!timeMatch || timeMatch.index === undefined) return null;

  const afterTime = rest.slice(timeMatch.index + timeMatch[0].length);
  const namesText = afterTime.match(/:\s*(.*)$/)?.[1] ?? "";

  return {
    year,
    month,
    day,
    time: formatTimeText(timeMatch[0]),
    namesText,
    expectedCount: parseVoteCount(afterTime),
  };
}

function parseManagerCarLine(line: string, carSchedules: CarSchedule[], fallbackYear: number): { key: string; displayText: string; expectedCount: number } | null {
  if (!/관리장님/.test(line)) return null;

  const scheduleMatch = line.match(scheduleLinePattern);
  if (!scheduleMatch) return null;

  const year = scheduleMatch[1] ? Number(scheduleMatch[1]) : fallbackYear;
  const month = Number(scheduleMatch[2]);
  const day = normalizeScheduleDay(year, month, scheduleMatch[3]);
  if (!day) return null;

  const dateKey = `${year}-${pad2(month)}-${pad2(day)}`;
  const schedule = carSchedules.find((item) => item.date === dateKey);
  if (!schedule) return null;

  return {
    key: schedule.key,
    displayText: schedule.displayDate,
    expectedCount: parseVoteCount(line) ?? 0,
  };
}

export function parseVoteText(
  rawText: string,
  serviceSchedules: ServiceSchedule[],
  carSchedules: CarSchedule[],
  fallbackYear: number,
): ParseVoteResult {
  const serviceVotes: VoteEntry[] = [];
  const carVotes: VoteEntry[] = [];
  const voteCounts: VoteCountInfo[] = [];
  const detectedMonths = new Set<string>();
  const unparsedLines: string[] = [];
  let current: { key: string; displayText: string; kind: "service" | "car" } | null = null;

  normalizeOcrVoteText(rawText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line) => {
      if (!line) return;
      if (isIgnorableLine(line)) return;

      const detectedMonth = detectScheduleMonth(line, fallbackYear);
      if (detectedMonth) detectedMonths.add(detectedMonth);

      const managerCarLine = parseManagerCarLine(line, carSchedules, fallbackYear);
      if (managerCarLine) {
        current = { key: managerCarLine.key, displayText: managerCarLine.displayText, kind: "car" };
        voteCounts.push({
          scheduleKey: managerCarLine.key,
          displayText: managerCarLine.displayText,
          kind: "car",
          expectedCount: managerCarLine.expectedCount,
        });
        carVotes.push({ scheduleKey: managerCarLine.key, displayText: managerCarLine.displayText, name: "관리장님", source: "ocr" });
        return;
      }

      const scheduleLine = parseScheduleLine(line, fallbackYear);
      if (scheduleLine) {
        const year = scheduleLine.year ?? fallbackYear;
        const { month, day, time } = scheduleLine;
        const displayText = `${month}/${day} ${time}`;
        const resolved = resolveScheduleKey({
          line,
          displayText,
          year,
          month,
          day,
          serviceSchedules,
          carSchedules,
        });
        const { key, kind } = resolved;
        const linkedDisplayText = resolved.displayText;
        current = { key, displayText: linkedDisplayText, kind };
        if (scheduleLine.expectedCount !== undefined) {
          voteCounts.push({ scheduleKey: key, displayText: linkedDisplayText, kind, expectedCount: scheduleLine.expectedCount });
        }

        if (scheduleLine.namesText) {
          splitNames(scheduleLine.namesText).forEach((name) => {
            const entry = { scheduleKey: key, displayText: linkedDisplayText, name, source: "ocr" as const };
            if (kind === "car") carVotes.push(entry);
            else serviceVotes.push(entry);
          });
        }
        return;
      }

      if (!current) {
        unparsedLines.push(line);
        return;
      }

      const active = current;
      splitNames(line).forEach((name) => {
        const entry = {
          scheduleKey: active.key,
          displayText: active.displayText,
          name,
          source: "ocr" as const,
        };
        if (active.kind === "car") carVotes.push(entry);
        else serviceVotes.push(entry);
      });
    });

  return { serviceVotes, carVotes, voteCounts, detectedMonths: [...detectedMonths], unparsedLines };
}
