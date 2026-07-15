import dayjs, { type Dayjs } from "dayjs";
import type { ParseVoteResult } from "../domain/voteParser";
import type { ScheduleSettings } from "../domain/scheduleTypes";
import { calculateOcrDimensions, createOcrPixelVariant } from "../domain/ocrImageProcessing";

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

export async function prepareImageForOcr(file: File): Promise<{ binary: Blob; grayscale: Blob }> {
  const image = await createImageBitmap(file);
  const dimensions = calculateOcrDimensions(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  try {
    const context = canvas.getContext("2d");
    if (!context) return { binary: file, grayscale: file };

  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const variantToBlob = async (kind: "binary" | "grayscale"): Promise<Blob> => {
      const source = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = createOcrPixelVariant(source.data, kind);
      source.data.set(pixels);
      context.putImageData(source, 0, 0);
      return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), "image/png"));
    };
    const binary = await variantToBlob("binary");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const grayscale = await variantToBlob("grayscale");
    return { binary, grayscale };
  } finally {
    image.close();
  }
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
  const entries = [...parsed.serviceVotes, ...parsed.carVotes];
  const uniqueCounts = parsed.voteCounts.filter((count, index, counts) =>
    counts.findIndex((candidate) => candidate.kind === count.kind && candidate.scheduleKey === count.scheduleKey) === index,
  );
  const countScore = uniqueCounts.reduce((score, count) => {
    const kindEntries = count.kind === "service" ? parsed.serviceVotes : parsed.carVotes;
    const actual = kindEntries.filter((entry) => entry.scheduleKey === count.scheduleKey).length;
    const distance = Math.abs(actual - count.expectedCount);
    return score + (distance === 0 ? 30 : 0) - distance * 15 - (actual > count.expectedCount ? 25 : 0);
  }, 0);
  return entries.length * 10 + countScore - parsed.unparsedLines.length * 5;
}
