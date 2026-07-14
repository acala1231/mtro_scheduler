import dayjs, { type Dayjs } from "dayjs";
import type { ParseVoteResult } from "../domain/voteParser";
import type { ScheduleSettings } from "../domain/scheduleTypes";

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function firstDateOfMonth(month: string): string {
  return `${month}-01`;
}

export function monthFromDayjs(value: Dayjs | null): string {
  return value ? value.format("YYYY-MM") : currentMonth();
}

export function dateFromDayjs(value: Dayjs | null, fallback: string): string {
  return value ? value.format("YYYY-MM-DD") : fallback;
}

export function timeFromDayjs(value: Dayjs | null, fallback: string): string {
  return value ? value.format("HH:mm") : fallback;
}

export function dayjsFromTime(time: string): Dayjs {
  return dayjs(`2026-01-01T${time || "00:00"}`);
}

export function monthTitle(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
}

export function sortByKey<T extends { key: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.key.localeCompare(b.key));
}

export function sortByDateTime<T extends { date: string; time: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

export function sortSettingsSchedules(settings: ScheduleSettings): ScheduleSettings {
  return {
    ...settings,
    serviceSchedules: sortByDateTime(settings.serviceSchedules),
    carSchedules: sortByDateTime(settings.carSchedules),
  };
}

export function issueCounts(issues: Array<{ severity: string }>): { errors: number; warnings: number } {
  return {
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
  };
}

export async function prepareImageForOcr(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = image.width * scale;
  canvas.height = image.height * scale;

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = brightness > 175 ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/png");
  });
}

export function sanitizeVoteOcrText(text: string): string {
  return text
    .replace(/[^\w가-힣\s,./:()년월일-]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

export function scoreVoteParse(parsed: ParseVoteResult): number {
  return (parsed.serviceVotes.length + parsed.carVotes.length) * 10 - parsed.unparsedLines.length * 2;
}
